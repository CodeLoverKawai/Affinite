import 'package:anx_reader/dao/dictionary.dart';
import 'package:dict_reader/dict_reader.dart';
import 'package:dio/dio.dart';

class DictionaryService {
  static final DictionaryService _instance = DictionaryService._internal();
  factory DictionaryService() => _instance;
  DictionaryService._internal();

  DictReader? _cachedReader;
  int? _cachedDictionaryId;
  final Dio _dio = Dio();

  Future<void> clearCache() async {
    _cachedReader = null;
    _cachedDictionaryId = null;
  }

  String _sanitizeWord(String word) {
    var cleaned = word.trim().toLowerCase();
    // Strip leading and trailing punctuation/symbols using Unicode properties
    cleaned = cleaned.replaceAll(RegExp(r'^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$', unicode: true), '');
    return cleaned;
  }

  List<String> _getCandidates(String word) {
    final candidates = <String>[word];
    final len = word.length;
    
    // English inflection rules
    if (len > 3 && word.endsWith('ing')) {
      candidates.add(word.substring(0, len - 3)); // thinking -> think
      candidates.add('${word.substring(0, len - 3)}e'); // making -> make
    } else if (len > 2 && word.endsWith('ed')) {
      candidates.add(word.substring(0, len - 2)); // played -> play
      candidates.add(word.substring(0, len - 1)); // baked -> bake
    } else if (len > 3 && word.endsWith('ies')) {
      candidates.add('${word.substring(0, len - 3)}y'); // flies -> fly
    } else if (len > 2 && word.endsWith('es')) {
      candidates.add(word.substring(0, len - 2)); // boxes -> box
      candidates.add(word.substring(0, len - 1)); // focuses -> focuse
    } else if (len > 1 && word.endsWith('s')) {
      candidates.add(word.substring(0, len - 1)); // beats -> beat
    }
    
    return candidates.toSet().toList();
  }

