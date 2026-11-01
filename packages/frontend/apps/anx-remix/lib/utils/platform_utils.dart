import 'dart:io';

import 'package:flutter/foundation.dart';

enum AnxPlatformEnum { android, ios, macos, windows, ohos, linux }

class AnxPlatform {
  static AnxPlatformEnum get type {
    if (kIsWeb) {
      return AnxPlatformEnum.linux;
    }
    if (Platform.isAndroid) {
      return AnxPlatformEnum.android;
    }
    if (Platform.isIOS) {
      return AnxPlatformEnum.ios;
    }
    if (Platform.isMacOS) {
      return AnxPlatformEnum.macos;
    }
    if (Platform.isWindows) {
      return AnxPlatformEnum.windows;
    }
    if (Platform.isLinux) {
      return AnxPlatformEnum.linux;
    }
    try {
      if (Platform.operatingSystem == 'ohos') {
        return AnxPlatformEnum.ohos;
      }
    } catch (_) {
      // Platform.operatingSystem might throw if not available in some environments
    }
    throw UnsupportedError('Unsupported platform');
  }

  static bool get isWeb => kIsWeb;
  static bool get isAndroid => !kIsWeb && type == AnxPlatformEnum.android;
  static bool get isIOS => !kIsWeb && type == AnxPlatformEnum.ios;
  static bool get isMacOS => !kIsWeb && type == AnxPlatformEnum.macos;
  static bool get isWindows => !kIsWeb && type == AnxPlatformEnum.windows;
  static bool get isOhos => !kIsWeb && type == AnxPlatformEnum.ohos;
  static bool get isLinux => !kIsWeb && type == AnxPlatformEnum.linux;

  static bool get isMobile => isAndroid || isIOS || isOhos;

  static bool get isDesktop => isWindows || isMacOS || isLinux;
}
