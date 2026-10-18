# Mermaid Pro Suite, Weekly Notes & Calendar Planner, Zero-Key Antigravity AI & Flathub Design Spec

**Date:** 2026-10-17
**Branch:** `feat/linux-performance-flatpak-offline`
**Status:** Approved

---

## 1. Overview & Architecture

This specification covers four integrated subsystems that transform AFFiNITe on Linux into a complete, zero-API-key, local-first productivity and engineering environment:

1. **Mermaid Pro Suite (`mermaid-preview.ts`, `code-block.ts`, Slash Menu `/mermaid`)**:
   - Fixes wheel-zoom math and scroll-hijacking in `MermaidPreview`.
   - Adds automatic dark/light theme synchronization, `suppressErrorRendering: true`, instant `mermaid.parse()` syntax error diagnostics (no 3-second retry freeze), template presets (Flowchart, Sequence, Class, State, ER, Mindmap), SVG copy/download, **Split Live Mode (`Code | Split | Preview`)** in `code-block.ts`, and `/mermaid` slash menu command.
2. **Weekly Notes (`Notas Semanales`) & Native Calendar Planner (`/calendar` + `/boards` Sync)**:
   - Extends `JournalStore` and `JournalService` to support ISO Weekly Notes (`YYYY-Www`, e.g., `2026-W42`) with a structured weekly planning template and a `Nota Diaria | Nota Semanal` header switcher in `/journals`.
   - Adds a dedicated `/calendar` workbench route and left-sidebar button with **Month, Week, and Agenda** views backed 100% by local workspace Yjs storage (`affinite_calendar_events` + Board cards from `/boards` + Daily/Weekly Journal badges).
   - Adds a `Due Date` (`Fecha límite`) picker to `CardModal` in `/boards` and allows dragging unscheduled board cards onto calendar days in `/calendar`.
3. **Zero-API-Key Antigravity (`agy` CLI), Local CLI & Ollama Bridge**:
   - Adds an Electron `ai` IPC handler namespace (`packages/frontend/apps/electron/src/main/ai/handlers.ts`) that invokes `agy` (Google Antigravity CLI, directly or via `flatpak-spawn --host` when running inside Flatpak), `gemini`/`claude` CLIs, or local `ollama` (`http://127.0.0.1:11434/v1`) without requiring cloud login or paid API keys.
   - Enables the `/chat` sidebar button in local/offline workspaces and updates `CopilotClient` / `AIModelSelector` to default to **Antigravity CLI (`agy` - Zero API Key)** with local session persistence (`affinite_local_ai_sessions`).
4. **Flathub & GitHub Release Distribution**:
   - Adds `flathub/app.affinite.Affinite.metainfo.xml` (AppStream metadata), `flathub/app.affinite.Affinite.yml` (Flathub manifest), and `flathub/README.md` with step-by-step Flathub submission instructions.
   - Updates `build-flatpak.sh` (`--talk-name=org.freedesktop.Flatpak` so `flatpak-spawn --host agy` works seamlessly inside the Flatpak sandbox) and `run_release.sh` to publish `AFFiNITe-linux-x86_64.flatpak` to GitHub Releases.
