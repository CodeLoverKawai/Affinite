# Nano-Plan: Complete Removal of Anx and Library from AFFiNITe

**Goal**: Completely remove Anx-Remix (Flutter app), Foliate reader embedding, and the Library module/route/sidebar entry from AFFiNITe, returning the codebase to a clean, robust state without unused e-reader infrastructure.

## File Impact Table

| Impact | Path | Description |
|---|---|---|
| `[-]` | `packages/frontend/apps/anx-remix/` | Delete entire Flutter/Dart Anx-Remix application |
| `[-]` | `packages/frontend/core/src/desktop/pages/workspace/library/` | Delete entire Library UI, reader, bridge, and tests |
| `[-]` | `packages/frontend/apps/electron/src/main/library/` | Delete Electron main process library handlers |
| `[*]` | `packages/frontend/core/src/desktop/workbench-router.ts` | Remove `/library` route |
| `[*]` | `packages/frontend/core/src/components/root-app-sidebar/index.tsx` | Remove `LibraryButton` component and its render in sidebar |
| `[*]` | `packages/frontend/core/src/modules/workbench/constants.tsx` | Remove `library` icon mapping and unused `BookPanelIcon` |
| `[*]` | `packages/frontend/apps/electron/src/main/handlers.ts` | Remove `libraryHandlers` registration |
| `[*]` | `packages/frontend/apps/electron/src/main/protocol.ts` | Remove `/api/anx-tts` and `/anx/` / `/foliate/` protocol handlers |
| `[*]` | `packages/frontend/apps/electron/scripts/generate-assets.ts` | Remove Anx and Foliate build/sync scripts |
| `[*]` | `packages/frontend/apps/electron/scripts/manual-package.sh` | Remove Anx and Foliate resource bundling |

## Bite-Sized Task Breakdown

### Task 1: Remove React UI & Routing Components
- Remove `packages/frontend/core/src/desktop/pages/workspace/library/`
- Update `packages/frontend/core/src/desktop/workbench-router.ts`
- Update `packages/frontend/core/src/components/root-app-sidebar/index.tsx`
- Update `packages/frontend/core/src/modules/workbench/constants.tsx`

### Task 2: Remove Electron Backend & Asset Generation Scripts
- Remove `packages/frontend/apps/electron/src/main/library/`
- Update `packages/frontend/apps/electron/src/main/handlers.ts`
- Update `packages/frontend/apps/electron/src/main/protocol.ts`
- Update `packages/frontend/apps/electron/scripts/generate-assets.ts`
- Update `packages/frontend/apps/electron/scripts/manual-package.sh`

### Task 3: Delete Anx-Remix App & Generated Static Assets
- Remove `packages/frontend/apps/anx-remix/`
- Remove `packages/frontend/apps/electron/resources/web-static/anx/` and `foliate/`

### Task 4: Empirical Build & Packaging Verification
- Run vitest suite across repo.
- Run `yarn affine @affine/electron-renderer build`.
- Run `yarn affine @affine/electron build`.
- Run `manual-package.sh` and update Flatpak `app.asar`.
