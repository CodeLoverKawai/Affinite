# Implementation Plan: Anx Reader Pro Suite & Zero-Key AI Companion

**Author:** Antigravity Engineering Pair  
**Date:** 2026-10-24  
**Design Reference:** `docs/specs/2026-10-24-anx-reader-pro-ai-design.md`  
**Branch:** `feat/anx-reader-streaks-calendar-habits`

---

## Task Breakdown

### Task 1: TDD Unit Tests (`library-reader-pro.spec.ts`)
- **File:** `packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-reader-pro.spec.ts`
- **Tests**:
  1. `processSearchResults(rawResults, currentChapter)`: Deduplicates and extracts clean snippet text with surrounding context.
  2. `TtsController`: Tests sentence state management (initial, playing, paused, stopped, rate multiplier, next sentence queueing).
  3. `formatQuoteCardLayout(quote, title, author, theme)`: Computes typography dimensions, padding, and max characters before scaling font down.
  4. `HIGHLIGHT_COLORS`: Validates color hex codes and default opacity.

### Task 2: Foliate Reader IPC Bridge Extension (`book.js`)
- **Files:**  
  - `packages/frontend/apps/electron/resources/web-static/foliate/src/book.js`  
  - `/home/rousseau/Documents/GitHub/Anx-Remix/assets/foliate-js/src/book.js`
- **Enhancements**:
  - Add `search` and `clearSearch` handlers to `window.addEventListener('message')`.
  - Add `ttsHere`, `ttsFromCfi`, `ttsNext`, `ttsPrev`, `ttsStop` handlers to `message` listener, posting `{ type: 'anx-reader', event: 'onTtsSentence', data: { text, cfi } }` to `window.parent`.
  - Add `getChapterContent` handler to return the text of the active chapter for AI summarization.

### Task 3: In-Book Search Drawer (`InBookSearchDrawer`)
- **File:** `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`
- **Components**:
  - Add `🔍 Buscar en el libro` button to reader top bar (`Ctrl+F` / `Cmd+F` shortcut).
  - Search drawer sliding in from the left with live debounced query input.
  - Search results list with chapter title, snippet excerpt, and click-to-jump to CFI.
  - Clear search highlights on close or new query.

### Task 4: Synchronized TTS Player Floating Bar (`TtsFloatingBar`)
- **File:** `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`
- **Components**:
  - Floating player bar docked at bottom center with sleek glassmorphism.
  - Play / Pause, Next Sentence (`>|`), Previous Sentence (`|<`), Stop (`X`).
  - Speed buttons: `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`.
  - Voice selector dropdown (populated via `speechSynthesis.getVoices()`).
  - Active sentence text preview in the bar.
  - Sentence synchronization with Foliate `Overlayer` highlight and auto-scrolling.

### Task 5: Floating Selection Context Toolbar (`FloatingSelectionToolbar`)
- **File:** `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`
- **Components**:
  - Dynamic positioning above selection using `selection.pos`.
  - 5-color palette (Amarillo, Verde, Azul, Rosa, Púrpura).
  - Note popover for attaching personal annotations.
  - Quick action buttons: Pronounce/TTS, Quote Card, Daily Note quote, AI Explanation.

### Task 6: Zero-Key AI Reading Assistant Drawer (`AiReadingDrawer`)
- **File:** `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`
- **Components**:
  - Right sliding drawer activated via `🤖 Asistente IA` button.
  - Direct connection to `window.__apis.handler.ai.chat` (Antigravity `agy` CLI).
  - Quick prompt chips:
    - 💡 *Resumir este capítulo*
    - 🔍 *Explicar concepto seleccionado*
    - 🧠 *Generar Mapa Mental Mermaid*
    - ❓ *Preguntas de comprensión*
  - Chat stream with Markdown rendering and code block copy.

### Task 7: Excerpt Share Card Modal (`ExcerptCardModal`)
- **File:** `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`
- **Components**:
  - 4 design themes: Modern Dark, Editorial Sepia, OLED Obsidian, Emerald Night.
  - Canvas rendering engine for generating crisp PNG.
  - "Copiar Imagen" (Clipboard API) and "Descargar PNG" buttons.

### Task 8: Verification & Flatpak Rebuild
- Run Vitest tests: `yarn vitest run --browser.headless packages/frontend/core/src/desktop/pages/workspace/library/__tests__/`
- Compile electron-renderer: `yarn affine @affine/electron-renderer build`
- Package and install updated Flatpak: `./build-flatpak.sh stable`
- Verify inside `flatpak run app.affinite.Affinite`.
