import 'dart:convert';
import 'dart:typed_data';
import 'package:anx_reader/config/shared_preference_provider.dart';
import 'package:anx_reader/service/tts/models/tts_voice.dart';
import 'package:anx_reader/service/tts/tts_service.dart';
import 'package:anx_reader/service/tts/tts_service_provider.dart';
import 'package:flutter/widgets.dart';
import 'package:http/http.dart' as http;

class VoiceboxTtsProvider extends TtsServiceProvider {
  static final VoiceboxTtsProvider _instance = VoiceboxTtsProvider._internal();

  factory VoiceboxTtsProvider() {
    return _instance;
  }

  VoiceboxTtsProvider._internal();

  static const String _defaultUrl = 'http://localhost:17493';
  static const String _defaultEngine = 'qwen';
  static const String _defaultLanguage = 'en';

  @override
  TtsService get service => TtsService.voicebox;

  @override
  String getLabel(BuildContext context) => 'Voicebox (Local AI)';

  @override
  List<ConfigItem> getConfigItems(BuildContext context) {
    return [
      ConfigItem(
        key: 'url',
        label: 'Voicebox Server URL',
        type: ConfigItemType.text,
        defaultValue: _defaultUrl,
      ),
      ConfigItem(
        key: 'engine',
        label: 'Engine',
        description: 'E.g. qwen, kokoro, chatterbox_turbo, tada, luxtts',
        type: ConfigItemType.text,
        defaultValue: _defaultEngine,
      ),
      ConfigItem(
        key: 'language',
        label: 'Language',
        type: ConfigItemType.text,
        defaultValue: _defaultLanguage,
      ),
    ];
  }

  @override
  Map<String, dynamic> getConfig() {
    final config = Prefs().getOnlineTtsConfig(serviceId);
    if (config.isEmpty) {
      return {
        'url': _defaultUrl,
        'engine': _defaultEngine,
        'language': _defaultLanguage,
        'voice': '',
      };
    }
    return {
      'url': config['url'] ?? _defaultUrl,
      'engine': config['engine'] ?? _defaultEngine,
      'language': config['language'] ?? _defaultLanguage,
      'voice': config['voice'] ?? '',
    };
  }

  @override
  void saveConfig(Map<String, dynamic> config) {
    Prefs().saveOnlineTtsConfig(serviceId, config);
  }

  @override
  Future<Uint8List> speak(
      String text, String? voice, double rate, double pitch) async {
    final config = getConfig();
    final String baseUrl = config['url']?.toString().trim() ?? _defaultUrl;
    final String engine = config['engine']?.toString().trim() ?? _defaultEngine;
    final String language = config['language']?.toString().trim() ?? _defaultLanguage;
    final String resolvedVoice = resolveVoice(voice);

    final response = await http.post(
      Uri.parse('$baseUrl/generate/stream'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'profile_id': resolvedVoice,
        'text': text,
        'language': language,
        'engine': engine,
      }),
    );

    if (response.statusCode == 200) {
      return response.bodyBytes;
    }

    throw Exception(
        'Voicebox generation failed: ${response.statusCode} ${response.body}');
  }

  @override
  Future<List<TtsVoice>> getVoices() async {
    final config = getConfig();
    final String baseUrl = config['url']?.toString().trim() ?? _defaultUrl;

    try {
      final response = await http.get(Uri.parse('$baseUrl/profiles'));
      if (response.statusCode == 200) {
        final List<dynamic> profiles = jsonDecode(response.body);
        return profiles.map((p) {
          final map = Map<String, dynamic>.from(p);
          final id = map['id']?.toString() ?? '';
          final name = map['name']?.toString() ?? id;
          final language = map['language']?.toString() ?? 'en';
          final desc = map['description']?.toString() ?? '';
          return TtsVoice(
            shortName: id,
            name: name,
            locale: language,
            gender: 'female',
            description: desc,
          );
        }).toList();
      }
    } catch (_) {}

    final voice = config['voice']?.toString() ?? '';
    if (voice.isNotEmpty) {
      return [TtsVoice(shortName: voice, name: voice, locale: 'en-US')];
    }
    return [];
  }

  @override
  TtsVoice convertVoiceModel(dynamic voiceData) {
    if (voiceData is TtsVoice) return voiceData;
    if (voiceData is Map<String, dynamic>) {
      return TtsVoice.fromMap(voiceData);
    }
    return const TtsVoice(shortName: '', name: '', locale: '');
  }

  @override
  String getSelectedVoice() {
    final config = getConfig();
    return config['voice']?.toString() ?? '';
  }

  @override
  void setSelectedVoice(String voice) {
    final config = getConfig();
    config['voice'] = voice;
    saveConfig(config);
  }
}
