# Mermaid Pro Suite, Weekly Notes & Calendar, Zero-Key Antigravity AI & Flathub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a pro-grade Mermaid live editor/preview, ISO Weekly Notes (`Notas Semanales`) + a native Monthly/Weekly Calendar & Task Planner (`/calendar`) synced with `/boards`, zero-API-key AI powered by Google Antigravity (`agy` CLI) & Ollama, and Flathub/GitHub Release distribution.

**Architecture:**
1. Enhance `MermaidPreview` (`mermaid-preview.ts`), `CodeBlockComponent` (`code-block.ts`), and `slash-menu.ts` with `/mermaid` slash commands, Split Live View (`Code | Split | Preview`), dark-mode theme detection, instant syntax diagnostics (`mermaid.parse`), diagram templates, fixed zoom math, and SVG export.
2. Extend `JournalStore`/`JournalService` for ISO Weekly Notes (`YYYY-Www`), add a `Día | Semana` switcher in `/journals`, add a `Due Date` picker in `/boards` `CardModal`, and create the `/calendar` route (`packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx`) aggregating local calendar tasks, board cards, and daily/weekly journals.
3. Build a native Electron main-process AI bridge (`packages/frontend/apps/electron/src/main/ai/handlers.ts`) that executes `agy` (directly or via `flatpak-spawn --host` inside Flatpak) and local Ollama/OpenAI endpoints, wiring `CopilotClient` and `/chat` to work 100% locally without API keys or AFFiNE Cloud login.
4. Author Flathub AppStream metadata (`flathub/app.affinite.Affinite.metainfo.xml`) and manifest (`flathub/app.affinite.Affinite.yml`), grant `org.freedesktop.Flatpak` session-bus access in `build-flatpak.sh` for host CLI bridging, update `run_release.sh`, and rebuild/install the updated Flatpak.

**Tech Stack:** TypeScript 5.9, Lit 3 (BlockSuite), Mermaid 11.12, React 19, Day.js (ISOWeek), Yjs CRDT, Electron 39 IPC, Google Antigravity CLI (`agy`), Flatpak / AppStream.

## Global Constraints

- Target branch: `feat/linux-performance-flatpak-offline`
- Zero external paid API key requirement: Antigravity (`agy`) and local Ollama must work offline/locally without AFFiNE Cloud authentication.
- All calendar events, weekly notes, and board due dates must persist locally in workspace Yjs/SQLite (`nbstore`).
- All unit tests must pass in headless Vitest (`yarn vitest run --browser.headless`).

---

### Task 1: Mermaid Pro Suite (Slash Command `/mermaid`, Split Live Editor, Dark Theme, Templates, Zoom Fix & Diagnostics)

**Files:**
- Modify: `packages/frontend/core/src/blocksuite/view-extensions/code-block-preview/mermaid-preview.ts`
- Modify: `blocksuite/affine/blocks/code/src/code-block.ts`
- Modify: `blocksuite/affine/blocks/code/src/styles.ts`
- Modify: `blocksuite/affine/blocks/code/src/configs/slash-menu.ts`
- Modify: `blocksuite/affine/blocks/code/src/code-toolbar/components/preview-button.ts`

**Interfaces:**
- Produces: `/mermaid` and `/diagram` slash menu items that insert an `affine:code` block with `language: 'mermaid'`, `preview: true`, and a starter flowchart diagram.
- Produces: Enhanced `MermaidPreview` with:
  - Auto dark/light theme (`document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default'`) and `suppressErrorRendering: true`.
  - Instant `await mermaid.parse(code)` validation that displays exact line/syntax errors in a clean diagnostic banner without freezing for 3 seconds or polluting `document.body`.
  - Fixed wheel-zoom math (`prevScale = this.scale` before updating `this.scale = newScale`) gated on `Ctrl`/`Meta` key (or fullscreen/zoom lock) so normal page scrolling is never hijacked.
  - Interactive toolbar inside the Mermaid preview header: **Template Presets** (`Flowchart`, `Sequence`, `Class`, `State`, `ER`, `Mindmap`), **Split Live Editor toggle (`Código + Vista Previa`)**, **Zoom `- / 100% / + / Fit`**, and **Copy / Download SVG**.

