# Anx-Remix Monorepo & SQLite Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relocate the complete Anx-Remix source code into the AFFiNITe monorepo (`packages/frontend/apps/anx-remix`) and replace the fragile in-memory mock database with native SQLite Web (`sqflite_common_ffi_web`), eliminating state loss, blank statistics, and React-Flutter synchronization race conditions.

**Architecture:** Anx-Remix becomes a native package in the monorepo. On the Web, it initializes `databaseFactoryFfiWeb`, executing standard SQLite queries against IndexedDB via WebAssembly. The React host (`library/index.tsx`) provides local book files via Electron, bridges notes to the Daily Journal and BlockSuite docs, and persists Yjs backup without triggering destructive feedback loops.

**Tech Stack:** Flutter Web, Dart, `sqflite_common_ffi_web`, TypeScript, React, Yjs, Electron, Foliate-js.

## Global Constraints

- Monorepo directory: `packages/frontend/apps/anx-remix/`
- SQLite Web backend: `sqflite_common_ffi_web` with `sqlite3.wasm`
- Zero placeholders in implementation and tests
- Prevent circular sync loops between React and Flutter

---

### Task 1: Migrate Anx-Remix Source Code into the Affinite Monorepo

**Files:**
- Create: `packages/frontend/apps/anx-remix/package.json`
- Create: `packages/frontend/apps/anx-remix/` (all files copied from `/home/rousseau/Documents/GitHub/Anx-Remix`)
- Modify: `packages/frontend/apps/electron/scripts/generate-assets.ts:75-95`
- Modify: `packages/frontend/apps/electron/scripts/manual-package.sh:77-97`

**Interfaces:**
- Produces: `@affine/anx-remix` npm package registered in monorepo workspaces with a clean build command.

- [ ] **Step 1: Copy Anx-Remix source code into monorepo**

Execute command to copy files, excluding git metadata and temporary build artifacts:
```bash
mkdir -p packages/frontend/apps/anx-remix
rsync -av --exclude '.git' --exclude 'build' --exclude '.dart_tool' /home/rousseau/Documents/GitHub/Anx-Remix/ packages/frontend/apps/anx-remix/
```

- [ ] **Step 2: Create package.json in packages/frontend/apps/anx-remix**

```json
{
  "name": "@affine/anx-remix",
  "version": "0.29.5",
  "private": true,
  "description": "Anx-Remix Flutter Web e-reader application embedded in AFFiNITe",
  "scripts": {
    "build": "flutter build web --no-pub --base-href /anx/",
    "build:clean": "flutter clean && flutter pub get && flutter build web --base-href /anx/",
    "analyze": "flutter analyze"
  }
}
```

- [ ] **Step 3: Update Electron asset generation scripts**

In `packages/frontend/apps/electron/scripts/generate-assets.ts`, update paths to point to the monorepo location:
```typescript
const externalAnxBuild = path.resolve(
  repoRootDir,
  'packages',
  'frontend',
  'apps',
  'anx-remix',
  'build',
  'web'
);
const externalFoliate = path.resolve(
  repoRootDir,
  'packages',
  'frontend',
  'apps',
  'anx-remix',
  'assets',
  'foliate-js'
);
```

In `packages/frontend/apps/electron/scripts/manual-package.sh`:
```bash
ANX_FOLIATE_SRC="${REPO_ROOT:-/home/rousseau/Documents/GitHub/Affinite}/packages/frontend/apps/anx-remix/assets/foliate-js"
ANX_WEB_SRC="${REPO_ROOT:-/home/rousseau/Documents/GitHub/Affinite}/packages/frontend/apps/anx-remix/build/web"
```

- [ ] **Step 4: Verify initial build from new location**

Run: `cd packages/frontend/apps/anx-remix && flutter pub get`
Expected: Resolution completed without errors.

- [ ] **Step 5: Commit monorepo migration**

