import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';
import 'dart:typed_data';
import 'dart:ui';

import 'package:anx_reader/dao/book.dart';
import 'package:anx_reader/dao/book_note.dart';
import 'package:anx_reader/dao/reading_time.dart';
import 'package:anx_reader/dao/tag.dart';
import 'package:anx_reader/models/book.dart';
import 'package:anx_reader/models/book_note.dart';
import 'package:anx_reader/models/reading_time.dart';
import 'package:anx_reader/models/tag.dart';
import 'package:anx_reader/models/tb_group.dart';
import 'package:anx_reader/providers/book_list.dart';
import 'package:anx_reader/providers/book_notes.dart';
import 'package:anx_reader/providers/notes_page_current_book.dart';
import 'package:anx_reader/providers/notes_statistics.dart';
import 'package:anx_reader/providers/tags.dart';
import 'package:anx_reader/providers/tb_groups.dart';
import 'package:anx_reader/utils/log/common.dart';
import 'package:anx_reader/utils/platform_utils.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:web/web.dart' as web;

typedef FoliateEventListener = void Function(String event, dynamic data);

class WebBridge {
  static bool _initialized = false;
  static WidgetRef? _ref;
  static web.BroadcastChannel? _foliateChannel;
  static int _evalSeq = 0;
  static int _aiSeq = 0;
  static final List<FoliateEventListener> _foliateListeners = [];
  static final Map<String, Completer<dynamic>> _evalCompleters = {};
  static final Map<String, Completer<String>> _aiCompleters = {};

  // Web HTML5 Audio TTS state
  static web.HTMLAudioElement? _ttsAudio;
  static Completer<bool>? _ttsChunkCompleter;
  static int _ttsSessionId = 0;
  static bool _ttsStopped = true;

  static void addFoliateListener(FoliateEventListener listener) {
    if (!_foliateListeners.contains(listener)) {
      _foliateListeners.add(listener);
    }
  }

  static void removeFoliateListener(FoliateEventListener listener) {
    _foliateListeners.remove(listener);
  }

  static void _reconcileOrphanedNotes() {
    // Preserve note identities faithfully. Do not forcibly reassign bookId,
    // which causes notes to migrate across books when books are opened or closed.
    return;
  }

  static void invalidateNoteProviders() {
    final ref = _ref;
    if (ref == null) return;
    try {
      ref.invalidate(notesStatisticsProvider);
      ref.invalidate(bookIdAndNotesProvider);
      ref.invalidate(notesPageCurrentBookProvider);
      ref.invalidate(bookNotesControllerProvider);
    } catch (_) {}
  }

