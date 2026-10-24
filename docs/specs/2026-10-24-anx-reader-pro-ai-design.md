# Design Spec: Anx Reader Pro Suite & Zero-Key AI Companion for AFFiNITe

**Author:** Antigravity Engineering Pair  
**Date:** 2026-10-24  
**Status:** Approved by User (Option 1)  
**Branch:** `feat/anx-reader-streaks-calendar-habits`  
**Target Modules:**  
- `packages/frontend/core/src/desktop/pages/workspace/library/`  
- `packages/frontend/apps/electron/resources/web-static/foliate/src/`  
- `/home/rousseau/Documents/GitHub/Anx-Remix/lib/` (reference)

---

## 1. Executive Summary & Goals

Following the comprehensive audit of **Anx-Remix**, the user selected **Option 1: Experiencia de Lectura Pro & IA**, bringing the 5 most valuable in-reader features into AFFiNITe:
1. **TTS (Text-to-Speech) Floating Player with Synchronized Highlighting**: Sentence-by-sentence voice reading via Web Speech API (`window.speechSynthesis`), live speed control (`0.5x` to `2.0x`), sentence highlighting in sync with audio (`ttsHighlightColor`), auto-scrolling, and auto-page turns.
2. **In-Book Full-Text Search Drawer**: Real-time search across all chapters of the open EPUB via Foliate's `search()` API, displaying excerpt snippets with chapter names and click-to-jump navigation to exact CFIs.
3. **Floating Context Menu on Selection**: Instant toolbar positioned above text selections with a 5-color palette (Amarillo, Verde, Azul, Rosa, Púrpura, Subrayado), note editor, pronunciation/TTS, quote card generator, and AI prompt.
4. **AI Reading Assistant Panel (Antigravity Zero-Key Bridge)**: Floating side panel inside the reader connected directly to `window.__apis.handler.ai.chat` (local `agy` CLI with no API key needed), featuring quick-action chips (*Resumir capítulo*, *Explicar concepto*, *Generar mapa mental Mermaid*, *Preguntas de reflexión*).
5. **Excerpt Share Card Generator (Quote Cards)**: Visual card generator with 4 elegant design themes (Modern Dark, Editorial Sepia, OLED Obsidian, Emerald Garden), exportable directly as PNG or copied to clipboard.

---

## 2. Architectural Blueprint

```
+-----------------------------------------------------------------------------------------+
|                                    AFFiNITe /library                                    |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | Reader Top Bar: Title | Chapter | TOC | Search [Q] | TTS [V] | AI [B] | Styles | X |  |
|  +-----------------------------------------------------------------------------------+  |
|                                                                                         |
|  +---------------------------+  +--------------------------------+  +----------------+  |
|  | Search Drawer (Left)      |  | Foliate Reader (iframe)        |  | AI Drawer (Rt) |  |
|  | - Query input             |  | - EPUB Rendering               |  | - Antigravity  |  |
|  | - Results list with CFI   |  | - Synchronized TTS Highlights  |  |   Zero-Key agy |  |
|  | - Snippet context         |  | - Text Selection Coordinates   |  | - Quick Chips  |  |
|  |                           |  | - Dynamic Themes & Font Styles |  | - Mermaid Map  |  |
|  +---------------------------+  +--------------------------------+  +----------------+  |
|                                                |                                        |
|                                 +--------------v-----------------+                      |
|                                 | Floating Context Selection Bar |                      |
|                                 | [Y][G][B][P][V] | Note | TTS   |                      |
|                                 | QuoteCard | DailyNote | AI Expl|                      |
|                                 +--------------------------------+                      |
|                                                |                                        |
|  +---------------------------------------------v-------------------------------------+  |
|  | Floating TTS Player Bar: [|<][Play/Pause][>|] | Speed: 1.0x | Voice | Close [X]   |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Detailed Component Specifications

### 3.1. TTS Engine & Floating Player (`TtsFloatingBar`)
- **Speech Engine**: Built using standard `window.speechSynthesis` and `SpeechSynthesisUtterance`.
- **Synchronization Flow**:
  1. User clicks `Play` or activates TTS from a selection.
  2. If started from selection, AFFiNITe sends `sendReaderCommand('ttsFromCfi', cfi)`. Otherwise sends `sendReaderCommand('ttsHere')`.
  3. Foliate initializes its `TTS` iterator at that range.
  4. AFFiNITe requests `sendReaderCommand('ttsNext')`.
  5. `book.js` runs `ttsNext()`, which highlights the sentence via Foliate's `Overlayer`, ensures the sentence is visible in the viewport (`scrollToAnchor`), and posts `{ type: 'anx-reader', event: 'onTtsSentence', data: { text, cfi } }` to the parent window.
  6. AFFiNITe creates an utterance: `const u = new SpeechSynthesisUtterance(text); u.rate = rate; u.pitch = pitch; u.voice = selectedVoice;`.
  7. When `u.onend` fires: If player is still in `playing` state, it immediately calls `sendReaderCommand('ttsNext')` to read the subsequent sentence.
  8. When user clicks `Pause`: pauses synthesis and leaves current sentence highlighted.
  9. When user clicks `Stop` or closes the bar: cancels synthesis and calls `sendReaderCommand('ttsStop')` to clear the highlight.
- **Controls**:
  - Play / Pause toggle.
  - Previous sentence (`ttsPrev`), Next sentence (`ttsNext`).
  - Speed selector: `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`.
  - Sentence text preview.

### 3.2. In-Book Full-Text Search Drawer (`InBookSearchDrawer`)
- **Foliate Integration**:
  - `sendReaderCommand('search', query, { scope: 'book', matchCase: false })`.
  - In `book.js`, `search()` iterates through chapters and posts `{ type: 'anx-reader', event: 'onSearch', data: result }`.
  - Results contain `{ cfi, excerpt }` and progress.
- **UI & Interaction**:
  - Sleek sliding drawer from the left side.
  - Real-time search query input with clear button (`X`).
  - Result count badge (e.g. `24 resultados`).
  - Item cards with highlighted matching terms and chapter label.
  - Clicking a result invokes `sendReaderCommand('goToCfi', item.cfi)` and applies a temporary focus highlight.

### 3.3. Floating Selection Context Toolbar (`FloatingSelectionToolbar`)
- **Positioning**:
  - Computed from `selection.pos` sent by `onSelectionEnd`:
    `left = iframeRect.left + pos.left * iframeRect.width + ((pos.right - pos.left) * iframeRect.width) / 2`
    `top = iframeRect.top + pos.top * iframeRect.height - 48px`
- **Actions**:
  - 🎨 **Palette**: 5 color circles:
    - Amarillo (`#fef08a`)
    - Verde (`#bbf7d0`)
    - Azul (`#bfdbfe`)
    - Rosa (`#fbcfe8`)
    - Púrpura (`#e9d5ff`)
  - 📝 **Nota**: Opens mini input to attach personal notes to the highlight.
  - 🔊 **Leer**: Immediately triggers TTS for this selection.
  - 🖼️ **Tarjeta**: Opens the Excerpt Share Card modal with the selection pre-filled.
  - 📖 **Citar en Diario**: Adds markdown quote to today's Daily Note.
  - 🤖 **Explicar con IA**: Sends text to the AI Assistant panel.

