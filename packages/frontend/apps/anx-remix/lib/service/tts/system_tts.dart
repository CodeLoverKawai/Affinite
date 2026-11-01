import 'dart:async';
import 'dart:io';
import 'package:anx_reader/service/web_bridge.dart';
import 'package:anx_reader/utils/platform_utils.dart';

import 'package:anx_reader/config/shared_preference_provider.dart';
import 'package:anx_reader/page/reading_page.dart';
import 'package:anx_reader/service/tts/base_tts.dart';
import 'package:anx_reader/service/tts/models/tts_voice.dart';
import 'package:anx_reader/service/tts/tts_service.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';

class SystemTts extends BaseTts {
  static final SystemTts _instance = SystemTts._internal();

  factory SystemTts() {
    return _instance;
  }

  SystemTts._internal();

  final FlutterTts flutterTts = FlutterTts();

  Process? _spdProcess;

  int _mapVolume(double volume) => ((volume * 200) - 100).clamp(-100, 100).toInt();
  int _mapPitch(double pitch) => ((pitch - 1.0) * 100).clamp(-100, 100).toInt();
  int _mapRate(double rate) => ((rate - 1.0) * 100).clamp(-100, 100).toInt();

  String? _currentVoiceText;
  static String? _prevVoiceText;

  bool restarting = false;

  late Function getHereFunction;
  late Function getNextTextFunction;
  late Function getPrevTextFunction;

  @override
  final ValueNotifier<TtsStateEnum> ttsStateNotifier =
      ValueNotifier<TtsStateEnum>(TtsStateEnum.stopped);

  @override
  void updateTtsState(TtsStateEnum newState) {
    ttsStateNotifier.value = newState;
  }

  bool get isIOS => AnxPlatform.isIOS;
  bool get isAndroid => AnxPlatform.isAndroid;
  bool get isWindows => AnxPlatform.isWindows;
  bool get isWeb => kIsWeb;

  @override
  double get volume => Prefs().ttsVolume;

  @override
  set volume(double volume) {
    Prefs().ttsVolume = volume;
    if (isPlaying) restart();
  }

  @override
  double get pitch => Prefs().ttsPitch;

  @override
  set pitch(double pitch) {
    Prefs().ttsPitch = pitch;
    if (isPlaying) restart();
  }

  @override
  double get rate => Prefs().ttsRate;

  @override
  set rate(double rate) {
    Prefs().ttsRate = rate;
    if (isPlaying) restart();
  }

  @override
  bool get isPlaying => ttsStateNotifier.value == TtsStateEnum.playing;

  @override
  String? get currentVoiceText => _currentVoiceText;

  @override
  Future<void> init(Function getCurrentText, Function getNextText,
      Function getPrevText) async {
    getHereFunction = getCurrentText;
    getNextTextFunction = getNextText;
    getPrevTextFunction = getPrevText;

    if (AnxPlatform.isLinux || isWeb) {
      return;
    }

    await setAwaitOptions();

    if (isAndroid) {
      await getDefaultEngine();
      await getDefaultVoice();
    }

    flutterTts.setStartHandler(() async {
      updateTtsState(TtsStateEnum.playing);
      if (!isAndroid) {
        return;
      }
      _prevVoiceText = _currentVoiceText;
      _currentVoiceText = await epubPlayerKey.currentState!.ttsPrepare();

      if (_currentVoiceText?.isNotEmpty ?? false) {
        flutterTts.speak(_currentVoiceText!);
      }
    });

    flutterTts.setCompletionHandler(() async {
      if (!isAndroid) {
        return;
      }
      updateTtsState(TtsStateEnum.playing);
      if (_currentVoiceText?.isEmpty ?? true) {
        _currentVoiceText = await getNextText();
        await speak();
      } else {
        await getNextText();
      }
    });
  }

  Future<void> setAwaitOptions() async {
    if (AnxPlatform.isLinux || isWeb) return;
    await flutterTts.awaitSpeakCompletion(true);
    if (isAndroid) {
      await flutterTts.awaitSynthCompletion(true);
      await flutterTts.setQueueMode(1);
    }
  }

  Future<void> getDefaultEngine() async {
    var engine = await flutterTts.getDefaultEngine;
    if (engine != null) {}
  }

