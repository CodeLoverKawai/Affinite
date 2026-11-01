import 'package:anx_reader/dao/base_dao.dart';
import 'package:anx_reader/dao/book.dart';
import 'package:anx_reader/dao/book_note.dart';
import 'package:anx_reader/enums/sync_direction.dart';
import 'package:anx_reader/enums/sync_trigger.dart';
import 'package:anx_reader/models/book.dart';
import 'package:anx_reader/models/reading_time.dart';
import 'package:anx_reader/providers/sync.dart';
import 'package:anx_reader/service/web_bridge.dart';
import 'package:anx_reader/utils/platform_utils.dart';

class ReadingTimeDao extends BaseDao {
  ReadingTimeDao();

  static const String table = 'tb_reading_time';
  static List<ReadingTime> webReadingTimes = [];

  Future<void> insertReadingTime(
    ReadingTime readingTime, {
    DateTime? startedAt,
  }) async {
    final resolvedDay = _resolveDayString(readingTime, startedAt);
    readingTime.date ??= resolvedDay;

    final db = await database;

    await db.transaction((txn) async {
      final existing = await txn.rawQuery(
        'SELECT id, reading_time FROM $table WHERE book_id = ? AND DATE(date) = DATE(?) LIMIT 1',
        [readingTime.bookId, resolvedDay],
      );

      if (existing.isNotEmpty) {
        final current = existing.first['reading_time'] as int? ?? 0;
        await txn.update(
          table,
          {
            'reading_time': current + readingTime.readingTime,
            // keep legacy date value unchanged to avoid churn
          },
          where: 'id = ?',
          whereArgs: [existing.first['id']],
        );
      } else {
        await txn.insert(
          table,
          {
            'book_id': readingTime.bookId,
            'date': resolvedDay,
            'reading_time': readingTime.readingTime,
          },
        );
      }
    });

    if (AnxPlatform.isWeb) {
      final idx = webReadingTimes.indexWhere(
          (r) => r.bookId == readingTime.bookId && (r.dateOnly ?? '') == resolvedDay);
      if (idx != -1) {
        final existing = webReadingTimes[idx];
        webReadingTimes[idx] = ReadingTime(
          id: existing.id,
          bookId: existing.bookId,
          date: existing.date ?? resolvedDay,
          readingTime: existing.readingTime + readingTime.readingTime,
        );
      } else {
        int nextId = 1;
        for (final r in webReadingTimes) {
          if ((r.id ?? 0) >= nextId) nextId = (r.id ?? 0) + 1;
        }
        webReadingTimes.insert(
          0,
          ReadingTime(
            id: nextId,
            bookId: readingTime.bookId,
            date: resolvedDay,
            readingTime: readingTime.readingTime,
          ),
        );
      }
      WebBridge.syncReadingTimes();
    }
  }

  Future<void> insertReadingSession({
    required int bookId,
    required int readingTime,
    DateTime? startedAt,
  }) async {
    final session = ReadingTime(
      bookId: bookId,
      readingTime: readingTime,
      date: startedAt?.toIso8601String(),
    );

    await insertReadingTime(session, startedAt: startedAt);
  }

  String _resolveDayString(ReadingTime readingTime, DateTime? startedAt) {
    final fromModel = readingTime.startedAt;
    if (fromModel != null) {
      return _dayKey(fromModel);
    }

    if (startedAt != null) {
      return _dayKey(startedAt);
    }

    final raw = readingTime.date;
    if (raw != null && raw.length >= 10) {
      return raw.substring(0, 10);
    }

    return _dayKey(DateTime.now());
  }

  String _dayKey(DateTime dateTime) =>
      dateTime.toIso8601String().substring(0, 10);

  Future<List<ReadingTime>> selectAllReadingTime() async {
    if (AnxPlatform.isWeb) {
      final copy = List<ReadingTime>.from(webReadingTimes);
      copy.sort((a, b) => (b.date ?? '').compareTo(a.date ?? ''));
      return copy;
    }
    return queryList(
      table,
      mapper: ReadingTime.fromDb,
      orderBy: 'datetime(date) DESC, id DESC',
    );
  }