```bash
git add packages/frontend/apps/anx-remix packages/frontend/apps/electron/scripts/generate-assets.ts packages/frontend/apps/electron/scripts/manual-package.sh
git commit -m "feat(anx-remix): migrate Anx-Remix into monorepo under packages/frontend/apps/anx-remix"
```

---

### Task 2: Implement Native SQLite Web Engine (`sqflite_common_ffi_web`) in Anx-Remix

**Files:**
- Modify: `packages/frontend/apps/anx-remix/pubspec.yaml`
- Modify: `packages/frontend/apps/anx-remix/lib/dao/database.dart`
- Modify: `packages/frontend/apps/anx-remix/lib/dao/base_dao.dart`
- Modify: `packages/frontend/apps/anx-remix/lib/dao/reading_time.dart`
- Modify: `packages/frontend/apps/anx-remix/lib/dao/book_note.dart`
- Create/Download: `packages/frontend/apps/anx-remix/web/sqlite3.wasm`

**Interfaces:**
- Produces: Fully functional SQLite database on Web with IndexedDB persistence for all DAOs.

- [ ] **Step 1: Add sqflite_common_ffi_web to pubspec.yaml**

In `packages/frontend/apps/anx-remix/pubspec.yaml`, under `dependencies:`:
```yaml
  sqflite_common_ffi: ^2.3.3
  sqflite_common_ffi_web: ^2.0.0+4
```

- [ ] **Step 2: Fetch sqlite3.wasm into web/ directory**

Run script to extract or download official `sqlite3.wasm`:
```bash
cd packages/frontend/apps/anx-remix
dart run sqflite_common_ffi_web:setup --force
```
Verify `web/sqlite3.wasm` exists.

- [ ] **Step 3: Configure databaseFactory on Web in database.dart**

In `packages/frontend/apps/anx-remix/lib/dao/database.dart`:
```dart
import 'package:anx_reader/utils/platform_utils.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:sqflite_common_ffi_web/sqflite_ffi_web.dart';

Future<Database> initDB() async {
  if (AnxPlatform.isWeb) {
    databaseFactory = databaseFactoryFfiWeb;
    final dbPath = 'anx_reader.db';
    return await databaseFactory.openDatabase(
      dbPath,
      options: OpenDatabaseOptions(
        version: currentDbVersion,
        onCreate: (db, version) async {
          await createTables(db);
        },
        onUpgrade: (db, oldVersion, newVersion) async {
          await onUpgrade(db, oldVersion, newVersion);
        },
      ),
    );
  }
  // desktop / mobile native initialization follows...
}
```
Remove `WebFakeDatabase` mock interceptors so that `DBHelper().database` returns the actual database instance.

- [ ] **Step 4: Restore base_dao.dart to query native SQLite on Web**

In `packages/frontend/apps/anx-remix/lib/dao/base_dao.dart`, ensure `database` getter returns `DBHelper().database` without `UnsupportedError`.

- [ ] **Step 5: Verify DAOs execute real SQL on Web without falling back to blank mocks**

In `packages/frontend/apps/anx-remix/lib/dao/reading_time.dart`:
Remove `if (AnxPlatform.isWeb) return [];` from `_aggregateByBook` and other methods. Allow the real SQLite query to aggregate rows directly!

- [ ] **Step 6: Build and test Flutter Web output**

Run: `cd packages/frontend/apps/anx-remix && flutter build web --base-href /anx/`
Expected: Build succeeds with `sqlite3.wasm` bundled into `build/web/`.

- [ ] **Step 7: Commit SQLite Web implementation**

```bash
git add packages/frontend/apps/anx-remix/
git commit -m "feat(anx-remix): enable native SQLite Web engine with sqflite_common_ffi_web"
```

---

### Task 3: Refactor React Host Bridge & Prevent Destructive Feedback Loops

**Files:**
- Modify: `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`
- Test: `packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-manager.spec.ts`

