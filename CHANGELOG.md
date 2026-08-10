# Changelog

All notable changes to **AFFiNITe** will be documented in this file.

## [v0.27.1] - 2026-08-10

### Bug Fixes & Improvements
- **Mouse Wheel Scroll Propagation Fix**:
  - Fixed vertical mouse wheel scrolling on Kanban card lists and columns in Desktop (AppImage) and Web (Docker) modes, keeping vertical list scrolling contained within columns without shifting the outer board canvas horizontally.
  - Resolved `onWheel` event leakage across BlockSuite Data-Views (Kanban and Table views).
- **Multi-Platform Release & Docker Image**:
  - Built and updated Android APK (`AFFINITE-release.apk`).
  - Built and pushed updated Docker Server Image (`rousseaukairos/affinite:latest` and `rousseaukairos/affinite:v0.27.1`) to Docker Hub.

## [v0.27.0] - 2026-08-05

### Features & Enhancements
- **Native Glassmorphism Project Boards System**:
  - Full-viewport (100% canvas) Kanban view with fixed 280px column width and horizontal scrolling.
  - Mouse wheel horizontal scroll support (`onWheel`) across Kanban columns.
  - Interactive Card Details modal with left-aligned checkboxes, custom tag labels, descriptions, and red trash icon delete buttons.
- **Dynamic Wallpapers & Theme Customization**:
  - Multi-preset HD wallpapers and gradient themes with configurable overlay darkness.
  - Custom wallpaper upload support (via direct image URL or local image file upload).
  - Dynamic board wallpaper previews on dashboard cards (`Project Boards`) with reactive Yjs observation.
- **Drag & Drop Micro-Animations**:
  - Smooth 0.25s cubic-bezier dragging micro-animations for reordering lists and cards.
  - Instant drag-end reset (`onDragEnd`) preventing opacity state sticking.
  - Smooth label pill expansion animations.
- **Linux AppImage Release**:
  - Standalone Linux x86_64 AppImage executable (`AFFiNITe-linux-x86_64.AppImage`).

## [v0.26.3] - 2026-08-03

### Features & Updates
- **Planka Kanban Board View**: Integrated custom Kanban Board workspace view with 272px standard column widths, white cards (`#ffffff`) with charcoal text (`#172b4d`), and dynamic wallpapers with darkness overlay.
- **Monorepo Linting**: Reached 0 errors and 0 warnings across all 6,673 workspace files via `yarn lint:ox`.
- **Decoupling Strategy & Fork Notice**: Updated project documentation detailing the roadmap to progressively decouple AFFiNITe from upstream AFFiNE architecture.
- **Linux AppImage Distribution**: Built standalone Linux x86_64 executable package (`AFFiNITe-linux-x86_64.AppImage`).