  Future<int> selectTotalReadingTime() async {
    if (AnxPlatform.isWeb) {
      return webReadingTimes.fold<int>(0, (sum, r) => sum + r.readingTime);
    }
    final result = await rawQuerySingle(
      'SELECT SUM(reading_time) AS total_sum FROM $table',
      mapper: (row) => row['total_sum'] as int? ?? 0,
    );
    return result ?? 0;
  }

  Future<int> selectTotalNumberOfBook() async {
    if (AnxPlatform.isWeb) {
      final readIds = webReadingTimes.map((r) => r.bookId).toSet();
      for (final b in BookDao.webBooks) {
        if (!b.isDeleted && b.readingPercentage > 0) {
          readIds.add(b.id);
        }
      }
      return readIds.length;
    }
    final result = await rawQuerySingle(
      'SELECT COUNT(DISTINCT book_id) AS total_count FROM $table',
      mapper: (row) => row['total_count'] as int? ?? 0,
    );
    return result ?? 0;
  }

  Future<int> selectTotalNumberOfDate() async {
    if (AnxPlatform.isWeb) {
      return webReadingTimes
          .map((r) => r.dateOnly)
          .whereType<String>()
          .toSet()
          .length;
    }
    final result = await rawQuerySingle(
      'SELECT COUNT(DISTINCT DATE(date)) AS total_count FROM $table',
      mapper: (row) => row['total_count'] as int? ?? 0,
    );
    return result ?? 0;
  }

  Future<int> selectTotalNumberOfNotes() async {
    if (AnxPlatform.isWeb) {
      return BookNoteDao.webNotes.length;
    }
    final result = await rawQuerySingle(
      'SELECT COUNT(*) AS total_count FROM tb_notes',
      mapper: (row) => row['total_count'] as int? ?? 0,
    );
    return result ?? 0;
  }

  Future<List<int>> selectReadingTimeOfWeek(DateTime dateTime) async {
    final start = dateTime.subtract(Duration(days: dateTime.weekday - 1));
    final end = start.add(const Duration(days: 6));

    if (AnxPlatform.isWeb) {
      final startStr = start.toIso8601String().substring(0, 10);
      final endStr = end.toIso8601String().substring(0, 10);
      final totals = <String, int>{};
      for (final r in webReadingTimes) {
        final d = r.dateOnly;
        if (d != null && d.compareTo(startStr) >= 0 && d.compareTo(endStr) <= 0) {
          totals[d] = (totals[d] ?? 0) + r.readingTime;
        }
      }
      return List<int>.generate(7, (index) {
        final day = start.add(Duration(days: index));
        final key = day.toIso8601String().substring(0, 10);
        return totals[key] ?? 0;
      });
    }

    final rows = await rawQueryList(
      '''
      SELECT DATE(date) AS day, SUM(reading_time) AS total_sum 
      FROM $table 
      WHERE DATE(date) BETWEEN DATE(?) AND DATE(?) 
      GROUP BY day
      ''',
      arguments: [
        start.toIso8601String().substring(0, 10),
        end.toIso8601String().substring(0, 10),
      ],
      mapper: (row) => row,
    );

    final totals = {
      for (final row in rows)
        row['day'] as String: row['total_sum'] as int? ?? 0,
    };

    return List<int>.generate(7, (index) {
      final day = start.add(Duration(days: index));
      final key = day.toIso8601String().substring(0, 10);
      return totals[key] ?? 0;
    });
  }

