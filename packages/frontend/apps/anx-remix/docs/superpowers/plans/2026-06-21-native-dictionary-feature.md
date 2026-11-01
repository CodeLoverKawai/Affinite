# Native Dictionary Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a native offline (MDict `.mdx` files) and online (Wiktionary API fallback) Dictionary feature in ANX Reader with panel-based lookup UI, along with a fix for single-word selection context menus on Linux and Android.

**Architecture:** We will use a database table `tb_dictionaries` to store imported dictionaries and track the active one, upgrading the DB version to `8`. A singleton service `DictionaryService` caches the reader instance for the active `.mdx` file or falls back to querying the Wiktionary REST API via `Dio`.

**Tech Stack:** Dart, Flutter, SQLite (sqflite), `dict_reader: ^0.1.2`, `dio: ^5.4.3+1`, `flutter_html: ^3.0.0-beta.2`, `path_provider`, `file_picker`.

---

### Task 1: Add Pub Dependency

**Files:**
- Modify: [pubspec.yaml](file:///home/rousseau/anx-reader/pubspec.yaml:26-30)

- [ ] **Step 1: Add dict_reader dependency**
  Modify `pubspec.yaml` to add `dict_reader: ^0.1.2` right below `flutter_colorpicker: ^1.0.3`.

  ```yaml
    flutter_colorpicker: ^1.0.3
    dict_reader: ^0.1.2
  ```

- [ ] **Step 2: Install dependencies**
  Run: `flutter pub get`
  Expected: Command finishes successfully with exit code 0.

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add pubspec.yaml
  git commit -m "feat(dict): add dict_reader package to pubspec.yaml"
  ```

---

### Task 2: Database Migration & Schema Upgrade

**Files:**
- Modify: [database.dart](file:///home/rousseau/anx-reader/lib/dao/database.dart:16-17,420-435)

- [ ] **Step 1: Increment currentDbVersion to 8**
  Modify `lib/dao/database.dart` line 16 to set `currentDbVersion` to `8`.

  ```dart
  // Current app database version
  const int currentDbVersion = 8;
  ```

- [ ] **Step 2: Add migration case for version 7 -> 8**
  Modify `lib/dao/database.dart` inside `onUpgradeDatabase` method:
  1. Add `continue case7;` at the end of `case 6`.
  2. Implement `case7:` / `case 7:` to create the `tb_dictionaries` table.

  ```dart
        // Create groups for existing group_ids
        for (var i = 0; i < uniqueGroups.length; i++) {
          final groupId = uniqueGroups[i]['group_id'];
          await db.execute('''
            INSERT INTO tb_groups (id, name, parent_id, create_time, update_time)
            VALUES (?, '...', 0, datetime('now'), datetime('now'))
          ''', [groupId]);
        }
        continue case7;
      case7:
      case 7:
        await db.execute('''
          CREATE TABLE tb_dictionaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
          )
        ''');
  ```

- [ ] **Step 3: Verify build and compile**
  Run: `flutter pub run build_runner build --delete-conflicting-outputs` (if needed) or run a simple build test.
  Expected: Compiles with no errors.

- [ ] **Step 4: Commit**
  Run:
  ```bash
  git add lib/dao/database.dart
  git commit -m "feat(dict): database migration for tb_dictionaries table (v8)"
  ```

---

### Task 3: Create Dictionary Model and DAO

**Files:**
- Create: [dictionary.dart](file:///home/rousseau/anx-reader/lib/models/dictionary.dart)
- Create: [dictionary.dart](file:///home/rousseau/anx-reader/lib/dao/dictionary.dart)

- [ ] **Step 1: Write DictionaryModel**
  Create `lib/models/dictionary.dart` to represent the SQLite dictionary data.

  ```dart
  class DictionaryModel {
    int? id;
    String name;
    String path;
    bool isActive;
    DateTime createdAt;

    DictionaryModel({
      this.id,
      required this.name,
      required this.path,
      required this.isActive,
      required this.createdAt,
    });

    Map<String, dynamic> toMap() {
      return {
        if (id != null) 'id': id,
        'name': name,
        'path': path,
        'is_active': isActive ? 1 : 0,
        'created_at': createdAt.toIso8601String(),
      };
    }

    factory DictionaryModel.fromMap(Map<String, dynamic> map) {
      return DictionaryModel(
        id: map['id'] as int?,
        name: map['name'] as String,
        path: map['path'] as String,
        isActive: (map['is_active'] as int) == 1,
        createdAt: DateTime.parse(map['created_at'] as String),
      );
    }
  }
  ```

- [ ] **Step 2: Write DictionaryDao**
  Create `lib/dao/dictionary.dart` to perform CRUD operations on `tb_dictionaries`.

  ```dart
  import 'package:anx_reader/dao/database.dart';
  import 'package:anx_reader/models/dictionary.dart';
  import 'package:sqflite/sqflite.dart';

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
  ```

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add lib/models/dictionary.dart lib/dao/dictionary.dart
  git commit -m "feat(dict): create DictionaryModel and DictionaryDao"
  ```

---

### Task 4: Create Dictionary Service & Fallback REST Client

**Files:**
- Create: [dictionary_service.dart](file:///home/rousseau/anx-reader/lib/service/dictionary/dictionary_service.dart)

- [ ] **Step 1: Write DictionaryService**
  Create `lib/service/dictionary/dictionary_service.dart` to implement on-demand `DictReader` loading, caching, normalization, and Wiktionary fallback parsing with context examples.

  ```dart
  import 'dart:convert';
  import 'package:anx_reader/dao/dictionary.dart';
  import 'package:anx_reader/models/dictionary.dart';
  import 'package:dict_reader/dict_reader.dart';
  import 'package:dio/dio.dart';

  class DictionaryService {
    static final DictionaryService _instance = DictionaryService._internal();
    factory DictionaryService() => _instance;
    DictionaryService._internal();

    DictReader? _cachedReader;
    int? _cachedDictionaryId;
    final Dio _dio = Dio();

    Future<void> clearCache() async {
      _cachedReader = null;
      _cachedDictionaryId = null;
    }

    Future<String?> lookup(String word, {String? bookLanguage}) async {
      final normalizedWord = word.trim().toLowerCase();
      if (normalizedWord.isEmpty) return null;

      try {
        final activeDict = await dictionaryDao.getActive();
        if (activeDict != null) {
          if (_cachedReader == null || _cachedDictionaryId != activeDict.id) {
            _cachedReader = DictReader(activeDict.path);
            _cachedDictionaryId = activeDict.id;
          }
          final result = await _cachedReader!.lookUp(normalizedWord);
          if (result != null && result.isNotEmpty) {
            return result;
          }
        }
      } catch (e) {
        // Offline lookup failed or file error, fallback to online
      }

      // Fallback to online Wiktionary REST API
      return await _lookupWiktionary(normalizedWord, bookLanguage);
    }

    Future<String?> _lookupWiktionary(String word, String? bookLanguage) async {
      final lang = (bookLanguage != null && bookLanguage.length >= 2)
          ? bookLanguage.substring(0, 2).toLowerCase()
          : 'en';

      final url = 'https://$lang.wiktionary.org/api/rest_v1/page/definition/$word';

      try {
        final response = await _dio.get(url);
        if (response.statusCode == 200) {
          final data = response.data;
          if (data is Map<String, dynamic>) {
            return _formatWiktionaryHtml(word, data);
          }
        }
      } catch (e) {
        // If book language search failed and language is not English, try English as fallback
        if (lang != 'en') {
          return await _lookupWiktionary(word, 'en');
        }
      }
      return null;
    }

    String _formatWiktionaryHtml(String word, Map<String, dynamic> data) {
      final entries = data.values.expand((element) {
        if (element is List) return element;
        return [];
      }).toList();

      if (entries.isEmpty) return '';

      final sb = StringBuffer();
      sb.write('<div style="font-family: sans-serif; padding: 10px;">');
      sb.write('<h2 style="font-size: 1.5em; margin-bottom: 5px;">$word</h2>');

      for (final entry in entries) {
        if (entry is! Map<String, dynamic>) continue;
        final partOfSpeech = entry['partOfSpeech']?.toString() ?? 'Word';
        final definitionsList = entry['definitions'];

        sb.write('<div style="margin-top: 15px;">');
        sb.write('<span style="font-weight: bold; font-style: italic; color: #007ACC; font-size: 1.1em;">$partOfSpeech</span>');
        sb.write('<ol style="margin-top: 5px; padding-left: 20px;">');

        if (definitionsList is List) {
          for (final def in definitionsList) {
            if (def is! Map<String, dynamic>) continue;
            final definitionText = def['definition']?.toString() ?? '';
            final examples = def['examples'];

            sb.write('<li style="margin-bottom: 8px;">');
            sb.write(definitionText);

            if (examples is List && examples.isNotEmpty) {
              sb.write('<div style="margin-top: 5px; padding-left: 10px; border-left: 2px solid #ccc; font-style: italic; color: #555;">');
              for (final ex in examples) {
                if (ex is Map<String, dynamic>) {
                  final exText = ex['text']?.toString() ?? '';
                  sb.write('<p style="margin: 2px 0;">"$exText"</p>');
                }
              }
              sb.write('</div>');
            }
            sb.write('</li>');
          }
        }
        sb.write('</ol>');
        sb.write('</div>');
      }

      sb.write('</div>');
      return sb.toString();
    }
  }
  ```

- [ ] **Step 2: Commit**
  Run:
  ```bash
  git add lib/service/dictionary/dictionary_service.dart
  git commit -m "feat(dict): implement DictionaryService with wiktionary fallback"
  ```

---

### Task 5: Add Localization Keys

**Files:**
- Modify: [app_en.arb](file:///home/rousseau/anx-reader/lib/l10n/app_en.arb)
- Modify: [app_es.arb](file:///home/rousseau/anx-reader/lib/l10n/app_es.arb)

- [ ] **Step 1: Add keys to app_en.arb**
  Open `lib/l10n/app_en.arb` and add these definitions (e.g. right before the closing brace):

  ```json
    "settingsDictionary": "Dictionary",
    "settingsDictionaryManage": "Manage Dictionaries",
    "settingsDictionaryAdd": "Add Dictionary",
    "settingsDictionaryEmpty": "No dictionaries imported yet. Tap '+' to import an MDict (.mdx) file.",
    "settingsDictionaryActive": "Active",
    "settingsDictionaryDeleteConfirm": "Are you sure you want to delete this dictionary?",
    "dictionaryLookupTitle": "Definition",
    "dictionaryLookupLoading": "Looking up definition...",
    "dictionaryLookupNotFound": "No definition found for '{word}'.",
    "dictionaryLookupError": "Error looking up word definition."
  ```

- [ ] **Step 2: Add keys to app_es.arb**
  Open `lib/l10n/app_es.arb` and add these definitions:

  ```json
    "settingsDictionary": "Diccionario",
    "settingsDictionaryManage": "Gestionar diccionarios",
    "settingsDictionaryAdd": "Añadir diccionario",
    "settingsDictionaryEmpty": "No se han importado diccionarios. Toca '+' para importar un archivo MDict (.mdx).",
    "settingsDictionaryActive": "Activo",
    "settingsDictionaryDeleteConfirm": "¿Estás seguro de que quieres eliminar este diccionario?",
    "dictionaryLookupTitle": "Definición",
    "dictionaryLookupLoading": "Buscando definición...",
    "dictionaryLookupNotFound": "No se encontró definición para '{word}'.",
    "dictionaryLookupError": "Error al buscar la definición de la palabra."
  ```

- [ ] **Step 3: Regenerate localization classes**
  Run: `flutter gen-l10n`
  Expected: Command runs successfully.

- [ ] **Step 4: Commit**
  Run:
  ```bash
  git add lib/l10n/app_en.arb lib/l10n/app_es.arb
  git commit -m "feat(dict): add localization strings for dictionary"
  ```

---

### Task 6: Implement Dictionary Settings UI Page

**Files:**
- Create: [dictionary.dart](file:///home/rousseau/anx-reader/lib/page/settings_page/subpage/dictionary.dart)
- Modify: [more_settings_page.dart](file:///home/rousseau/anx-reader/lib/page/settings_page/more_settings_page.dart:120-135)

- [ ] **Step 1: Write DictionarySettings Page**
  Create `lib/page/settings_page/subpage/dictionary.dart` using `file_picker` and `path_provider` to import, toggle active, and delete `.mdx` files:

  ```dart
  import 'dart:io';
  import 'package:anx_reader/dao/dictionary.dart';
  import 'package:anx_reader/l10n/generated/L10n.dart';
  import 'package:anx_reader/models/dictionary.dart';
  import 'package:anx_reader/service/dictionary/dictionary_service.dart';
  import 'package:anx_reader/utils/toast/common.dart';
  import 'package:file_picker/file_picker.dart';
  import 'package:flutter/material.dart';
  import 'package:path/path.dart' as p;
  import 'package:path_provider/path_provider.dart';

  class DictionarySettings extends StatefulWidget {
    const DictionarySettings({super.key});

    @override
    State<DictionarySettings> createState() => _DictionarySettingsState();
  }

  class _DictionarySettingsState extends State<DictionarySettings> {
    List<DictionaryModel> _dictionaries = [];
    bool _isLoading = false;

    @override
    void initState() {
      super.initState();
      _loadDictionaries();
    }

    Future<void> _loadDictionaries() async {
      setState(() => _isLoading = true);
      final list = await dictionaryDao.selectAll();
      setState(() {
        _dictionaries = list;
        _isLoading = false;
      });
    }

    Future<void> _importDictionary() async {
      try {
        final result = await FilePicker.platform.pickFiles(
          type: FileType.any,
        );

        if (result == null || result.files.single.path == null) return;

        final originalFile = File(result.files.single.path!);
        final extension = p.extension(originalFile.path).toLowerCase();

        if (extension != '.mdx') {
          AnxToast.show("Please select an MDict (.mdx) file");
          return;
        }

        setState(() => _isLoading = true);

        final docDir = await getApplicationDocumentsDirectory();
        final dictDir = Directory(p.join(docDir.path, 'dictionaries'));
        if (!dictDir.existsSync()) {
          dictDir.createSync(recursive: true);
        }

        final fileName = p.basename(originalFile.path);
        final targetPath = p.join(dictDir.path, '${DateTime.now().millisecondsSinceEpoch}_$fileName');
        
        await originalFile.copy(targetPath);

        final newDict = DictionaryModel(
          name: p.basenameWithoutExtension(fileName),
          path: targetPath,
          isActive: _dictionaries.isEmpty, // auto-activate first imported dictionary
          createdAt: DateTime.now(),
        );

        await dictionaryDao.insert(newDict);
        AnxToast.show("Dictionary imported successfully");
        await _loadDictionaries();
      } catch (e) {
        AnxToast.show("Failed to import dictionary: $e");
        setState(() => _isLoading = false);
      }
    }

    Future<void> _toggleActive(DictionaryModel dict) async {
      if (dict.id == null) return;
      await dictionaryDao.setActive(dict.id!);
      await DictionaryService().clearCache();
      await _loadDictionaries();
    }

    Future<void> _deleteDictionary(DictionaryModel dict) async {
      if (dict.id == null) return;
      final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(L10n.of(context).settingsDictionary),
          content: Text(L10n.of(context).settingsDictionaryDeleteConfirm),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text("Cancel"),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text("Delete"),
            ),
          ],
        ),
      );

      if (confirm != true) return;

      try {
        final file = File(dict.path);
        if (file.existsSync()) {
          file.deleteSync();
        }
        await dictionaryDao.delete(dict.id!);
        if (dict.isActive) {
          await DictionaryService().clearCache();
        }
        await _loadDictionaries();
        AnxToast.show("Dictionary deleted");
      } catch (e) {
        AnxToast.show("Failed to delete: $e");
      }
    }

    @override
    Widget build(BuildContext context) {
      return Scaffold(
        appBar: AppBar(
          title: Text(L10n.of(context).settingsDictionaryManage),
          actions: [
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: _importDictionary,
            ),
          ],
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _dictionaries.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.translate, size: 64, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text(
                            L10n.of(context).settingsDictionaryEmpty,
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: _importDictionary,
                            icon: const Icon(Icons.add),
                            label: Text(L10n.of(context).settingsDictionaryAdd),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    itemCount: _dictionaries.length,
                    itemBuilder: (context, index) {
                      final dict = _dictionaries[index];
                      return ListTile(
                        leading: const Icon(Icons.book),
                        title: Text(dict.name),
                        subtitle: Text(
                          dict.isActive
                              ? L10n.of(context).settingsDictionaryActive
                              : "",
                          style: const TextStyle(
                            color: Colors.green,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          onPressed: () => _deleteDictionary(dict),
                        ),
                        onTap: () => _toggleActive(dict),
                      );
                    },
                  ),
      );
    }
  }
  ```

- [ ] **Step 2: Add navigation entry to More Settings Page**
  Modify `lib/page/settings_page/more_settings_page.dart` to insert the new Dictionary settings entry in the `settings` list right after `NarrateSettings`:

  ```dart
              {
                "title": L10n.of(context).settingsDictionary,
                "icon": Icons.translate,
                "sections": const DictionarySettings(),
                "subtitles": [
                  L10n.of(context).settingsDictionaryManage,
                ],
              },
  ```

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add lib/page/settings_page/subpage/dictionary.dart lib/page/settings_page/more_settings_page.dart
  git commit -m "feat(dict): implement DictionarySettings UI page and register in more_settings"
  ```

---

### Task 7: Fix Selection & Word Menu in Foliate-JS

**Files:**
- Modify: [book.js](file:///home/rousseau/anx-reader/assets/foliate-js/src/book.js:288-300,370-385)

- [ ] **Step 1: Modify platform check in book.js for Linux desktop**
  Modify `assets/foliate-js/src/book.js` (around line 288) to treat non-Android Linux platform like macOS and register the `pointerup` event listener for direct selection handling.

  ```javascript
    if (navigator.platform.includes('Mac')
      || navigator.platform.includes('iPhone')
      || navigator.platform.includes('iPad')
      || (navigator.platform.includes('Linux') && !navigator.userAgent.includes('Android'))
    ) {
      doc.addEventListener('pointerup', () => {
        if (shouldSkipPointerUp()) return;
        handleSelection(view, doc, index);
      });
    }
  ```

- [ ] **Step 2: Add debounced selectionchange listener for Android**
  Modify the `else` block (for Android) inside `setSelectionHandler` in `assets/foliate-js/src/book.js` (around line 372) to listen to `selectionchange` with a 600ms debounce.

  ```javascript
    } else { // Android
      let hasNativeSelectionStarted = false;

      doc.addEventListener('pointerdown', () => {
        hasNativeSelectionStarted = false;
      });

      // When the native selection handles appear, the browser loses control of the pointer
      // This event signals that the user has started dragging handles
      doc.addEventListener('pointercancel', () => {
        hasNativeSelectionStarted = true;
      });

      doc.addEventListener('contextmenu', e => {
        // Allow mouse context menu (if any)
        if (e.pointerType === 'mouse') {
          handleSelection(view, doc, index);
          return;
        }

        // If we haven't lost pointer control yet (no pointercancel),
        // this is the "early" long-press event during drag start.
        // We block it to prevent the custom menu from interfering with the drag.
        if (!hasNativeSelectionStarted) {
          e.preventDefault();
          return;
        }

        // If we have entered native selection mode (pointercancel happened),
        // this contextmenu event is likely triggered by the system or user interaction
        // after the selection phase (e.g. on release). We handle it.
        handleSelection(view, doc, index);
      });

      // Debounced selectionchange to support double-tap and simple selection menus
      var debounceTimerId = undefined;
      doc.addEventListener('selectionchange', () => {
        const selRange = getSelectionRange(doc.getSelection());
        if (!selRange) return;

        clearTimeout(debounceTimerId);
        debounceTimerId = setTimeout(() => {
          handleSelection(view, doc, index);
        }, 600);
      });
    }
  ```

- [ ] **Step 3: Rebuild Webpack Bundle**
  Run:
  1. `cd assets/foliate-js`
  2. `npm install`
  3. `npm run build`
  Expected: Webpack compiles cleanly and updates `assets/foliate-js/dist/bundle.js`.

- [ ] **Step 4: Commit**
  Run:
  ```bash
  git add assets/foliate-js/src/book.js assets/foliate-js/dist/bundle.js
  git commit -m "fix(dict): improve selection handler for desktop Linux and single-word Android touches"
  ```

---

### Task 8: Integrate Dictionary Menu Button and Panel UI

**Files:**
- Modify: [excerpt_menu.dart](file:///home/rousseau/anx-reader/lib/widgets/context_menu/excerpt_menu.dart:250-270)
- Create: [dictionary_lookup.dart](file:///home/rousseau/anx-reader/lib/widgets/context_menu/dictionary_lookup.dart) (Optional: we can create a sub-widget or write it inline. Let's create a dedicated bottom sheet widget)

- [ ] **Step 1: Write DictionaryLookupBottomSheet**
  Create `lib/widgets/context_menu/dictionary_lookup.dart` containing the bottom sheet interface rendered with `flutter_html`:

  ```dart
  import 'package:anx_reader/l10n/generated/L10n.dart';
  import 'package:anx_reader/service/dictionary/dictionary_service.dart';
  import 'package:flutter/material.dart';
  import 'package:flutter_html/flutter_html.dart';

  class DictionaryLookupBottomSheet extends StatefulWidget {
    final String word;
    final String? bookLanguage;

    const DictionaryLookupBottomSheet({
      super.key,
      required this.word,
      this.bookLanguage,
    });

    @override
    State<DictionaryLookupBottomSheet> createState() =>
        _DictionaryLookupBottomSheetState();
  }

  class _DictionaryLookupBottomSheetState
      extends State<DictionaryLookupBottomSheet> {
    late Future<String?> _lookupFuture;

    @override
    void initState() {
      super.initState();
      _lookupFuture = DictionaryService().lookup(
        widget.word,
        bookLanguage: widget.bookLanguage,
      );
    }

    @override
    Widget build(BuildContext context) {
      final theme = Theme.of(context);
      return Container(
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        ),
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.6,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  L10n.of(context).dictionaryLookupTitle,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const Divider(),
            Expanded(
              child: FutureBuilder<String?>(
                future: _lookupFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const CircularProgressIndicator(),
                          const SizedBox(height: 16),
                          Text(L10n.of(context).dictionaryLookupLoading),
                        ],
                      ),
                    );
                  }

                  if (snapshot.hasError || !snapshot.hasData) {
                    return Center(
                      child: Text(
                        L10n.of(context).dictionaryLookupError,
                        style: const TextStyle(color: Colors.red),
                      ),
                    );
                  }

                  final definition = snapshot.data;
                  if (definition == null || definition.isEmpty) {
                    return Center(
                      child: Text(
                        L10n.of(context).dictionaryLookupNotFound(widget.word),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontStyle: FontStyle.italic),
                      ),
                    );
                  }

                  return SingleChildScrollView(
                    child: Html(
                      data: definition,
                      style: {
                        "body": Style(
                          margin: Margins.zero,
                          padding: HtmlPaddings.zero,
                          color: theme.colorScheme.onSurface,
                          fontSize: FontSize(16.0),
                        ),
                        "a": Style(
                          color: theme.colorScheme.primary,
                          textDecoration: TextDecoration.underline,
                        ),
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      );
    }
  }
  ```

- [ ] **Step 2: Add Dictionary Option to ExcerptMenu**
  Modify `lib/widgets/context_menu/excerpt_menu.dart` (around line 268) to insert the **Dictionary** option. Tapping it will invoke `showModalBottomSheet`.

  ```dart
  import 'package:anx_reader/widgets/context_menu/dictionary_lookup.dart';
  ```

  And inside the `operatorMenu` widget children list:

  ```dart
            // Dictionary option
            IconAndText(
              compact: true,
              onTap: () {
                widget.onClose();
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.transparent,
                  builder: (context) => DictionaryLookupBottomSheet(
                    word: widget.annoContent,
                    bookLanguage: epubPlayerKey.currentState?.widget.book.languages,
                  ),
                );
              },
              icon: const Icon(Icons.book),
              text: L10n.of(context).settingsDictionary,
            ),
  ```

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add lib/widgets/context_menu/dictionary_lookup.dart lib/widgets/context_menu/excerpt_menu.dart
  git commit -m "feat(dict): integrate Dictionary lookup bottom sheet in ExcerptMenu"
  ```

---

### Verification and Testing

1. Run standard build test:
   `flutter run -d linux`
2. Test settings page -> dictionary subpage. Select `+` to add an `.mdx` file. Confirm it lists and can be activated.
3. Open a book. Double click (or double tap) a word. Confirm context menu appears immediately.
4. Press "Diccionario". Confirm panel displays definitions correctly.
