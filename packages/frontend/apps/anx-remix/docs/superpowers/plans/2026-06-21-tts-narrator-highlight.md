# TTS Narrator Highlight Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement settings options to customize the TTS narrator text highlight color and opacity, and inject them dynamically into the Foliate-JS WebView.

**Architecture:** Add preferences storage in Dart, propagate them to the Foliate-JS WebView via URL initialization and `changeStyle` updates, apply them dynamically in Foliate-JS's `initTTS`, rebuild the Foliate bundle, and add UI settings widgets.

**Tech Stack:** Flutter, Dart, Javascript, Webpack, HTML.

---

### Task 1: Update Localization Files
**Files:**
- Modify: [app_en.arb](file:///home/rousseau/anx-reader/lib/l10n/app_en.arb)
- Modify: [app_es.arb](file:///home/rousseau/anx-reader/lib/l10n/app_es.arb)

- [ ] **Step 1: Add localization keys to `app_en.arb`**
  Append these keys inside `lib/l10n/app_en.arb` right after `settingsNarrateOpenAiInstructionsDescription` (around line 844):
  ```json
    "settingsNarrateHighlightStyle": "Highlight Style",
    "settingsNarrateHighlightColor": "Highlight Color",
    "settingsNarrateHighlightOpacity": "Highlight Opacity",
  ```

- [ ] **Step 2: Add localization keys to `app_es.arb`**
  Append these keys inside `lib/l10n/app_es.arb` right after `settingsNarrateOpenAiInstructionsDescription` (around line 796):
  ```json
    "settingsNarrateHighlightStyle": "Estilo de Resaltado",
    "settingsNarrateHighlightColor": "Color de Resaltado",
    "settingsNarrateHighlightOpacity": "Opacidad del Resaltado",
  ```

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add lib/l10n/app_en.arb lib/l10n/app_es.arb
  git commit -m "feat: add tts highlight settings localization keys"
  ```

---

### Task 2: Update Preferences Storage
**Files:**
- Modify: [shared_preference_provider.dart](file:///home/rousseau/anx-reader/lib/config/shared_preference_provider.dart)

- [ ] **Step 1: Implement getters and setters for highlight color and opacity**
  Add the following getter/setter implementations inside the `Prefs` class in `lib/config/shared_preference_provider.dart` (e.g., around line 454):
  ```dart
    set ttsHighlightColor(String color) {
      prefs.setString('ttsHighlightColor', color);
      notifyListeners();
    }

    String get ttsHighlightColor {
      return prefs.getString('ttsHighlightColor') ?? '39C5BC';
    }

    set ttsHighlightOpacity(double opacity) {
      prefs.setDouble('ttsHighlightOpacity', opacity);
      notifyListeners();
    }

    double get ttsHighlightOpacity {
      return prefs.getDouble('ttsHighlightOpacity') ?? 0.5;
    }
  ```

- [ ] **Step 2: Commit**
  Run:
  ```bash
  git add lib/config/shared_preference_provider.dart
  git commit -m "feat: add tts highlight color and opacity preferences"
  ```

---

### Task 3: WebView Integration and JS Bridge in Dart
**Files:**
- Modify: [gererate_url.dart](file:///home/rousseau/anx-reader/lib/utils/webView/gererate_url.dart)
- Modify: [epub_player.dart](file:///home/rousseau/anx-reader/lib/page/book_player/epub_player.dart)

- [ ] **Step 1: Update style parameter map in `gererate_url.dart`**
  Modify the `style` map in `lib/utils/webView/gererate_url.dart` around line 98:
  ```dart
      'headingFontSize': bookStyle.headingFontSize,
      'codeHighlightTheme': Prefs().codeHighlightTheme.code,
      'ttsHighlightColor': Prefs().ttsHighlightColor,
      'ttsHighlightOpacity': Prefs().ttsHighlightOpacity,
    };
  ```

- [ ] **Step 2: Update dynamic settings update in `changeStyle` inside `epub_player.dart`**
  Add the new fields to the `changeStyle` method js call in `lib/page/book_player/epub_player.dart` around line 207:
  ```dart
          useBookStyles: ${Prefs().useBookStyles},
          headingFontSize: ${style.headingFontSize},
          codeHighlightTheme: '${Prefs().codeHighlightTheme.code}',
          ttsHighlightColor: '${Prefs().ttsHighlightColor}',
          ttsHighlightOpacity: ${Prefs().ttsHighlightOpacity},
        })
  ```

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add lib/utils/webView/gererate_url.dart lib/page/book_player/epub_player.dart
  git commit -m "feat: propagate tts highlight style configurations to webview"
  ```

---

