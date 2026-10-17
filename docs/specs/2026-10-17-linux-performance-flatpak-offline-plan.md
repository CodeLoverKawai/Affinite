# Linux Desktop Performance, Single-Renderer Tabs, Offline Sync & Flatpak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate Linux desktop startup and runtime bottlenecks by implementing single-renderer tabs, offline sync circuit-breakers with full local SQLite mirroring, bundle/ASAR size reduction (>65%), native Wayland/GPU acceleration, and native Flatpak packaging (`build-flatpak.sh`).

**Architecture:**
1. Refactor Electron `WebContentViewsManager` (`tab-views.ts`) and renderer `Workbench` (`desktop-state-synchronizer.ts`, `workbench.ts`) so all tabs share a single `'app'` `WebContentsView` and switch in `<1ms` via in-memory `View[]` state while detaching `shellView` once ready.
2. Add an offline circuit-breaker (3 retries max with exponential backoff + `online` event listener) to `AutoReconnectConnection`, `DocSyncPeer`, `BlobSyncPeer`, and Cloud revalidators, while triggering automatic `BlobSync.fullDownload()` when connected so 100% of docs and blobs live in local SQLite.
3. Strip `@affine/i18n` from `main.js`, `zod` from `preload.js`, enable `esbuild` minification, isolate `ShellAppSidebarFallback` from `@affine/core` barrel imports, unpack `*.node` from `app.asar`, strip `.map` and unused Chromium `.pak` locales, enable native Wayland/GPU flags on Linux, and provide `build-flatpak.sh` using `flatpak build-init/finish/export/bundle`.

**Tech Stack:** TypeScript 5.9, Electron 39, React 19, RxJS 7, `@toeverything/infra` (`LiveData`), `@affine/nbstore` (SQLite + Socket.IO), esbuild, Webpack, Flatpak (`org.freedesktop.Platform//25.08`).

## Global Constraints

- Target branch: `feat/linux-performance-flatpak-offline`
- Preserve `TabViewsMetaSchema` structure so tab bar UI (`<AppTabsHeader />`), split views, pinning, and keyboard shortcuts work without regression.
- All offline/sync changes in `@affine/nbstore` and `@affine/core` must pass Vitest unit tests (`yarn vitest run`).
- `dist/main.js` must drop from `7.0 MB` to `<1 MB`, `dist/preload.js` from `552 KB` to `<100 KB`, and `app.asar` must unpack `*.node` and exclude `*.map`.
- `build-flatpak.sh` must work using standard `flatpak` CLI (`build-init`, `build-finish`, `build-export`, `build-bundle`) without requiring `flatpak-builder`.

---

### Task 1: Offline Circuit-Breaker & Eager Full Local Blob Sync in `@affine/nbstore` & `@affine/core`

**Files:**
- Modify: `packages/common/nbstore/src/connection/connection.ts`
- Modify: `packages/common/nbstore/src/sync/doc/peer.ts`
- Modify: `packages/common/nbstore/src/sync/blob/peer.ts`
- Modify: `packages/common/nbstore/src/sync/blob/index.ts`
- Modify: `packages/frontend/core/src/modules/cloud/entities/server.ts`
- Modify: `packages/frontend/core/src/modules/cloud/entities/session.ts`
- Modify: `packages/frontend/core/src/modules/permissions/entities/permission.ts`
- Modify: `packages/frontend/core/src/modules/permissions/services/guard.ts`
- Test: `packages/common/nbstore/src/__tests__/connection-circuit-breaker.spec.ts`

**Interfaces:**
- Produces: `AutoReconnectConnection` with `maxRetries = 3`, exponential backoff (`retryDelay * 2 ** (attempt - 1)`), offline circuit-breaker that stops polling after `maxRetries` (or immediately when `navigator.onLine === false`) and resumes automatically on `window.addEventListener('online')` or explicit `connect()`.
- Produces: Automatic `fullDownloadLoop(signal)` in `BlobSyncPeer` / `BlobSyncImpl` that mirrors all remote workspace blobs into local `SqliteBlobStorage` when connected.

- [ ] **Step 1: Write the failing unit test for `AutoReconnectConnection` circuit-breaker & `BlobSyncPeer` eager download**
  Create `packages/common/nbstore/src/__tests__/connection-circuit-breaker.spec.ts` testing that a failing `AutoReconnectConnection` stops retrying after `maxRetries` (3 attempts) instead of looping forever, and resets its retry counter when `connect()` is triggered.

