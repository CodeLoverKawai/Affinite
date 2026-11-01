# Specification: TTS Narrator Highlight Customization

This document defines the implementation details for customizing the highlight color and intensity/opacity of the text being read by the TTS narrator in ANX Reader.

## Goal
Provide settings options in the TTS narrator configuration page to allow users to customize the highlight color and opacity, and inject these settings dynamically into the foliate-js WebView reader.

## Storage Configuration
We will add two new properties to `Prefs` in [shared_preference_provider.dart](file:///home/rousseau/anx-reader/lib/config/shared_preference_provider.dart):

1. **`ttsHighlightColor`**: String (hex format, default: `'39C5BC'`).
2. **`ttsHighlightOpacity`**: Double (opacity value from `0.0` to `1.0`, default: `0.5`).

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

## WebView and JS Bridge
We need to propagate the color and opacity settings to the Foliate-JS WebView player.

### 1. Initial State Injection
In [gererate_url.dart](file:///home/rousseau/anx-reader/lib/utils/webView/gererate_url.dart), we will add `ttsHighlightColor` and `ttsHighlightOpacity` to the style parameters of the reader URL:
```dart
  Map<String, dynamic> style = {
    ...
    'ttsHighlightColor': Prefs().ttsHighlightColor,
    'ttsHighlightOpacity': Prefs().ttsHighlightOpacity,
  };
```

### 2. Dynamically Updating Style
In [book.js](file:///home/rousseau/anx-reader/assets/foliate-js/src/book.js) inside `window.changeStyle`, extract these variables and set them globally:
```javascript
window.changeStyle = (newStyle) => {
  const oldStyle = style
  style = { ...style, ...newStyle }
  console.log('changeStyle', JSON.stringify(style))
  setStyle(oldStyle)
  
  if (newStyle.ttsHighlightColor !== undefined) {
    window.ttsHighlightColor = newStyle.ttsHighlightColor
  }
  if (newStyle.ttsHighlightOpacity !== undefined) {
    window.ttsHighlightOpacity = newStyle.ttsHighlightOpacity
  }
  ...
}
```

### 3. Foliate-JS TTS Overlay Update
In [view.js](file:///home/rousseau/anx-reader/assets/foliate-js/src/view.js) inside `initTTS(stop)`, resolve the custom highlight color dynamically by combining RGB hex and alpha opacity:
```javascript
          let color = window.ttsHighlightColor || '#39c5bc';
          if (!color.startsWith('#')) {
            color = '#' + color;
          }
          const opacity = window.ttsHighlightOpacity !== undefined ? parseFloat(window.ttsHighlightOpacity) : 0.5;
          const alphaHex = Math.min(255, Math.max(0, Math.round(opacity * 255))).toString(16).padStart(2, '0');
          const highlightColor = color.slice(0, 7) + alphaHex;
          
          overlayer.add(value, range, Overlayer.highlight, { color: highlightColor });
```

In addition, we need to ensure that the webpack bundle (`dist/bundle.js`) is rebuilt by running `npm run build` inside `assets/foliate-js/` after changes are done.

## User Interface Configuration
In [narrate.dart](file:///home/rousseau/anx-reader/lib/page/settings_page/narrate.dart), we will add a new `SettingsSection` at the end of the `ListView` (or right after the TTS Service configuration) titled `Resaltado` (or standard highlight header).

```dart
        SettingsSection(
          title: Text(L10n.of(context).settingsNarrateHighlightStyle),
          tiles: [
            SettingsTile.navigation(
              title: Text(L10n.of(context).settingsNarrateHighlightColor),
              leading: Icon(Icons.color_lens, color: Color(int.parse('FF${Prefs().ttsHighlightColor}', radix: 16))),
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
                await showTtsColorPickerDialog(context);
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

### Color Picker Dialog Helper
We will add `showTtsColorPickerDialog` inside `narrate.dart` similar to `showColorPickerDialog` in `appearance.dart`:
```dart
  Future<void> showTtsColorPickerDialog(BuildContext context) async {
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

## Localization
We will add the following translation keys to:
* [app_en.arb](file:///home/rousseau/anx-reader/lib/l10n/app_en.arb)
* [app_es.arb](file:///home/rousseau/anx-reader/lib/l10n/app_es.arb)

### English (`app_en.arb`):
```json
  "settingsNarrateHighlightStyle": "Highlight Style",
  "settingsNarrateHighlightColor": "Highlight Color",
  "settingsNarrateHighlightOpacity": "Highlight Opacity"
```

### Spanish (`app_es.arb`):
```json
  "settingsNarrateHighlightStyle": "Estilo de Resaltado",
  "settingsNarrateHighlightColor": "Color de Resaltado",
  "settingsNarrateHighlightOpacity": "Opacidad del Resaltado"
```
