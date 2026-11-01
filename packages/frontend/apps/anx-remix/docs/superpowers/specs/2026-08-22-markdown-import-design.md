# Markdown (.md) Import Support Design Document

**Date:** 2026-08-22  
**Status:** Approved  
**Author:** Pair Programming Agent & User  

---

## 1. Overview

This design specifies the end-to-end support for importing Markdown (`.md` and `.markdown`) files into Anx-Remix. The import process converts Markdown documents into compliant EPUB 3 packages in the background, making full use of the Foliate-js reader engine, including CFI position tracking, bookmarks, highlights, text-to-speech (TTS), table of contents (TOC), and theme customization.

---

## 2. Goals & Success Criteria

- Allow users to select `.md` and `.markdown` files from the bookshelf file picker.
- Parse YAML Frontmatter (`--- ... ---`) for metadata extraction (`title`, `author`, `description`).
- Divide documents cleanly into chapters/sections using Markdown heading hierarchy (`#`, `##`, `###`), establishing an accurate, nested Table of Contents (TOC).
- Render full Markdown syntax (headings, bold, italics, strikethrough, blockquotes, code blocks, lists, tables, links, images, horizontal rules) into valid XHTML.
- Embed styled CSS in the generated EPUB to render code blocks, tables, and blockquotes cleanly across both light and dark themes.
- Guarantee full compatibility with existing reader features (Foliate-js webview, CFI bookmarks, search, reading stats, font and theme changes).

---

## 3. Architecture & Components

```
User selects .md file
         │
         ▼
[bookshelf_page / importBookList] ──► Checks allowBookExtensions ("md", "markdown")
         │
         ▼
[MD5Service & Duplication Check] ──► Standard duplicate prevention
         │
         ▼
[convertFromMd(File)]
         │
         ├── 1. Read file with multi-encoding fallback (UTF-8, GBK, Latin1, UTF-16)
         ├── 2. Extract YAML Frontmatter (title, author, description)
         ├── 3. Parse Markdown into sections divided by headings (#, ##, ...)
         ├── 4. Convert Markdown syntax to semantic XHTML per section
         └── 5. Build EPUB package via createEpub() with enhanced CSS styling
         │
         ▼
[getBookMetadata & saveBook] ──► Inserts into SQLite bookDao & updates UI
```

### 3.1. File Detection & Registration
- Add `"md"` and `"markdown"` to `allowBookExtensions` in `lib/service/book.dart`.
- Update `importBook(File file, WidgetRef ref)` to detect `.md` and `.markdown` and delegate to `convertFromMd(file)`.

### 3.2. Markdown Converter (`lib/service/convert_to_epub/md/convert_from_md.dart`)
- **Encoding:** Read file content using encoding detection (UTF-8 primary, GBK, Latin1, UTF-16 fallbacks).
- **Frontmatter Parser:**
  - Detect leading `---` delimiter blocks.
  - Parse YAML key-value pairs (`title`, `author`/`creator`, `description`).
  - Strip frontmatter from the markdown body before chapter division.
- **Title/Author Fallbacks:**
  - Title: Frontmatter `title` -> First `# Heading` -> Filename without extension.
  - Author: Frontmatter `author` -> Regex detection -> `'Unknown'`.
- **Chapter / Section Splitting & TOC:**
  - Parse Markdown headings (`#`, `##`, `###`, etc.).
  - Generate `Section(title, content, level)` where level reflects heading depth (1 for `#`, 2 for `##`, etc.).
  - Sections before the first heading are captured as introductory section if non-empty.
  - If no headings are present, handle as single section (or chunk if exceptionally large > 50,000 chars).
- **Markdown to XHTML Compilation:**
  - Robust parser/transformer that compiles Markdown blocks and inline elements to valid XHTML:
    - Code blocks (```` ```lang ... ``` ````) -> `<pre><code>...</code></pre>` (escaped XML entities).
    - Inline code (`` `code` ``) -> `<code>...</code>`.
    - Blockquotes (`> text`) -> `<blockquote><p>...</p></blockquote>`.
    - Tables (`| Header 1 | Header 2 |`) -> `<table><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>`.
    - Unordered & Ordered lists (`-`, `*`, `1.`) -> `<ul>` / `<ol>`.
    - Bold/Italic/Strikethrough (`**`, `*`, `~~`) -> `<strong>`, `<em>`, `<del>`.
    - Links (`[text](url)`) and images (`![alt](url)`).
    - Horizontal rules (`---` / `***`) -> `<hr/>`.

### 3.3. EPUB Generation & CSS Styling
- Extend or configure `createEpub` to embed modern, responsive CSS rules for Markdown elements:
  - Code block styling: font-family monospace, background tint, padding, border-radius, horizontal scroll handling.
  - Table styling: border-collapse, borders, cell padding, alternate row shading.
  - Blockquote styling: left accent border, indentation, italicized color tone.

---

## 4. Error Handling & Edge Cases

- **Empty / Tiny files:** Handled gracefully by creating a single-section EPUB with fallback title.
- **Malformed Frontmatter:** Fall back to raw content without crashing.
- **Large Markdown files:** Efficient string parsing without excessive memory overhead.
- **Special XML characters:** All user-provided markdown content escaped properly for valid XHTML (`&`, `<`, `>`, `"`, `'`).

---

## 5. Testing & Verification Plan

- Unit test for Markdown parsing and section extraction (`test/service/convert_to_epub/md/convert_from_md_test.dart`):
  - Test Frontmatter extraction (title, author, description).
  - Test heading level hierarchy (#, ##, ###) and section titles.
  - Test code blocks, tables, blockquotes, lists, and inline formatting conversion to valid XHTML.
  - Test fallback mechanisms for files without headings or frontmatter.
- Integration test for EPUB generation from sample `.md` files.
- Manual verification: Import sample `.md` files in Anx-Remix and verify display, TOC, themes, and font controls.