- [ ] **Step 2: Run Vitest to verify the test fails**
  Run: `yarn vitest run packages/common/nbstore/src/__tests__/connection-circuit-breaker.spec.ts`

- [ ] **Step 3: Implement circuit-breaker in `connection.ts`, quiet sync in `doc/peer.ts` & `blob/peer.ts`, eager `fullDownload` in `blob/index.ts`, and finite `backoffRetry` in `server.ts`, `session.ts`, `permission.ts`, `guard.ts`**
  - In `packages/common/nbstore/src/connection/connection.ts`: Add `maxRetries = 3`, exponential backoff, offline check (`typeof navigator !== 'undefined' && navigator.onLine === false`), and `'online'` event listener to reset and reconnect.
  - In `packages/common/nbstore/src/sync/doc/peer.ts`: Ensure `waitForConnected` does not abort-spin every 3s when connection status transitions to `error`/`closed` during circuit-break; wait cleanly for `status === 'connected'`.
  - In `packages/common/nbstore/src/sync/blob/peer.ts` & `packages/common/nbstore/src/sync/blob/index.ts`: Run `fullDownload(signal)` once connected so all remote blobs are downloaded to local SQLite, and back off cleanly on network errors in `fullUploadLoop` / `fullDownloadLoop` instead of polling every 15s when offline.
  - In `server.ts`, `session.ts`, `permission.ts`, `guard.ts`: Change `backoffRetry({ count: Infinity })` to `backoffRetry({ count: 2, when: () => typeof navigator === 'undefined' || navigator.onLine })`.

- [ ] **Step 4: Run Vitest to verify tests pass**
  Run: `yarn vitest run packages/common/nbstore/src/__tests__/connection-circuit-breaker.spec.ts`

- [ ] **Step 5: Commit Task 1**
  Commit message: `feat(nbstore,cloud): add offline circuit-breaker and eager local blob mirror`

---

### Task 2: Single-Renderer Lightweight Tabs (`tab-views.ts` & `workbench`)

**Files:**
- Modify: `packages/frontend/apps/electron/src/main/windows-manager/tab-views.ts`
- Modify: `packages/frontend/core/src/modules/workbench/services/workbench-view-state.ts`
- Modify: `packages/frontend/core/src/modules/workbench/services/desktop-state-synchronizer.ts`
- Modify: `packages/frontend/core/src/modules/workbench/entities/workbench.ts`
- Test: `packages/frontend/core/src/modules/workbench/__tests__/single-renderer-tabs.spec.ts`

**Interfaces:**
- Produces: Shared `'app'` `WebContentsView` in `WebContentViewsManager` (`tab-views.ts`) where `reorderViews()` detaches `shellView` and any non-active views once `'app'` is ready, and all tabs in `tabViewsMeta` share the primary `'app'` `WebContentsView`.
- Produces: Dynamic tab switching in `Workbench` / `DesktopStateSynchronizer` that caches `{ views: View[], activeViewIndex: number, basename: string }` per `tabId` and switches tabs in `<1ms` when `activeWorkbenchId` changes.

- [ ] **Step 1: Write unit test for multi-tab state switching in a single `Workbench` instance**
  Create `packages/frontend/core/src/modules/workbench/__tests__/single-renderer-tabs.spec.ts` verifying that switching `activeWorkbenchId` swaps `workbench.views$`, `workbench.activeViewIndex$`, and `workbench.basename$` while preserving each tab's `View` history instances.

- [ ] **Step 2: Run Vitest to verify the test fails**
  Run: `yarn vitest run packages/frontend/core/src/modules/workbench/__tests__/single-renderer-tabs.spec.ts`

- [ ] **Step 3: Implement single `'app'` `WebContentsView` reuse & compositor cleanup in `tab-views.ts` and dynamic tab state switching in `workbench.ts`, `workbench-view-state.ts`, and `desktop-state-synchronizer.ts`**
  - In `tab-views.ts`:
    - Reuse a single primary `'app'` `WebContentsView` across all tabs in `loadTab(id)` / `getViewById(id)`.
    - Once the primary `'app'` `WebContentsView` is ready (`appTabsUIReady.size > 0`), mark all tabs as `{ loaded: true, ready: true }` in `tabsStatus$` and detach `shellView` from `mainWindow.contentView` in `reorderViews()`.
    - When `closeTab(id)` removes a tab, only remove metadata from `tabViewsMeta` without destroying the shared `'app'` `WebContentsView`.
  - In `workbench.ts`, `workbench-view-state.ts`, and `desktop-state-synchronizer.ts`:
    - Track `activeTabId` from `tabViewsMeta.activeWorkbenchId` (falling back to `appInfo.viewId`).
    - Cache `{ views: View[]; activeViewIndex: number; basename: string }` per `tabId` so switching tabs swaps the active `View[]` array in memory and navigates the top-level router if `basename` changed.

