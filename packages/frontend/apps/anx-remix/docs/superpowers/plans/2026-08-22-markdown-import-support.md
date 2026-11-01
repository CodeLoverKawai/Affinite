# Markdown (.md) Import Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete support for importing `.md` and `.markdown` files into Anx-Remix by converting them into rich, well-formatted EPUB 3 packages.

**Architecture:** A dedicated Markdown-to-EPUB converter service in `lib/service/convert_to_epub/md/convert_from_md.dart` that extracts YAML frontmatter for metadata, parses headings into hierarchical TOC sections, converts Markdown syntax (tables, code blocks, lists, quotes, styles) into valid XHTML, and packages them via `createEpub` with theme-compatible CSS. `importBook` and `allowBookExtensions` in `lib/service/book.dart` are updated to route `.md` and `.markdown` through this pipeline.

**Tech Stack:** Dart, Flutter, Riverpod, xml/xhtml escaping, archive (zip packaging for EPUB).

## Global Constraints
- No extra third-party heavy dependencies if existing libraries/Dart core can perform the conversion reliably.
- Valid XHTML output (all self-closing tags `<hr/>`, `<br/>`, `<img .../>`, XML entity escaping).
- Fully compatible with Foliate-js reading engine, CFI tracking, themes, and font scaling.

---

### Task 1: Markdown Conversion Engine (`convert_from_md.dart`) & EPUB Styling

**Files:**
- Create: `lib/service/convert_to_epub/md/convert_from_md.dart`
- Modify: `lib/service/convert_to_epub/create_epub.dart`
- Test: `test/service/convert_to_epub/md/convert_from_md_test.dart`

**Interfaces:**
- Produces: `Future<File> convertFromMd(File file)`
- Consumes: `createEpub(String title, String author, List<Section> sections)` from `lib/service/convert_to_epub/create_epub.dart`

- [ ] **Step 1: Write unit test for Frontmatter, Section Splitting, and XHTML conversion**

```dart
// test/service/convert_to_epub/md/convert_from_md_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:anx_reader/service/convert_to_epub/md/convert_from_md.dart';

void main() {
  group('Markdown Converter Tests', () {
    test('extractFrontmatter parses YAML frontmatter correctly', () {
      const input = '''---
title: My Markdown Book
author: Alice Developer
description: A great test book
---
# Chapter 1
Hello world!''';

      final result = extractFrontmatter(input);
      expect(result.metadata['title'], 'My Markdown Book');
      expect(result.metadata['author'], 'Alice Developer');
      expect(result.metadata['description'], 'A great test book');
      expect(result.body.trim(), '# Chapter 1\nHello world!');
    });

    test('buildMarkdownSections splits by headings with levels', () {
      const body = '''Intro paragraph before any chapter.

# Chapter 1: Introduction
Text in chapter 1.

## Section 1.1: Details
Sub-details here.

# Chapter 2: Summary
Final text.''';

      final sections = buildMarkdownSections(body, 'Fallback Title');
      expect(sections.length, 4);
      expect(sections[0].title, '');
      expect(sections[0].content, contains('Intro paragraph'));
      expect(sections[1].title, 'Chapter 1: Introduction');
      expect(sections[1].level, 1);
      expect(sections[2].title, 'Section 1.1: Details');
      expect(sections[2].level, 2);
      expect(sections[3].title, 'Chapter 2: Summary');
      expect(sections[3].level, 1);
    });

    test('markdownToXhtml converts markdown formatting to valid XHTML', () {
      const md = '''Paragraph with **bold**, *italic*, and `inline code`.

```dart
void main() {
  print("Hello <world> & all");
}
```

> Blockquote line 1
> Blockquote line 2

- List item 1
- List item 2

| Col 1 | Col 2 |
|---|---|
| A | B |
''';

      final xhtml = markdownToXhtml(md);
      expect(xhtml, contains('<strong>bold</strong>'));
      expect(xhtml, contains('<em>italic</em>'));
      expect(xhtml, contains('<code>inline code</code>'));
      expect(xhtml, contains('<pre><code>'));
      expect(xhtml, contains('&lt;world&gt; &amp; all'));
      expect(xhtml, contains('<blockquote>'));
      expect(xhtml, contains('<ul>'));
      expect(xhtml, contains('<li>List item 1</li>'));
      expect(xhtml, contains('<table>'));
      expect(xhtml, contains('<th>Col 1</th>'));
      expect(xhtml, contains('<td>A</td>'));
    });
  });
}
```

- [ ] **Step 2: Implement `lib/service/convert_to_epub/md/convert_from_md.dart`**
Implement frontmatter extraction, heading and section hierarchy generator, robust Markdown-to-XHTML converter, and `convertFromMd(File file)`.

- [ ] **Step 3: Enhance `createEpub.dart` with Markdown CSS styles**
Update `lib/service/convert_to_epub/create_epub.dart` to support styled code blocks, blockquotes, tables, and preformatted text in `style.css`.

- [ ] **Step 4: Run unit tests**
Run unit tests to ensure frontmatter parsing, section division, XHTML conversion, and table/code formatting pass.

---

### Task 2: Connect Markdown Import into Bookshelf & Service

**Files:**
- Modify: `lib/service/book.dart`
- Test: Manual import verification with sample `.md` files

**Interfaces:**
- Updates `allowBookExtensions` to `["epub", "mobi", "azw3", "fb2", "txt", "pdf", "md", "markdown"]`
- In `importBook`, if extension is `md` or `markdown`, invoke `convertFromMd(file)`.

- [ ] **Step 1: Update `allowBookExtensions` and `importBook` in `lib/service/book.dart`**
Add `"md"` and `"markdown"` to `allowBookExtensions` and call `convertFromMd` in `importBook`.

- [ ] **Step 2: Verify End-to-End Build and Test Suite**
Verify code formatting, static analysis, and test suites.
