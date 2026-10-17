# Linux Desktop Performance, Lightweight Tabs, Offline Circuit-Breaker & Flatpak Design Spec

**Date:** 2026-10-17
**Branch:** `feat/linux-performance-flatpak-offline`
**Status:** Approved

---

## 1. Problem Statement

On Linux (specifically Wayland compositors like Hyprland on hybrid AMD/NVIDIA hardware), the AFFiNITe desktop client suffers from severe cold-start latency, high memory footprint, compositor frame drops, and continuous background network retries when offline:

1. **XWayland Fallback & Compositor Stacking**:
   - Electron starts without `--ozone-platform-hint=auto` or `WaylandWindowDecorations`, running under XWayland (`:0`).
   - `WebContentViewsManager` (`tab-views.ts`) spawns a separate `WebContentsView` (full Chromium renderer process + V8 isolate + WebGL context) per tab and never removes ready inactive `WebContentsView`s (`score = 0`) or `shellView` (`score = 1`) from `mainWindow.contentView.children`.
2. **Massive Bundle Bloat & Packaging Overhead**:
   - `dist/main.js` is 7.0 MB unminified because `tab-views.ts` imports `@affine/i18n` for 3 strings (`Cut`, `Copy`, `Paste`), inlining 24 language JSON files (~4.5 MB) into CJS `main.js`.
   - `dist/preload.js` is 552 KB unminified (`rxjs` CJS + `zod`).
   - `shell.html` loads 11.5 MB of JS (including 5.0 MB `@affine/core`/`@blocksuite` and 3.6 MB `vendor.js`) due to barrel imports in `packages/frontend/core/src/modules/app-sidebar/views/index.tsx` and monolithic `vendor` chunk splitting in `tools/cli/src/webpack/cache-group.ts`.
   - `app.asar` (243 MB) contains 85.2 MB of `.map` files and packs the 16 MB `affine.linux-x64-gnu.node` native addon inside the archive without `--unpack "*.node"`.
3. **Infinite Reconnection Loops & Incomplete Offline Blob Mirroring**:
   - `AutoReconnectConnection` (`connection.ts`), `DocSyncPeer` (`doc/peer.ts`), `BlobSyncPeer` (`blob/peer.ts`), and Cloud/Auth/Permission revalidators (`backoffRetry({ count: Infinity })`) retry forever every 3s–15s when the server is unreachable.
   - `BlobSyncImpl` only runs `fullUploadLoop` and never runs `fullDownload` for cloud peers, leaving remote blobs uncached until clicked.
4. **AppImage FUSE Mount Overhead**:
   - AppImage requires mounting a 195 MB `zstd` SquashFS archive via FUSE on every launch instead of running natively from an OSTree/Flatpak installation.

---

## 2. Architecture & Design Pillars

### Pillar 1: Single-Renderer Lightweight Tabs (`tab-views.ts` + `workbench`)
- **Main Process (`packages/frontend/apps/electron/src/main/windows-manager/tab-views.ts`)**:
  - Preserve `TabViewsMetaSchema` (`activeWorkbenchId` + `workbenches: WorkbenchMeta[]`) for full compatibility with `<AppTabsHeader />`, shortcuts, split views, and persistence.
  - Share a single primary `'app'` `WebContentsView` across all tabs in `tabViewsMap` instead of creating a new `WebContentsView` per tab.
  - Once the primary `'app'` `WebContentsView` reports UI ready (`setTabUIReady`), mark all tabs as `loaded: true, ready: true` in `tabsStatus$` and detach `shellView` from `mainWindow.contentView` so only the single active `'app'` view is composited.
- **Renderer Process (`desktop-state-synchronizer.ts`, `workbench-view-state.ts`, `workbench.ts`)**:
  - Track the active tab dynamically via `tabViewsMeta.activeWorkbenchId` rather than static `appInfo.viewId`.
  - Maintain an in-memory cache `Map<string, { views: View[]; activeViewIndex: number; basename: string }>` inside `Workbench` / `DesktopStateSynchronizer` so switching tabs swaps `views$`, `activeViewIndex$`, and `basename$` in `<1ms` with zero process creation.

### Pillar 2: Offline Circuit-Breaker & Full Local SQLite Mirror (`nbstore` + `cloud`)
- **Offline Circuit-Breaker in `AutoReconnectConnection` (`packages/common/nbstore/src/connection/connection.ts`)**:
  - Replace fixed 3s infinite retries with exponential backoff (`3s -> 6s -> 12s`) and a `maxRetries = 3` circuit-breaker (immediate circuit break if `typeof navigator !== 'undefined' && navigator.onLine === false`).
  - Once tripped, stop scheduled timers until an `'online'` event fires or manual `connect()` is called.
