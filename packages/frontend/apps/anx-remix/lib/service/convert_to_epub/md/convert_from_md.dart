import 'dart:convert';
import 'dart:io';

import 'package:anx_reader/service/convert_to_epub/create_epub.dart';
import 'package:anx_reader/service/convert_to_epub/section.dart';
import 'package:anx_reader/service/convert_to_epub/txt/convert_from_txt.dart';
import 'package:anx_reader/utils/log/common.dart';
import 'package:characters/characters.dart';
import 'package:path/path.dart' as path;

/// Container for extracted frontmatter and stripped body.
class MarkdownFrontmatterResult {
  final Map<String, String> metadata;
  final String body;

  const MarkdownFrontmatterResult({
    required this.metadata,
    required this.body,
  });
}

String _escapeXml(String value) {
  return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
}

/// Extracts YAML frontmatter enclosed between `---` markers at the start of the file.
MarkdownFrontmatterResult extractFrontmatter(String content) {
  final trimmed = content.trimLeft();
  if (!trimmed.startsWith('---')) {
    return MarkdownFrontmatterResult(metadata: {}, body: content);
  }

  // Find the end marker
  final afterFirstMarker = trimmed.substring(3);
  final endMarkerIndex = afterFirstMarker.indexOf(RegExp(r'\n---\s*(\n|$)'));
  if (endMarkerIndex == -1) {
    return MarkdownFrontmatterResult(metadata: {}, body: content);
  }

  final frontmatterContent = afterFirstMarker.substring(0, endMarkerIndex);
  final bodyStartIndex = 3 + endMarkerIndex;
  // Skip past the closing marker line
  final closingLineMatch =
      RegExp(r'\n---\s*(\n|$)').firstMatch(afterFirstMarker.substring(endMarkerIndex));
  final totalHeaderLength =
      (closingLineMatch != null) ? bodyStartIndex + closingLineMatch.end : bodyStartIndex;

  final body = afterFirstMarker.substring(totalHeaderLength - 3);

  final metadata = <String, String>{};
  final lines = LineSplitter.split(frontmatterContent);
  for (final line in lines) {
    final trimmedLine = line.trim();
    if (trimmedLine.isEmpty || trimmedLine.startsWith('#')) continue;

    final colonIndex = trimmedLine.indexOf(':');
    if (colonIndex > 0) {
      final key = trimmedLine.substring(0, colonIndex).trim().toLowerCase();
      var value = trimmedLine.substring(colonIndex + 1).trim();

      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      metadata[key] = value;
    }
  }

  return MarkdownFrontmatterResult(metadata: metadata, body: body);
}

/// Splits markdown content into hierarchical sections based on `#` and `##` headings.
/// Sub-headings (###, ####) are preserved within sections for continuous, readable chapters.
List<Section> buildMarkdownSections(String content, String fallbackTitle) {
  final headingRegex = RegExp(r'^(#{1,2})\s+(.+)$', multiLine: true);
  final matches = headingRegex.allMatches(content).toList();

  if (matches.isEmpty) {
    return [Section(fallbackTitle, content.trim(), 1)];
  }

  final sections = <Section>[];

  // Optional introductory section before first heading
  final firstMatch = matches.first;
  if (firstMatch.start > 0) {
    final intro = content.substring(0, firstMatch.start).trim();
    if (intro.isNotEmpty) {
      sections.add(Section('', intro, 1));
    }
  }

  for (var i = 0; i < matches.length; i++) {
    final match = matches[i];
    final level = match.group(1)!.length;
    final title = match.group(2)!.trim();

    final startPos = match.end;
    final endPos =
        i < matches.length - 1 ? matches[i + 1].start : content.length;

    final body = content.substring(startPos, endPos).trim();
    sections.add(Section(title, body, level));
  }

  return sections;
}