### Task 4: Foliate-JS Scripts Modification and Rebuild
**Files:**
- Modify: [book.js](file:///home/rousseau/anx-reader/assets/foliate-js/src/book.js)
- Modify: [view.js](file:///home/rousseau/anx-reader/assets/foliate-js/src/view.js)

- [ ] **Step 1: Update style change logic in `book.js`**
  Modify `window.changeStyle` in `assets/foliate-js/src/book.js` (around line 1827) to store the window values:
  ```javascript
    // Update code highlighting theme if changed
    if (newStyle.codeHighlightTheme !== undefined) {
      changeCodeHighlightTheme(newStyle.codeHighlightTheme)
    }
    if (newStyle.ttsHighlightColor !== undefined) {
      window.ttsHighlightColor = newStyle.ttsHighlightColor
    }
    if (newStyle.ttsHighlightOpacity !== undefined) {
      window.ttsHighlightOpacity = newStyle.ttsHighlightOpacity
    }
  ```
  Also in `book.js`, parse the initial parameters if present in the loaded style object (around line 2385):
  ```javascript
  var style = JSON.parse(urlParams.get('style'))
  if (style) {
    if (style.ttsHighlightColor !== undefined) {
      window.ttsHighlightColor = style.ttsHighlightColor
    }
    if (style.ttsHighlightOpacity !== undefined) {
      window.ttsHighlightOpacity = style.ttsHighlightOpacity
    }
  }
  ```

- [ ] **Step 2: Update highlight rendering logic in `view.js`**
  Modify the `initTTS` callback in `assets/foliate-js/src/view.js` (around line 577) to resolve colors dynamically:
  ```javascript
            value = this.getCFI(this.#index, range);
            let highlightColor = (() => {
              let color = window.ttsHighlightColor || '#39c5bc';
              if (!color.startsWith('#')) {
                color = '#' + color;
              }
              const opacity = window.ttsHighlightOpacity !== undefined ? parseFloat(window.ttsHighlightOpacity) : 0.5;
              const alphaHex = Math.min(255, Math.max(0, Math.round(opacity * 255))).toString(16).padStart(2, '0');
              return color.slice(0, 7) + alphaHex;
            })();
            overlayer.add(value, range, Overlayer.highlight, { color: highlightColor });
            this.oldValue = value;
  ```

- [ ] **Step 3: Run npm build to rebuild Foliate dist bundle**
  Run:
  ```bash
  cd assets/foliate-js && npm install && npm run build && cd ../..
  ```
  Verify that `assets/foliate-js/dist/bundle.js` has been updated.

- [ ] **Step 4: Commit**
  Run:
  ```bash
  git add assets/foliate-js/src/book.js assets/foliate-js/src/view.js assets/foliate-js/dist/bundle.js
  git commit -m "feat: handle dynamic tts highlights in foliate-js and rebuild bundle"
  ```

---

### Task 5: Narrator Settings UI implementation
**Files:**
- Modify: [narrate.dart](file:///home/rousseau/anx-reader/lib/page/settings_page/narrate.dart)

- [ ] **Step 1: Add Color Picker helper dialog and Resaltado section**
  Add the dialog helper `_showTtsColorPickerDialog` and a new `SettingsSection` inside `lib/page/settings_page/narrate.dart`.
  
  Add `_showTtsColorPickerDialog` to the `_NarrateSettingsState` class:
  ```dart
    Future<void> _showTtsColorPickerDialog(BuildContext context) async {
      final currentColor = Color(int.parse('FF${Prefs().ttsHighlightColor}', radix: 16));
      Color pickedColor = currentColor;

      await showDialog<void>(
        context: context,
        builder: (BuildContext context) {
          return AlertDialog(
            title: Text(L10n.of(context).settingsNarrateHighlightColor),
            content: SingleChildScrollView(
              child: ColorPicker(
                pickerColor: pickedColor,
                onColorChanged: (color) {
                  pickedColor = color;
                },
                enableAlpha: false,
                displayThumbColor: true,
                pickerAreaHeightPercent: 0.8,
              ),
            ),
            actions: <Widget>[
              TextButton(
                child: Text(L10n.of(context).commonCancel),
                onPressed: () {
                  Navigator.of(context).pop();
                },
              ),
              TextButton(
                child: Text(L10n.of(context).commonOk),
                onPressed: () {
                  String hexColor = pickedColor.value.toRadixString(16).substring(2).toUpperCase();
                  Prefs().ttsHighlightColor = hexColor;
                  Navigator.of(context).pop();
                },
              ),
            ],
          );
        },
      );
    }
  ```
  
  In the `build` method, append the new `SettingsSection` at the end of the `ListView` children:
  ```dart
          SettingsSection(
            title: Text(L10n.of(context).settingsNarrateHighlightStyle),
            tiles: [
              SettingsTile.navigation(
                title: Text(L10n.of(context).settingsNarrateHighlightColor),
                leading: const Icon(Icons.color_lens),
                trailing: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: Color(int.parse('FF${Prefs().ttsHighlightColor}', radix: 16)),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.grey),
                  ),
                ),
                onPressed: (context) async {
                  await _showTtsColorPickerDialog(context);
                  setState(() {});
                },
              ),
              CustomSettingsTile(
                child: ListTile(
                  title: Text(L10n.of(context).settingsNarrateHighlightOpacity),
                  subtitle: Row(
                    children: [
                      Text('${(Prefs().ttsHighlightOpacity * 100).toStringAsFixed(0)}%'),
                      Expanded(
                        child: Slider(
                          value: Prefs().ttsHighlightOpacity,
                          onChanged: (value) {
                            setState(() {
                              Prefs().ttsHighlightOpacity = value;
                            });
                          },
                          max: 1.0,
                          min: 0.1,
                          divisions: 9,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
  ```

- [ ] **Step 2: Commit**
  Run:
  ```bash
  git add lib/page/settings_page/narrate.dart
  git commit -m "feat: add tts highlight options to narrator settings UI"
  ```

---

### Task 6: Verification and Testing
**Files:**
- Test: Manual verification in the running app.

- [ ] **Step 1: Re-build flutter localization strings**
  Run:
  ```bash
  flutter gen-l10n
  ```

- [ ] **Step 2: Build/Run the app locally**
  Run:
  ```bash
  flutter run
  ```

- [ ] **Step 3: Verify style updates**
  1. Open narrator options in the settings page.
  2. Change highlight color and opacity.
  3. Open an EPUB book, select TTS Narrate, and confirm the highlight style is applied correctly.
  4. Modify highlight options again and check if changes propagate.
