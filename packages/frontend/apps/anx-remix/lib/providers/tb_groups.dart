import 'package:anx_reader/dao/database.dart';
import 'package:anx_reader/models/tb_group.dart';
import 'package:anx_reader/service/web_bridge.dart';
import 'package:anx_reader/utils/platform_utils.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'tb_groups.g.dart';

@riverpod
class GroupDao extends _$GroupDao {
  static List<TbGroup> webGroups = [];

  @override
  Future<List<TbGroup>> build() async {
    return await _getAllGroups();
  }

  Future<List<TbGroup>> _getAllGroups() async {
    if (AnxPlatform.isWeb) {
      return webGroups.where((g) => g.isDeleted == 0).toList();
    }
    final db = await DBHelper().database;
    final List<Map<String, dynamic>> maps = await db.query(
      'tb_groups',
      where: 'is_deleted = ?',
      whereArgs: [0],
    );
    return List.generate(maps.length, (i) {
      return TbGroup(
        id: maps[i]['id'],
        name: maps[i]['name'],
        parentId: maps[i]['parent_id'],
        isDeleted: maps[i]['is_deleted'],
        createTime: maps[i]['create_time'],
        updateTime: maps[i]['update_time'],
      );
    });
  }

  Future<TbGroup?> getGroup(int id) async {
    if (AnxPlatform.isWeb) {
      final found = webGroups.where((g) => g.id == id);
      return found.isEmpty ? null : found.first;
    }
    final db = await DBHelper().database;
    final List<Map<String, dynamic>> maps = await db.query(
      'tb_groups',
      where: 'id = ?',
      whereArgs: [id],
    );
    if (maps.isEmpty) {
      return null;
    }
    return TbGroup(
      id: maps[0]['id'],
      name: maps[0]['name'],
      parentId: maps[0]['parent_id'],
      isDeleted: maps[0]['is_deleted'],
      createTime: maps[0]['create_time'],
      updateTime: maps[0]['update_time'],
    );
  }

  Future<List<TbGroup>> getChildGroups(int parentId) async {
    if (AnxPlatform.isWeb) {
      return webGroups
          .where((g) => g.parentId == parentId && g.isDeleted == 0)
          .toList();
    }
    final db = await DBHelper().database;
    final List<Map<String, dynamic>> maps = await db.query(
      'tb_groups',
      where: 'parent_id = ? AND is_deleted = ?',
      whereArgs: [parentId, 0],
    );
    return List.generate(maps.length, (i) {
      return TbGroup(
        id: maps[i]['id'],
        name: maps[i]['name'],
        parentId: maps[i]['parent_id'],
        isDeleted: maps[i]['is_deleted'],
        createTime: maps[i]['create_time'],
        updateTime: maps[i]['update_time'],
      );
    });
  }

  Future<int> insertGroup(int groupId) async {
    final now = DateTime.now().toIso8601String();
    if (AnxPlatform.isWeb) {
      if (await getGroup(groupId) == null) {
        webGroups.add(TbGroup(
          id: groupId,
          name: '...',
          parentId: 0,
          isDeleted: 0,
          createTime: now,
          updateTime: now,
        ));
        WebBridge.syncGroups();
        ref.invalidateSelf();
        return groupId;
      }
      return 0;
    }
    final db = await DBHelper().database;
    // if not exists, insert a new group
    if (await getGroup(groupId) == null) {
      final id = await db.insert(
        'tb_groups',
        {
          'id': groupId,
          'name': "...",
          'parent_id': 0,
          'is_deleted': 0,
          'create_time': now,
          'update_time': now,
        },
      );
      ref.invalidateSelf();
      return id;
    }
    return 0;
  }

  Future<int> updateGroup(TbGroup group) async {
    final now = DateTime.now().toIso8601String();
    if (AnxPlatform.isWeb) {
      final idx = webGroups.indexWhere((g) => g.id == group.id);
      final updated = group.copyWith(updateTime: now);
      if (idx != -1) {
        webGroups[idx] = updated;
      } else {
        webGroups.add(updated);
      }
      WebBridge.syncGroups();
      ref.invalidateSelf();
      return 1;
    }
    final db = await DBHelper().database;
    final result = await db.update(
      'tb_groups',
      {
        'name': group.name,
        'parent_id': group.parentId,
        'is_deleted': group.isDeleted,
        'update_time': now,
      },
      where: 'id = ?',
      whereArgs: [group.id],
    );
    ref.invalidateSelf();
    return result;
  }

  Future<int> softDeleteGroup(int id) async {
    final now = DateTime.now().toIso8601String();
    if (AnxPlatform.isWeb) {
      final idx = webGroups.indexWhere((g) => g.id == id);
      if (idx != -1) {
        webGroups[idx] = webGroups[idx].copyWith(isDeleted: 1, updateTime: now);
        WebBridge.syncGroups();
      }
      ref.invalidateSelf();
      return 1;
    }
    final db = await DBHelper().database;
    final result = await db.update(
      'tb_groups',
      {
        'is_deleted': 1,
        'update_time': now,
      },
      where: 'id = ?',
      whereArgs: [id],
    );
    ref.invalidateSelf();
    return result;
  }

  Future<void> hardDeleteGroup(int id) async {
    if (AnxPlatform.isWeb) {
      webGroups.removeWhere((g) => g.id == id);
      WebBridge.syncGroups();
      ref.invalidateSelf();
      return;
    }
    final db = await DBHelper().database;
    await db.delete(
      'tb_groups',
      where: 'id = ?',
      whereArgs: [id],
    );
    ref.invalidateSelf();
  }

  Future<int> moveGroup(int id, int? newParentId) async {
    final now = DateTime.now().toIso8601String();
    if (AnxPlatform.isWeb) {
      final idx = webGroups.indexWhere((g) => g.id == id);
      if (idx != -1) {
        webGroups[idx] =
            webGroups[idx].copyWith(parentId: newParentId, updateTime: now);
        WebBridge.syncGroups();
      }
      ref.invalidateSelf();
      return 1;
    }
    final db = await DBHelper().database;
    final result = await db.update(
      'tb_groups',
      {
        'parent_id': newParentId,
        'update_time': now,
      },
      where: 'id = ?',
      whereArgs: [id],
    );
    ref.invalidateSelf();
    return result;
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
  }
}