  Future<List<int>> selectReadingTimeOfMonth(DateTime dateTime) async {
    final firstDay = DateTime(dateTime.year, dateTime.month, 1);
    final lastDay = DateTime(dateTime.year, dateTime.month + 1, 0);
    final daysInMonth = lastDay.day;

    if (AnxPlatform.isWeb) {
      final startStr = firstDay.toIso8601String().substring(0, 10);
      final endStr = lastDay.toIso8601String().substring(0, 10);
      final totals = <String, int>{};
      for (final r in webReadingTimes) {
        final d = r.dateOnly;
        if (d != null && d.compareTo(startStr) >= 0 && d.compareTo(endStr) <= 0) {
          totals[d] = (totals[d] ?? 0) + r.readingTime;
        }
      }
      return List<int>.generate(daysInMonth, (index) {
        final day = firstDay.add(Duration(days: index));
        final key = day.toIso8601String().substring(0, 10);
        return totals[key] ?? 0;
      });
    }

    final rows = await rawQueryList(
      '''
      SELECT DATE(date) AS day, SUM(reading_time) AS total_sum 
      FROM $table 
      WHERE DATE(date) BETWEEN DATE(?) AND DATE(?) 
      GROUP BY day
      ''',
      arguments: [
        firstDay.toIso8601String().substring(0, 10),
        lastDay.toIso8601String().substring(0, 10),
      ],
      mapper: (row) => row,
    );

    final totals = {
      for (final row in rows)
        row['day'] as String: row['total_sum'] as int? ?? 0,
    };

    return List<int>.generate(daysInMonth, (index) {
      final day = firstDay.add(Duration(days: index));
      final key = day.toIso8601String().substring(0, 10);
      return totals[key] ?? 0;
    });
  }

  Future<List<int>> selectReadingTimeOfYear(DateTime dateTime) async {
    final yearStart = DateTime(dateTime.year, 1, 1);
    final yearEnd = DateTime(dateTime.year, 12, 31);

    if (AnxPlatform.isWeb) {
      final startStr = yearStart.toIso8601String().substring(0, 10);
      final endStr = yearEnd.toIso8601String().substring(0, 10);
      final totals = <String, int>{};
      for (final r in webReadingTimes) {
        final d = r.dateOnly;
        if (d != null && d.compareTo(startStr) >= 0 && d.compareTo(endStr) <= 0) {
          final monthKey = d.substring(0, 7);
          totals[monthKey] = (totals[monthKey] ?? 0) + r.readingTime;
        }
      }
      return List<int>.generate(12, (index) {
        final monthKey = DateTime(dateTime.year, index + 1, 1)
            .toIso8601String()
            .substring(0, 7);
        return totals[monthKey] ?? 0;
      });
    }

    final rows = await rawQueryList(
      '''
      SELECT strftime('%Y-%m', date) AS month, SUM(reading_time) AS total_sum 
      FROM $table 
      WHERE DATE(date) BETWEEN DATE(?) AND DATE(?) 
      GROUP BY month
      ''',
      arguments: [
        yearStart.toIso8601String().substring(0, 10),
        yearEnd.toIso8601String().substring(0, 10),
      ],
      mapper: (row) => row,
    );

    final totals = {
      for (final row in rows)
        row['month'] as String: row['total_sum'] as int? ?? 0,
    };

    return List<int>.generate(12, (index) {
      final monthKey = DateTime(dateTime.year, index + 1, 1)
          .toIso8601String()
          .substring(0, 7);
      return totals[monthKey] ?? 0;
    });
  }

  Future<List<ReadingTime>> selectReadingTimeByBookId(int bookId) async {
    if (AnxPlatform.isWeb) {
      final list =
          webReadingTimes.where((r) => r.bookId == bookId).toList();
      list.sort((a, b) => (b.date ?? '').compareTo(a.date ?? ''));
      return list;
    }
    return queryList(
      table,
      mapper: ReadingTime.fromDb,
      where: 'book_id = ?',
      whereArgs: [bookId],
      orderBy: 'datetime(date) DESC, id DESC',
    );
  }

