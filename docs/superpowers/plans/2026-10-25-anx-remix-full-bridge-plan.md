# Anx-Remix + AFFiNITe Unified Full Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Anx-Remix and AFFiNITe into a single seamless reading application where Anx-Remix runs full-screen with infinite scroll by default, full Foliate WebView postMessage bridge, real-time Yjs synchronization of books/notes/bookmarks/reading-time/groups, native AFFiNITe Daily Journal & BlockSuite Doc actions in the selection context menu, Web TTS, and Antigravity Zero-Key AI.

**Architecture:**
1. Expand `library-manager.ts` and `library/index.tsx` in AFFiNITe to remove the duplicate React reader/bookshelf UI and act as a full-featured Yjs & IPC Host (`anx-full-sync`, `anx-sync-notes`, `anx-sync-reading-times`, `anx-sync-groups`, `anx-quote-to-journal`, `anx-export-to-doc`, `anx-ai-request`).
2. Upgrade `foliate/src/book.js` and `Anx-Remix/lib/page/book_player/epub_player.dart` with a bidirectional `postMessage` RPC bridge (`anx-reader` events + `anx-eval` JS execution with promise result) and default `PageTurn.scroll` infinite scroll mode.
3. Implement in-memory stores backed by `WebBridge` in `BookNoteDao`, `ReadingTimeDao`, `Bookmark`, `GroupDao`, `AiHistoryStore`, `aiGenerateStream`, and `TtsHandler` inside Anx-Remix, plus AFFiNITe quick-action buttons in `ExcerptMenu`.

**Tech Stack:** TypeScript, React, Yjs, Vitest (AFFiNITe Host); Dart, Flutter Web, Riverpod, Foliate-js (Anx-Remix).

## Global Constraints

- Host AFFiNITe repo: `/home/rousseau/Documents/GitHub/Affinite`
- App Anx-Remix repo: `/home/rousseau/Documents/GitHub/Anx-Remix`
- Zero duplicate UI modes (`displayMode` removed from `library/index.tsx`).
- Default page turn mode on Web: `PageTurn.scroll` (infinite vertical scroll).
- All unit tests in `library-manager.spec.ts` must pass (`npx vitest run`).
- `flutter build web --no-pub --base-href /anx/` must succeed with exit code 0 and sync cleanly into `packages/frontend/apps/electron/resources/web-static/anx/`.

---

### Task 1: Expand `library-manager.ts` with Full Bridge Data Models & Transformers (TDD)

**Files:**
- Modify: `packages/frontend/core/src/desktop/pages/workspace/library/library-manager.ts`
- Test: `packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-manager.spec.ts`

**Interfaces:**
- Produces:
  - `AnxWebNote`: `{ id: number; bookId: number; content: string; cfi: string; chapter: string; type: string; color: string; readerNote?: string; createTime: string; updateTime: string }`
  - `AnxWebReadingTime`: `{ id?: number; bookId: number; date: string; readingTime: number }`
  - `AnxWebGroup`: `{ id: number; name: string; parentId?: number | null; isDeleted?: number; createTime?: string; updateTime?: string }`
  - `getNumericBookId(idOrPath: string): number`
  - `formatBooksForAnxBridge(books: LibraryBook[]): Record<string, unknown>[]`
  - `convertAnxNotesToHighlights(notes: AnxWebNote[], books: LibraryBook[]): LibraryHighlight[]`
  - `exportAnxNotesToMarkdown(bookTitle: string, author: string, notes: AnxWebNote[]): string`

- [ ] **Step 1: Write the failing unit tests in `library-manager.spec.ts`**
- [ ] **Step 2: Run Vitest to verify the new tests fail**
  Run: `npx vitest run packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-manager.spec.ts`
- [ ] **Step 3: Implement the Full Bridge helpers in `library-manager.ts`**
- [ ] **Step 4: Run Vitest to verify all tests pass**
  Run: `npx vitest run packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-manager.spec.ts`

---

### Task 2: Upgrade `foliate/src/book.js` with `anx-eval` RPC & Scroll Wheel Forwarding

**Files:**
- Modify: `packages/frontend/apps/electron/resources/web-static/foliate/src/book.js`

**Interfaces:**
- Consumes: `{ type: 'anx-eval', id?: string, source: string }` via `window.addEventListener('message')`
- Produces: `{ type: 'anx-eval-result', id?: string, result: unknown, error?: string }` via `window.parent.postMessage`

- [ ] **Step 1: Add `anx-eval` handler in `foliate/src/book.js` message listener**
  Execute `(0, eval)(data.source)`, await any returned Promise, and post `{ type: 'anx-eval-result', id: data.id, result }` back to `window.parent`.