- **Quiet Sync Loops (`packages/common/nbstore/src/sync/doc/peer.ts` & `blob/peer.ts`)**:
  - In `DocSyncPeer.waitForConnected`, do not abort on intermediate error ticks while waiting for connection; back off cleanly when the remote connection enters offline circuit-breaker state.
  - In `BlobSyncPeer`, gate `fullUploadLoop` and `fullDownload` on remote connectivity and pause when network errors occur.
- **Eager Full Workspace Download (`packages/common/nbstore/src/sync/blob/index.ts` & `blob/peer.ts`)**:
  - Alongside `DocSyncPeer` (which already pulls 100% of workspace docs into `SqliteDocStorage`), trigger `fullDownload(signal)` in `BlobSyncImpl` when connected so all remote blobs are mirrored into local `SqliteBlobStorage`.
- **Finite Cloud Revalidation (`server.ts`, `session.ts`, `permission.ts`, `guard.ts`)**:
  - Replace `backoffRetry({ count: Infinity })` with finite retry (`count: 2`) and `when: () => typeof navigator === 'undefined' || navigator.onLine`, falling back immediately to local cached state.

### Pillar 3: Native Wayland, GPU Acceleration, Bundle Diet & `app.asar` Hygiene
- **Wayland & GPU Flags (`packages/frontend/apps/electron/src/main/index.ts`, `popup.ts`)**:
  - On Linux, automatically configure `ozone-platform-hint=auto` and enable `UseOzonePlatform,WaylandWindowDecorations,VaapiVideoDecodeLinuxGL,CanvasOopRasterization`.
  - Skip the 60fps `setPosition` animation loop in `popup.ts` on Linux/Wayland.
- **Main & Preload Bundle Diet (`scripts/common.ts`, `tab-views.ts`, `handlers.ts`, `preload/electron-api.ts`)**:
  - Remove `@affine/i18n` from `src/main` (use Electron native `role: 'cut' | 'copy' | 'paste'` and lightweight labels).
  - Remove `zod` from `src/preload/electron-api.ts` and enable `minify: mode === 'production'` + ESM `mainFields: ['module', 'main']` in `scripts/common.ts`.
- **Shell & Worker Chunk Isolation (`views/shell-app-sidebar-fallback.tsx`, `cache-group.ts`)**:
  - Move `ShellAppSidebarFallback` into its own standalone module so `shell/app.tsx` does not import the barrel `views/index.tsx`.
  - Scope webpack `vendor` cacheGroup in `tools/cli/src/webpack/cache-group.ts` so `shell.html` and `background-worker.html` do not download 8.6 MB of editor/UI libraries.
- **Protocol & Boards Optimization (`protocol.ts`, `boards/index.tsx`, `use-blur-root.ts`)**:
  - Filter `webRequest.onBeforeSendHeaders` in `protocol.ts` to `{ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }`.
  - Avoid opening every Yjs doc simultaneously in `BoardCardItem` on `/boards` mount and reduce expensive multi-layer Gaussian blur on Linux.

### Pillar 4: Native Flatpak Packaging (`build-flatpak.sh`) & Streamlined `build-appimage.sh`
- **Packaging Hygiene (`manual-package.sh`, `build-appimage.sh`)**:
  - Remove duplicate `yarn affine @affine/electron build` invocation.
  - Strip `*.map`, `*.d.ts`, `*.tsbuildinfo`, stale `dist/{main,helper,preload}` directories, `LICENSES.chromium.html`, and unused Chromium `locales/*.pak` (retaining `en-US.pak` and `es*.pak`).
  - Pack `app.asar` with `--unpack "*.node"` so `affine.linux-x64-gnu.node` loads directly via `dlopen()` without `/tmp` extraction.
- **Flatpak Builder (`build-flatpak.sh`)**:
  - Use `flatpak build-init`, `flatpak build-finish`, `flatpak build-export`, and `flatpak build-bundle` against `org.freedesktop.Platform/x86_64/25.08` and `org.freedesktop.Sdk/x86_64/25.08` to produce `AFFiNITe-linux-x86_64.flatpak` and optionally install it to the user's Flatpak repo (`app.affinite.Affinite`) with native Wayland/X11/GPU permissions.