- [ ] **Step 1: Add `/mermaid` slash command in `blocksuite/affine/blocks/code/src/configs/slash-menu.ts`**
  Register a `Mermaid Diagram` slash menu item (aliases: `['mermaid', 'diagram', 'flowchart', 'graph']`) under `4_Content & Media` that creates an `affine:code` block with `language: 'mermaid'`, `preview: true`, and a clean starter flowchart, focusing it ready to edit.

- [ ] **Step 2: Upgrade `MermaidPreview` in `packages/frontend/core/src/blocksuite/view-extensions/code-block-preview/mermaid-preview.ts` and `code-block.ts`**
  - Fix the zoom math bug (`const prevScale = this.scale; this.scale = newScale; this.translateX = mouseX - scaleCenterX * (newScale / prevScale);`) and only intercept wheel events when `e.ctrlKey || e.metaKey` so vertical page scroll works smoothly.
  - Detect dark mode (`document.documentElement.dataset.theme === 'dark'`) and configure `mermaid.initialize({ startOnLoad: false, suppressErrorRendering: true, securityLevel: 'loose', theme: isDark ? 'dark' : 'default', ... })`.
  - Replace the 3x 1-second retry loop on syntax errors with `mermaid.parse(code)` validation: if invalid while typing in split mode, keep the last valid SVG visible with a subtle syntax error indicator (or show the exact parser error message with line number).
  - Add built-in **Live Split Editor** toggle (` Edit Code` side-by-side textarea synced directly with `this.model. props.text` via Yjs/Text), **Template Selector** dropdown (`Flowchart`, `Sequence`, `Class`, `State`, `ER`, `Mindmap`), and **Copy SVG / Download SVG** buttons right in the Mermaid preview bar!

- [ ] **Step 3: Build & Verify Task 1**
  Run `yarn affine @affine/electron build` and verify zero TypeScript/build errors.

- [ ] **Step 4: Commit Task 1**
  Commit message: `feat(mermaid): add /mermaid slash command, live split editor, templates, dark mode, and zoom/error fixes`

---

### Task 2: Weekly Notes (`Notas Semanales`) & Native Monthly/Weekly Calendar Planner (`/calendar` + `/boards` Sync)

**Files:**
- Modify: `packages/frontend/core/src/modules/journal/store/journal.ts`
- Modify: `packages/frontend/core/src/modules/journal/services/journal.ts`
- Modify: `packages/frontend/core/src/desktop/pages/workspace/journals/index.tsx`
- Modify: `packages/frontend/core/src/desktop/pages/workspace/detail-page/detail-page-header.tsx`
- Modify: `packages/frontend/core/src/blocksuite/block-suite-editor/journal-doc-title.tsx`
- Create: `packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx`
- Modify: `packages/frontend/core/src/desktop/workbench-router.ts`
- Modify: `packages/frontend/core/src/components/root-app-sidebar/index.tsx`
- Modify: `packages/frontend/core/src/desktop/pages/workspace/boards/index.tsx`
- Test: `packages/frontend/core/src/modules/journal/__tests__/weekly-journal.spec.ts`

**Interfaces:**
- Produces: `isJournalString(j)` and `isWeeklyJournalString(j)` (`^\d{4}-W\d{2}$`) in `JournalStore`, plus `ensureWeeklyJournal(maybeDate)` and `weeklyJournalsByDate$(maybeDate)` in `JournalService` that create a pre-structured Weekly Note (`YYYY-Www`) with sections for *Objetivos de la Semana*, *Prioridades Clave*, *Agenda / Bloques*, and *Revisión Semanal*.
- Produces: `Nota Diaria | Nota Semanal` header switcher in `/journals` and `JournalPageHeader`.
- Produces: `/calendar` workbench route (`packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx`) and `<CalendarButton />` in the left sidebar (`root-app-sidebar/index.tsx`) with:
  - **Vista Mensual (Month Grid)**, **Vista Semanal (7-Day Planner)**, and **Agenda Mensual (Task List)**.
  - Direct creation/completion/deletion of calendar tasks & events (with time, priority, category, and optional linked doc) persisted locally in workspace Yjs (`affinite_calendar_events`).
  - Live aggregation of all Kanban Board cards from `/boards` (`custom:isBoard === 'true'`), displaying cards with `dueDate` on their respective calendar days, plus an "Unscheduled Board Tasks" drawer to assign dates in 1 click, AND a `Fecha límite (Due Date)` `<input type="date">` inside `CardModal` in `boards/index.tsx`!
  - Quick buttons on every week row and day cell to open/create that week's **Nota Semanal (`YYYY-Www`)** or **Nota Diaria (`YYYY-MM-DD`)**.

