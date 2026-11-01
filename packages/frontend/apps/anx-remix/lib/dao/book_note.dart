import 'dart:math';

import 'package:anx_reader/dao/base_dao.dart';
import 'package:anx_reader/dao/book.dart';
import 'package:anx_reader/models/book_note.dart';
import 'package:anx_reader/service/web_bridge.dart';
import 'package:anx_reader/utils/platform_utils.dart';

class BookNoteDao extends BaseDao {
  BookNoteDao();

  static const String table = 'tb_notes';
  static List<BookNote> webNotes = [];

  /// Annotation types for highlight/underline notes (excludes book reviews)
  static const List<String> annotationTypes = [
    'highlight',
    'underline',
    'bookmark'
  ];

  /// Helper to build type filter SQL
  static String get _typeFilter =>
      "type IN ('${annotationTypes.join("', '")}')";

  Future<int> save(BookNote bookNote) async {
    if (bookNote.id != null) {
      await updateBookNoteById(bookNote);
      return bookNote.id!;
    }

    final duplicates =
        await selectBookNoteByCfiAndBookId(bookNote.cfi, bookNote.bookId);
    if (duplicates.isNotEmpty) {
      bookNote.id = duplicates.last.id;
      await updateBookNoteById(bookNote);
      return bookNote.id!;
    }

    final insertedId = await insert(table, bookNote.toMap());
    bookNote.id = insertedId;
    if (AnxPlatform.isWeb) {
      bookNote.createTime ??= DateTime.now();
      bookNote.updateTime = DateTime.now();
      webNotes.insert(0, bookNote);
      WebBridge.syncNotes();
    }
    return insertedId;
  }

  Future<List<BookNote>> selectBookNoteByCfiAndBookId(
      String cfi, int bookId) async {
    if (AnxPlatform.isWeb) {
      final list = webNotes
          .where((n) =>
              n.cfi == cfi &&
              n.bookId == bookId &&
              annotationTypes.contains(n.type))
          .toList();
      list.sort((a, b) => a.updateTime.compareTo(b.updateTime));
      return list;
    }
    return queryList(
      table,
      mapper: BookNote.fromDb,
      where: 'cfi = ? AND book_id = ? AND $_typeFilter',
      whereArgs: [cfi, bookId],
      orderBy: 'update_time ASC',
    );
  }

  Future<List<BookNote>> selectBookNotesByBookId(int bookId) async {
    if (AnxPlatform.isWeb) {
      final list = webNotes
          .where((n) => n.bookId == bookId && annotationTypes.contains(n.type))
          .toList();
      list.sort((a, b) => b.updateTime.compareTo(a.updateTime));
      return list;
    }
    return queryList(
      table,
      mapper: BookNote.fromDb,
      where: 'book_id = ? AND $_typeFilter',
      whereArgs: [bookId],
      orderBy: 'update_time DESC',
    );
  }

  Future<void> updateBookNoteById(BookNote bookNote) async {
    bookNote.updateTime = DateTime.now();
    await update(
      table,
      bookNote.toMap(),
      where: 'id = ?',
      whereArgs: [bookNote.id],
    );
    if (AnxPlatform.isWeb) {
      final idx = webNotes.indexWhere((n) => n.id == bookNote.id);
      if (idx != -1) {
        webNotes[idx] = bookNote;
      } else {
        webNotes.insert(0, bookNote);
      }
      WebBridge.syncNotes();
    }
  }

  Future<BookNote> selectBookNoteById(int id) async {
    if (AnxPlatform.isWeb) {
      final existing = webNotes.where((n) => n.id == id);
      if (existing.isNotEmpty) {
        return existing.first;
      }
      return BookNote(
        id: id,
        bookId: 1,
        content: '',
        cfi: '',
        chapter: '',
        type: 'highlight',
        color: '66CCFF',
        updateTime: DateTime.now(),
      );
    }
    final note = await querySingle(
      table,
      mapper: BookNote.fromDb,
      where: 'id = ?',
      whereArgs: [id],
    );

    if (note == null) {
      throw StateError('Book note with id $id not found');
    }

    return note;
  }

  Future<List<Map<String, int>>> selectAllBookIdAndNotes() async {
    if (AnxPlatform.isWeb) {
      final activeBookIds = BookDao.webBooks
          .where((b) => !b.isDeleted)
          .map((b) => b.id)
          .toSet();
      final counts = <int, int>{};
      for (final n in webNotes) {
        if (n.bookId != 0 &&
            activeBookIds.contains(n.bookId) &&
            annotationTypes.contains(n.type)) {
          counts[n.bookId] = (counts[n.bookId] ?? 0) + 1;
        }
      }
      final entries = counts.entries
          .map((e) => <String, int>{
                'bookId': e.key,
                'numberOfNotes': e.value,
              })
          .toList();
      entries.sort(
          (a, b) => (b['numberOfNotes'] ?? 0).compareTo(a['numberOfNotes'] ?? 0));
      return entries;
    }
    return rawQueryList(
      'SELECT book_id, COUNT(id) AS number_of_notes FROM $table WHERE $_typeFilter GROUP BY book_id ORDER BY number_of_notes DESC',
      mapper: (row) => <String, int>{
        'bookId': row['book_id'] as int? ?? 0,
        'numberOfNotes': row['number_of_notes'] as int? ?? 0,
      },
    ).then((rows) => rows.where((element) => element['bookId'] != 0).toList());
  }

