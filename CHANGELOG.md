# Changelog

All notable changes to **AFFiNITe** will be documented in this file.

## [v0.29.0] - 2026-10-18

### 📦 Native Flatpak Distribution & Flathub Ready
- **Official Flatpak Bundle (`AFFiNITe-linux-x86_64.flatpak`)**:
  - Direct single-file installer bundle (`138 MB`) runnable on any modern Linux distribution with `flatpak install AFFiNITe-linux-x86_64.flatpak`.
  - Built with `org.freedesktop.Platform//25.08` runtime and standalone unpacked native binaries (`affine.linux-x64-gnu.node`) for instant OS `dlopen()` loading.
- **Flathub Metadata & Manifests (`flathub/`)**:
  - Full AppStream 1.1 compliant metadata (`app.affinite.Affinite.metainfo.xml`) verified via `appstreamcli validate --no-net`.
  - Flathub build manifest (`app.affinite.Affinite.yml`) with Wayland, X11 fallback, DRI hardware acceleration, IPC, and pipewire/pulseaudio support.
  - Complete Spanish publication guide (`flathub/README.md`) for Flathub pull-request submission.
- **Host CLI Execution Permission**:
  - Enabled `--talk-name=org.freedesktop.Flatpak` in Flatpak finish args and automated `build-flatpak.sh` to allow sandboxed access to host tools like `agy` (Google Antigravity CLI) via `flatpak-spawn --host`.

### ⚡ Linux Performance & Single-Renderer Architecture
- **Single-Renderer Lightweight Tabs**:
  - Shared primary `WebContentsView` architecture across all tabs via `tab-views.ts`, eliminating the overhead of spawning a ~300 MB Chromium renderer process per tab (0 MB extra RAM per additional tab).
  - Instant in-memory `<1ms` tab switching in `Workbench` with per-tab history and active view preservation.
  - Detached inactive compositor layers so only the active tab is attached to the window's view hierarchy.
- **Wayland GPU Acceleration & Hyprland Blank Screen Fix**:
  - Enabled `--ozone-platform-hint=auto`, `UseOzonePlatform`, and `WaylandWindowDecorations`.
  - Fixed blank/white screen glitch on Hyprland and Wayland compositors by disabling problematic `CanvasOopRasterization`, applying solid `#121212` background, disabling background throttling, and triggering synchronous bounds invalidation on window focus.
  - Automatic Mesa GPU selection (`DRI_PRIME=0`, `VK_ICD_FILENAMES`) for hybrid Intel/NVIDIA laptops to avoid proprietary driver compositor stalls.
- **Bundle Diet & Resource Trimming**:
  - Reduced `dist/main.js` from 7.0 MB to <1 MB and `dist/preload.js` from 552 KB to <100 KB.
  - Trimmed 42 MB of unused Chromium locale `.pak` files and eliminated 73 MB of development source maps in production builds.

### 🔌 100% Offline Mode & Eager Local Mirroring
- **Connection Circuit-Breaker**:
  - Added smart circuit-breaker to `AutoReconnectConnection` in `@affine/nbstore`: trips after 3 consecutive failed attempts and enters quiet idle state instead of retrying endlessly every 3 seconds.
  - Automatic reconnection when `navigator.onLine` fires or when the user triggers a sync action.
- **Eager Local Blob Mirror**:
  - Implemented continuous `fullDownloadLoop` in `BlobSyncPeer` so 100% of workspace media and attachments are eagerly mirrored in local SQLite.
  - Replaced infinite backoff loops in frontend permission guards and cloud revalidators with fast 2-retry limits when offline.

### 📊 Mermaid Pro Suite
- **`/mermaid` Slash Command**:
  - Quick insertion of interactive Mermaid diagrams from the BlockSuite slash menu (`/mermaid`, `/diagram`, `/flowchart`, `/uml`, `/sequence`).
- **Live Split Editor & Instant Diagnostics**:
  - Dual-pane layout featuring real-time code editor on the left and live SVG preview on the right.
  - Preloaded with 6 visual templates: Flowchart, Sequence, UML Class, State Machine, Entity-Relationship (ER), and Mindmap.
  - Real-time syntax error validation with non-destructive fallback rendering (preserves last valid diagram state).
