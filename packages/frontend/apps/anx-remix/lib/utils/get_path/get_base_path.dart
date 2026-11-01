import 'dart:io';
import 'package:anx_reader/config/shared_preference_provider.dart';
import 'package:anx_reader/utils/log/common.dart';
import 'package:anx_reader/utils/platform_utils.dart';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

String documentPath = '';

/// Check if a path is accessible (can read and write)
Future<bool> _isPathAccessible(String path) async {
  try {
    final dir = Directory(path);
    if (!dir.existsSync()) return false;

    // Try to create and delete a test file to verify write permission
    final testFile = File('$path${Platform.pathSeparator}.anx_permission_test');
    await testFile.writeAsString('test');
    await testFile.delete();
    return true;
  } catch (e) {
    AnxLog.warning('Path not accessible: $path, error: $e');
    return false;
  }
}

Future<String> getAnxDocumentsPath() async {
  // Windows & Linux: Check for custom storage path first
  if (AnxPlatform.isWindows || AnxPlatform.isLinux) {
    final customPath = Prefs().customStoragePath;
    if (customPath != null) {
      // Verify the path is still accessible (permission may have been revoked)
      if (await _isPathAccessible(customPath)) {
        return customPath;
      } else {
        // Permission lost, clear the custom path
        AnxLog.warning(
            'Custom storage path no longer accessible, resetting to default');
        Prefs().customStoragePath = null;
      }
    }
  }

  final directory = await getApplicationDocumentsDirectory();
  switch (AnxPlatform.type) {
    case AnxPlatformEnum.android:
    case AnxPlatformEnum.ohos:
      return directory.path;
    case AnxPlatformEnum.windows:
      return (await getApplicationSupportDirectory()).path;
    case AnxPlatformEnum.macos:
      return (await getApplicationSupportDirectory()).path;
    case AnxPlatformEnum.ios:
      return (await getApplicationSupportDirectory()).path;
    case AnxPlatformEnum.linux:
      return (await getApplicationSupportDirectory()).path;
  }
}

Future<Directory> getAnxDocumentDir() async {
  return Directory(await getAnxDocumentsPath());
}

void initBasePath() async {
  if (AnxPlatform.isWeb) {
    documentPath = '';
    return;
  }
  Directory appDocDir = await getAnxDocumentDir();
  documentPath = appDocDir.path;
  debugPrint('documentPath: $documentPath');
  final fileDir = getFileDir();
  final coverDir = getCoverDir();
  final fontDir = getFontDir();
  final bgimgDir = getBgimgDir();
  if (!fileDir.existsSync()) {
    fileDir.createSync(recursive: true);
  }
  if (!coverDir.existsSync()) {
    coverDir.createSync(recursive: true);
  }
  if (!fontDir.existsSync()) {
    fontDir.createSync(recursive: true);
  }
  if (!bgimgDir.existsSync()) {
    bgimgDir.createSync(recursive: true);
  }
}

String getBasePath(String path) {
  if (AnxPlatform.isWeb) {
    return path;
  }
  // the path that in database using "/"
  path.replaceAll("/", Platform.pathSeparator);
  return '$documentPath${Platform.pathSeparator}$path';
}

String get _sep => AnxPlatform.isWeb ? '/' : Platform.pathSeparator;

Directory getFontDir({String? path}) {
  path ??= documentPath;
  return Directory('$path${_sep}font');
}

Directory getCoverDir({String? path}) {
  path ??= documentPath;
  return Directory('$path${_sep}cover');
}

Directory getFileDir({String? path}) {
  path ??= documentPath;
  return Directory('$path${_sep}file');
}

Directory getBgimgDir({String? path}) {
  path ??= documentPath;
  return Directory('$path${_sep}bgimg');
}
