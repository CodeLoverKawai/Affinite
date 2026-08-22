# Changelog

All notable changes to **AFFiNITe** will be documented in this file.

## [v0.28.0] - 2026-08-22

### 🌟 Features & Enhancements

- **Professional LaTeX Math Suite (`blocksuite/affine/blocks/latex` & `inlines/latex`)**:
  - **Centralized KaTeX Engine & Scientific Macros**: Preloaded support for number sets (`\R`, `\N`, `\Z`, `\Q`, `\C`, `\K`), vectors/tensors (`\bm`, `\vec`, `\grad`, `\curl`, `\div`, `\laplacian`), and calculus operators (`\diff`, `\pdiff`, `\d`, `\norm`, `\abs`, `\degree`, `\hbar`).
  - **Redesigned Latex Editor Menu**: Responsive adaptive popover (`520px - 820px`), real-time dual-pane Live KaTeX preview, quick template snippets, non-destructive syntax diagnostic alerts, and keyboard shortcuts (`Enter`, `Shift+Enter`, `Escape`).
  - **Text Selection & 1-Click Formula Copy**: Enabled `user-select: text` on all rendered equations and added a floating **"Copy LaTeX"** button with visual copy feedback.
  - **Lossless HTML Adapters**: Bidirectional AST converters preserving LaTeX equations and KaTeX/MathML data when exporting/importing HTML.
  - **Markdown Multiline Preprocessing**: Preserves multiline environments (`pmatrix`, `cases`, `aligned`) without paragraph fragmentation and supports inline `$formula$` triggers.

- **🎨 Graphical Equation Builder (Ecuaciones Gráficas)**:
  - **Dedicated Slash Menu Command**: `/greq`, `/graphical-equation`, `/visual-equation`, `/vmath`, `/formula`.
  - **Mode Toggle**: Instant switching between `[ 🎨 Visual Builder ]` and `[ ⚡ Code Editor ]`.
  - **Categorized Visual Palettes**: 5 palettes (Álgebra, Cálculo, Matrices & Vectores, Símbolos Griegos, Fórmulas Famosas con 1-clic).
  - **Smart Slot Navigation**: Template insertion with `\square` placeholders and `⇥ Next Slot □` quick jumping.
  - **Interactive Math Reference Guide**: `docs/notes/guia-ecuaciones-graficas.md` and `~/Documents/Affinite_Notes/Matematicas/guia-ecuaciones-graficas.md`.

### 📱 Multi-Platform Releases & Tooling
- **Linux AppImage**: Standalone executable `AFFiNITe-Math-linux-x86_64.AppImage` with bundled production dependencies in ASAR archive.
- **Android APK**: Native Android app package `AFFiNITe-Math-android-debug.apk` built with Capacitor, OpenJDK 21, and 4GB Gradle heap.

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
