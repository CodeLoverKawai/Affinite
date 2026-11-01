import 'dart:convert';

import 'package:anx_reader/config/shared_preference_provider.dart';
import 'package:anx_reader/dao/base_dao.dart';
import 'package:anx_reader/l10n/generated/L10n.dart';
import 'package:anx_reader/main.dart';
import 'package:anx_reader/models/read_theme.dart';
import 'package:anx_reader/utils/platform_utils.dart';
import 'package:anx_reader/utils/toast/common.dart';

class ThemeDao extends BaseDao {
  ThemeDao();

  static const String table = 'tb_themes';
  static List<ReadTheme>? _webThemes;

  static List<ReadTheme> _getWebThemes() {
    if (_webThemes != null) return _webThemes!;
    try {
      final raw = Prefs().prefs.getString('anx_web_read_themes_v1');
      if (raw != null && raw.isNotEmpty) {
        final List<dynamic> decoded = jsonDecode(raw);
        _webThemes = decoded
            .map((e) => ReadTheme.fromDb(Map<String, dynamic>.from(e as Map)))
            .toList();
        if (_webThemes!.length >= 2) {
          return _webThemes!;
        }
      }
    } catch (_) {}
    _webThemes = [
      ReadTheme(
        id: 1,
        backgroundColor: 'fffbfbf3',
        textColor: 'ff343434',
        backgroundImagePath: '',
      ),
      ReadTheme(
        id: 2,
        backgroundColor: 'ff040404',
        textColor: 'fffeffeb',
        backgroundImagePath: '',
      ),
    ];
    return _webThemes!;
  }

  static void _saveWebThemes() {
    if (!AnxPlatform.isWeb || _webThemes == null) return;
    try {
      final jsonStr = jsonEncode(_webThemes!.map((t) => t.toMap()).toList());
      Prefs().prefs.setString('anx_web_read_themes_v1', jsonStr);
    } catch (_) {}
  }

  Future<int> insertTheme(ReadTheme readTheme) async {
    if (AnxPlatform.isWeb) {
      final list = _getWebThemes();
      final nextId = list.isEmpty
          ? 1
          : list.map((t) => t.id ?? 0).reduce((a, b) => a > b ? a : b) + 1;
      readTheme.id = nextId;
      list.add(readTheme);
      _saveWebThemes();
      return nextId;
    }
    return insert(table, readTheme.toMap());
  }

  Future<List<ReadTheme>> selectThemes() {
    if (AnxPlatform.isWeb) {
      return Future.value(List<ReadTheme>.from(_getWebThemes()));
    }
    return queryList(
      table,
      mapper: ReadTheme.fromDb,
    );
  }

  Future<void> deleteTheme(int id) async {
    if (AnxPlatform.isWeb) {
      final list = _getWebThemes();
      if (list.length <= 2) {
        AnxToast.show(
            L10n.of(navigatorKey.currentContext!).readingPageAtLeastTwoThemes);
        return;
      }
      list.removeWhere((t) => t.id == id);
      _saveWebThemes();
      return;
    }
    final currentThemes = await queryList(
      table,
      mapper: ReadTheme.fromDb,
    );
    if (currentThemes.length <= 2) {
      AnxToast.show(
          L10n.of(navigatorKey.currentContext!).readingPageAtLeastTwoThemes);
      return;
    }

    await delete(
      table,
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> updateTheme(ReadTheme readTheme) async {
    if (AnxPlatform.isWeb) {
      final list = _getWebThemes();
      final idx = list.indexWhere((t) => t.id == readTheme.id);
      if (idx != -1) {
        list[idx] = readTheme;
        _saveWebThemes();
      }
      return;
    }
    await update(
      table,
      readTheme.toMap(),
      where: 'id = ?',
      whereArgs: [readTheme.id],
    );
  }

  Future<ReadTheme> selectReadThemeById(int id) async {
    if (AnxPlatform.isWeb) {
      final list = _getWebThemes();
      return list.firstWhere(
        (t) => t.id == id,
        orElse: () => list.isNotEmpty
            ? list.first
            : ReadTheme(
                id: id,
                backgroundColor: 'fffbfbf3',
                textColor: 'ff343434',
                backgroundImagePath: '',
              ),
      );
    }
    final theme = await querySingle(
      table,
      mapper: ReadTheme.fromDb,
      where: 'id = ?',
      whereArgs: [id],
    );

    if (theme == null) {
      throw StateError('Theme with id $id not found');
    }
    return theme;
  }
}

final themeDao = ThemeDao();
