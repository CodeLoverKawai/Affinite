import 'dart:io';

import 'package:anx_reader/service/convert_to_epub/generate_toc.dart';
import 'package:anx_reader/service/convert_to_epub/section.dart';
import 'package:anx_reader/utils/get_path/get_temp_dir.dart';
import 'package:anx_reader/utils/log/common.dart';
import 'package:archive/archive_io.dart';
import 'package:uuid/uuid.dart';

String _escapeXml(String value) {
  return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
}

Future<File> createEpub(
  String titleString,
  String authorString,
  // List<String> chapters,
  List<Section> sections, {
  bool isHtmlContent = false,
}) async {
  // create epub
  final cacheDir = await getAnxTempDir();
  final epubDir = Directory('${cacheDir.path}/$titleString');
  if (epubDir.existsSync()) {
    epubDir.deleteSync(recursive: true);
  }
  epubDir.createSync();

  // mimetype
  final mimetypeFile = File('${epubDir.path}/mimetype');
  mimetypeFile.createSync();
  mimetypeFile.writeAsStringSync('application/epub+zip');

  // META-INF/container.xml
  final metainfDir = Directory('${epubDir.path}/META-INF');
  metainfDir.createSync();
  final containerFile = File('${epubDir.path}/META-INF/container.xml');
  containerFile.createSync();
  containerFile.writeAsStringSync('''<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>''');

  // OEBPS
  final oebpsDir = Directory('${epubDir.path}/OEBPS');
  oebpsDir.createSync();

  // content.opf
  final contentFile = File('${oebpsDir.path}/content.opf');
  contentFile.createSync();
  final manifestItems = List.generate(
          sections.length,
          (index) =>
              '    <item id="item$index" href="xhtml/$index.xhtml" media-type="application/xhtml+xml"/>')
      .join('\n');
  final spineItems = List.generate(
          sections.length, (index) => '    <itemref idref="item$index"/>')
      .join('\n');

  contentFile.writeAsStringSync('''<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${_escapeXml(titleString)}</dc:title>
    <dc:creator>${_escapeXml(authorString)}</dc:creator>
    <dc:identifier id="pub-id">urn:uuid:${const Uuid().v4()}</dc:identifier>
  </metadata>

  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    $manifestItems
  </manifest>

  <spine toc="ncx">
    $spineItems
  </spine>
</package>''');

  // toc.ncx
  final tocFile = File('${oebpsDir.path}/toc.ncx');
  tocFile.createSync();
  tocFile.writeAsStringSync('''<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="zh-CN">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${const Uuid().v4()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="${sections.length}"/>
  </head>
  <docTitle>
    <text>${_escapeXml(titleString)}</text>
  </docTitle>
  <navMap>
    ${generateNestedToc(sections)}
  </navMap>
</ncx>''');

  // style.css
  final styleFile = File('${oebpsDir.path}/style.css');
  styleFile.createSync();
  styleFile.writeAsStringSync('''body {
  font-family: inherit;
  margin: 0;
  padding: 0;
}
pre {
  background-color: rgba(128, 128, 128, 0.15);
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
  font-family: monospace;
}
code {
  background-color: rgba(128, 128, 128, 0.15);
  padding: 2px 5px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
}
pre code {
  background-color: transparent;
  padding: 0;
}
blockquote {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 4px solid rgba(128, 128, 128, 0.4);
  background-color: rgba(128, 128, 128, 0.05);
  border-radius: 0 6px 6px 0;
}
.markdown-alert {
  margin: 1.2em 0;
  padding: 0.8em 1em;
  border-left: 4px solid #0969da;
  background-color: rgba(9, 105, 218, 0.08);
  border-radius: 0 6px 6px 0;
}
.markdown-alert-title {
  font-weight: bold;
  margin-top: 0;
  margin-bottom: 0.4em;
}
.markdown-alert-note {
  border-left-color: #218bff;
  background-color: rgba(33, 139, 255, 0.08);
}
.markdown-alert-note .markdown-alert-title {
  color: #218bff;
}
.markdown-alert-tip {
  border-left-color: #2da44e;
  background-color: rgba(45, 164, 78, 0.08);
}
.markdown-alert-tip .markdown-alert-title {
  color: #2da44e;
}
.markdown-alert-important {
  border-left-color: #8250df;
  background-color: rgba(130, 80, 223, 0.08);
}
.markdown-alert-important .markdown-alert-title {
  color: #8250df;
}
.markdown-alert-warning {
  border-left-color: #d97706;
  background-color: rgba(217, 119, 6, 0.08);
}
.markdown-alert-warning .markdown-alert-title {
  color: #d97706;
}
.markdown-alert-caution {
  border-left-color: #cf222e;
  background-color: rgba(207, 34, 46, 0.08);
}
.markdown-alert-caution .markdown-alert-title {
  color: #cf222e;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.2em 0;
  overflow-x: auto;
  display: table;
}
th, td {
  border: 1px solid rgba(128, 128, 128, 0.35);
  padding: 8px 12px;
  text-align: left;
  vertical-align: top;
}
th {
  background-color: rgba(128, 128, 128, 0.15);
  font-weight: bold;
}
tr:nth-child(even) {
  background-color: rgba(128, 128, 128, 0.05);
}
hr {
  border: 0;
  height: 1px;
  background: rgba(128, 128, 128, 0.3);
  margin: 2em 0;
}
img {
  max-width: 100%;
  height: auto;
}
.math-display {
  margin: 1.2em 0;
  text-align: center;
  overflow-x: auto;
  font-size: 1.1em;
}
.math-inline {
  font-size: 1.05em;
}
.task-list-item {
  list-style-type: none;
}
.task-list-item input[type="checkbox"] {
  margin-right: 0.5em;
}
.mermaid-container {
  text-align: center;
  margin: 1.5em 0;
  overflow-x: auto;
}
.mermaid-container svg {
  max-width: 100%;
  height: auto;
}
''');
  // xhtml
  final xhtmlDir = Directory('${oebpsDir.path}/xhtml');
  xhtmlDir.createSync();
  for (var i = 0; i < sections.length; i++) {
    final xhtmlFile = File('${xhtmlDir.path}/$i.xhtml');
    xhtmlFile.createSync();

    final rawTitle = sections[i].title.trim();
    final level = sections[i].level.clamp(1, 6);
    final content = sections[i].content;

    final heading = rawTitle.isEmpty
        ? ''
        : '    <h$level>${_escapeXml(rawTitle)}</h$level>';

    final bodyBuffer = StringBuffer();
    if (heading.isNotEmpty) {
      bodyBuffer.writeln(heading);
    }

    if (isHtmlContent) {
      bodyBuffer.writeln(content);
    } else {
      final paragraphLines = content
          .split('\n')
          .map((e) => e.trim())
          .where((line) => line.isNotEmpty)
          .map((line) => '    <p>${_escapeXml(line)}</p>')
          .toList();

      for (final line in paragraphLines) {
        bodyBuffer.writeln(line);
      }
    }

    final bodyContent = bodyBuffer.toString().trimRight();

    xhtmlFile.writeAsStringSync('''<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head>
    <meta charset="utf-8"/>
    <title>${_escapeXml(rawTitle.isEmpty ? titleString : rawTitle)}</title>
    <link rel="stylesheet" type="text/css" href="../style.css"/>
  </head>
  <body>
${bodyContent.isEmpty ? '' : '$bodyContent\n'}
  </body>
</html>''');
  }

  // zip
  final zipFile = File('${cacheDir.path}/$titleString.epub');
  zipFile.createSync();

  try {
    final encoder = ZipFileEncoder();
    encoder.create(zipFile.path);
    await encoder.addFile(mimetypeFile);
    await encoder.addDirectory(metainfDir);
    await encoder.addDirectory(oebpsDir);
    await encoder.close();
  } catch (e) {
    AnxLog.severe('EPUB: ZIP compression failed: $e');
    rethrow;
  }

  epubDir.deleteSync(recursive: true);
  return zipFile;
}
