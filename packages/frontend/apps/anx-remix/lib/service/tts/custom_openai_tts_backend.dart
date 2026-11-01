import 'dart:convert';
import 'dart:typed_data';
import 'package:anx_reader/config/shared_preference_provider.dart';
import 'package:anx_reader/service/tts/models/tts_voice.dart';
import 'package:anx_reader/service/tts/tts_service.dart';
import 'package:anx_reader/service/tts/tts_service_provider.dart';
import 'package:flutter/widgets.dart';
import 'package:http/http.dart' as http;

class CustomOpenAiTtsProvider extends TtsServiceProvider {
  static final CustomOpenAiTtsProvider _instance = CustomOpenAiTtsProvider._internal();

  factory CustomOpenAiTtsProvider() {
    return _instance;
  }

  CustomOpenAiTtsProvider._internal();

  static const String _defaultUrl = 'http://localhost:8000/v1/audio/speech';
  static const String _defaultModel = 'kokoro';
  static const String _defaultVoice = 'af_bella';

  @override
  TtsService get service => TtsService.customOpenai;

  @override
  String getLabel(BuildContext context) => 'Custom/Local OpenAI';

  @override
  List<ConfigItem> getConfigItems(BuildContext context) {
    return [
      ConfigItem(
        key: 'url',
        label: 'Server URL',
        type: ConfigItemType.text,
        defaultValue: _defaultUrl,
      ),
      ConfigItem(
        key: 'key',
        label: 'API Key (Optional)',
        type: ConfigItemType.password,
        defaultValue: '',
      ),
      ConfigItem(
        key: 'model',
        label: 'Model',
        type: ConfigItemType.text,
        defaultValue: _defaultModel,
      ),
      ConfigItem(
        key: 'voice',
        label: 'Voice',
        type: ConfigItemType.text,
        defaultValue: _defaultVoice,
      ),
    ];
  }

  @override
  Map<String, dynamic> getConfig() {
    final config = Prefs().getOnlineTtsConfig(serviceId);
    if (config.isEmpty) {
      return {
        'url': _defaultUrl,
        'key': '',
        'model': _defaultModel,
        'voice': _defaultVoice,
      };
    }
    return {
      'url': config['url'] ?? _defaultUrl,
      'key': config['key'] ?? '',
      'model': config['model'] ?? _defaultModel,
      'voice': config['voice'] ?? _defaultVoice,
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
    final String url = config['url']?.toString().trim() ?? _defaultUrl;
    final String? key = config['key']?.toString().trim();
    final String model = config['model']?.toString().trim() ?? _defaultModel;
    final String resolvedVoice = resolveVoice(voice);

    final headers = {
      'Content-Type': 'application/json',
      if (key != null && key.isNotEmpty) 'Authorization': 'Bearer $key',
    };

    final response = await http.post(
      Uri.parse(url),
      headers: headers,
      body: jsonEncode({
        'model': model,
        'voice': resolvedVoice,
        'input': text,
        'response_format': 'mp3',
      }),
    );

    if (response.statusCode == 200) {
      return response.bodyBytes;
    }

    throw Exception(
        'Local OpenAI TTS failed: ${response.statusCode} ${response.body}');
  }

  @override
  Future<List<TtsVoice>> getVoices() async {
    final config = getConfig();
    final voice = config['voice']?.toString() ?? _defaultVoice;
    return [
      TtsVoice(shortName: voice, name: voice, locale: 'en-US'),
    ];
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
    final voice = config['voice']?.toString() ?? '';
    if (voice.isNotEmpty) return voice;
    return _defaultVoice;
  }

  @override
  void setSelectedVoice(String voice) {
    final config = getConfig();
    config['voice'] = voice;
    saveConfig(config);
  }
}