- [ ] **Step 1: Write unit test for Weekly Notes (`isWeeklyJournalString`, `formatWeeklyJournalKey`)**
  Create `packages/frontend/core/src/modules/journal/__tests__/weekly-journal.spec.ts` and verify RED -> GREEN with `yarn vitest run --browser.headless packages/frontend/core/src/modules/journal/__tests__/weekly-journal.spec.ts`.

- [ ] **Step 2: Implement Weekly Notes in `journal/store/journal.ts`, `journal/services/journal.ts`, `journals/index.tsx`, `detail-page-header.tsx`, and `journal-doc-title.tsx`**
  Support `YYYY-Www` weekly journal strings, populate newly created Weekly Notes with structured headings/checklists, and add the `Nota Diaria` / `Nota Semanal` toggle button in the journal header.

- [ ] **Step 3: Add `Due Date` picker to `CardModal` in `boards/index.tsx` and build `/calendar` (`pages/workspace/calendar/index.tsx`, `workbench-router.ts`, `root-app-sidebar/index.tsx`)**
  - In `packages/frontend/core/src/desktop/pages/workspace/boards/index.tsx`: Add a `Fecha límite` (`dueDate`) date input + clear button in `CardModal`'s right sidebar so users can set/change `card.dueDate` on any board card.
  - Create `packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx` with Month, Week, and Agenda views, local Yjs calendar task storage, bi-directional Board card `dueDate` sync (including toggling card completion or changing `dueDate` directly from `/calendar`), and 1-click access to each day's Daily Note and each week's Weekly Note (`Nota Semanal`).
  - Register `/calendar` in `workbench-router.ts` and add `<CalendarButton />` right next to Journals and Project Boards in `root-app-sidebar/index.tsx`.

- [ ] **Step 4: Run tests and commit Task 2**
  Commit message: `feat(calendar,journal): add weekly notes, native monthly/weekly calendar planner, and board due dates`

---

### Task 3: Zero-API-Key Antigravity (`agy` CLI), Local CLI & Ollama AI Integration

**Files:**
- Create: `packages/frontend/apps/electron/src/main/ai/index.ts`
- Modify: `packages/frontend/apps/electron/src/main/handlers.ts`
- Modify: `packages/frontend/apps/electron/src/main/events.ts`
- Modify: `packages/frontend/core/src/desktop/dialogs/setting/account-setting/ai-model-selector.tsx`
- Modify: `packages/frontend/core/src/components/root-app-sidebar/index.tsx`
- Modify: `packages/frontend/core/src/blocksuite/ai/provider/copilot-client.ts`
- Modify: `packages/frontend/core/src/blocksuite/ai/provider/request.ts`

**Interfaces:**
- Produces: Electron main-process `ai` IPC handlers (`ai.detectLocalProviders`, `ai.chat`, `ai.listModels`) in `packages/frontend/apps/electron/src/main/ai/index.ts`:
  - Automatically detects `agy` (checking `~/.local/bin/agy`, `/usr/local/bin/agy`, `$PATH`, and using `flatpak-spawn --host` when `process.env.FLATPAK_ID` is set!), `gemini`, `claude`, and local `ollama` (`http://127.0.0.1:11434/v1`).
  - Executes prompts via `agy -p "<prompt>" --model <model> --output-format text` (or `ollama` HTTP `/v1/chat/completions`) with **zero API key required**.
