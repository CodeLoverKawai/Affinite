import 'dart:convert';
import 'dart:ui';

import 'package:anx_reader/config/shared_preference_provider.dart';
import 'package:anx_reader/dao/base_dao.dart';
import 'package:anx_reader/models/tag.dart';
import 'package:anx_reader/service/web_bridge.dart';
import 'package:anx_reader/utils/platform_utils.dart';

const _stylesTable = 'tb_styles';
const _tagSentinel = 1.0;
const _relationSentinel = 2.0;

class TagDao extends BaseDao {
  static List<Tag> webTags = [];
  static List<BookTag> webBookTags = [];
  static bool _loadedFromPrefs = false;

  static void ensureLoaded() {
    if (!AnxPlatform.isWeb || _loadedFromPrefs) return;
    _loadedFromPrefs = true;
    try {
      final rawTags = Prefs().prefs.getString('anx_web_tags_v1');
      if (rawTags != null && rawTags.isNotEmpty && webTags.isEmpty) {
        final List<dynamic> decoded = jsonDecode(rawTags);
        webTags = decoded.map((item) {
          final map = Map<String, dynamic>.from(item as Map);
          final colorVal = map['color'] as int?;
          return Tag(
            id: (map['id'] as num).toInt(),
            name: map['name']?.toString() ?? '',
            color: colorVal == null ? null : Color(0xFF000000 | (colorVal & 0x00FFFFFF)),
          );
        }).toList();
      }
      final rawRels = Prefs().prefs.getString('anx_web_book_tags_v1');
      if (rawRels != null && rawRels.isNotEmpty && webBookTags.isEmpty) {
        final List<dynamic> decoded = jsonDecode(rawRels);
        webBookTags = decoded.map((item) {
          final map = Map<String, dynamic>.from(item as Map);
          return BookTag(
            id: (map['id'] as num?)?.toInt() ?? 1,
            bookId: (map['bookId'] as num).toInt(),
            tagId: (map['tagId'] as num).toInt(),
          );
        }).toList();
      }
    } catch (_) {}
  }

  static void persistWebTags({bool notifyBridge = true}) {
    if (!AnxPlatform.isWeb) return;
    try {
      final tagsJson = jsonEncode(webTags
          .map((t) => {
                'id': t.id,
                'name': t.name,
                'color': t.color != null ? (t.color!.toARGB32() & 0x00FFFFFF) : null,
              })
          .toList());
      final relsJson = jsonEncode(webBookTags
          .map((r) => {
                'id': r.id,
                'bookId': r.bookId,
                'tagId': r.tagId,
              })
          .toList());
      Prefs().prefs.setString('anx_web_tags_v1', tagsJson);
      Prefs().prefs.setString('anx_web_book_tags_v1', relsJson);
      if (notifyBridge) {
        WebBridge.syncTags();
      }
    } catch (_) {}
  }

  Future<List<Tag>> fetchAllTags() async {
    if (AnxPlatform.isWeb) {
      ensureLoaded();
      final sorted = List<Tag>.from(webTags)
        ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
      return sorted;
    }
    return queryList(
      _stylesTable,
      mapper: Tag.fromDb,
      where: 'ABS(font_size - ?) < 0.0001 AND font_family IS NOT NULL',
      whereArgs: [_tagSentinel],
      orderBy: 'LOWER(font_family) ASC',
    );
  }

  Future<Tag?> getTagById(int id) async {
    if (AnxPlatform.isWeb) {
      ensureLoaded();
      return webTags.cast<Tag?>().firstWhere((t) => t?.id == id, orElse: () => null);
    }
    return querySingle(
      _stylesTable,
      mapper: Tag.fromDb,
      where: 'id = ? AND ABS(font_size - ?) < 0.0001',
      whereArgs: [id, _tagSentinel],
    );
  }

  Future<Tag?> getTagByName(String name) async {
    if (AnxPlatform.isWeb) {
      ensureLoaded();
      final lower = name.trim().toLowerCase();
      return webTags
          .cast<Tag?>()
          .firstWhere((t) => t?.name.toLowerCase() == lower, orElse: () => null);
    }
    return rawQuerySingle(
      '''
      SELECT * FROM $_stylesTable 
      WHERE ABS(font_size - ?) < 0.0001 AND LOWER(font_family) = LOWER(?) 
      LIMIT 1
      ''',
      arguments: [_tagSentinel, name],
      mapper: Tag.fromDb,
    );
  }

