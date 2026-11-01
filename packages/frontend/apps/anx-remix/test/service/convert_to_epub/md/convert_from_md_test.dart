import 'package:anx_reader/service/convert_to_epub/md/convert_from_md.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Markdown Converter - Frontmatter Extraction', () {
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

    test('extractFrontmatter handles markdown without frontmatter', () {
      const input = '''# Plain Markdown
Just regular content without frontmatter.''';

      final result = extractFrontmatter(input);
      expect(result.metadata.isEmpty, isTrue);
      expect(result.body, input);
    });
  });

  group('Markdown Converter - Section Splitting & TOC', () {
    test('buildMarkdownSections splits by headings with appropriate levels', () {
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

    test('buildMarkdownSections creates single section when no headings exist', () {
      const body = 'Just a continuous text document without any headings.';
      final sections = buildMarkdownSections(body, 'Single Doc');
      expect(sections.length, 1);
      expect(sections[0].title, 'Single Doc');
      expect(sections[0].level, 1);
      expect(sections[0].content, contains('Just a continuous text'));
    });
  });

  group('Markdown Converter - Markdown to XHTML', () {
    test('markdownToXhtml converts formatting, code blocks, quotes, lists, and tables', () {
      const md = '''Paragraph with **bold**, *italic*, ~~strikethrough~~, and `inline code`.

```dart
void main() {
  print("Hello <world> & all");
}
```

> Blockquote line 1
> Blockquote line 2

- Item 1
- Item 2

1. First
2. Second

| Header 1 | Header 2 |
|---|---|
| Cell 1 | Cell 2 |

---
''';

      final xhtml = markdownToXhtml(md);
      expect(xhtml, contains('<strong>bold</strong>'));
      expect(xhtml, contains('<em>italic</em>'));
      expect(xhtml, contains('<del>strikethrough</del>'));
      expect(xhtml, contains('<code>inline code</code>'));
      expect(xhtml, contains('<pre><code class="language-dart">'));
      expect(xhtml, contains('&lt;world&gt; &amp; all'));
      expect(xhtml, contains('<blockquote>'));
      expect(xhtml, contains('<ul>'));
      expect(xhtml, contains('<li>Item 1</li>'));
      expect(xhtml, contains('<ol>'));
      expect(xhtml, contains('<li>First</li>'));
      expect(xhtml, contains('<table>'));
      expect(xhtml, contains('<th>Header 1</th>'));
      expect(xhtml, contains('<td>Cell 1</td>'));
      expect(xhtml, contains('<hr/>'));
    });

    test('markdownToXhtml converts links and images accurately', () {
      const md = 'Check [Flutter Docs](https://flutter.dev) and ![Logo](https://example.com/logo.png)';
      final xhtml = markdownToXhtml(md);
      expect(xhtml, contains('<a href="https://flutter.dev">Flutter Docs</a>'));
      expect(xhtml, contains('<img alt="Logo" src="https://example.com/logo.png"/>'));
    });

    test('markdownToXhtml converts math formulas and complex markdown notes correctly', () {
      const md = '''# 📚 Math Guide

| Method | Command | Ideal For |
| :--- | :--- | :--- |
| **Visual Eq** | `/greq` | Formula clicking with \$\\square\$. |

1. **Quadratic Formula**:
   \$\$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\$\$
2. **Pythagorean Theorem**:
   \$\$a^2 + b^2 = c^2\$\$
''';
      final xhtml = markdownToXhtml(md);
      expect(xhtml, contains('<table>'));
      expect(xhtml, contains('<th>Method</th>'));
      expect(xhtml, contains('<strong>Visual Eq</strong>'));
      expect(xhtml, contains('<code>/greq</code>'));
      expect(xhtml, contains('<span class="math-inline" data-math="\\square">'));
      expect(xhtml, contains('<div class="math-display" data-math="x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}">'));
      expect(xhtml, contains('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'));
      expect(xhtml, contains('a^2 + b^2 = c^2'));
      // Verify both items are inside the same ordered list
      expect(xhtml.indexOf('Quadratic Formula') < xhtml.indexOf('Pythagorean Theorem'), isTrue);
    });

    test('markdownToXhtml converts GitHub Alerts and Checklists correctly', () {
      const md = '''> [!NOTE]
> This is a key note.

> [!WARNING]
> Watch out for edge cases.

- [ ] Unfinished task
- [x] Completed task
''';
      final xhtml = markdownToXhtml(md);
      expect(xhtml, contains('<div class="markdown-alert markdown-alert-note">'));
      expect(xhtml, contains('<p class="markdown-alert-title">NOTE</p>'));
      expect(xhtml, contains('<div class="markdown-alert markdown-alert-warning">'));
      expect(xhtml, contains('<p class="markdown-alert-title">WARNING</p>'));
      expect(xhtml, contains('class="task-list-item"'));
      expect(xhtml, contains('type="checkbox"'));
      expect(xhtml, contains('checked="checked"'));
    });

    test('markdownToXhtml converts Mermaid diagrams and mindmaps correctly', () {
      const md = '''```mermaid
graph LR
   A["Minuto 0: <br> 1 amiba (2^0)"] -->|Pasan 3 min| B["Minuto 3: <br> 2 amibas (2^1)"]
   B -->|Pasan 3 min| C["Minuto 6: <br> 4 amibas (2^2)"]
   C -->|... se duplica cada 3 min ...| D["Minuto 60: <br> Recipiente LLENO (2^20)"]
```''';
      final xhtml = markdownToXhtml(md);
      expect(xhtml, contains('<div class="mermaid"'));
      expect(xhtml, contains('graph LR'));
      expect(xhtml, contains('Minuto 0'));
      expect(xhtml, contains('Recipiente LLENO'));
    });

    test('markdownToXhtml handles empty content gracefully', () {
      expect(markdownToXhtml('   '), '');
      expect(markdownToXhtml(''), '');
    });
  });
}