- [ ] **Step 4: Run Vitest to verify the test passes**
  Run: `yarn vitest run packages/frontend/core/src/modules/workbench/__tests__/single-renderer-tabs.spec.ts`

- [ ] **Step 5: Commit Task 2**
  Commit message: `perf(electron,workbench): share single WebContentsView across tabs and detach inactive compositor layers`

---

### Task 3: Linux Wayland/GPU Acceleration, Protocol Filtering, Main/Preload Diet & Shell/Boards Optimization

**Files:**
- Modify: `packages/frontend/apps/electron/src/main/index.ts`
- Modify: `packages/frontend/apps/electron/src/main/windows-manager/popup.ts`
- Modify: `packages/frontend/apps/electron/src/main/windows-manager/tab-views.ts`
- Modify: `packages/frontend/apps/electron/src/main/handlers.ts`
- Modify: `packages/frontend/apps/electron/src/main/protocol.ts`
- Modify: `packages/frontend/apps/electron/src/preload/electron-api.ts`
- Modify: `packages/frontend/apps/electron/scripts/common.ts`
- Create: `packages/frontend/core/src/modules/app-sidebar/views/shell-fallback.tsx`
- Modify: `packages/frontend/core/src/modules/app-sidebar/views/index.tsx`
- Modify: `packages/frontend/apps/electron-renderer/src/shell/app.tsx`
- Modify: `tools/cli/src/webpack/cache-group.ts`
- Modify: `packages/frontend/core/src/desktop/pages/workspace/boards/index.tsx`
- Modify: `packages/frontend/core/src/components/hooks/use-blur-root.ts`

**Interfaces:**
- Produces: Native Wayland + GPU flags on Linux in `src/main/index.ts`, minified `<500 KB` `dist/main.js` (zero `@affine/i18n` JSON bloat) and `<80 KB` `dist/preload.js` (zero `zod`), isolated `ShellAppSidebarFallback`, scoped `onBeforeSendHeaders`, and lightweight `/boards` rendering.

- [ ] **Step 1: Remove `@affine/i18n` from `src/main`, remove `zod` from `src/preload`, and enable `minify` + ESM resolution in `scripts/common.ts`**
  - In `tab-views.ts` and `handlers.ts`: Remove `@affine/i18n` import; use Electron native `role: 'cut' | 'copy' | 'paste'` in context menu.
  - In `preload/electron-api.ts`: Validate `envBuildType` with a plain `Set(['stable', 'beta', 'canary', 'internal'])` instead of `zod`.
  - In `scripts/common.ts`: Enable `minify: mode === 'production'`, set `sourcemap: mode === 'development' ? 'linked' : false`, and add `mainFields: ['module', 'main']` so `rxjs` is tree-shaken.

- [ ] **Step 2: Enable Linux Wayland/GPU switches in `src/main/index.ts`, fix Wayland popup loop in `popup.ts`, and filter `onBeforeSendHeaders` in `protocol.ts`**
  - In `src/main/index.ts`: On `process.platform === 'linux'`, set `app.commandLine.appendSwitch('ozone-platform-hint', process.env.ELECTRON_OZONE_PLATFORM_HINT || 'auto')` and add `'UseOzonePlatform'`, `'WaylandWindowDecorations'`, `'VaapiVideoDecodeLinuxGL'`, `'CanvasOopRasterization'` to `enabledFeatures`.
  - In `popup.ts`: Skip the 60fps `setPosition` loop on Linux (`process.platform === 'linux'`).
  - In `protocol.ts`: Pass `{ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }` to `webRequest.onBeforeSendHeaders` so local `assets://` requests bypass the async header hook.