  Future<List<ReadingTime>> queryReadingHistory({
    int? bookId,
    DateTime? from,
    DateTime? to,
    int? limit,
  }) async {
    if (AnxPlatform.isWeb) {
      var list = webReadingTimes.where((r) {
        if (bookId != null && r.bookId != bookId) return false;
        final dt = r.startedAt;
        if (from != null && dt != null && dt.isBefore(from)) return false;
        if (to != null && dt != null && dt.isAfter(to)) return false;
        return true;
      }).toList();
      list.sort((a, b) => (b.date ?? '').compareTo(a.date ?? ''));
      if (limit != null && list.length > limit) {
        list = list.sublist(0, limit);
      }
      return list;
    }

    final where = <String>[];
    final whereArgs = <Object?>[];

    if (bookId != null) {
      where.add('book_id = ?');
      whereArgs.add(bookId);
    }

    String? toDateTimeString(DateTime? date) => date?.toIso8601String();

    final fromStr = toDateTimeString(from);
    final toStr = toDateTimeString(to);

    if (fromStr != null) {
      where.add('datetime(date) >= datetime(?)');
      whereArgs.add(fromStr);
    }

    if (toStr != null) {
      where.add('datetime(date) <= datetime(?)');
      whereArgs.add(toStr);
    }

    return queryList(
      table,
      mapper: ReadingTime.fromDb,
      where: where.isEmpty ? null : where.join(' AND '),
      whereArgs: where.isEmpty ? null : whereArgs,
      orderBy: 'datetime(date) DESC, id DESC',
      limit: limit,
    );
  }