  Future<void> getDefaultVoice() async {
    var voice = await flutterTts.getDefaultVoice;
    if (voice != null) {}
  }

  /// Apply the voice by shortName
  Future<void> _applyVoice(String? voiceShortName) async {
    if (AnxPlatform.isLinux || isWeb) return;
    if (voiceShortName == null || voiceShortName.isEmpty) {
      return;
    }

    try {
      // Get all voices to find the matching one
      final voices = await flutterTts.getVoices;
      if (voices is List) {
        for (var voice in voices) {
          final map = Map<String, dynamic>.from(voice);
          if (map['name'] == voiceShortName) {
            // flutter_tts setVoice expects a Map with 'name' and 'locale'
            await flutterTts.setVoice({
              'name': map['name'],
              'locale': map['locale'],
            });
            return;
          }
        }
      }
    } catch (e) {
      // Fallback: try to set voice directly (some platforms support this)
      // Ignore errors if voice not found
    }
  }

  /// For testing a specific voice in settings (matching OnlineTts API)
  Future<void> speakWithVoice(String content, String voiceShortName) async {
    await stop();
    if (isWeb) {
      updateTtsState(TtsStateEnum.playing);
      await WebBridge.speakTts(
        content,
        volume: volume,
        rate: rate,
        pitch: pitch,
      );
      updateTtsState(TtsStateEnum.stopped);
      return;
    }
    if (AnxPlatform.isLinux) {
      updateTtsState(TtsStateEnum.playing);
      try {
        _spdProcess = await Process.start('spd-say', [
          '-w',
          '-r', _mapRate(rate).toString(),
          '-p', _mapPitch(pitch).toString(),
          '-i', _mapVolume(volume).toString(),
          if (voiceShortName.isNotEmpty) ...['-t', voiceShortName],
          content,
        ]);
        await _spdProcess!.exitCode;
        _spdProcess = null;
        updateTtsState(TtsStateEnum.stopped);
      } catch (e) {
        updateTtsState(TtsStateEnum.stopped);
      }
      return;
    }
    await flutterTts.setVolume(volume);
    await flutterTts.setSpeechRate(rate);
    await flutterTts.setPitch(pitch);
    await _applyVoice(voiceShortName);
    await flutterTts.speak(content);
  }

  @override
  Future<void> speak({String? content}) async {
    await setAwaitOptions();
    if (content != null) {
      _currentVoiceText = content;
    }
    if (_currentVoiceText == null || _currentVoiceText!.trim().isEmpty) {
      final hereText = await getHereFunction();
      if (hereText is String && hereText.trim().isNotEmpty) {
        _currentVoiceText = hereText.trim();
      } else {
        _currentVoiceText = (await getNextTextFunction())?.toString().trim();
      }
    }

    // Guard: if still null or empty (e.g. WebView not ready), abort.
    if (_currentVoiceText == null || _currentVoiceText!.isEmpty) {
      updateTtsState(TtsStateEnum.stopped);
      return;
    }

    if (isWeb) {
      updateTtsState(TtsStateEnum.playing);
      final completed = await WebBridge.speakTts(
        _currentVoiceText!,
        volume: volume,
        rate: rate,
        pitch: pitch,
      );
      if (completed && ttsStateNotifier.value == TtsStateEnum.playing) {
        _currentVoiceText = (await getNextTextFunction())?.toString().trim();
        if (_currentVoiceText != null && _currentVoiceText!.isNotEmpty) {
          speak();
        } else {
          updateTtsState(TtsStateEnum.stopped);
        }
      }
      return;
    }

    if (AnxPlatform.isLinux) {
      updateTtsState(TtsStateEnum.playing);
      final voice = SystemTtsProvider().getSelectedVoice();
      try {
        _spdProcess = await Process.start('spd-say', [
          '-w',
          '-r', _mapRate(rate).toString(),
          '-p', _mapPitch(pitch).toString(),
          '-i', _mapVolume(volume).toString(),
          if (voice.isNotEmpty) ...['-t', voice],
          _currentVoiceText!,
        ]);

        final exitCode = await _spdProcess!.exitCode;
        _spdProcess = null;

        if (exitCode == 0 && ttsStateNotifier.value == TtsStateEnum.playing) {
          _currentVoiceText = await getNextTextFunction();
          speak();
        }
      } catch (e) {
        updateTtsState(TtsStateEnum.stopped);
      }
      return;
    }

    await flutterTts.setVolume(volume);
    await flutterTts.setSpeechRate(rate);
    await flutterTts.setPitch(pitch);

    // Apply the saved voice model
    final selectedVoice = SystemTtsProvider().resolveVoice(null);
    await _applyVoice(selectedVoice);

    await flutterTts.speak(_currentVoiceText!);

    if (!isAndroid && ttsStateNotifier.value == TtsStateEnum.playing) {
      _currentVoiceText = await getNextTextFunction();
      speak();
    }
  }