### 3.4. AI Reading Assistant Panel (`AiReadingDrawer`)
- **Connection**: Zero-API-key via `(window as any).__apis?.handler?.ai?.chat` with `provider: 'antigravity'` and `modelId: 'gemini-4-argon-high'`.
- **Context Awareness**:
  - Automatically captures `book.title`, `book.author`, and `currentChapter`.
- **Quick Action Chips**:
  - 💡 *Resumir este capítulo*: Asks Antigravity for a structured executive summary of the current chapter.
  - 🔍 *Explicar concepto*: Explains selected text or difficult terms in simple terms.
  - 🧠 *Generar Mapa Mental Mermaid*: Asks Antigravity to produce valid Mermaid syntax (`mindmap` or `flowchart TD`) representing the chapter's conceptual architecture, rendering with AFFiNITe's native Mermaid preview.
  - ❓ *Preguntas de reflexión*: Generates 3 thought-provoking comprehension questions.

### 3.5. Excerpt Share Card Generator (`ExcerptCardModal`)
- **Themes**:
  1. *Modern Dark*: Rich slate gradient (`#0f172a` to `#1e293b`), crisp typography, emerald quotation accent.
  2. *Editorial Sepia*: Warm archival parchment (`#fbf0d9` to `#f3e4c3`), classic serif styling, burgundy accent.
  3. *OLED Obsidian*: Deep black (`#000000`), minimal border glow, pure white typography.
  4. *Emerald Night*: Deep forest teal (`#064e3b` to `#022c22`), gold quotation accent.
- **Card Elements**:
  - Giant quotation mark `“`.
  - Quote text (with adjustable font size if length > 250 characters).
  - Divider with subtle leaf/book glyph.
  - Book title, author name, and chapter name.
  - Minimalistic AFFiNITe watermark (`AFFiNITe · Anx Reader`).
- **Export Engine**:
  - Generates full-resolution PNG via HTML5 Canvas `toBlob()`.
  - **Copiar al portapapeles**: `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`.
  - **Descargar PNG**: Prompts save file `cita-[titulo].png`.

---

## 4. Verification Plan

1. **Unit Tests**:
   - `packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-reader-pro.spec.ts`:
     - Test TTS state transitions (play, pause, next, prev, stop).
     - Test search query sanitization, excerpt snippet trimming, and CFI indexing.
     - Test highlight color palette assignments.
     - Test Quote Card theme parameters and text layout calculations.
2. **TypeScript & Bundling**:
   - Run `yarn vitest run --browser.headless packages/frontend/core/src/desktop/pages/workspace/library/__tests__/`
   - Run `yarn affine @affine/electron-renderer build` to ensure zero compilation or bundling errors.
3. **Flatpak Packaging**:
   - Run `./build-flatpak.sh stable` to compile and install into the user's Flatpak environment.
   - Verify that all features are responsive and render cleanly inside `app.affinite.Affinite`.