  Future<Map<String, int>> selectNumberOfNotesAndBooks() async {
    if (AnxPlatform.isWeb) {
      final activeBookIds = BookDao.webBooks
          .where((b) => !b.isDeleted)
          .map((b) => b.id)
          .toSet();
      final validNotes = webNotes
          .where((n) =>
              activeBookIds.contains(n.bookId) &&
              annotationTypes.contains(n.type))
          .toList();
      final bookIds = validNotes.map((n) => n.bookId).toSet();
      return {
        'numberOfNotes': validNotes.length,
        'numberOfBooks': bookIds.length,
      };
    }
    final result = await rawQuerySingle(
      'SELECT COUNT(id) AS number_of_notes, COUNT(DISTINCT book_id) AS number_of_books FROM $table WHERE $_typeFilter',
      mapper: (row) => <String, int>{
        'numberOfNotes': row['number_of_notes'] as int? ?? 0,
        'numberOfBooks': row['number_of_books'] as int? ?? 0,
      },
    );

    return result ?? const {'numberOfNotes': 0, 'numberOfBooks': 0};
  }

  Future<void> deleteBookNoteById(int id) async {
    await delete(
      table,
      where: 'id = ?',
      whereArgs: [id],
    );
    if (AnxPlatform.isWeb) {
      webNotes.removeWhere((n) => n.id == id);
      WebBridge.syncNotes();
    }
  }

  Future<List<BookNote>> searchBookNotes(String keyword) {
    final query = keyword.trim();
    if (query.isEmpty) {
      return Future.value(const []);
    }
    return searchBookNotesAdvanced(keyword: query, types: annotationTypes);
  }

  Future<List<BookNote>> searchBookNotesAdvanced({
    String? keyword,
    int? bookId,
    DateTime? from,
    DateTime? to,
    int? limit,
    List<String>? types,
  }) async {
    if (AnxPlatform.isWeb) {
      final filterTypes = types ?? annotationTypes;
      final q = keyword?.trim().toLowerCase();
      var list = webNotes.where((n) {
        if (filterTypes.isNotEmpty && !filterTypes.contains(n.type)) {
          return false;
        }
        if (bookId != null && n.bookId != bookId) {
          return false;
        }
        if (from != null && n.updateTime.isBefore(from)) {
          return false;
        }
        if (to != null && n.updateTime.isAfter(to)) {
          return false;
        }
        if (q != null && q.isNotEmpty) {
          final inContent = n.content.toLowerCase().contains(q);
          final inReaderNote =
              (n.readerNote ?? '').toLowerCase().contains(q);
          final inChapter = n.chapter.toLowerCase().contains(q);
          if (!inContent && !inReaderNote && !inChapter) {
            return false;
          }
        }
        return true;
      }).toList();
      list.sort((a, b) => b.updateTime.compareTo(a.updateTime));
      if (limit != null && list.length > limit) {
        list = list.sublist(0, limit);
      }
      return list;
    }

    final where = <String>[];
    final whereArgs = <Object?>[];
    final query = keyword?.trim();

    // Filter by types (defaults to annotation types if not specified)
    final filterTypes = types ?? annotationTypes;
    if (filterTypes.isNotEmpty) {
      where.add("type IN ('${filterTypes.join("', '")}')");
    }

    if (query != null && query.isNotEmpty) {
      where.add('(content LIKE ? OR reader_note LIKE ? OR chapter LIKE ?)');
      final pattern = '%$query%';
      whereArgs.addAll([pattern, pattern, pattern]);
    }

    if (bookId != null) {
      where.add('book_id = ?');
      whereArgs.add(bookId);
    }

    if (from != null) {
      where.add('update_time >= ?');
      whereArgs.add(from.toIso8601String());
    }

    if (to != null) {
      where.add('update_time <= ?');
      whereArgs.add(to.toIso8601String());
    }

    return queryList(
      table,
      mapper: BookNote.fromDb,
      where: where.isEmpty ? null : where.join(' AND '),
      whereArgs: whereArgs.isEmpty ? null : whereArgs,
      orderBy: 'update_time DESC',
      limit: limit,
    );
  }

  Future<BookNote?> selectRandomNote() async {
    if (AnxPlatform.isWeb) {
      final valid =
          webNotes.where((n) => annotationTypes.contains(n.type)).toList();
      if (valid.isEmpty) return null;
      return valid[Random().nextInt(valid.length)];
    }
    return rawQuerySingle(
      'SELECT * FROM $table WHERE $_typeFilter ORDER BY RANDOM() LIMIT 1',
      mapper: BookNote.fromDb,
    );
  }
}

final bookNoteDao = BookNoteDao();