  @override
  Future<dynamic> stop() async {
    updateTtsState(TtsStateEnum.stopped);
    if (isWeb) {
      WebBridge.stopTts();
      _currentVoiceText = null;
      return 1;
    }
    if (AnxPlatform.isLinux) {
      _spdProcess?.kill();
      _spdProcess = null;
      await Process.run('spd-say', ['-S']);
      _currentVoiceText = null;
      return 1;
    }
    final result = await flutterTts.stop();
    _currentVoiceText = null;
    return result;
  }

  @override
  Future<void> pause() async {
    if (isWeb) {
      WebBridge.stopTts();
      updateTtsState(TtsStateEnum.paused);
      return;
    }
    if (AnxPlatform.isLinux) {
      _spdProcess?.kill();
      _spdProcess = null;
      await Process.run('spd-say', ['-S']);
      updateTtsState(TtsStateEnum.paused);
      return;
    }
    final result = await flutterTts.stop();
    if (result == 1) {
      updateTtsState(TtsStateEnum.paused);
    }
  }

  @override
  Future<void> resume() async {
    if (isAndroid) {
      speak(content: _prevVoiceText);
      return;
    }
    speak(content: _currentVoiceText);
  }

  @override
  Future<void> prev() async {
    if (restarting) {
      return;
    }
    restarting = true;
    await stop();
    updateTtsState(TtsStateEnum.playing);
    _currentVoiceText = (await getPrevTextFunction())?.toString().trim();
    speak();
    restarting = false;
  }

  @override
  Future<void> next() async {
    if (restarting) {
      return;
    }
    restarting = true;
    await stop();
    updateTtsState(TtsStateEnum.playing);
    _currentVoiceText = (await getNextTextFunction())?.toString().trim();
    speak();
    restarting = false;
  }

  @override
  Future<void> restart() async {
    if (restarting) {
      return;
    }
    restarting = true;
    final savedText = _currentVoiceText;
    await stop();
    _currentVoiceText = savedText;
    updateTtsState(TtsStateEnum.playing);
    speak();
    restarting = false;
  }

  @override
  Future<List<TtsVoice>> getVoices() async {
    if (AnxPlatform.isLinux || isWeb) {
      return const [
        TtsVoice(shortName: 'es-ES', name: 'Español (Neural)', locale: 'es-ES', gender: 'female'),
        TtsVoice(shortName: 'en-US', name: 'English (Neural)', locale: 'en-US', gender: 'female'),
        TtsVoice(shortName: 'male1', name: 'Male 1', locale: 'en-US', gender: 'male'),
        TtsVoice(shortName: 'female1', name: 'Female 1', locale: 'en-US', gender: 'female'),
      ];
    }
    try {
      dynamic voices = await flutterTts.getVoices;
      if (voices is List) {
        return voices.map((e) {
          final map = Map<String, dynamic>.from(e);
          return TtsVoice(
              shortName: map['name'] ?? '',
              name: map['name'] ?? '',
              locale: map['locale']?.replaceAll('_', '-') ?? '',
              gender: map['gender']?.toString().toLowerCase() ?? '',
              rawData: map);
        }).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  @override
  Future<void> dispose() async {
    if (isWeb) {
      WebBridge.stopTts();
      return;
    }
    if (AnxPlatform.isLinux) {
      _spdProcess?.kill();
      _spdProcess = null;
      await Process.run('spd-say', ['-S']);
      return;
    }
    await flutterTts.stop();
  }
}