  Future<int> insertTag(String name, {int? color}) async {
    final sanitizedColor = color == null ? null : (color & 0x00FFFFFF);
    if (AnxPlatform.isWeb) {
      ensureLoaded();
      final existing = await getTagByName(name);
      if (existing != null) {
        return existing.id;
      }
      final nextId = webTags.isEmpty
          ? 1
          : webTags.map((t) => t.id).reduce((a, b) => a > b ? a : b) + 1;
      webTags.add(Tag(
        id: nextId,
        name: name.trim(),
        color: sanitizedColor == null ? null : Color(0xFF000000 | sanitizedColor),
      ));
      persistWebTags();
      return nextId;
    }
    final db = await database;
    return db.transaction((txn) async {
      final existing = await txn.rawQuery(
        '''
        SELECT id FROM $_stylesTable 
        WHERE ABS(font_size - ?) < 0.0001 AND LOWER(font_family) = LOWER(?) 
        LIMIT 1
        ''',
        [_tagSentinel, name],
      );
      if (existing.isNotEmpty) {
        return existing.first['id'] as int;
      }
      return txn.insert(_stylesTable, {
        'font_size': _tagSentinel,
        'font_family': name,
        if (sanitizedColor != null) 'line_height': sanitizedColor.toDouble(),
      });
    });
  }

  Future<void> updateTag(int id, {String? newName, int? color}) async {
    final sanitizedColor = color == null ? null : (color & 0x00FFFFFF);
    if (AnxPlatform.isWeb) {
      ensureLoaded();
      final idx = webTags.indexWhere((t) => t.id == id);
      if (idx != -1) {
        final current = webTags[idx];
        webTags[idx] = Tag(
          id: current.id,
          name: newName?.trim() ?? current.name,
          color: sanitizedColor != null
              ? Color(0xFF000000 | sanitizedColor)
              : current.color,
        );
        persistWebTags();
      }
      return;
    }
    await update(
      _stylesTable,
      {
        if (newName != null) 'font_family': newName,
        if (sanitizedColor != null) 'line_height': sanitizedColor.toDouble(),
      },
      where: 'id = ? AND ABS(font_size - ?) < 0.0001',
      whereArgs: [id, _tagSentinel],
    );
  }

  Future<void> deleteTag(int id) async {
    if (AnxPlatform.isWeb) {
      ensureLoaded();
      webTags.removeWhere((t) => t.id == id);
      webBookTags.removeWhere((r) => r.tagId == id);
      persistWebTags();
      return;
    }
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete(
        _stylesTable,
        where: 'id = ? AND ABS(font_size - ?) < 0.0001',
        whereArgs: [id, _tagSentinel],
      );
      await txn.delete(
        _stylesTable,
        where:
            'ABS(font_size - ?) < 0.0001 AND CAST(letter_spacing AS INTEGER) = ?',
        whereArgs: [_relationSentinel, id],
      );
    });
  }
}

class BookTagDao extends BaseDao {
  Future<List<BookTag>> fetchRelationsForBook(int bookId) async {
    if (AnxPlatform.isWeb) {
      TagDao.ensureLoaded();
      return TagDao.webBookTags.where((r) => r.bookId == bookId).toList();
    }
    return queryList(
      _stylesTable,
      mapper: BookTag.fromDb,
      where: 'ABS(font_size - ?) < 0.0001 AND CAST(line_height AS INTEGER) = ?',
      whereArgs: [_relationSentinel, bookId],
    );
  }

  Future<List<int>> fetchBookIdsForTag(int tagId) async {
    if (AnxPlatform.isWeb) {
      TagDao.ensureLoaded();
      return TagDao.webBookTags
          .where((r) => r.tagId == tagId)
          .map((r) => r.bookId)
          .toList();
    }
    final rows = await rawQueryList(
      'SELECT line_height FROM $_stylesTable WHERE ABS(font_size - ?) < 0.0001 AND CAST(letter_spacing AS INTEGER) = ?',
      arguments: [_relationSentinel, tagId],
      mapper: (row) => (row['line_height'] as num? ?? 0).toInt(),
    );
    return rows;
  }

