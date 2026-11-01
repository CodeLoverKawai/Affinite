import 'dart:io';

import 'package:anx_reader/dao/book.dart';
import 'package:anx_reader/enums/sync_direction.dart';
import 'package:anx_reader/models/book.dart';
import 'package:anx_reader/models/sync_status.dart';
import 'package:anx_reader/providers/sync.dart';
import 'package:anx_reader/utils/get_path/get_base_path.dart';
import 'package:anx_reader/utils/log/common.dart';
import 'package:anx_reader/utils/platform_utils.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'sync_status.g.dart';

@Riverpod(keepAlive: true)
class SyncStatus extends _$SyncStatus {
  List<Book> allBooksInBookShelf = [];
  @override
  Future<SyncStatusModel> build() async {
    allBooksInBookShelf = await _listAllBooksInBookShelf();
    final allBooksInBookShelfIds =
        allBooksInBookShelf.map((e) => e.id).toList();
    if (AnxPlatform.isWeb) {
      return SyncStatusModel(
        localOnly: const [],
        remoteOnly: const [],
        both: allBooksInBookShelfIds,
        nonExistent: const [],
        downloading: const [],
        uploading: const [],
      );
    }
    final remoteFiles = await _listRemoteFiles(allBooksInBookShelf);
    final localFiles = await _listLocalFiles(allBooksInBookShelf);

    final localOnly =
        localFiles.where((e) => !remoteFiles.contains(e)).toList();
    final remoteOnly =
        remoteFiles.where((e) => !localFiles.contains(e)).toList();
    final both = localFiles.where((e) => remoteFiles.contains(e)).toList();
    final nonExistent = allBooksInBookShelfIds
        .where((e) => !localFiles.contains(e) && !remoteFiles.contains(e))
        .toList();
    final webdavInfo = ref.read(syncProvider);

    final isSyncing = ref.read(syncProvider.select((value) => value.isSyncing));

    List<int> downloading = isSyncing &&
            webdavInfo.direction == SyncDirection.download &&
            !webdavInfo.fileName.endsWith('.db')
        ? [
            allBooksInBookShelf
                .firstWhere((e) => e.filePath.contains(webdavInfo.fileName))
                .id
          ]
        : [];
    List<int> uploading = isSyncing &&
            webdavInfo.direction == SyncDirection.upload &&
            !webdavInfo.fileName.endsWith('.db')
        ? [
            allBooksInBookShelf
                .firstWhere((e) => e.filePath.contains(webdavInfo.fileName))
                .id
          ]
        : [];
    return SyncStatusModel(
      localOnly: localOnly,
      remoteOnly: remoteOnly,
      both: both,
      nonExistent: nonExistent,
      downloading: downloading,
      uploading: uploading,
    );
  }

  Future<void> refresh() async {
    state = AsyncData(await build());
  }

  Future<List<int>> _listRemoteFiles(List<Book> books) async {
    if (AnxPlatform.isWeb) return [];
    Future<List<int>> core() async {
      final remoteFiles =
          await ref.read(syncProvider.notifier).listRemoteBookFiles();
      final remoteFilesIds = books
          .map((e) {
            final filePath = e.filePath.split('/').last;
            final isExist = remoteFiles.contains(filePath);
            return isExist ? e.id : null;
          })
          .whereType<int>()
          .toList();
      return remoteFilesIds;
    }

    int count = 0;
    const maxCount = 2;
    while (true) {
      try {
        return await core();
      } catch (e) {
        AnxLog.info(
            'Webdav: Failed to list remote files: $e try again $count/$maxCount');
        count++;
        if (count >= maxCount) {
          AnxLog.info('Webdav: Failed to list remote files: $e');
          return [];
        }
      }
    }
  }

  Future<List<int>> _listLocalFiles(List<Book> books) async {
    if (AnxPlatform.isWeb) return books.map((e) => e.id).toList();
    final localFiles = (await getFileDir().list().toList())
        .map((e) => e.path.split(Platform.pathSeparator).last)
        .toList();

    final localFilesIds = books
        .map((e) {
          final filePath = e.filePath.split('/').last;
          final isExist = localFiles.contains(filePath);
          return isExist ? e.id : null;
        })
        .whereType<int>()
        .toList();
    return localFilesIds;
  }

  Future<List<Book>> _listAllBooksInBookShelf() async {
    return await bookDao.selectNotDeleteBooks();
  }

  Future<int?> pathToBookId(String filePath) async {
    if (filePath.endsWith('.db') || filePath.contains('.json') || filePath.contains('.mdx')) {
      return null;
    }
    try {
      return allBooksInBookShelf
          .firstWhere((e) => filePath.contains(e.filePath))
          .id;
    } catch (e) {
      allBooksInBookShelf = await _listAllBooksInBookShelf();
      try {
        return allBooksInBookShelf
            .firstWhere((e) => filePath.contains(e.filePath))
            .id;
      } catch (_) {
        return null;
      }
    }
  }

  bool isCover(String filePath) {
    return filePath.contains("/cover/");
  }

  Future<void> addDownloading(String filePath) async {
    if (isCover(filePath)) {
      return;
    }
    final bookId = await pathToBookId(filePath);
    if (bookId == null || state.value == null) {
      return;
    }
    state = AsyncData(
      SyncStatusModel(
        localOnly: state.value!.localOnly,
        remoteOnly: state.value!.remoteOnly,
        both: state.value!.both,
        nonExistent: state.value!.nonExistent,
        downloading: [...state.value!.downloading, bookId],
        uploading: state.value!.uploading,
      ),
    );
  }

  Future<void> addUploading(String filePath) async {
    if (isCover(filePath)) {
      return;
    }
    final bookId = await pathToBookId(filePath);
    if (bookId == null || state.value == null) {
      return;
    }
    state = AsyncData(
      SyncStatusModel(
        localOnly: state.value!.localOnly,
        remoteOnly: state.value!.remoteOnly,
        both: state.value!.both,
        nonExistent: state.value!.nonExistent,
        downloading: state.value!.downloading,
        uploading: [...state.value!.uploading, bookId],
      ),
    );
  }

  Future<void> removeDownloading(String filePath) async {
    if (isCover(filePath)) {
      return;
    }
    final bookId = await pathToBookId(filePath);
    if (bookId == null || state.value == null) {
      return;
    }
    state = AsyncData(
      SyncStatusModel(
        localOnly: state.value!.localOnly,
        remoteOnly: state.value!.remoteOnly,
        both: [...state.value!.both, bookId],
        nonExistent: state.value!.nonExistent,
        downloading:
            state.value!.downloading.where((e) => e != bookId).toList(),
        uploading: state.value!.uploading,
      ),
    );
    ref.invalidateSelf();
  }

  Future<void> removeUploading(String filePath) async {
    if (isCover(filePath)) {
      return;
    }
    final bookId = await pathToBookId(filePath);
    if (bookId == null || state.value == null) {
      return;
    }
    state = AsyncData(
      SyncStatusModel(
        localOnly: state.value!.localOnly,
        remoteOnly: state.value!.remoteOnly,
        both: [...state.value!.both, bookId],
        nonExistent: state.value!.nonExistent,
        downloading: state.value!.downloading,
        uploading: state.value!.uploading.where((e) => e != bookId).toList(),
      ),
    );
    ref.invalidateSelf();
  }
}
