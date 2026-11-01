import 'package:anx_reader/dao/database.dart';
import 'package:anx_reader/models/dictionary.dart';

class DictionaryDao {
  Future<int> insert(DictionaryModel dictionary) async {
    final db = await DBHelper().database;
    return await db.insert('tb_dictionaries', dictionary.toMap());
  }

  Future<void> update(DictionaryModel dictionary) async {
    if (dictionary.id == null) return;
    final db = await DBHelper().database;
    await db.update(
      'tb_dictionaries',
      dictionary.toMap(),
      where: 'id = ?',
      whereArgs: [dictionary.id],
    );
  }

  Future<void> delete(int id) async {
    final db = await DBHelper().database;
    await db.delete(
      'tb_dictionaries',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<List<DictionaryModel>> selectAll() async {
    final db = await DBHelper().database;
    final List<Map<String, dynamic>> maps =
        await db.query('tb_dictionaries', orderBy: 'created_at DESC');
    return List.generate(maps.length, (i) => DictionaryModel.fromMap(maps[i]));
  }

  Future<DictionaryModel?> getActive() async {
    final db = await DBHelper().database;
    final List<Map<String, dynamic>> maps = await db.query(
      'tb_dictionaries',
      where: 'is_active = 1',
      limit: 1,
    );
    if (maps.isEmpty) return null;
    return DictionaryModel.fromMap(maps.first);
  }

  Future<void> setActive(int id) async {
    final db = await DBHelper().database;
    await db.transaction((txn) async {
      await txn.update(
        'tb_dictionaries',
        {'is_active': 0},
      );
      await txn.update(
        'tb_dictionaries',
        {'is_active': 1},
        where: 'id = ?',
        whereArgs: [id],
      );
    });
  }
}

final dictionaryDao = DictionaryDao();