List<String> _splitTableCells(String row) {
  var trimmed = row.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);

  final cells = <String>[];
  final current = StringBuffer();
  var inCode = false;
  var inMath = false;

  for (var i = 0; i < trimmed.length; i++) {
    final char = trimmed[i];
    if (char == '`') {
      inCode = !inCode;
      current.write(char);
    } else if (char == r'$' && !inCode) {
      inMath = !inMath;
      current.write(char);
    } else if (char == '|' && !inCode && !inMath) {
      cells.add(current.toString().trim());
      current.clear();
    } else {
      current.write(char);
    }
  }
  cells.add(current.toString().trim());
  return cells;
}

String _renderInline(String text) {
  // First, extract inline code spans to prevent accidental formatting inside code
  final codeSpans = <String>[];
  var processed = text.replaceAllMapped(RegExp(r'`([^`]+)`'), (match) {
    final code = match.group(1)!;
    final token = '@@@INLINECODE${codeSpans.length}@@@';
    codeSpans.add('<code>${_escapeXml(code)}</code>');
    return token;
  });

  // Extract inline math formulas ($...$) to prevent XML escaping or markdown formatting conflicts
  final mathSpans = <String>[];
  processed = processed.replaceAllMapped(RegExp(r'(?<!\\)\$([^\$\n]+?)(?<!\\)\$'), (match) {
    final math = match.group(1)!;
    final token = '@@@INLINEMATH${mathSpans.length}@@@';
    final escapedMath = _escapeXml(math);
    mathSpans.add('<span class="math-inline" data-math="$escapedMath">\$$math\$</span>');
    return token;
  });

  // Escape XML in the rest of the text
  processed = _escapeXml(processed);

  // Images: ![alt](url)
  processed = processed.replaceAllMapped(
      RegExp(r'!\[([^\]]*)\]\(([^)]+)\)'),
      (match) => '<img alt="${match.group(1)}" src="${match.group(2)}"/>');

  // Links: [text](url)
  processed = processed.replaceAllMapped(
      RegExp(r'\[([^\]]+)\]\(([^)]+)\)'),
      (match) => '<a href="${match.group(2)}">${match.group(1)}</a>');

  // Bold & Italic: ***text*** or ___text___
  processed = processed.replaceAllMapped(
      RegExp(r'(\*\*\*|___)(.+?)\1'),
      (match) => '<strong><em>${match.group(2)}</em></strong>');

  // Bold: **text** or __text__
  processed = processed.replaceAllMapped(
      RegExp(r'(\*\*|__)(.+?)\1'),
      (match) => '<strong>${match.group(2)}</strong>');

  // Italic: *text* or _text_
  processed = processed.replaceAllMapped(
      RegExp(r'(\*|_)(.+?)\1'),
      (match) => '<em>${match.group(2)}</em>');

  // Strikethrough: ~~text~~
  processed = processed.replaceAllMapped(
      RegExp(r'~~(.+?)~~'),
      (match) => '<del>${match.group(1)}</del>');

  // Restore inline math formulas
  for (var i = 0; i < mathSpans.length; i++) {
    processed = processed.replaceAll('@@@INLINEMATH$i@@@', mathSpans[i]);
  }

  // Restore inline code spans
  for (var i = 0; i < codeSpans.length; i++) {
    processed = processed.replaceAll('@@@INLINECODE$i@@@', codeSpans[i]);
  }

  return processed;
}