**Interfaces:**
- Consumes: PostMessage events (`anx-update-progress`, `anx-sync-notes`, `anx-sync-reading-times`, `anx-request-import`).
- Produces: Safe incremental Yjs updates without echoing `anx-full-sync` back into Anx-Remix.

- [ ] **Step 1: Write unit tests verifying isolated sync triggers**

In `packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-manager.spec.ts`, add tests verifying note mapping and ID consistency:
```typescript
it('preserves note IDs and book bindings accurately without drift', () => {
  const books = [
    createLibraryBook({ id: 'book-1', title: 'Test Book', filePath: '/path/test.epub' }),
  ];
  const numId = getNumericBookId(books[0].id);
  const note: AnxWebNote = {
    id: 101,
    bookId: numId,
    content: 'A test quote',
    cfi: 'epubcfi(/6/2!/4/2/1:0)',
    chapter: 'Chapter 1',
    type: 'highlight',
    color: '#FFD700',
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString(),
  };
  const highlights = convertAnxNotesToHighlights([note], books);
  expect(highlights).toHaveLength(1);
  expect(highlights[0].bookId).toBe('book-1');
  expect(highlights[0].text).toBe('A test quote');
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `yarn test packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-manager.spec.ts`
Expected: PASS.

- [ ] **Step 3: Refactor index.tsx to decouple the sync feedback loop**

In `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`:
1. Add an `isOriginAnxRef = useRef(false)` flag.
2. In `handleHostMessage`, set `isOriginAnxRef.current = true` before calling `saveAnxNotesToYjs` or `saveBooksToYjs`.
3. In `yMap.observe(syncFromYjs)`:
   Check `if (isOriginAnxRef.current) { isOriginAnxRef.current = false; return; }`.
   This prevents incoming Anx updates from bouncing back as an `anx-full-sync` that interrupts the reader.
4. Ensure `anx-request-books` still receives the full catalog on demand when the iframe loads.

- [ ] **Step 4: Run test suite to verify no regressions**

Run: `yarn test packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-manager.spec.ts`
Expected: 100% tests pass.

- [ ] **Step 5: Commit React bridge refactor**

```bash
git add packages/frontend/core/src/desktop/pages/workspace/library/
git commit -m "fix(library): break postMessage feedback loop and ensure reliable Yjs sync"
```

---

### Task 4: Full Asset Generation, Build & Empirical Verification

**Files:**
- Modify: `packages/frontend/apps/electron/resources/web-static/anx/` (updated from new build)

**Interfaces:**
- Produces: Integrated Electron build with verified SQLite Web persistence, Foliate reading, and statistics.

- [ ] **Step 1: Build Anx-Remix Web in monorepo**

Run: `cd packages/frontend/apps/anx-remix && flutter build web --no-pub --base-href /anx/`
Expected: Build outputs generated in `packages/frontend/apps/anx-remix/build/web/`.

- [ ] **Step 2: Sync assets into Electron web-static**

Run: `yarn affine @affine/electron generate-assets`
Expected: Assets copied into `packages/frontend/apps/electron/resources/web-static/anx/` and `foliate/`.

- [ ] **Step 3: Verify packaging script runs without errors**

Run: `BUILD_TYPE=stable bash packages/frontend/apps/electron/scripts/manual-package.sh`
Expected: Package created in `out/stable/AFFiNITe-stable-linux-x64/`.

- [ ] **Step 4: Empirical Reader & Database Verification**

Verify:
1. Open library in desktop app.
2. Anx-Remix boots with real SQLite in IndexedDB (`anx_reader.db`).
3. Open a book, scroll pages, add a highlight/note.
4. Navigate to Statistics: verify reading time counters and charts display real data instead of blank states.
5. Close and reopen the app: verify reading CFI and notes are immediately restored.

- [ ] **Step 5: Final commit and summary documentation**

```bash
git add packages/frontend/apps/electron/
git commit -m "chore(release): complete Anx-Remix monorepo and SQLite Web integration"
```