  static void _handleIncomingRawMessage(dynamic rawData) {
    try {
      if (rawData == null) return;
      Map<String, dynamic> msg;
      if (rawData is String) {
        msg = jsonDecode(rawData) as Map<String, dynamic>;
      } else {
        try {
          msg = jsonDecode(rawData.toString()) as Map<String, dynamic>;
        } catch (_) {
          return;
        }
      }

      final type = msg['type']?.toString();
      if (type == null) return;

      if (type == 'anx-diagnostic-log') {
        try {
          final str = rawData is String ? rawData : jsonEncode(rawData);
          web.window.parent?.postMessage(str.toJS, '*'.toJS);
        } catch (_) {}
        return;
      }

      if (type == 'anx-reader') {
        final evtName = msg['event']?.toString() ?? '';
        final data = msg['data'];
        for (final listener
            in List<FoliateEventListener>.from(_foliateListeners)) {
          try {
            listener(evtName, data);
          } catch (e, st) {
            AnxLog.severe(
                '[WebBridge] Error in foliate listener ($evtName): $e\n$st');
          }
        }
        return;
      }

      if (type == 'anx-eval-result') {
        final id = msg['id']?.toString();
        if (id != null && _evalCompleters.containsKey(id)) {
          final completer = _evalCompleters.remove(id)!;
          if (!completer.isCompleted) {
            completer.complete(msg['result']);
          }
        }
        return;
      }

      if (type == 'anx-ai-response') {
        final reqId = msg['requestId']?.toString();
        if (reqId != null && _aiCompleters.containsKey(reqId)) {
          final completer = _aiCompleters.remove(reqId)!;
          if (!completer.isCompleted) {
            if (msg['error'] != null) {
              completer.complete('Error: ${msg['error']}');
            } else {
              completer.complete(msg['content']?.toString() ?? '');
            }
          }
        }
        return;
      }

      final ref = _ref;
      if (ref == null) return;

      AnxLog.info('[WebBridge] Received message from host: $type');

      if ((type == 'anx-sync-books' || type == 'anx-full-sync') &&
          msg['books'] is List) {
        final List<dynamic> bookList = msg['books'];
        BookDao.webBooks = bookList.map(_parseBook).toList();

        if (msg['notes'] is List) {
          final List<dynamic> noteList = msg['notes'];
          BookNoteDao.webNotes = noteList.map(_parseNote).toList();
        }

        _reconcileOrphanedNotes();

        if (msg['readingTimes'] is List) {
          final List<dynamic> rtList = msg['readingTimes'];
          ReadingTimeDao.webReadingTimes =
              rtList.map(_parseReadingTime).toList();
        }

        if (msg['groups'] is List) {
          final List<dynamic> groupList = msg['groups'];
          GroupDao.webGroups = groupList.map(_parseGroup).toList();
        }

        if (msg['tags'] is List) {
          final List<dynamic> tagList = msg['tags'];
          TagDao.webTags = tagList.map(_parseTag).toList();
        }

        if (msg['bookTags'] is List) {
          final List<dynamic> btList = msg['bookTags'];
          TagDao.webBookTags = btList.map(_parseBookTag).toList();
        }

        if (msg['tags'] is List || msg['bookTags'] is List) {
          TagDao.persistWebTags(notifyBridge: false);
          ref.invalidate(tagListProvider);
        }

        AnxLog.info(
            '[WebBridge] Synced ${BookDao.webBooks.length} books, ${BookNoteDao.webNotes.length} notes, ${ReadingTimeDao.webReadingTimes.length} reading sessions from host');
        ref.read(bookListProvider.notifier).refresh();
        invalidateNoteProviders();
      } else if (type == 'anx-book-imported' && msg['book'] != null) {
        final newBook = _parseBook(msg['book']);
        BookDao.webBooks.removeWhere((b) => b.filePath == newBook.filePath);
        BookDao.webBooks.insert(0, newBook);
        _reconcileOrphanedNotes();
        AnxLog.info('[WebBridge] Book imported from host: ${newBook.title}');
        ref.read(bookListProvider.notifier).refresh();
        invalidateNoteProviders();
      }
    } catch (e, st) {
      AnxLog.severe('[WebBridge] Error handling message: $e\n$st');
    }
  }

  static void init(WidgetRef ref) {
    _ref = ref;
    if (!AnxPlatform.isWeb || _initialized) return;
    _initialized = true;

    AnxLog.info('[WebBridge] Initializing web postMessage listener');

    try {
      _foliateChannel = web.BroadcastChannel('anx-foliate-bridge');
      _foliateChannel!.addEventListener(
        'message',
        (web.MessageEvent event) {
          _handleIncomingRawMessage(event.data);
        }.toJS,
      );
    } catch (e) {
      AnxLog.warning('[WebBridge] BroadcastChannel init warning: $e');
    }

    web.window.addEventListener(
      'message',
      (web.MessageEvent event) {
        _handleIncomingRawMessage(event.data);
      }.toJS,
    );

    requestBooks();
  }