- **Theme Sync & Controls**:
  - Automatic synchronization with AFFiNITe Dark and Light themes.
  - Fixed mouse-wheel zoom math (requires `Ctrl`/`Meta` to prevent scroll hijacking) with dedicated Zoom In, Zoom Out, Fit, and 1-click SVG copy/download buttons.

### 🗓️ ISO Weekly Notes & Dedicated Weekly Reports Hub
- **ISO 8601 Weekly Notes (`YYYY-Www`)**:
  - Native support for weekly documents formatted as `YYYY-Www` (e.g., `2026-W42`) with full ISO week date range calculation (`dayjs/plugin/isoWeek`).
  - Structured Weekly Note template containing Weekly Goals, Key Priorities, Day-by-day Plan (Monday to Sunday), and Weekly Retrospective.
- **7-Day Daily Note Auto-Connection**:
  - When creating a Weekly Note (`createWeeklyJournal`), automatically discovers or creates the corresponding 7 Daily Notes (Monday–Sunday) and inserts interactive `LinkedPage` mentions linking each day directly to the weekly document.
- **Dedicated Weekly Reports Hub (`/weekly-reports`)**:
  - Dedicated navigation entry in the left sidebar below Journals.
  - Visual 7-day strip showing status of each day's daily note with 1-click creation/navigation.
  - Weekly logging completion rate (e.g., 7/7 days = 100%) and 1-click weekly synthesis to clipboard.

### 📅 Supercharged Calendar Planner (`/calendar`)
- **Multi-View Task & Schedule Planner**:
  - **Month View (`📅 Mes`)**: 7-column calendar grid with dedicated ISO Week row headers linking to Weekly Notes and daily note indicators.
  - **Week View (`🗓️ Semana`)**: 7-day planner with top weekly goals and daily task blocks.
  - **Day Time-Blocking View (`⏰ Día`)**: Hourly planner from 06:00 to 23:00 for precise time-blocking and scheduling.
  - **Monthly Agenda View (`📋 Agenda`)**: Categorized breakdown of upcoming deadlines, high-priority tasks, and overdue items with monthly KPI summary cards.
- **Category Filters & Quick Presets**:
  - Filter calendar items by category (`Trabajo`, `Estudio`, `Personal`, `Salud`, `Proyectos`) and quick-add tasks with 1-click preset buttons.
- **Bidirectional Kanban Board Sync**:
  - Added Due Date picker to `/boards` card details modal.
  - Board cards with due dates automatically appear on the calendar with board badges and click-to-edit capability.
  - Collapsible drawer for unscheduled board cards allowing instant date assignment.

### 🎯 Habits Tracking Suite (`/habits` & `/habit`)
- **Dedicated Habits Hub (`/habits`)**:
  - Sidebar entry featuring interactive habit matrices, completion streaks (current and longest), monthly completion rates, and an annual 365-day GitHub-style commit heatmap.
  - Category filters and weekly habit progress bars.
- **Journal-Scoped Slash Commands**:
  - `/habit` slash commands (`/habit`, `/habits`, `/habito`, `/habitos`) strictly scoped to Journal documents (`isJournalDoc`), preventing clutter in regular project docs.
  - Automatic date synchronization: toggling habit completions in a Journal note logs the completion against that specific note's date rather than always using today's system time.

### 🤖 Zero-API-Key Google Antigravity & Ollama AI Integration
- **Google Antigravity (`agy` CLI) Bridge**:
  - Native integration with the Google Antigravity SDK CLI (`agy`) executing host models (`gemini-4-argon-high`, `gemini-4-argon-medium`, `gemini-3.8-flash-high`, `claude-sonnet-5-5-high`, `claude-opus-5-5-high`, `gpt-oss-120b-medium`) with zero API key configuration.
  - Compatible with Flatpak sandbox via `flatpak-spawn --host`.
- **Local AI Provider & Offline Copilot**:
  - First-class support for Ollama (`http://127.0.0.1:11434`) and local CLI agents (`gemini-cli`, `claude-cli`).
  - Offline AI Chat (`/chat`) enabled in local workspaces without requiring remote server authentication or active internet connection.
  - Persistent local conversation storage and synthetic `EventSource` streaming.

---

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
