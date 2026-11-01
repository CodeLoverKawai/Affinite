# Design Spec: Linux System TTS & Custom/Local OpenAI TTS

**Goal:** Implement native Text-to-Speech (TTS) support for Linux using the system's `spd-say` utility, and add a custom/local OpenAI-compatible TTS provider supporting HTTP/HTTPS URLs and optional API keys.

---

## 1. Linux System TTS (`spd-say`)

Since `flutter_tts` does not support Linux out-of-the-box, we will bypass the plugin call when running on Linux and use the native `spd-say` binary via standard process execution in `SystemTts`.

### Architecture & API Mapping
`spd-say` is a standard client command for Speech Dispatcher on Linux. It supports key arguments:
- `-w, --wait`: Wait until the message is fully spoken. This makes it synchronous and allows us to await process completion.
- `-S, --stop`: Stop speaking the current message.
- `-r, --rate`: Speech rate, between `-100` and `+100` (default: 0).
- `-p, --pitch`: Pitch, between `-100` and `+100` (default: 0).
- `-i, --volume`: Volume, between `-100` and `+100` (default: 0).
- `-y, --synthesis-voice`: Set the voice by name.

### Volume, Pitch, and Rate Mapping Formulas:
- **Volume** (app scale `0.0` to `1.0`):
  `volume_param = ((volume * 200) - 100).clamp(-100, 100).toInt()`
  *(e.g., 0.0 -> -100, 0.5 -> 0, 1.0 -> 100)*
- **Pitch** (app scale `0.5` to `2.0`):
  `pitch_param = ((pitch - 1.0) * 100).clamp(-100, 100).toInt()`
  *(e.g., 1.0 -> 0, 1.5 -> 50, 0.5 -> -50)*
- **Rate** (app scale `0.0` to `2.0`):
  `rate_param = ((rate - 1.0) * 100).clamp(-100, 100).toInt()`
  *(e.g., 1.0 -> 0, 2.0 -> 100, 0.0 -> -100)*

### Execution Flow:
- When `speak()` is called on Linux:
  - We run `spd-say` process using `Process.start` or `Process.run`.
  - To implement the completion handler, we wait for the process to exit when using `-w`.
  - When the process exits, we call the completion callback to trigger the next sentence.
  - We store the `Process` reference so we can call `.kill()` if paused/stopped, and run `spd-say -S` to clear dispatcher buffer.

---

## 2. Custom/Local OpenAI-Compatible TTS Provider

We will add a new provider `customOpenai` in the `TtsService` enum that sends TTS requests to any endpoint matching the OpenAI Audio API.

### Configuration Fields:
- **URL**: Default is `http://localhost:8000/v1/audio/speech`. User can change this to any HTTP or HTTPS URL.
- **Model**: Default is `kokoro`.
- **Voice**: Default is `af_bella`.
- **API Key**: Optional. If empty, the authorization header is omitted.

### Implementation Details:
- Create `CustomOpenAiTtsProvider` inheriting from `TtsServiceProvider`.
- Register the provider in `TtsService` enum.
- In `CustomOpenAiTtsProvider.speak(...)`:
  - Perform `http.post` to the user-defined URL.
  - If `API Key` is set, add `'Authorization': 'Bearer $key'` to headers.
  - Send JSON body with `model`, `voice`, `input` (text), and `response_format: 'mp3'`.
  - Return the audio bytes (`response.bodyBytes`).
- Register the new provider option in the `NarrateSettings` UI view so it displays in the TTS Service dropdown.
