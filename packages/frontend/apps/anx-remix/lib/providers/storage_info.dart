import 'dart:io';

import 'package:anx_reader/models/storege_info_model.dart';
import 'package:anx_reader/providers/font_list.dart';
import 'package:anx_reader/utils/get_path/databases_path.dart';
import 'package:anx_reader/utils/get_path/get_base_path.dart';
import 'package:anx_reader/utils/get_path/get_cache_dir.dart';
import 'package:anx_reader/utils/get_path/log_file.dart';
import 'package:anx_reader/utils/log/common.dart';
import 'package:anx_reader/utils/platform_utils.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'storage_info.g.dart';

@riverpod
class StorageInfo extends _$StorageInfo {
  @override
  Future<StorageInfoModel> build() async {
    if (AnxPlatform.isWeb) {
      return StorageInfoModel(
        databaseSize: 0,
        booksSize: 0,
        fontSize: 0,
        cacheSize: 0,
        logSize: 0,
        coverSize: 0,
      );
    }
    return StorageInfoModel(
      databaseSize: await calculatePathSize(await getAnxDataBasesDir()),
      booksSize: await calculatePathSize(getFileDir()),
      fontSize: await calculatePathSize(getFontDir()),
      cacheSize: await calculatePathSize(
        await getAnxCacheDir(),
        recursive: true,
      ),
      logSize: await calsulateFileSize(await getLogFile()),
      coverSize: await calculatePathSize(getCoverDir()),
    );
  }

  Future<bool> clearCache() async {
    if (AnxPlatform.isWeb) return true;
    try {
      final cacheDir = await getAnxCacheDir();
      if (!cacheDir.existsSync()) {
        return true;
      }

      final entities = await cacheDir.list(recursive: true).toList();
      for (var entity in entities) {
        if (entity.existsSync()) {
          if (entity is File) {
            entity.deleteSync();
          } else if (entity is Directory) {
            entity.deleteSync(recursive: true);
          }
        }
      }

      state = AsyncData(await build());

      return true;
    } catch (e) {
      AnxLog.severe('StorageInfo clearCache error: $e');
      return false;
    }
  }

  Future<int> calculatePathSize(Directory dir, {bool recursive = false}) async {
    if (AnxPlatform.isWeb || !dir.existsSync()) {
      return 0;
    }

    int totalSize = 0;
    final entities = await dir.list(recursive: recursive).toList();
    for (var entity in entities) {
      if (entity is File) {
        totalSize += await entity.length();
      }
    }

    return totalSize;
  }

  Future<int> calsulateFileSize(File file) async {
    if (AnxPlatform.isWeb) return 0;
    return await file.length();
  }

  Future<List<File>> listBookFiles() async {
    if (AnxPlatform.isWeb) return [];
    final fileDir = getFileDir();
    if (!fileDir.existsSync()) {
      return [];
    }

    final files = <File>[];
    final entities = await fileDir.list(recursive: true).toList();
    for (var entity in entities) {
      if (entity is File) {
        files.add(entity);
      }
    }

    return files;
  }

  Future<List<File>> listFontFiles() async {
    if (AnxPlatform.isWeb) return [];
    final fontDir = getFontDir();
    if (!fontDir.existsSync()) {
      return [];
    }

    final files = <File>[];
    final entities = await fontDir.list(recursive: true).toList();
    for (var entity in entities) {
      if (entity is File) {
        files.add(entity);
      }
    }

    return files;
  }

  Future<List<File>> listCoverFiles() async {
    if (AnxPlatform.isWeb) return [];
    final coverDir = getCoverDir();
    if (!coverDir.existsSync()) {
      return [];
    }

    final files = <File>[];
    final entities = await coverDir.list(recursive: true).toList();
    for (var entity in entities) {
      if (entity is File) {
        files.add(entity);
      }
    }

    return files;
  }

  Future<void> deleteFile(File file) async {
    if (AnxPlatform.isWeb) return;
    await file.delete();
    state = AsyncData(await build());
    ref.watch(fontListProvider.notifier).refresh();
  }
}