  String _sanitizeHtml(String html) {
    // 1. Remove all script tags and their contents
    var cleaned = html.replaceAll(RegExp(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', caseSensitive: false), '');
    // 2. Remove all style tags and their contents
    cleaned = cleaned.replaceAll(RegExp(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', caseSensitive: false), '');
    // 3. Remove all link tags
    cleaned = cleaned.replaceAll(RegExp(r'<link\b[^>]*>', caseSensitive: false), '');
    
    // List of standard elements that flutter_html supports without issues
    final standardTags = {
      'b', 'a', 'p', 'br', 'i', 'ol', 'li', 'ul', 'span', 'div', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'sub', 'sup', 'strong', 
      'em', 'small', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'u', 'ins', 'del', 'mark', 'abbr', 'cite', 'code', 'pre', 'q', 'blockquote'
    };
    
    // 3. Convert all custom non-standard tags (like <OED4>, <hg>, <hw>, <n>, etc.) to standard span elements
    cleaned = cleaned.replaceAllMapped(RegExp(r'</?([a-zA-Z0-9]+)\b[^>]*>'), (match) {
      final tag = match.group(1)!.toLowerCase();
      if (standardTags.contains(tag)) {
        return match.group(0)!; // Keep standard tags unchanged
      }
      
      final isClose = match.group(0)!.startsWith('</');
      if (isClose) {
        return '</span>';
      }
      
      // Get all attributes of the original tag and map them
      final fullMatch = match.group(0)!;
      final classAttrMatch = RegExp(r'''\bclass\s*=\s*["']([^"']*)["']''', caseSensitive: false).firstMatch(fullMatch);
      final idAttrMatch = RegExp(r'''\bid\s*=\s*["']([^"']*)["']''', caseSensitive: false).firstMatch(fullMatch);
      
      final classes = <String>['custom-tag-$tag'];
      if (classAttrMatch != null) {
        classes.add(classAttrMatch.group(1)!);
      }
      
      final idAttr = idAttrMatch != null ? ' id="${idAttrMatch.group(1)}"' : '';
      return '<span class="${classes.join(' ')}"$idAttr>';
    });

    return cleaned;
  }

  Future<String?> lookup(String word, {String? bookLanguage}) async {
    final cleanWord = _sanitizeWord(word);
    if (cleanWord.isEmpty) return null;

    final candidates = _getCandidates(cleanWord);

    try {
      final activeDict = await dictionaryDao.getActive();
      if (activeDict != null) {
        if (_cachedReader == null || _cachedDictionaryId != activeDict.id) {
          _cachedReader = DictReader(activeDict.path);
          _cachedDictionaryId = activeDict.id;
          await _cachedReader!.initDict();
        }
        
        for (final candidate in candidates) {
          var currentLookup = candidate;
          int redirectCount = 0;
          
          while (redirectCount < 5) {
            final offsetInfo = await _cachedReader!.locate(currentLookup);
            if (offsetInfo == null) break;
            
            var result = await _cachedReader!.readOneMdx(offsetInfo);
            result = result.trim();
            if (result.isEmpty) break;
            
            if (result.startsWith('@@@LINK=')) {
              currentLookup = result.substring(8).trim();
              redirectCount++;
              continue;
            }
            
            return _sanitizeHtml(result);
          }
        }
      }
    } catch (e) {
      // Offline lookup failed or file error, fallback to online
    }

    // Fallback to online Wiktionary REST API
    for (final candidate in candidates) {
      final onlineResult = await _lookupWiktionary(candidate, bookLanguage);
      if (onlineResult != null && onlineResult.isNotEmpty) {
        return onlineResult;
      }
    }

    return null;
  }

  Future<String?> _lookupWiktionary(String word, String? bookLanguage) async {
    final lang = (bookLanguage != null && bookLanguage.length >= 2)
        ? bookLanguage.substring(0, 2).toLowerCase()
        : 'en';

    final url = 'https://$lang.wiktionary.org/api/rest_v1/page/definition/$word';

    try {
      final response = await _dio.get(url);
      if (response.statusCode == 200) {
        final data = response.data;
        if (data is Map<String, dynamic>) {
          return _formatWiktionaryHtml(word, data, lang);
        }
      }
    } catch (e) {
      // If book language search failed and language is not English, try English as fallback
      if (lang != 'en') {
        return await _lookupWiktionary(word, 'en');
      }
    }
    return null;
  }

  String _formatWiktionaryHtml(String word, Map<String, dynamic> data, String lang) {
    List<dynamic> entries = [];
    if (data.containsKey(lang) && data[lang] is List) {
      entries = data[lang];
    } else if (data.isNotEmpty) {
      entries = data.values.firstWhere((e) => e is List, orElse: () => []) as List<dynamic>;
    }

    if (entries.isEmpty) return '';

    final sb = StringBuffer();
    sb.write('<div style="font-family: sans-serif; padding: 10px;">');
    sb.write('<h2 style="font-size: 1.5em; margin-bottom: 5px;">$word</h2>');

    for (final entry in entries) {
      if (entry is! Map<String, dynamic>) continue;
      final partOfSpeech = entry['partOfSpeech']?.toString() ?? 'Word';
      final definitionsList = entry['definitions'];

      sb.write('<div style="margin-top: 15px;">');
      sb.write('<span style="font-weight: bold; font-style: italic; color: #007ACC; font-size: 1.1em;">$partOfSpeech</span>');
      sb.write('<ol style="margin-top: 5px; padding-left: 20px;">');

      if (definitionsList is List) {
        for (final def in definitionsList) {
          if (def is! Map<String, dynamic>) continue;
          final definitionText = def['definition']?.toString() ?? '';
          final examples = def['examples'];

          sb.write('<li style="margin-bottom: 8px;">');
          sb.write(definitionText);

          if (examples is List && examples.isNotEmpty) {
            sb.write('<div style="margin-top: 5px; padding-left: 10px; border-left: 2px solid #ccc; font-style: italic; color: #555;">');
            for (final ex in examples) {
              if (ex is Map<String, dynamic>) {
                final exText = ex['text']?.toString() ?? '';
                sb.write('<p style="margin: 2px 0;">"$exText"</p>');
              }
            }
            sb.write('</div>');
          }
          sb.write('</li>');
        }
      }
      sb.write('</ol>');
      sb.write('</div>');
    }

    sb.write('</div>');
    return sb.toString();
  }
}