- [ ] **Step 3: Isolate `ShellAppSidebarFallback`, fix `vendor` chunk splitting in `cache-group.ts`, and optimize `/boards` & `use-blur-root.ts`**
  - Extract `ShellAppSidebarFallback` into `packages/frontend/core/src/modules/app-sidebar/views/shell-fallback.tsx` and import it directly in `packages/frontend/apps/electron-renderer/src/shell/app.tsx`.
  - In `tools/cli/src/webpack/cache-group.ts`: Change `vendor` cacheGroup from a single forced global chunk across all entries to initial/async per-entry or exclude `shell`/`background-worker` from heavy editor vendor chunks, and disable duplicate `SourceMapDevToolPlugin` when `SENTRY_AUTH_TOKEN` is absent.
  - In `packages/frontend/core/src/desktop/pages/workspace/boards/index.tsx` and `use-blur-root.ts`: Avoid calling `docsService.open(doc.id)` on every board card simultaneously on dashboard mount (read cached metadata or lazy-open) and reduce full-root/multi-layer Gaussian blur radius for smooth 60fps scrolling on Linux.

- [ ] **Step 4: Build `@affine/electron` and verify bundle size reduction**
  Run: `yarn affine @affine/electron build` and check sizes of `packages/frontend/apps/electron/dist/main.js` and `preload.js`.

- [ ] **Step 5: Commit Task 3**
  Commit message: `perf(electron,core): enable native Wayland/GPU, shrink main/preload/shell bundles, and optimize boards`

---

### Task 4: Streamlined Packaging (`manual-package.sh`, `build-appimage.sh`) & Native Flatpak Builder (`build-flatpak.sh`)

**Files:**
- Modify: `packages/frontend/apps/electron/scripts/manual-package.sh`
- Modify: `build-appimage.sh`
- Create: `build-flatpak.sh`

**Interfaces:**
- Produces: Clean `resources/app.asar` with `--unpack "*.node"`, zero `.map` files, trimmed `locales/*.pak`, and `build-flatpak.sh` that builds `AFFiNITe-linux-x86_64.flatpak` and installs `app.affinite.Affinite` into the user's Flatpak installation.

- [ ] **Step 1: Update `manual-package.sh` and `build-appimage.sh`**
  - In `manual-package.sh`: Clean stale `dist/` subdirectories, strip `*.map`, `*.d.ts`, `*.tsbuildinfo`, delete `LICENSES.chromium.html`, trim `locales/*.pak` (keep `en-US.pak`, `es.pak`, `es-419.pak`), and only copy external runtime `node_modules` (`electron-updater`, `yjs`, `semver` + their dependencies) instead of all 41 build-time packages.
  - In `build-appimage.sh`: Remove duplicate `yarn affine @affine/electron build` (since `generate-assets` already runs it), pass `--unpack "*.node"` to `npx @electron/asar pack`, and pass Wayland/GPU flags in `AppRun`.

- [ ] **Step 2: Create `build-flatpak.sh` for native Flatpak packaging and local installation**
  Create executable `build-flatpak.sh` at repository root that:
  1. Uses the packaged Electron output (`packages/frontend/apps/electron/out/${BUILD_TYPE}/AFFiNITe-${BUILD_TYPE}-linux-x64`, running the build first if needed or when `--build` is passed).
  2. Initializes a Flatpak build directory (`flatpak build-init`) with `app.affinite.Affinite`, `org.freedesktop.Sdk`, `org.freedesktop.Platform`, version `25.08`.
  3. Installs the unpacked app into `/app/lib/affinite`, creates `/app/bin/affinite` launcher with Wayland/X11/GPU flags (`--ozone-platform-hint=auto --enable-features=UseOzonePlatform,WaylandWindowDecorations,VaapiVideoDecodeLinuxGL,CanvasOopRasterization`), and installs desktop entry + icons into `/app/share/`.
  4. Finalizes permissions with `flatpak build-finish` (`--socket=wayland`, `--socket=fallback-x11`, `--share=ipc`, `--device=dri`, `--share=network`, `--filesystem=xdg-documents`, `--filesystem=xdg-download`), exports to a local OSTree repo (`flatpak build-export`), generates `AFFiNITe-linux-x86_64.flatpak` (`flatpak build-bundle`), and installs/updates it in `flatpak --user`.

- [ ] **Step 3: Execute packaging and verify `app.asar`, `.node` unpacking, and `AFFiNITe-linux-x86_64.flatpak` installation**
  Run `./build-flatpak.sh` and verify `flatpak list --app` shows `app.affinite.Affinite` installed and `AFFiNITe-linux-x86_64.flatpak` created at repo root.

- [ ] **Step 4: Commit Task 4**
  Commit message: `build(linux): add native Flatpak builder and optimize ASAR/AppImage packaging`
