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
