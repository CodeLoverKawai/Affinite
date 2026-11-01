# WebDAV Settings/Dictionary Sync & Docker Caddy Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement WebDAV sync for preferences/settings and MDict dictionary files (.mdx), and add a Caddy-based docker-compose setup to reverse proxy Ollama, Voicebox, and WebDAV.

**Architecture:** Settings sync operates via SharedPreferences timestamps compared with a remote JSON file. Dictionary sync maintains an MD5 manifest and uploads/downloads files in the background. Caddy operates via Docker extra-hosts gateways.

**Tech Stack:** Dart/Flutter, SQLite (Sqflite), WebDAV, Docker, Caddy.

---

### Task 1: SharedPreferences Changes

**Files:**
* Modify: [shared_preference_provider.dart](file:///home/rousseau/anx-remix/lib/config/shared_preference_provider.dart)

- [ ] **Step 1: Add importing flag and override `notifyListeners`**
  Modify [shared_preference_provider.dart](file:///home/rousseau/anx-remix/lib/config/shared_preference_provider.dart) to define a boolean flag `_isImporting` and override `notifyListeners()` to update the `prefsLastChangedTime` timestamp:
  ```dart
  bool _isImporting = false;

  @override
  void notifyListeners() {
    super.notifyListeners();
    if (!_isImporting && prefs != null) {
      prefs.setInt('prefsLastChangedTime', DateTime.now().millisecondsSinceEpoch);
    }
  }
  ```

- [ ] **Step 2: Add sync backup export/import methods**
  Modify [shared_preference_provider.dart](file:///home/rousseau/anx-remix/lib/config/shared_preference_provider.dart) to add `buildPrefsBackupMapForSync()` and `applyPrefsBackupMapForSync()`:
  ```dart
  Future<Map<String, dynamic>> buildPrefsBackupMapForSync() async {
    final Map<String, dynamic> backup = await buildPrefsBackupMap();
    final excludeKeys = {
      'webdavUrl', 'webdavUsername', 'webdavPassword', 'webdavStatus',
      'syncProtocol', 'iapPurchaseStatus', 'iapLastCheckTime',
      'webdavInfo', 'calibreInfo', 'gdriveInfo',
      'prefsLastChangedTime'
    };
    backup.removeWhere((key, value) => excludeKeys.contains(key));
    return backup;
  }

  Future<void> applyPrefsBackupMapForSync(Map<String, dynamic> backup) async {
    _isImporting = true;
    try {
      await applyPrefsBackupMap(backup);
    } finally {
      _isImporting = false;
    }
  }
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add lib/config/shared_preference_provider.dart
  git commit -m "feat(sync): add SharedPreferences sync export/import and timestamp tracking"
  ```

---

### Task 2: Database Migration for Dictionaries MD5

**Files:**
* Modify: [database.dart](file:///home/rousseau/anx-remix/lib/dao/database.dart)

- [ ] **Step 1: Bump version and add migration case**
  Modify [database.dart](file:///home/rousseau/anx-remix/lib/dao/database.dart) to bump version to 9 and add Case 8:
  ```dart
  // Line 16:
  const int currentDbVersion = 9;
  
  // Inside onUpgradeDatabase migration block:
  // After case 7, add:
        continue case8;
      case8:
      case 8:
        await db.execute('ALTER TABLE tb_dictionaries ADD COLUMN md5 TEXT');
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add lib/dao/database.dart
  git commit -m "feat(sync): database schema migration version 9 for dictionaries md5 column"
  ```

---

### Task 3: Update Dictionary Model

**Files:**
* Modify: [dictionary.dart](file:///home/rousseau/anx-remix/lib/models/dictionary.dart)

- [ ] **Step 1: Add md5 column to DictionaryModel**
  Update [dictionary.dart](file:///home/rousseau/anx-remix/lib/models/dictionary.dart):
  ```dart
  class DictionaryModel {
    int? id;
    String name;
    String path;
    bool isActive;
    DateTime createdAt;
    String? md5; // Added

    DictionaryModel({
      this.id,
      required this.name,
      required this.path,
      required this.isActive,
      required this.createdAt,
      this.md5, // Added
    });

    Map<String, dynamic> toMap() {
      return {
        if (id != null) 'id': id,
        'name': name,
        'path': path,
        'is_active': isActive ? 1 : 0,
        'created_at': createdAt.toIso8601String(),
        'md5': md5, // Added
      };
    }

    factory DictionaryModel.fromMap(Map<String, dynamic> map) {
      return DictionaryModel(
        id: map['id'] as int?,
        name: map['name'] as String,
        path: map['path'] as String,
        isActive: (map['is_active'] as int) == 1,
        createdAt: DateTime.parse(map['created_at'] as String),
        md5: map['md5'] as String?, // Added
      );
    }
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add lib/models/dictionary.dart
  git commit -m "feat(sync): add md5 field to DictionaryModel"
  ```

---

### Task 4: Settings WebDAV Sync Implementation

**Files:**
* Modify: [sync.dart](file:///home/rousseau/anx-remix/lib/providers/sync.dart)

- [ ] **Step 1: Implement syncSettings**
  Add the following method in `Sync` class in [sync.dart](file:///home/rousseau/anx-remix/lib/providers/sync.dart):
  ```dart
  Future<void> syncSettings(SyncDirection direction) async {
    final client = _syncClient;
    if (client == null) return;

    const String remoteSettingsFileName = 'settings.json';
    RemoteFile? remoteSettings = await client.readProps('anx/$remoteSettingsFileName');
    final int localLastChanged = Prefs().prefs.getInt('prefsLastChangedTime') ?? 0;

    try {
      switch (direction) {
        case SyncDirection.upload:
          final settingsMap = await Prefs().buildPrefsBackupMapForSync();
          final tempDir = await getAnxTempDir();
          final tempFile = io.File('${tempDir.path}/temp_settings.json');
          await tempFile.writeAsString(jsonEncode(settingsMap));
          await uploadFile(tempFile.path, 'anx/$remoteSettingsFileName');
          if (tempFile.existsSync()) await tempFile.delete();
          break;

        case SyncDirection.download:
          if (remoteSettings != null) {
            final tempDir = await getAnxTempDir();
            final tempFile = io.File('${tempDir.path}/temp_settings.json');
            await client.downloadFile('anx/$remoteSettingsFileName', tempFile.path);
            final String content = await tempFile.readAsString();
            final decoded = jsonDecode(content);
            if (decoded is Map<String, dynamic>) {
              await Prefs().applyPrefsBackupMapForSync(decoded);
            }
            if (tempFile.existsSync()) await tempFile.delete();
          }
          break;

        case SyncDirection.both:
          if (remoteSettings == null) {
            final settingsMap = await Prefs().buildPrefsBackupMapForSync();
            final tempDir = await getAnxTempDir();
            final tempFile = io.File('${tempDir.path}/temp_settings.json');
            await tempFile.writeAsString(jsonEncode(settingsMap));
            await uploadFile(tempFile.path, 'anx/$remoteSettingsFileName');
            if (tempFile.existsSync()) await tempFile.delete();
          } else {
            final remoteTime = remoteSettings.mTime!;
            final localTime = DateTime.fromMillisecondsSinceEpoch(localLastChanged);
            if (remoteTime.isAfter(localTime)) {
              final tempDir = await getAnxTempDir();
              final tempFile = io.File('${tempDir.path}/temp_settings.json');
              await client.downloadFile('anx/$remoteSettingsFileName', tempFile.path);
              final String content = await tempFile.readAsString();
              final decoded = jsonDecode(content);
              if (decoded is Map<String, dynamic>) {
                await Prefs().applyPrefsBackupMapForSync(decoded);
              }
              if (tempFile.existsSync()) await tempFile.delete();
            } else if (remoteTime.isBefore(localTime)) {
              final settingsMap = await Prefs().buildPrefsBackupMapForSync();
              final tempDir = await getAnxTempDir();
              final tempFile = io.File('${tempDir.path}/temp_settings.json');
              await tempFile.writeAsString(jsonEncode(settingsMap));
              await uploadFile(tempFile.path, 'anx/$remoteSettingsFileName');
              if (tempFile.existsSync()) await tempFile.delete();
            }
          }
          break;
      }
    } catch (e) {
      AnxLog.severe('Sync: Settings sync failed: $e');
    }
  }
  ```

- [ ] **Step 2: Invoke inside syncData**
  Modify the `syncData` method in [sync.dart](file:///home/rousseau/anx-remix/lib/providers/sync.dart) to call `await syncSettings(finalDirection);` right after or before `await syncDatabase(finalDirection);`.

- [ ] **Step 3: Commit**
  ```bash
  git add lib/providers/sync.dart
  git commit -m "feat(sync): integrate settings JSON sync over WebDAV"
  ```

---

### Task 5: Dictionary WebDAV Sync Implementation

**Files:**
* Modify: [sync.dart](file:///home/rousseau/anx-remix/lib/providers/sync.dart)

- [ ] **Step 1: Implement syncDictionaries**
  Add the following method in `Sync` class in [sync.dart](file:///home/rousseau/anx-remix/lib/providers/sync.dart):
  ```dart
  Future<void> syncDictionaries(SyncDirection direction) async {
    final client = _syncClient;
    if (client == null) return;

    final localDicts = await dictionaryDao.selectAll();
    
    // Ensure all local dictionaries have MD5
    for (final dict in localDicts) {
      if (dict.md5 == null || dict.md5!.isEmpty) {
        final computed = await MD5Service.calculateFileMd5(dict.path);
        if (computed != null) {
          dict.md5 = computed;
          await dictionaryDao.update(dict);
        }
      }
    }

    const String manifestPath = 'anx/dictionaries/manifest.json';
    List<Map<String, dynamic>> remoteManifestList = [];
    
    try {
      if (await client.isExist(manifestPath)) {
        final tempDir = await getAnxTempDir();
        final tempFile = io.File('${tempDir.path}/manifest_temp.json');
        await client.downloadFile(manifestPath, tempFile.path);
        final manifestStr = await tempFile.readAsString();
        final decoded = jsonDecode(manifestStr);
        if (decoded is Map<String, dynamic> && decoded['dictionaries'] is List) {
          remoteManifestList = List<Map<String, dynamic>>.from(decoded['dictionaries']);
        }
        if (tempFile.existsSync()) await tempFile.delete();
      }
    } catch (e) {
      AnxLog.warning('Failed to load remote dictionary manifest: $e');
    }

    // Upload dictionaries missing from remote
    bool manifestChanged = false;
    for (final dict in localDicts) {
      if (dict.md5 == null || dict.md5!.isEmpty) continue;
      final existsInRemote = remoteManifestList.any((r) => r['md5'] == dict.md5);
      if (!existsInRemote) {
        final remoteFilePath = 'anx/dictionaries/${dict.md5}.mdx';
        await uploadFile(dict.path, remoteFilePath);
        
        remoteManifestList.add({
          'name': dict.name,
          'md5': dict.md5,
          'isActive': dict.isActive,
          'createdAt': dict.createdAt.toIso8601String(),
        });
        manifestChanged = true;
      }
    }

    if (manifestChanged) {
      final tempDir = await getAnxTempDir();
      final tempFile = io.File('${tempDir.path}/manifest_temp.json');
      await tempFile.writeAsString(jsonEncode({'dictionaries': remoteManifestList}));
      await uploadFile(tempFile.path, manifestPath);
      if (tempFile.existsSync()) await tempFile.delete();
    }

    // Download dictionaries missing locally (background thread simulation via async loop)
    final docDir = await getApplicationDocumentsDirectory();
    final dictDir = io.Directory(join(docDir.path, 'dictionaries'));
    if (!dictDir.existsSync()) {
      dictDir.createSync(recursive: true);
    }

    for (final remoteDict in remoteManifestList) {
      final String rMd5 = remoteDict['md5'];
      final String rName = remoteDict['name'];
      final bool localHas = localDicts.any((l) => l.md5 == rMd5);
      
      if (!localHas) {
        final targetLocalPath = join(dictDir.path, '${DateTime.now().millisecondsSinceEpoch}_$rName.mdx');
        final remoteFilePath = 'anx/dictionaries/$rMd5.mdx';
        
        // Save database entry as inactive/downloading placeholder first
        final newDict = DictionaryModel(
          name: rName,
          path: targetLocalPath,
          isActive: false,
          createdAt: DateTime.parse(remoteDict['createdAt']),
          md5: rMd5,
        );
        final newId = await dictionaryDao.insert(newDict);
        newDict.id = newId;

        // Async download without awaiting the full file transfer sequentially inside the main loop
        Future<void>(() async {
          try {
            await client.downloadFile(remoteFilePath, targetLocalPath);
            if (remoteDict['isActive'] == true) {
              await dictionaryDao.setActive(newId);
            }
          } catch (e) {
            AnxLog.severe('Failed to download dictionary $rName: $e');
            await dictionaryDao.delete(newId);
          }
        });
      }
    }
  }
  ```

- [ ] **Step 2: Invoke inside syncData**
  Modify the `syncData` method in [sync.dart](file:///home/rousseau/anx-remix/lib/providers/sync.dart) to call `await syncDictionaries(finalDirection);` right after or before `await syncFiles();`.

- [ ] **Step 3: Commit**
  ```bash
  git add lib/providers/sync.dart
  git commit -m "feat(sync): integrate dictionary mdx file sync with hashing"
  ```

---

### Task 6: Docker Caddy Integration

**Files:**
* Create: `docker/caddy/docker-compose.yml`
* Create: `docker/caddy/Caddyfile`
* Create: `docker/caddy/README.md`

- [ ] **Step 1: Write docker-compose.yml**
  Create [docker-compose.yml](file:///home/rousseau/anx-remix/docker/caddy/docker-compose.yml):
  ```yaml
  version: "3.7"
  services:
    caddy:
      image: caddy:2.7-alpine
      restart: unless-stopped
      ports:
        - "80:80"
        - "443:443"
      environment:
        - DOMAIN=localhost
        - SSL_EMAIL=admin@example.com
      volumes:
        - ./Caddyfile:/etc/caddy/Caddyfile
        - caddy_data:/data
        - caddy_config:/config
      extra_hosts:
        - "host.docker.internal:host-gateway"

  volumes:
    caddy_data:
    caddy_config:
  ```

- [ ] **Step 2: Write Caddyfile**
  Create [Caddyfile](file:///home/rousseau/anx-remix/docker/caddy/Caddyfile):
  ```caddyfile
  {
      email {$SSL_EMAIL}
  }

  {$DOMAIN} {
      # Proxy to Ollama running on Host GPU
      route /ollama/* {
          uri strip_prefix /ollama
          reverse_proxy host.docker.internal:11434
      }

      # Proxy to Voicebox
      route /voicebox/* {
          reverse_proxy host.docker.internal:5002
      }
  }
  ```

- [ ] **Step 3: Write README.md**
  Create [README.md](file:///home/rousseau/anx-remix/docker/caddy/README.md):
  ```markdown
  # Docker Caddy Reverse Proxy for Anx Remix

  This folder contains the configuration to set up a Caddy reverse proxy for Ollama, Voicebox, and WebDAV with automated HTTPS SSL certificates.

  ## Getting Started
  1. Edit `.env` or set environment variables:
     * `DOMAIN`: Your public DDNS domain (e.g. `my-remix.duckdns.org` or `desec.io`).
     * `SSL_EMAIL`: Email for Let's Encrypt certificates.
  2. Run:
     ```bash
     docker compose up -d
     ```
  3. Ensure port `80` and `443` are open if using external DNS verification, or access via Zero-Trust VPN (Tailscale) by binding to the Tailscale interface IP.
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add docker/caddy/
  git commit -m "feat(docker): add Caddy reverse proxy setup for Ollama and Voicebox"
  ```