- Produces: Local/Offline session & message manager in `CopilotClient` (`copilot-client.ts`) and `request.ts`:
  - Defaults `getSavedAIModel()` in `ai-model-selector.tsx` to `{ provider: 'antigravity', modelId: 'gemini-4-argon-high', apiKey: '', baseUrl: '' }` with presets for **Antigravity CLI (`agy` - Sin API Key)** (`gemini-4-argon-high`, `gemini-4-argon-medium`, `gemini-3.8-flash-high`, `claude-sonnet-5-5-high`, `claude-opus-5-5-high`, `gpt-oss-120b-medium`), **Ollama Local (Sin API Key)**, and custom CLI/OpenAI endpoints.
  - When `provider` is `'antigravity'`, `'ollama'`, `'local-cli'`, or when the user is offline/unauthenticated on Cloud, `CopilotClient` stores sessions & messages locally in `localStorage` (`affinite_local_ai_sessions_v1`) and streams responses from the Electron `ai.chat` IPC handler (or local `fetch`) through a synthetic `EventSource` compatible with AFFiNE's `/chat` page and inline BlockSuite AI tools!
  - Updates `AIChatButton` in `root-app-sidebar/index.tsx` so `/chat` is always visible when `enableAI` is enabled, even without a remote Cloud server.

- [ ] **Step 1: Create Electron `src/main/ai/index.ts` and register in `handlers.ts`**
  Implement `aiHandlers` (`detectLocalProviders`, `chat`) supporting `agy` (with automatic `flatpak-spawn --host` wrapper when inside Flatpak so it accesses `~/.local/bin/agy` on the host!), `gemini`/`claude` CLIs, and `ollama` HTTP.

- [ ] **Step 2: Update `ai-model-selector.tsx`, `root-app-sidebar/index.tsx`, `copilot-client.ts`, and `request.ts`**
  - Add `Antigravity (agy CLI - Sin API Key)` and `CLI Local (gemini / claude)` + `Ollama Local` to `ai-model-selector.tsx` as zero-key providers (defaulting to `antigravity` / `gemini-4-argon-high`).
  - Show `<AIChatButton />` in `root-app-sidebar/index.tsx` without requiring `serverFeatures?.copilot`.
  - In `copilot-client.ts` and `request.ts`, intercept session creation, message creation, history queries, and SSE streaming when using a local/zero-key provider (or when offline), routing through `window.__apis?.ai?.chat` / local fetch and returning a compatible `EventSource`-like emitter and async stream.

- [ ] **Step 3: Build & test `agy` bridge via Electron build**
  Run `yarn affine @affine/electron build` and verify clean compilation.

- [ ] **Step 4: Commit Task 3**
  Commit message: `feat(ai): integrate zero-API-key Google Antigravity (agy) CLI and local Ollama bridge`

---

### Task 4: Flathub Manifests, Host-Spawn Permission & Full Flatpak Rebuild

**Files:**
- Create: `flathub/app.affinite.Affinite.metainfo.xml`
- Create: `flathub/app.affinite.Affinite.yml`
- Create: `flathub/README.md`
- Modify: `build-flatpak.sh`
- Modify: `run_release.sh`

**Interfaces:**
- Produces: Validated Flathub AppStream file (`flathub/app.affinite.Affinite.metainfo.xml`), Flathub submission manifest (`flathub/app.affinite.Affinite.yml`), and step-by-step publication guide (`flathub/README.md`).
- Produces: Updated `build-flatpak.sh` that installs `app.affinite.Affinite.metainfo.xml` into `/app/share/metainfo/`, grants `--talk-name=org.freedesktop.Flatpak` (so `flatpak-spawn --host agy` can invoke host Antigravity CLI from inside the Flatpak!), and rebuilds + installs `AFFiNITe-linux-x86_64.flatpak`.

- [ ] **Step 1: Create `flathub/app.affinite.Affinite.metainfo.xml`, `flathub/app.affinite.Affinite.yml`, and `flathub/README.md`, and update `build-flatpak.sh` + `run_release.sh`**
  - Validate `flathub/app.affinite.Affinite.metainfo.xml` with `appstreamcli validate`.
  - Add `--talk-name=org.freedesktop.Flatpak` and install the metainfo file in `build-flatpak.sh`.
  - Update `run_release.sh` to also build and upload `AFFiNITe-linux-x86_64.flatpak` to GitHub Releases.

- [ ] **Step 2: Run full Flatpak rebuild (`./build-flatpak.sh --rebuild`) and verify**
  Rebuild the web and Electron bundles with all 3 new modules (Mermaid Pro, Weekly Notes + `/calendar`, and Antigravity `agy` zero-key AI) and install the updated Flatpak (`app.affinite.Affinite`).

- [ ] **Step 3: Commit Task 4**
  Commit message: `build(flathub): add Flathub manifests, host CLI bridge permission, and release integration`
