# Spec: WebDAV Expanded Synchronization and Docker Caddy Integration

This specification details the technical architecture, data structures, and implementation plan for adding settings synchronization, dictionary file synchronization over WebDAV, and a pre-configured Docker Caddy reverse proxy template to the **Anx Remix** application.

---

## 1. WebDAV Settings & Preferences Sync

### Goal
Keep all user configurations, visual styles (such as TTS highlights), and AI integration settings in sync across all devices using the configured WebDAV server, while keeping credentials local to avoid lockouts.

### Data Flow
1. **Change Tracking**: Override the `notifyListeners()` method in `Prefs` inside `lib/config/shared_preference_provider.dart` to automatically update an internal timestamp `prefsLastChangedTime` on any user configuration write. A private flag `_isImporting` will suppress this update during sync runs to prevent recursion.
2. **Filtering Credentials**: Create a dedicated export method `buildPrefsBackupMapForSync()` that calls the existing `buildPrefsBackupMap()` and filters out the following keys:
   * `webdavUrl`, `webdavUsername`, `webdavPassword`, `syncProtocol`, `webdavStatus`
   * `calibreUrl`, `calibrePort`, `gdriveInfo`, etc.
   * `iapPurchaseStatus`, `iapLastCheckTime`
   * `prefsLastChangedTime`
3. **Remote Integration**:
   * Settings are saved to `anx/settings.json` on the WebDAV server.
   * **Upload**: Serialize filtered preferences to a temporary JSON file and upload it.
   * **Download**: Download `anx/settings.json`, parse it, and import settings via `applyPrefsBackupMap()`.
   * **Sync (Both)**: Compare the remote modification time (`mTime`) of `anx/settings.json` with the local `prefsLastChangedTime`:
     * If remote `mTime` is newer, download and apply.
     * If local timestamp is newer, upload local settings.

---

## 2. WebDAV Dictionary Sync (.mdx)

### Goal
Synchronize physical `.mdx` dictionary files across devices without blocking the user, using MD5 hashing to deduplicate transfers.

### Database Migration (v9)
Bumb `currentDbVersion` to 9 in `lib/dao/database.dart` and add an `md5` column to `tb_dictionaries`.
```sql
case8:
case 8:
  await db.execute('ALTER TABLE tb_dictionaries ADD COLUMN md5 TEXT');
```

### Sync Flow
1. **Remote Manifest**: Maintain a JSON file `/anx/dictionaries/manifest.json` on the remote server:
   ```json
   {
     "dictionaries": [
       {
         "name": "English-Spanish",
         "md5": "7b508ca42bf80b85a3c9e6...",
         "size": 5242880,
         "isActive": true
       }
     ]
   }
   ```
2. **Upload Sync**:
   * For each local dictionary in the database:
     * If `md5` is null, calculate it using `MD5Service.calculateFileMd5(path)` and save it.
     * If it is not listed in the remote manifest, upload the file to `/anx/dictionaries/[md5].mdx` and add its record to the manifest.
   * Upload the updated manifest if changes occurred.
3. **Download Sync**:
   * For each dictionary in the remote manifest:
     * If the `md5` is not found in the local database:
       * Create a pending local record in `tb_dictionaries`.
       * Initiate a background download of `/anx/dictionaries/[md5].mdx` using `Dio` with progress tracking.
       * Save it to `getApplicationDocumentsDirectory()/dictionaries/[md5].mdx` and update the local file path.
   * In the meantime, lookups fall back gracefully to the online Wiktionary API.

---

## 3. Docker Caddy Reverse Proxy & DDNS Guide

### Goal
Provide a production-ready Caddy server template to easily reverse proxy Ollama, Voicebox, and WebDAV services with automatic HTTPS certificates and zero-trust VPN configurations.

### Directory Structure
Create `/docker/caddy` containing:
* `docker-compose.yml`: Defnies the Caddy service, persistent volumes for certificates, and binds ports 80/443.
* `Caddyfile`: Redirects a domain (like `DuckDNS` or custom) to internal Docker services or `host.docker.internal` (Ollama running on host GPU).
* `README.md`: Explains domain binding, network configurations, Tailscale VPN integration, and security best practices.

---

## 4. Verification Plan

### Automated Verification
* Run `flutter analyze` to verify the codebase after the database migration and sync updates.
* Write a unit test verifying `buildPrefsBackupMapForSync()` correctly filters credentials and device-specific layouts.

### Manual Verification
1. Modify a theme setting, trigger sync, and verify `anx/settings.json` is created on WebDAV.
2. Import an `.mdx` dictionary, run sync, and verify it uploads as `[md5].mdx` alongside `manifest.json`.
3. Check the Caddy configuration against a test host to confirm SSL binding works correctly.