  Future<List<int>> fetchTagIdsForBook(int bookId) async {
    final relations = await fetchRelationsForBook(bookId);
    return relations.map((r) => r.tagId).toList(growable: false);
  }

  Future<List<Tag>> fetchTagsForBook(int bookId) async {
    final tagIds = await fetchTagIdsForBook(bookId);
    if (tagIds.isEmpty) return const [];
    if (AnxPlatform.isWeb) {
      TagDao.ensureLoaded();
      return TagDao.webTags.where((t) => tagIds.contains(t.id)).toList();
    }
    final placeholders = List.filled(tagIds.length, '?').join(',');
    return rawQueryList(
      '''
      SELECT * FROM $_stylesTable 
      WHERE ABS(font_size - ?) < 0.0001 AND id IN ($placeholders)
      ''',
      arguments: [_tagSentinel, ...tagIds],
      mapper: Tag.fromDb,
    );
  }

  Future<void> addRelation({required int bookId, required int tagId}) async {
    if (AnxPlatform.isWeb) {
      TagDao.ensureLoaded();
      final exists = TagDao.webBookTags
          .any((r) => r.bookId == bookId && r.tagId == tagId);
      if (exists) return;
      final nextId = TagDao.webBookTags.isEmpty
          ? 1
          : TagDao.webBookTags.map((r) => r.id).reduce((a, b) => a > b ? a : b) + 1;
      TagDao.webBookTags.add(BookTag(id: nextId, bookId: bookId, tagId: tagId));
      TagDao.persistWebTags();
      return;
    }
    final db = await database;
    await db.transaction((txn) async {
      final exists = await txn.rawQuery(
        '''
        SELECT id FROM $_stylesTable 
        WHERE ABS(font_size - ?) < 0.0001 
          AND CAST(line_height AS INTEGER) = ? 
          AND CAST(letter_spacing AS INTEGER) = ? 
        LIMIT 1
        ''',
        [_relationSentinel, bookId, tagId],
      );
      if (exists.isNotEmpty) return;
      await txn.insert(_stylesTable, {
        'font_size': _relationSentinel,
        'line_height': bookId.toDouble(),
        'letter_spacing': tagId.toDouble(),
      });
    });
  }

  Future<void> removeRelation({required int bookId, required int tagId}) async {
    if (AnxPlatform.isWeb) {
      TagDao.ensureLoaded();
      TagDao.webBookTags
          .removeWhere((r) => r.bookId == bookId && r.tagId == tagId);
      TagDao.persistWebTags();
      return;
    }
    await delete(
      _stylesTable,
      where:
          'ABS(font_size - ?) < 0.0001 AND CAST(line_height AS INTEGER) = ? AND CAST(letter_spacing AS INTEGER) = ?',
      whereArgs: [_relationSentinel, bookId, tagId],
    );
  }

  Future<Map<int, List<int>>> bookIdToTagIds({List<int>? bookIds}) async {
    if (AnxPlatform.isWeb) {
      TagDao.ensureLoaded();
      final map = <int, List<int>>{};
      for (final rel in TagDao.webBookTags) {
        if (bookIds == null || bookIds.isEmpty || bookIds.contains(rel.bookId)) {
          map.putIfAbsent(rel.bookId, () => []).add(rel.tagId);
        }
      }
      return map;
    }
    final buffer = StringBuffer(
        'SELECT id, line_height, letter_spacing FROM $_stylesTable WHERE ABS(font_size - ?) < 0.0001');
    final args = <Object?>[_relationSentinel];
    if (bookIds != null && bookIds.isNotEmpty) {
      final placeholders = List.filled(bookIds.length, '?').join(',');
      buffer.write(' AND CAST(line_height AS INTEGER) IN ($placeholders)');
      args.addAll(bookIds);
    }
    final rows = await rawQueryList(
      buffer.toString(),
      arguments: args,
      mapper: BookTag.fromDb,
    );
    final map = <int, List<int>>{};
    for (final rel in rows) {
      map.putIfAbsent(rel.bookId, () => []).add(rel.tagId);
    }
    return map;
  }
}

final tagDao = TagDao();
final bookTagDao = BookTagDao();
