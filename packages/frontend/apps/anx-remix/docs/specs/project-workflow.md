# Project Workflow Spec - Anx Remix

## 1. Stack & Runtime Engine
- **Framework**: Flutter (Dart SDK `>=3.5.2 <4.0.0`)
- **State Management**: Dual architecture (`flutter_riverpod` + `provider`)
- **Database Engine**: `sqflite` (Mobile) / `sqflite_common_ffi` (Desktop: Linux, macOS, Windows)
- **AI Integrations**: LangChain Dart (`langchain_ai_config.dart`), Google Gemini (`flutter_gemini`), HTTP REST APIs
- **Web Renderer / WebView**: `flutter_inappwebview` (Mobile/macOS), `flutter_inappwebview_linux` (Linux GTK/WebKitGTK)
- **Audio Engine**: `audio_service`, `audio_session`, `flutter_tts`

## 2. Verification Command Pipeline
- **Static Analysis & Linting**: `flutter analyze`
- **Unit & Integration Test Suite**: `flutter test`
- **Localization Normalization**: `dart run normalize_arb_files.dart`

## 3. Version Manifest
- `pubspec.yaml` (`version: 1.15.3+4`)
- `android/app/build.gradle`
- `ios/Runner.xcodeproj/project.pbxproj`
- `docs/ANX_REMIX_RELEASE.md`

## 4. Automated Release Protocol
- `run_release.sh`: Orchestrates version increment & git tags
- `release.dart` & `release_build.sh`: Multi-platform release runner
- `scripts/build_apk.sh`: Android APK build pipeline
- `scripts/build_appimage.sh`: Linux AppImage packaging