/// Converts a Markdown string into clean, valid XHTML markup.
String markdownToXhtml(String markdown) {
  if (markdown.trim().isEmpty) return '';

  final lines = LineSplitter.split(markdown).toList();
  final buffer = StringBuffer();

  var i = 0;
  while (i < lines.length) {
    final line = lines[i];
    final trimmed = line.trim();

    // 1. Empty lines
    if (trimmed.isEmpty) {
      i++;
      continue;
    }

    // 2. Fenced Code Blocks (```)
    if (trimmed.startsWith('```')) {
      final info = trimmed.substring(3).trim().toLowerCase();
      final codeLines = <String>[];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.add(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }

      if (info == 'mermaid') {
        final rawMermaid = codeLines.join('\n').trim();
        final escapedMermaid = _escapeXml(rawMermaid);
        buffer.writeln('<div class="mermaid" data-mermaid="$escapedMermaid">$escapedMermaid</div>');
      } else {
        final langClass = info.isNotEmpty ? ' class="language-$info"' : '';
        final escapedCode = _escapeXml(codeLines.join('\n'));
        buffer.writeln('<pre><code$langClass>$escapedCode</code></pre>');
      }
      continue;
    }

    // 3. Display Math ($$ ... $$)
    if (trimmed.startsWith(r'$$')) {
      if (trimmed.endsWith(r'$$') && trimmed.length > 4) {
        // Single-line display math
        final mathContent = trimmed.substring(2, trimmed.length - 2).trim();
        final escapedMath = _escapeXml(mathContent);
        buffer.writeln('<div class="math-display" data-math="$escapedMath">\$\$$mathContent\$\$</div>');
        i++;
        continue;
      } else {
        // Multi-line display math
        final mathLines = <String>[];
        if (trimmed.length > 2) {
          mathLines.add(trimmed.substring(2));
        }
        i++;
        while (i < lines.length && !lines[i].trim().endsWith(r'$$')) {
          mathLines.add(lines[i]);
          i++;
        }
        if (i < lines.length) {
          final lastTrimmed = lines[i].trim();
          if (lastTrimmed.length > 2) {
            mathLines.add(lastTrimmed.substring(0, lastTrimmed.length - 2));
          }
          i++; // skip closing $$
        }
        final mathContent = mathLines.join('\n').trim();
        final escapedMath = _escapeXml(mathContent);
        buffer.writeln('<div class="math-display" data-math="$escapedMath">\$\$\n$mathContent\n\$\$</div>');
        continue;
      }
    }

    // 4. Blockquotes (> ...) & GitHub Alerts
    if (trimmed.startsWith('>')) {
      final quoteLines = <String>[];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        var qLine = lines[i].trim();
        if (qLine.startsWith('> ')) {
          qLine = qLine.substring(2);
        } else if (qLine.startsWith('>')) {
          qLine = qLine.substring(1);
        }
        quoteLines.add(qLine);
        i++;
      }

      final firstLine = quoteLines.isNotEmpty ? quoteLines.first.trim() : '';
      final alertMatch = RegExp(r'^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]', caseSensitive: false).firstMatch(firstLine);

      if (alertMatch != null) {
        final alertType = alertMatch.group(1)!.toLowerCase();
        final alertTitle = alertMatch.group(1)!.toUpperCase();
        final remainingLines = quoteLines.sublist(1);
        final alertBody = remainingLines.map(_renderInline).join('<br/>');
        buffer.writeln('<div class="markdown-alert markdown-alert-$alertType">');
        buffer.writeln('  <p class="markdown-alert-title">$alertTitle</p>');
        if (alertBody.isNotEmpty) {
          buffer.writeln('  <p>$alertBody</p>');
        }
        buffer.writeln('</div>');
      } else {
        final quoteContent = quoteLines.map(_renderInline).join('<br/>');
        buffer.writeln('<blockquote><p>$quoteContent</p></blockquote>');
      }
      continue;
    }

    // 5. Horizontal Rules (---, ***, ___)
    if (RegExp(r'^((\*{3,})|(-{3,})|(_{3,}))$').hasMatch(trimmed)) {
      buffer.writeln('<hr/>');
      i++;
      continue;
    }

    // 6. Tables (| col | col |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length &&
        lines[i + 1].trim().startsWith('|') && lines[i + 1].contains('-')) {
      final headerLine = trimmed;
      final headerCells = _splitTableCells(headerLine).map(_renderInline).toList();

      i += 2; // skip header and delimiter lines

      final bodyRows = <List<String>>[];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        final rowCells = _splitTableCells(lines[i].trim()).map(_renderInline).toList();
        bodyRows.add(rowCells);
        i++;
      }

      buffer.writeln('<table>');
      buffer.writeln('  <thead>');
      buffer.writeln('    <tr>');
      for (final cell in headerCells) {
        buffer.writeln('      <th>$cell</th>');
      }
      buffer.writeln('    </tr>');
      buffer.writeln('  </thead>');

      if (bodyRows.isNotEmpty) {
        buffer.writeln('  <tbody>');
        for (final row in bodyRows) {
          buffer.writeln('    <tr>');
          for (var c = 0; c < headerCells.length; c++) {
            final cell = c < row.length ? row[c] : '';
            buffer.writeln('      <td>$cell</td>');
          }
          buffer.writeln('    </tr>');
        }
        buffer.writeln('  </tbody>');
      }
      buffer.writeln('</table>');
      continue;
    }

    // 7. Headings within section body (e.g. h3-h6)
    if (RegExp(r'^(#{1,6})\s+(.+)$').hasMatch(trimmed)) {
      final match = RegExp(r'^(#{1,6})\s+(.+)$').firstMatch(trimmed)!;
      final level = match.group(1)!.length;
      final text = _renderInline(match.group(2)!.trim());
      buffer.writeln('<h$level>$text</h$level>');
      i++;
      continue;
    }

    // 8. Unordered Lists (- , * , + ) & Checklists
    if (RegExp(r'^\s*[-*+]\s+(.+)$').hasMatch(line)) {
      buffer.writeln('<ul>');
      while (i < lines.length &&
          (RegExp(r'^\s*[-*+]\s+(.+)$').hasMatch(lines[i]) ||
              lines[i].startsWith('   ') ||
              lines[i].startsWith('  ') ||
              lines[i].startsWith('\t'))) {
        if (RegExp(r'^\s*[-*+]\s+(.+)$').hasMatch(lines[i])) {
          final match = RegExp(r'^\s*[-*+]\s+(.+)$').firstMatch(lines[i])!;
          var itemText = match.group(1)!;
          var isTaskItem = false;
          var isChecked = false;
          if (itemText.startsWith('[ ] ')) {
            isTaskItem = true;
            itemText = itemText.substring(4);
          } else if (itemText.startsWith('[x] ') || itemText.startsWith('[X] ')) {
            isTaskItem = true;
            isChecked = true;
            itemText = itemText.substring(4);
          }
          i++;
          final itemChildren = <String>[];
          while (i < lines.length &&
              !RegExp(r'^\s*[-*+]\s+').hasMatch(lines[i]) &&
              !RegExp(r'^\s*\d+\.\s+').hasMatch(lines[i]) &&
              !RegExp(r'^#{1,6}\s+').hasMatch(lines[i].trim()) &&
              (lines[i].startsWith('  ') || lines[i].startsWith('\t') || lines[i].trim().startsWith(r'$$'))) {
            itemChildren.add(lines[i].trim());
            i++;
          }
          final renderedItem = _renderInline(itemText);
          final taskPrefix = isTaskItem
              ? '<input type="checkbox"${isChecked ? ' checked="checked"' : ''} disabled="disabled"/> '
              : '';
          final liClass = isTaskItem ? ' class="task-list-item"' : '';
          if (itemChildren.isEmpty) {
            buffer.writeln('  <li$liClass>$taskPrefix$renderedItem</li>');
          } else {
            final renderedChildren = markdownToXhtml(itemChildren.join('\n'));
            buffer.writeln('  <li$liClass>$taskPrefix$renderedItem<br/>$renderedChildren</li>');
          }
        } else {
          i++;
        }
      }
      buffer.writeln('</ul>');
      continue;
    }

    // 9. Ordered Lists (1. , 2. )
    if (RegExp(r'^\s*\d+\.\s+(.+)$').hasMatch(line)) {
      buffer.writeln('<ol>');
      while (i < lines.length &&
          (RegExp(r'^\s*\d+\.\s+(.+)$').hasMatch(lines[i]) ||
              lines[i].startsWith('   ') ||
              lines[i].startsWith('  ') ||
              lines[i].startsWith('\t'))) {
        if (RegExp(r'^\s*\d+\.\s+(.+)$').hasMatch(lines[i])) {
          final match = RegExp(r'^\s*\d+\.\s+(.+)$').firstMatch(lines[i])!;
          final itemText = match.group(1)!;
          i++;
          final itemChildren = <String>[];
          while (i < lines.length &&
              !RegExp(r'^\s*\d+\.\s+').hasMatch(lines[i]) &&
              !RegExp(r'^\s*[-*+]\s+').hasMatch(lines[i]) &&
              !RegExp(r'^#{1,6}\s+').hasMatch(lines[i].trim()) &&
              (lines[i].startsWith('  ') || lines[i].startsWith('\t') || lines[i].trim().startsWith(r'$$'))) {
            itemChildren.add(lines[i].trim());
            i++;
          }
          final renderedItem = _renderInline(itemText);
          if (itemChildren.isEmpty) {
            buffer.writeln('  <li>$renderedItem</li>');
          } else {
            final renderedChildren = markdownToXhtml(itemChildren.join('\n'));
            buffer.writeln('  <li>$renderedItem<br/>$renderedChildren</li>');
          }
        } else {
          i++;
        }
      }
      buffer.writeln('</ol>');
      continue;
    }

    // 10. Regular Paragraphs
    final paragraphLines = <String>[];
    while (i < lines.length) {
      final currTrimmed = lines[i].trim();
      if (currTrimmed.isEmpty ||
          currTrimmed.startsWith('```') ||
          currTrimmed.startsWith(r'$$') ||
          currTrimmed.startsWith('>') ||
          RegExp(r'^((\*{3,})|(-{3,})|(_{3,}))$').hasMatch(currTrimmed) ||
          (currTrimmed.startsWith('|') && currTrimmed.endsWith('|')) ||
          RegExp(r'^\s*[-*+]\s+').hasMatch(lines[i]) ||
          RegExp(r'^\s*\d+\.\s+').hasMatch(lines[i]) ||
          RegExp(r'^#{1,6}\s+').hasMatch(currTrimmed)) {
        break;
      }
      paragraphLines.add(currTrimmed);
      i++;
    }

    if (paragraphLines.isNotEmpty) {
      buffer.writeln('<p>${_renderInline(paragraphLines.join(' '))}</p>');
    }
  }

  return buffer.toString().trimRight();
}