  Future<List<Map<int, int>>> selectThisWeekBooks() async {
    final monday =
        DateTime.now().subtract(Duration(days: DateTime.now().weekday - 1));
    final mondayStr = monday.toIso8601String().substring(0, 10);

    if (AnxPlatform.isWeb) {
      final sums = <int, int>{};
      for (final r in webReadingTimes) {
        final d = r.dateOnly;
        if (d != null && d.compareTo(mondayStr) >= 0) {
          sums[r.bookId] = (sums[r.bookId] ?? 0) + r.readingTime;
        }
      }
      final entries = sums.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));
      return entries.map((e) => {e.key: e.value}).toList();
    }

    final rows = await rawQueryList(
      '''
      SELECT book_id, SUM(reading_time) AS total_sum 
      FROM $table 
      WHERE DATE(date) >= DATE(?) 
      GROUP BY book_id 
      ORDER BY total_sum DESC
      ''',
      arguments: [mondayStr],
      mapper: (row) => {
        (row['book_id'] as int?) ?? 0: row['total_sum'] as int? ?? 0,
      },
    );
    return rows;
  }

  Future<int> selectTotalReadingTimeByBookId(int bookId) async {
    if (AnxPlatform.isWeb) {
      return webReadingTimes
          .where((r) => r.bookId == bookId)
          .fold<int>(0, (sum, r) => sum + r.readingTime);
    }
    final total = await rawQuerySingle(
      'SELECT SUM(reading_time) AS total_sum FROM $table WHERE book_id = ?',
      arguments: [bookId],
      mapper: (row) => row['total_sum'] as int? ?? 0,
    );
    return total ?? 0;
  }

  Future<List<Map<Book, int>>> selectBookReadingTimeOfDay(DateTime date) async {
    final dayStr = date.toIso8601String().substring(0, 10);
    if (AnxPlatform.isWeb) {
      return _aggregateWebByDateRange(dayStr, dayStr);
    }
    final rows = await _aggregateByBook(
      where: 'DATE(date) = DATE(?)',
      whereArgs: [dayStr],
    );
    return _attachBooks(rows);
  }

  Future<List<Map<Book, int>>> selectBookReadingTimeOfWeek(
      DateTime date) async {
    final start = date.subtract(Duration(days: date.weekday - 1));
    final end = start.add(const Duration(days: 6));
    final startStr = start.toIso8601String().substring(0, 10);
    final endStr = end.toIso8601String().substring(0, 10);
    if (AnxPlatform.isWeb) {
      return _aggregateWebByDateRange(startStr, endStr);
    }
    final rows = await _aggregateByBook(
      where: 'DATE(date) BETWEEN DATE(?) AND DATE(?)',
      whereArgs: [startStr, endStr],
    );
    return _attachBooks(rows);
  }

  Future<List<Map<Book, int>>> selectBookReadingTimeOfMonth(
      DateTime date) async {
    final start = DateTime(date.year, date.month, 1);
    final end = DateTime(date.year, date.month + 1, 0);
    final startStr = start.toIso8601String().substring(0, 10);
    final endStr = end.toIso8601String().substring(0, 10);
    if (AnxPlatform.isWeb) {
      return _aggregateWebByDateRange(startStr, endStr);
    }
    final rows = await _aggregateByBook(
      where: 'DATE(date) BETWEEN DATE(?) AND DATE(?)',
      whereArgs: [startStr, endStr],
    );
    return _attachBooks(rows);
  }

  Future<List<Map<Book, int>>> selectBookReadingTimeOfYear(
      DateTime date) async {
    final start = DateTime(date.year, 1, 1);
    final end = DateTime(date.year, 12, 31);
    final startStr = start.toIso8601String().substring(0, 10);
    final endStr = end.toIso8601String().substring(0, 10);
    if (AnxPlatform.isWeb) {
      return _aggregateWebByDateRange(startStr, endStr);
    }
    final rows = await _aggregateByBook(
      where: 'DATE(date) BETWEEN DATE(?) AND DATE(?)',
      whereArgs: [startStr, endStr],
    );
    return _attachBooks(rows);
  }

  Future<Map<DateTime, int>> selectAllReadingTimeGroupByDay() async {
    if (AnxPlatform.isWeb) {
      final result = <DateTime, int>{};
      for (final r in webReadingTimes) {
        final d = r.dateOnly;
        if (d == null) continue;
        final dt = DateTime.tryParse(d);
        if (dt != null) {
          result[dt] = (result[dt] ?? 0) + r.readingTime;
        }
      }
      return result;
    }
    final rows = await rawQueryList(
      '''
      SELECT DATE(date) AS day, SUM(reading_time) AS total_time 
      FROM $table 
      GROUP BY day 
      ORDER BY day ASC
      ''',
      mapper: (row) => row,
    );

    final result = <DateTime, int>{};
    for (final row in rows) {
      final date = DateTime.parse(row['day'] as String);
      result[date] = row['total_time'] as int? ?? 0;
    }
    return result;
  }

  Future<List<Map<Book, int>>> selectBookReadingTimeOfAll() async {
    if (AnxPlatform.isWeb) {
      return _aggregateWebByDateRange(null, null);
    }
    final rows = await _aggregateByBook();
    return _attachBooks(rows);
  }

  Future<List<Map<Book, int>>> _aggregateWebByDateRange(
      String? startStr, String? endStr) async {
    final sums = <int, int>{};
    for (final r in webReadingTimes) {
      final d = r.dateOnly;
      if (startStr != null && (d == null || d.compareTo(startStr) < 0)) {
        continue;
      }
      if (endStr != null && (d == null || d.compareTo(endStr) > 0)) {
        continue;
      }
      sums[r.bookId] = (sums[r.bookId] ?? 0) + r.readingTime;
    }
    final entries = sums.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final rows = entries
        .map((e) => <String, dynamic>{'book_id': e.key, 'total_time': e.value})
        .toList();
    return _attachBooks(rows);
  }

  Future<Map<String, dynamic>?> selectLatestReadingRecord() async {
    if (AnxPlatform.isWeb) {
      if (webReadingTimes.isEmpty) return null;
      final sorted = List<ReadingTime>.from(webReadingTimes)
        ..sort((a, b) => (b.date ?? '').compareTo(a.date ?? ''));
      final top = sorted.first;
      return {
        'book_id': top.bookId,
        'date': top.date,
        'reading_time': top.readingTime,
      };
    }
    return await rawQuerySingle(
      '''
      SELECT book_id, date, reading_time 
      FROM $table 
      ORDER BY datetime(date) DESC, id DESC 
      LIMIT 1
      ''',
      mapper: (row) => row,
    );
  }

  Future<void> deleteReadingTimeByBookId(List<int> bookIds) async {
    if (bookIds.isEmpty) return;

    final placeholders = List.filled(bookIds.length, '?').join(',');
    await delete(
      table,
      where: 'book_id IN ($placeholders)',
      whereArgs: bookIds,
    );

    if (AnxPlatform.isWeb) {
      webReadingTimes.removeWhere((r) => bookIds.contains(r.bookId));
      WebBridge.syncReadingTimes();
      return;
    }

    Sync().syncData(SyncDirection.both, null, trigger: SyncTrigger.auto);
  }

  Future<List<Map<String, dynamic>>> _aggregateByBook({
    String? where,
    List<Object?>? whereArgs,
  }) async {
    final db = await database;
    return db.rawQuery(
      '''
      SELECT book_id, SUM(reading_time) AS total_time 
      FROM $table 
      ${where != null ? 'WHERE $where' : ''} 
      GROUP BY book_id 
      ORDER BY total_time DESC
      ''',
      whereArgs,
    );
  }

  Future<List<Map<Book, int>>> _attachBooks(
      List<Map<String, dynamic>> rows) async {
    final ids = rows
        .map((row) => row['book_id'] as int?)
        .whereType<int>()
        .toSet()
        .toList();
    if (ids.isEmpty) {
      return const [];
    }

    final books = await bookDao.selectBooksByIds(ids);
    final bookMap = {for (final book in books) book.id: book};

    final result = <Map<Book, int>>[];
    for (final row in rows) {
      final bookId = row['book_id'] as int?;
      if (bookId == null) continue;
      final book = bookMap[bookId];
      if (book == null) continue;
      result.add({book: row['total_time'] as int? ?? 0});
    }
    return result;
  }

  Future<List<Map<String, dynamic>>> selectBookDailyReadingTime({
    required int bookId,
    required int days,
  }) async {
    final startDate = DateTime.now().subtract(Duration(days: days - 1));
    final startStr = startDate.toIso8601String().substring(0, 10);

    if (AnxPlatform.isWeb) {
      final sums = <String, int>{};
      for (final r in webReadingTimes) {
        final d = r.dateOnly;
        if (r.bookId == bookId && d != null && d.compareTo(startStr) >= 0) {
          sums[d] = (sums[d] ?? 0) + r.readingTime;
        }
      }
      final keys = sums.keys.toList()..sort();
      return keys
          .map((k) => <String, dynamic>{'day': k, 'total_time': sums[k] ?? 0})
          .toList();
    }

    return rawQueryList(
      '''
      SELECT DATE(date) as day, SUM(reading_time) as total_time
      FROM $table
      WHERE book_id = ? AND DATE(date) >= DATE(?)
      GROUP BY day
      ORDER BY day ASC
      ''',
      arguments: [
        bookId,
        startStr,
      ],
      mapper: (row) => {
        'day': row['day'] as String,
        'total_time': row['total_time'] as int? ?? 0,
      },
    );
  }

  Future<Map<DateTime, int>> selectDailyReadingTimeSince(
      DateTime startDate) async {
    final startStr = startDate.toIso8601String().substring(0, 10);

    if (AnxPlatform.isWeb) {
      final result = <DateTime, int>{};
      for (final r in webReadingTimes) {
        final d = r.dateOnly;
        if (d != null && d.compareTo(startStr) >= 0) {
          final dt = DateTime.tryParse(d);
          if (dt != null) {
            result[dt] = (result[dt] ?? 0) + r.readingTime;
          }
        }
      }
      return result;
    }

    final rows = await rawQueryList(
      '''
      SELECT DATE(date) as day, SUM(reading_time) as total_time
      FROM $table
      WHERE DATE(date) >= DATE(?)
      GROUP BY day
      ORDER BY day ASC
      ''',
      arguments: [startStr],
      mapper: (row) => row,
    );

    final result = <DateTime, int>{};
    for (final row in rows) {
      final day = row['day'] as String?;
      if (day == null) continue;
      result[DateTime.parse(day)] = row['total_time'] as int? ?? 0;
    }
    return result;
  }
}

final readingTimeDao = ReadingTimeDao();
