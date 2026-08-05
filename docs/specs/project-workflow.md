# AFFiNITe Project Workflow Spec

## Stack & Architecture
- **Monorepo**: Yarn v4 Workspaces + Cargo Workspaces (Rust NAPI native modules)
- **Frontend**: React (Desktop Electron Renderer, Web), Flutter (`packages/frontend/apps/mobile-flutter`), Capacitor (`packages/frontend/apps/android`)
- **Backend / Engine**: Rust (`packages/common/native`, `packages/backend/native`, `y-octo`), Node.js Server (`packages/backend/server`)
- **State & Data**: Yjs / y-octo CRDT, SQLite (sqlite_v1, nbstore), BlockSuite workspace blocks

## Verification Pipeline
- **Linter**: `yarn lint` (`yarn lint:ox` && `yarn lint:eslint` && `yarn lint:prettier`)
- **Typecheck**: `yarn typecheck` (`tsc -b tsconfig.json --verbose`)
- **Tests**: `yarn test` (`vitest --run`)
- **Cargo Check**: `cargo check --workspace`

## Version Sync Manifest
- `package.json` (.version)
- `packages/frontend/core/package.json` (.version)
- `packages/frontend/apps/electron/package.json` (.version)

## Release Protocol
- Release Script: `./run_release.sh`
- Build Targets: Linux AppImage (`./build-appimage.sh stable`), Android APK (`./build-apk.sh`)
- GitHub Release Tagging: `gh release create v<VERSION>`
