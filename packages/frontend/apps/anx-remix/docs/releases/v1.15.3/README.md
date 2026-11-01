# Anx Remix - Release v1.15.2 (Primer Lanzamiento Público)

¡Bienvenidos al lanzamiento oficial de **Anx Remix (v1.15.2)**! Este es el primer lanzamiento público de este fork optimizado de *ANX Reader*. Dado que las versiones anteriores fueron únicamente de desarrollo interno, esta release compila **todas** las mejoras, nuevas funcionalidades, integraciones y correcciones aplicadas desde el proyecto base original.

---

## 🌟 Características Destacadas de Anx Remix

### 1. Rebranding Completo e Independencia del Sistema (Decoupling)
Para evitar conflictos con la versión original de ANX Reader y permitir el uso en paralelo:
* **Identificadores del Paquete**: Cambiados a `com.pitufus.anx_remix` (Android, Linux, Web) y `com.pitufus.anxRemix` (iOS).
* **Identidad Visual**: Títulos de ventana actualizados en Flutter y Windows Manager, nombre nativo del sistema adaptado en strings de Android, iOS Info.plist, y el título interno del WebView.
* **Localización**: Actualizadas las cadenas de traducción oficiales del sistema para inglés y español (con compilación exitosa de `flutter gen-l10n`).

### 2. Diccionario Offline MDict (.mdx) e Integración de Búsquedas
* **Lector MDict Nativo**: Integración del motor de lectura de diccionarios offline en formato binario comprimido `.mdx` (mediante el paquete `dict_reader`).
* **Base de Datos SQLite (v8)**: Diseño de base de datos actualizado con la tabla `tb_dictionaries` para la gestión interactiva de archivos locales importados físicamente en el directorio del dispositivo.
* **Sanitizado y Renderizado HTML**:
  * Limpiador regex a nivel de base de datos para omitir bloques de estilos CSS malformados embebidos en el contenido del diccionario.
  * Preservación selectiva de etiquetas HTML aprobadas (negritas, cursivas, listas) para mantener el formato original sin romper la interfaz de usuario.
* **Flujo Inteligente de Consultas**:
  1. **Limpieza Unicode**: Remoción de signos de puntuación iniciales y finales para aislar la palabra clave.
  2. **Búsqueda Exacta Local**: Consulta rápida sobre los diccionarios MDict instalados.
  3. **Desconjugación (Stemming)**: Si la palabra no existe (ej. "reading"), el motor busca automáticamente variantes base ("read").
  4. **Fallback Online**: Si no hay diccionarios o falla la búsqueda, consulta de respaldo integrada con la REST API de Wiktionary en el idioma del libro.
  5. **Navegación por Enlaces**: El panel de definición inferior soporta hipervínculos internos (`entry://`) para navegación recursiva entre definiciones con un toque.

### 3. Personalización del Resaltado del Narrador TTS
* **Control UI Total**: Añadidos a la configuración del lector un selector de color interactivo (`flutter_colorpicker`) y un control deslizante (`Slider`) de opacidad (0% - 100%).
* **Inyección de CSS en Caliente**: Los valores elegidos son transmitidos en tiempo real al WebView del lector (Foliate-JS), permitiendo cambiar el color de fondo y de resaltado del TTS dinámicamente sin recargar la página.

### 4. Corrección del Menú Contextual (Foliate Bridge Fix)
* Solucionado el bug crítico en Linux y Android donde al seleccionar una sola palabra no se mostraba el menú contextual de notas/diccionario. 
* Se reescribió el detector en JavaScript interceptando los eventos `pointerup` y `selectionchange` con debounce para forzar la sincronización del bridge de Flutter de forma inmediata.

---

## ⚙️ Automatización e Infraestructura del Proyecto (Novedades de Compilación)

Para facilitar la generación y distribución de releases desde esta terminal:
* **[run_release.sh](file:///home/rousseau/Documents/GitHub/Anx-Remix/run_release.sh)**: Automatiza de forma interactiva el versionado de `pubspec.yaml`, validación de SemVer, y gestión de tags en Git directamente en la rama `main`.
* **[build_apk.sh](file:///home/rousseau/Documents/GitHub/Anx-Remix/scripts/build_apk.sh)**: Script para compilar las arquitecturas de Android (`arm64-v8a`, `armeabi-v7a`, `x86_64`) por separado (optimizando tamaño) y renombrarlas de acuerdo a la versión actual.
* **[build_appimage.sh](file:///home/rousseau/Documents/GitHub/Anx-Remix/scripts/build_appimage.sh)**: Script automatizado para descargar `appimagetool` y empaquetar el ejecutable ejecutable y portable de Linux (`Anx_Remix-x86_64.AppImage`) incluyendo hacks para el renderizado acelerado en GPUs híbridas bajo Wayland.