- [ ] **Step 2: Ensure `callFlutter` posts JSON-safe payloads to `window.parent`**
  Ensure `onLoadEnd`, `onRelocated`, `onClick`, `onSetToc`, `onSelectionEnd`, `onSelectionCleared`, `onAnnotationClick`, `onSearch`, `renderAnnotations`, `onPushState`, `handleBookmark` always emit `{ type: 'anx-reader', event: name, data }` to `window.parent`.

---

### Task 3: Upgrade `WebBridge`, DAOs, AI, TTS, Context Menu & Default Infinite Scroll in `Anx-Remix`

**Files:**
- Modify: `/home/rousseau/Documents/GitHub/Anx-Remix/lib/config/shared_preference_provider.dart`
- Modify: `/home/rousseau/Documents/GitHub/Anx-Remix/lib/service/web_bridge.dart`
- Modify: `/home/rousseau/Documents/GitHub/Anx-Remix/lib/dao/book_note.dart`
- Modify: `/home/rousseau/Documents/GitHub/Anx-Remix/lib/providers/bookmark.dart`
- Modify: `/home/rousseau/Documents/GitHub/Anx-Remix/lib/dao/reading_time.dart`
- Modify: `/home/rousseau/Documents/GitHub/Anx-Remix/lib/providers/tb_groups.dart`
- Modify: `/home/rousseau/Documents/GitHub/Anx-Remix/lib/page/book_player/epub_player.dart`
- Modify: `/home/rousseau/Documents/GitHub/Anx-Remix/lib/widgets/context_menu/excerpt_menu.dart`
- Modify: `/home/rousseau/Documents/GitHub/Anx-Remix/lib/service/ai/ai_history.dart`
- Modify: `/home/rousseau/Documents/GitHub/Anx-Remix/lib/service/ai/index.dart`
- Modify: `/home/rousseau/Documents/GitHub/Anx-Remix/lib/main.dart`
- Modify: `/home/rousseau/Documents/GitHub/Anx-Remix/lib/service/tts/tts_handler.dart`

- [ ] **Step 1: Set `PageTurn.scroll` as default on Web in `shared_preference_provider.dart`**
- [ ] **Step 2: Expand `WebBridge` (`lib/service/web_bridge.dart`)**
  Add synchronization for `notes`, `readingTimes`, `groups`, `quoteToJournal`, `exportToAffineDoc`, `requestAiChat`, `evalInFoliate`, and foliate event listener registration.
- [ ] **Step 3: Implement in-memory persistence & sync in `BookNoteDao`, `Bookmark`, `ReadingTimeDao`, and `GroupDao`**
- [ ] **Step 4: Wire `EpubPlayerState` (`lib/page/book_player/epub_player.dart`) to `WebBridge` Foliate events & `_evalJs`**
  Replace direct `webViewController.evaluateJavascript` calls with a helper `_evalJs` / `_evalJsWithResult` that uses `WebBridge.evalInFoliate` on Web, and listen to `WebBridge.onFoliateEvent` so TOC, selection menu, progress, click-to-toggle-bars, search, annotations, and bookmarks work 100% on Web.
- [ ] **Step 5: Add AFFiNITe Daily Journal & BlockSuite Doc buttons in `ExcerptMenu` (`lib/widgets/context_menu/excerpt_menu.dart`)**
- [ ] **Step 6: Connect `AiHistoryStore` and `aiGenerateStream` to `WebBridge.requestAiChat` on Web**
- [ ] **Step 7: Initialize `audioHandler = TtsHandler()` on Web in `main.dart` and make `TtsHandler` web-safe**
- [ ] **Step 8: Build Anx-Remix Web and sync to AFFiNITe**
  Run: `cd /home/rousseau/Documents/GitHub/Anx-Remix && flutter build web --no-pub --base-href /anx/`

---

### Task 4: Unify `library/index.tsx` as Single Full-Screen Anx-Remix Host

**Files:**
- Modify: `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`

- [ ] **Step 1: Replace dual-mode `library/index.tsx` with unified Full-Bridge Host**
  Remove `displayMode` toggle and duplicate React reader/bookshelf UI; handle `anx-request-books` / `anx-request-sync`, `anx-request-import`, `anx-update-book`, `anx-delete-book`, `anx-update-progress`, `anx-sync-notes`, `anx-sync-reading-times`, `anx-sync-groups`, `anx-quote-to-journal`, `anx-export-to-doc`, and `anx-ai-request`.
- [ ] **Step 2: Run unit tests, build `@affine/electron-renderer`, and update master note**
  Run: `npx vitest run packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-manager.spec.ts && yarn affine @affine/electron-renderer build`