/// Converts a Markdown (.md) file to an EPUB file.
Future<File> convertFromMd(File file) async {
  final filename = path.basenameWithoutExtension(file.path);
  AnxLog.info('Convert: Reading Markdown file: ${file.path}');

  final rawContent = readFileWithEncoding(file);
  final frontmatterResult = extractFrontmatter(rawContent);

  final metaTitle = frontmatterResult.metadata['title'];
  final metaAuthor = frontmatterResult.metadata['author'] ??
      frontmatterResult.metadata['creator'] ??
      'Unknown';

  // If no title in frontmatter, look for first # heading, else fallback to filename
  final firstHeadingMatch =
      RegExp(r'^#\s+(.+)$', multiLine: true).firstMatch(frontmatterResult.body);
  final title = metaTitle ??
      (firstHeadingMatch != null
          ? firstHeadingMatch.group(1)!.trim()
          : filename);
  final author = metaAuthor;

  AnxLog.info('Convert: Markdown title="$title", author="$author"');

  final rawSections = buildMarkdownSections(frontmatterResult.body, title);
  final formattedSections = rawSections.map((section) {
    return Section(
      section.title,
      markdownToXhtml(section.content),
      section.level,
    );
  }).toList();

  AnxLog.info('Convert: Created ${formattedSections.length} sections from Markdown');

  try {
    final epubFile = await createEpub(
      title,
      author,
      formattedSections,
      isHtmlContent: true,
    );
    AnxLog.info('Convert: Markdown EPUB created successfully at ${epubFile.path}');
    return epubFile;
  } catch (e) {
    AnxLog.severe('Convert: Failed to create EPUB from Markdown: $e');
    rethrow;
  }
}