  static Book _parseBook(dynamic item) {
    final raw = item is Map ? item : jsonDecode(jsonEncode(item));
    int parsedId = 1;
    if (raw['id'] is int) {
      parsedId = raw['id'];
    } else if (raw['id'] != null) {
      parsedId = int.tryParse(raw['id'].toString()) ??
          raw['id'].toString().hashCode.abs();
    }
    return Book(
      id: parsedId,
      title: raw['title']?.toString() ?? 'Sin título',
      author: raw['author']?.toString() ?? 'Desconocido',
      coverPath:
          raw['coverPath']?.toString() ?? raw['cover']?.toString() ?? '',
      filePath: raw['filePath']?.toString() ?? '',
      lastReadPosition: raw['lastReadPosition']?.toString() ?? '',
      readingPercentage: (raw['readingPercentage'] is num)
          ? (raw['readingPercentage'] as num).toDouble()
          : 0.0,
      rating:
          (raw['rating'] is num) ? (raw['rating'] as num).toDouble() : 0.0,
      groupId: (raw['groupId'] is num) ? (raw['groupId'] as num).toInt() : 0,
      isDeleted: raw['isDeleted'] == true,
      description: raw['description']?.toString() ?? '',
      createTime: DateTime.tryParse(raw['createTime']?.toString() ?? '') ??
          DateTime.now(),
      updateTime: DateTime.tryParse(raw['updateTime']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  static Tag _parseTag(dynamic item) {
    final raw = item is Map ? item : jsonDecode(jsonEncode(item));
    final colorVal = (raw['color'] is num) ? (raw['color'] as num).toInt() : null;
    return Tag(
      id: (raw['id'] is num) ? (raw['id'] as num).toInt() : 1,
      name: raw['name']?.toString() ?? '',
      color: colorVal == null ? null : Color(0xFF000000 | (colorVal & 0x00FFFFFF)),
    );
  }

  static BookTag _parseBookTag(dynamic item) {
    final raw = item is Map ? item : jsonDecode(jsonEncode(item));
    return BookTag(
      id: (raw['id'] is num) ? (raw['id'] as num).toInt() : 1,
      bookId: (raw['bookId'] is num) ? (raw['bookId'] as num).toInt() : 1,
      tagId: (raw['tagId'] is num) ? (raw['tagId'] as num).toInt() : 1,
    );
  }

  static BookNote _parseNote(dynamic item) {
    final raw = item is Map ? item : jsonDecode(jsonEncode(item));
    int? parsedId;
    if (raw['id'] is int) {
      parsedId = raw['id'];
    } else if (raw['id'] != null) {
      parsedId = int.tryParse(raw['id'].toString());
    }
    int bookId = 1;
    if (raw['bookId'] is int) {
      bookId = raw['bookId'];
    } else if (raw['book_id'] is int) {
      bookId = raw['book_id'];
    } else if (raw['bookId'] != null) {
      bookId = int.tryParse(raw['bookId'].toString()) ?? 1;
    }
    String rawColor = (raw['color']?.toString() ?? '66CCFF').replaceAll('#', '').trim();
    final lower = rawColor.toLowerCase();
    const namedColors = {
      'yellow': 'FEF08A',
      'green': 'BBF7D0',
      'blue': '66CCFF',
      'pink': 'FBCFE8',
      'purple': 'E9D5FF',
      'red': 'E11D48',
    };
    if (namedColors.containsKey(lower)) {
      rawColor = namedColors[lower]!;
    } else {
      rawColor = rawColor.toUpperCase();
    }
    if (rawColor.isEmpty || rawColor == 'FFF176' || !RegExp(r'^[0-9A-F]{3,8}$').hasMatch(rawColor)) {
      rawColor = '66CCFF';
    }
    return BookNote(
      id: parsedId,
      bookId: bookId,
      content: raw['content']?.toString() ?? '',
      cfi: raw['cfi']?.toString() ?? '',
      chapter: raw['chapter']?.toString() ?? '',
      type: raw['type']?.toString() ?? 'highlight',
      color: rawColor,
      readerNote:
          raw['readerNote']?.toString() ?? raw['reader_note']?.toString(),
      createTime: DateTime.tryParse(raw['createTime']?.toString() ??
              raw['create_time']?.toString() ??
              '') ??
          DateTime.now(),
      updateTime: DateTime.tryParse(raw['updateTime']?.toString() ??
              raw['update_time']?.toString() ??
              '') ??
          DateTime.now(),
    );
  }

  static ReadingTime _parseReadingTime(dynamic item) {
    final raw = item is Map ? item : jsonDecode(jsonEncode(item));
    int? id;
    if (raw['id'] is int) id = raw['id'];
    int bookId = 1;
    if (raw['bookId'] is int) {
      bookId = raw['bookId'];
    } else if (raw['book_id'] is int) {
      bookId = raw['book_id'];
    } else if (raw['bookId'] != null) {
      bookId = int.tryParse(raw['bookId'].toString()) ?? 1;
    }
    int seconds = 0;
    if (raw['readingTime'] is num) {
      seconds = (raw['readingTime'] as num).toInt();
    } else if (raw['reading_time'] is num) {
      seconds = (raw['reading_time'] as num).toInt();
    }
    return ReadingTime(
      id: id,
      bookId: bookId,
      date: raw['date']?.toString(),
      readingTime: seconds,
    );
  }

  static TbGroup _parseGroup(dynamic item) {
    final raw = item is Map ? item : jsonDecode(jsonEncode(item));
    return TbGroup(
      id: (raw['id'] is num) ? (raw['id'] as num).toInt() : 1,
      name: raw['name']?.toString() ?? 'Grupo',
      parentId: (raw['parentId'] is num) ? (raw['parentId'] as num).toInt() : null,
      isDeleted: (raw['isDeleted'] is num) ? (raw['isDeleted'] as num).toInt() : 0,
      createTime: raw['createTime']?.toString(),
      updateTime: raw['updateTime']?.toString(),
    );
  }

  static void _postToAllIframes(web.Node root, String payload) {
    try {
      final children = root.childNodes;
      for (int i = 0; i < children.length; i++) {
        final node = children.item(i);
        if (node == null) continue;
        if (node.nodeName.toUpperCase() == 'IFRAME') {
          try {
            final iframe = node as web.HTMLIFrameElement;
            iframe.contentWindow?.postMessage(payload.toJS, '*'.toJS);
          } catch (_) {}
        }
        try {
          final el = node as web.Element;
          final shadow = el.shadowRoot;
          if (shadow != null) {
            _postToAllIframes(shadow, payload);
          }
        } catch (_) {}
        if (node.hasChildNodes()) {
          _postToAllIframes(node, payload);
        }
      }
    } catch (_) {}
  }

  static Future<dynamic> evalInFoliate(String source,
      {bool expectResult = false}) async {
    if (!AnxPlatform.isWeb) return null;
    try {
      final seq = 'seq-${++_evalSeq}';
      final reqId = expectResult ? seq : null;
      Completer<dynamic>? completer;
      if (reqId != null) {
        completer = Completer<dynamic>();
        _evalCompleters[reqId] = completer;
      }

      final payload = jsonEncode({
        'type': 'anx-eval',
        'seq': seq,
        if (reqId != null) 'id': reqId,
        'source': source,
        'script': source,
      });

      try {
        _foliateChannel?.postMessage(payload.toJS);
      } catch (_) {}

      final docBody = web.document.documentElement;
      if (docBody != null) {
        _postToAllIframes(docBody, payload);
      }

      if (completer != null) {
        return await completer.future.timeout(
          const Duration(seconds: 4),
          onTimeout: () {
            _evalCompleters.remove(reqId);
            return null;
          },
        );
      }
    } catch (e) {
      AnxLog.warning('[WebBridge] evalInFoliate error: $e');
    }
    return null;
  }

  static String _detectLanguage(String text) {
    if (RegExp(r'[\u4e00-\u9fff]').hasMatch(text)) return 'zh-CN';
    if (RegExp(r'[\u3040-\u30ff]').hasMatch(text)) return 'ja';
    if (RegExp(r'[\uac00-\ud7af]').hasMatch(text)) return 'ko';
    if (RegExp(r'[\u0400-\u04ff]').hasMatch(text)) return 'ru';
    if (RegExp(r'[áéíóúñÁÉÍÓÚÑ¿¡]').hasMatch(text)) return 'es';
    final lower = text.toLowerCase();
    if (RegExp(r'\b(the|and|that|with|from|this|have|which|their|would|there|about)\b')
        .hasMatch(lower)) {
      return 'en';
    }
    return 'es';
  }

  static List<String> _splitTextForTts(String text, {int maxLen = 180}) {
    final cleaned = text.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (cleaned.isEmpty) return const [];
    if (cleaned.length <= maxLen) return [cleaned];

    final chunks = <String>[];
    var remaining = cleaned;
    while (remaining.length > maxLen) {
      int splitAt = -1;
      for (final sep in ['. ', '; ', ', ', ': ', ' ']) {
        final idx = remaining.lastIndexOf(sep, maxLen);
        if (idx > 30) {
          splitAt = idx + sep.trimRight().length;
          break;
        }
      }
      if (splitAt <= 0) splitAt = maxLen;
      final part = remaining.substring(0, splitAt).trim();
      if (part.isNotEmpty) chunks.add(part);
      remaining = remaining.substring(splitAt).trim();
    }
    if (remaining.isNotEmpty) chunks.add(remaining);
    return chunks;
  }

  static Future<bool> speakTts(
    String text, {
    double volume = 1.0,
    double rate = 1.0,
    double pitch = 1.0,
  }) async {
    if (!AnxPlatform.isWeb) return false;
    final chunks = _splitTextForTts(text);
    if (chunks.isEmpty) return true;

    final sessionId = ++_ttsSessionId;
    _ttsStopped = false;
    final lang = _detectLanguage(text);

    for (final chunk in chunks) {
      if (_ttsStopped || sessionId != _ttsSessionId) return false;
      final completer = Completer<bool>();
      _ttsChunkCompleter = completer;

      try {
        _ttsAudio?.pause();
        final audio = web.HTMLAudioElement();
        _ttsAudio = audio;
        final encoded = Uri.encodeComponent(chunk);
        audio.src = '/api/anx-tts?tl=$lang&q=$encoded';
        audio.volume = volume.clamp(0.0, 1.0);
        final effectiveRate = rate <= 0.1 ? 1.0 : rate.clamp(0.5, 2.0);
        audio.playbackRate = effectiveRate;
        audio.defaultPlaybackRate = effectiveRate;

        audio.onended = (web.Event _) {
          if (!completer.isCompleted) completer.complete(true);
        }.toJS;
        audio.onerror = (web.Event _) {
          if (!completer.isCompleted) completer.complete(false);
        }.toJS;

        audio.play();
      } catch (e) {
        if (!completer.isCompleted) completer.complete(false);
      }

      final ok = await completer.future.timeout(
        const Duration(seconds: 25),
        onTimeout: () => false,
      );
      if (!ok || _ttsStopped || sessionId != _ttsSessionId) {
        return false;
      }
    }
    return !_ttsStopped && sessionId == _ttsSessionId;
  }

  static void stopTts() {
    _ttsStopped = true;
    _ttsSessionId++;
    try {
      _ttsAudio?.pause();
      _ttsAudio?.src = '';
      _ttsAudio = null;
    } catch (_) {}
    if (_ttsChunkCompleter != null && !_ttsChunkCompleter!.isCompleted) {
      _ttsChunkCompleter!.complete(false);
    }
    _ttsChunkCompleter = null;
  }

  static void requestBooks() {
    if (!AnxPlatform.isWeb) return;
    try {
      final payload = jsonEncode({'type': 'anx-request-books'});
      web.window.parent?.postMessage(payload.toJS, '*'.toJS);
    } catch (e) {
      AnxLog.warning('[WebBridge] Failed to postMessage requestBooks: $e');
    }
  }

  static void importBook() {
    if (!AnxPlatform.isWeb) return;
    try {
      AnxLog.info('[WebBridge] Requesting host importBook');
      final payload = jsonEncode({'type': 'anx-request-import'});
      web.window.parent?.postMessage(payload.toJS, '*'.toJS);
    } catch (e) {
      AnxLog.warning('[WebBridge] Failed to postMessage importBook: $e');
    }
  }

  static void openBook(Book book) {
    if (!AnxPlatform.isWeb) return;
    try {
      final payload = jsonEncode({
        'type': 'anx-open-book',
        'id': book.id,
        'filePath': book.filePath,
        'title': book.title,
        'author': book.author,
        'lastReadPosition': book.lastReadPosition,
        'readingPercentage': book.readingPercentage,
      });
      web.window.parent?.postMessage(payload.toJS, '*'.toJS);
    } catch (e) {
      AnxLog.warning('[WebBridge] Failed to postMessage openBook: $e');
    }
  }

  static void deleteBook(Book book) {
    if (!AnxPlatform.isWeb) return;
    try {
      AnxLog.info('[WebBridge] Requesting host deleteBook: ${book.title}');
      final payload = jsonEncode({
        'type': 'anx-delete-book',
        'id': book.id,
        'filePath': book.filePath,
      });
      web.window.parent?.postMessage(payload.toJS, '*'.toJS);
    } catch (e) {
      AnxLog.warning('[WebBridge] Failed to postMessage deleteBook: $e');
    }
  }

  static void updateProgress(Book book, double percentage, String cfi) {
    if (!AnxPlatform.isWeb) return;
    try {
      final payload = jsonEncode({
        'type': 'anx-update-progress',
        'id': book.id,
        'filePath': book.filePath,
        'percentage': percentage,
        'cfi': cfi,
      });
      web.window.parent?.postMessage(payload.toJS, '*'.toJS);
    } catch (e) {
      AnxLog.warning('[WebBridge] Failed to postMessage updateProgress: $e');
    }
  }

  static void syncNotes({bool invalidateProviders = true}) {
    if (!AnxPlatform.isWeb) return;
    try {
      final notesPayload = BookNoteDao.webNotes
          .map((n) {
            final cleanColor = n.color.replaceFirst(RegExp(r'^#+'), '');
            return {
              'id': n.id ?? 0,
              'bookId': n.bookId,
              'content': n.content,
              'cfi': n.cfi,
              'chapter': n.chapter,
              'type': n.type,
              'color': '#$cleanColor',
              'readerNote': n.readerNote,
              'createTime': (n.createTime ?? DateTime.now()).toIso8601String(),
              'updateTime': n.updateTime.toIso8601String(),
            };
          })
          .toList();
      final payload = jsonEncode({
        'type': 'anx-sync-notes',
        'notes': notesPayload,
      });
      web.window.parent?.postMessage(payload.toJS, '*'.toJS);
      if (invalidateProviders) {
        invalidateNoteProviders();
      }
    } catch (e) {
      AnxLog.warning('[WebBridge] Failed to syncNotes: $e');
    }
  }

  static void syncReadingTimes() {
    if (!AnxPlatform.isWeb) return;
    try {
      final rtPayload = ReadingTimeDao.webReadingTimes
          .map((r) => {
                'id': r.id,
                'bookId': r.bookId,
                'date': r.date ?? DateTime.now().toIso8601String().substring(0, 10),
                'readingTime': r.readingTime,
              })
          .toList();
      final payload = jsonEncode({
        'type': 'anx-sync-reading-times',
        'readingTimes': rtPayload,
      });
      web.window.parent?.postMessage(payload.toJS, '*'.toJS);
    } catch (e) {
      AnxLog.warning('[WebBridge] Failed to syncReadingTimes: $e');
    }
  }

  static void syncGroups() {
    if (!AnxPlatform.isWeb) return;
    try {
      final groupsPayload = GroupDao.webGroups
          .map((g) => {
                'id': g.id,
                'name': g.name,
                'parentId': g.parentId,
                'isDeleted': g.isDeleted,
                'createTime': g.createTime,
                'updateTime': g.updateTime,
              })
          .toList();
      final payload = jsonEncode({
        'type': 'anx-sync-groups',
        'groups': groupsPayload,
      });
      web.window.parent?.postMessage(payload.toJS, '*'.toJS);
    } catch (e) {
      AnxLog.warning('[WebBridge] Failed to syncGroups: $e');
    }
  }

  static void updateBookMeta(Book book) {
    if (!AnxPlatform.isWeb) return;
    try {
      final safeCover =
          (book.coverPath.startsWith('data:') || book.coverPath.length > 2048)
              ? ''
              : book.coverPath;
      final payload = jsonEncode({
        'type': 'anx-update-book-meta',
        'id': book.id,
        'filePath': book.filePath,
        'title': book.title,
        'author': book.author,
        'coverPath': safeCover,
        'description': book.description ?? '',
        'rating': book.rating,
        'groupId': book.groupId,
        'lastReadPosition': book.lastReadPosition,
        'readingPercentage': book.readingPercentage,
      });
      web.window.parent?.postMessage(payload.toJS, '*'.toJS);
    } catch (e) {
      AnxLog.warning('[WebBridge] Failed to updateBookMeta: $e');
    }
  }

  static void syncTags() {
    if (!AnxPlatform.isWeb) return;
    try {
      final tagsPayload = TagDao.webTags
          .map((t) => {
                'id': t.id,
                'name': t.name,
                'color': t.color != null ? (t.color!.toARGB32() & 0x00FFFFFF) : null,
              })
          .toList();
      final bookTagsPayload = TagDao.webBookTags
          .map((r) => {
                'id': r.id,
                'bookId': r.bookId,
                'tagId': r.tagId,
              })
          .toList();
      final payload = jsonEncode({
        'type': 'anx-sync-tags',
        'tags': tagsPayload,
        'bookTags': bookTagsPayload,
      });
      web.window.parent?.postMessage(payload.toJS, '*'.toJS);
    } catch (e) {
      AnxLog.warning('[WebBridge] Failed to syncTags: $e');
    }
  }

  static Future<String?> downloadFile({
    Uint8List? bytes,
    String? sourceFilePath,
    required String fileName,
    String? mimeType,
  }) async {
    if (!AnxPlatform.isWeb) return null;
    try {
      String href;
      if (bytes != null) {
        final b64 = base64Encode(bytes);
        final mime = mimeType ?? 'application/octet-stream';
        href = 'data:$mime;base64,$b64';
      } else if (sourceFilePath != null && sourceFilePath.isNotEmpty) {
        if (sourceFilePath.startsWith('http') ||
            sourceFilePath.startsWith('assets://') ||
            sourceFilePath.startsWith('data:') ||
            sourceFilePath.startsWith('blob:')) {
          href = sourceFilePath;
        } else {
          href = 'assets://local-file/${Uri.encodeComponent(sourceFilePath)}';
        }
      } else {
        return null;
      }

      final anchor = web.document.createElement('a') as web.HTMLAnchorElement;
      anchor.href = href;
      anchor.download = fileName;
      anchor.style.display = 'none';
      web.document.body?.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return fileName;
    } catch (e) {
      AnxLog.warning('[WebBridge] Failed to downloadFile ($fileName): $e');
      return null;
    }
  }

  static void quoteToJournal({
    required Book book,
    required String text,
    required String cfi,
    required String chapter,
    String? note,
  }) {
    if (!AnxPlatform.isWeb) return;
    try {
      final payload = jsonEncode({
        'type': 'anx-quote-to-journal',
        'bookId': book.id,
        'bookTitle': book.title,
        'author': book.author,
        'text': text,
        'cfi': cfi,
        'chapter': chapter,
        'note': note ?? '',
      });
      web.window.parent?.postMessage(payload.toJS, '*'.toJS);
    } catch (e) {
      AnxLog.warning('[WebBridge] Failed to quoteToJournal: $e');
    }
  }

  static void exportToAffineDoc({
    required Book book,
    String? text,
    String? cfi,
    String? chapter,
  }) {
    if (!AnxPlatform.isWeb) return;
    try {
      final bookNotes = BookNoteDao.webNotes
          .where((n) => n.bookId == book.id && n.type != 'bookmark')
          .map((n) => {
                'id': n.id ?? 0,
                'bookId': n.bookId,
                'content': n.content,
                'cfi': n.cfi,
                'chapter': n.chapter,
                'type': n.type,
                'color': n.color,
                'readerNote': n.readerNote,
                'createTime': (n.createTime ?? DateTime.now()).toIso8601String(),
                'updateTime': n.updateTime.toIso8601String(),
              })
          .toList();
      final payload = jsonEncode({
        'type': 'anx-export-to-doc',
        'bookId': book.id,
        'bookTitle': book.title,
        'author': book.author,
        'text': text,
        'cfi': cfi,
        'chapter': chapter,
        'notes': bookNotes,
      });
      web.window.parent?.postMessage(payload.toJS, '*'.toJS);
    } catch (e) {
      AnxLog.warning('[WebBridge] Failed to exportToAffineDoc: $e');
    }
  }

  static Future<String> requestAiChat(
    List<Map<String, String>> messages, {
    String? bookTitle,
    String? chapterTitle,
  }) async {
    if (!AnxPlatform.isWeb) return '';
    final reqId = 'ai-${++_aiSeq}-${DateTime.now().millisecondsSinceEpoch}';
    final completer = Completer<String>();
    _aiCompleters[reqId] = completer;

    try {
      final payload = jsonEncode({
        'type': 'anx-ai-request',
        'requestId': reqId,
        'messages': messages,
        if (bookTitle != null) 'bookTitle': bookTitle,
        if (chapterTitle != null) 'chapterTitle': chapterTitle,
      });
      web.window.parent?.postMessage(payload.toJS, '*'.toJS);
      return await completer.future.timeout(
        const Duration(seconds: 90),
        onTimeout: () {
          _aiCompleters.remove(reqId);
          return 'Tiempo de espera agotado al consultar el motor IA Antigravity.';
        },
      );
    } catch (e) {
      _aiCompleters.remove(reqId);
      return 'Error al conectar con Antigravity IA: $e';
    }
  }
}
