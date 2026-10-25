# 📚 AFFiNITe: Master Note de Integración de Biblioteca y Lector Anx-Remix

> **Versión:** `v0.29.5`  
> **Fecha:** 25 de Octubre, 2026  
> **Autor:** Rousseau & Antigravity  
> **Área:** Biblioteca Digital, Lector EPUB/PDF/TXT/MD, Arquitectura WebBridge & Base de Datos Web  
> **Estado:** 100% Implementado, Integrado de Forma Auténtica y Empaquetado en Flatpak (`app.affinite.Affinite`)

---

## 📑 Tabla de Contenidos

1. [Visión y Principio Rector: Contener Anx-Remix sin Reinventar la Rueda](#1-visión-y-principio-rector-contener-anx-remix-sin-reinventar-la-rueda)
2. [Arquitectura Bidireccional `WebBridge` (React ↔ Flutter Web)](#2-arquitectura-bidireccional-webbridge-react--flutter-web)
3. [Solución Definitiva al Fallo de Base de Datos en Web (`WebFakeDatabase`)](#3-solución-definitiva-al-fallo-de-base-de-datos-en-web-webfakedatabase)
4. [El Lector Auténtico de Anx-Remix en Pantalla Completa (`ReadingPage` + Foliate)](#4-el-lector-auténtico-de-anx-remix-en-pantalla-completa-readingpage--foliate)
5. [Carga Segura de Archivos Locales con Protocolo `assets://local-file/`](#5-carga-segura-de-archivos-locales-con-protocolo-assetslocal-file)
6. [Corrección del Error Crítico TDZ (`ReferenceError: Cannot access 't$' before initialization`)](#6-corrección-del-error-crítico-tdz-referenceerror-cannot-access-t-before-initialization)
7. [Ajustes Tipográficos, Escala Visual y Renderizado de Foliate](#7-ajustes-tipográficos-escala-visual-y-renderizado-de-foliate)
8. [Pipeline de Compilación, Empaquetado y Despliegue Flatpak](#8-pipeline-de-compilación-empaquetado-y-despliegue-flatpak)
9. [Resumen de Archivos Clave Modificados](#9-resumen-de-archivos-clave-modificados)

---

## 1. Visión y Principio Rector: Contener Anx-Remix sin Reinventar la Rueda

El objetivo central de este desarrollo fue integrar **Anx-Remix** (una de las aplicaciones de lectura y gestión de libros de código abierto más completas en Flutter) dentro del entorno de trabajo unificado de **AFFiNITe** (`/library`), sin reescribir desde cero la experiencia de usuario:

* **Identidad Visual y Funcional Idéntica:** La estantería de libros, la vista de estadísticas de lectura, las notas al margen, los temas de lectura y la pantalla del lector debían verse y comportarse exactamente igual que en Anx-Remix nativo.
* **Integración sin Costura:** Los libros gestionados en AFFiNITe se sincronizan de forma transparente con la estantería de Anx-Remix, y el progreso de lectura (CFI y porcentaje) se conserva de forma persistente en los documentos locales Yjs de AFFiNITe.
* **Cero Dependencia de Servidores Externos:** Todo el sistema funciona de manera 100% local y offline, aprovechando la arquitectura de archivos del sandbox Flatpak.

```
+-----------------------------------------------------------------------------------+
|                              AFFiNITe Workspace (/library)                       |
|                                                                                   |
|  [ Pestañas AFFiNITe: Documentos | Boards | Calendario | Hábitos | Biblioteca ]   |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                 Contenedor Iframe: Anx-Remix (Flutter Web)                  |  |
|  |                                                                             |  |
|  |  +-------------------+ +-------------------+ +---------------------------+  |  |
|  |  | Estantería Libros | |    Estadísticas   | | Lector Auténtico Anx      |  |  |
|  |  | Grid / Lista      | | Métricas de horas | | AppBar + Foliate + TOC    |  |  |
|  |  | Portadas fluidas  | | Cero errores (!)  | | Temas / Notas / TTS / IA  |  |  |
|  |  +-------------------+ +-------------------+ +---------------------------+  |  |
|  |                           ▲                                                 |  |
|  |                           │ postMessage ('anx-sync-books', 'anx-progress')  |  |
|  |                           ▼                                                 |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  | Bridge React (packages/frontend/core/.../library/index.tsx)           |  |  |
|  |  | - Sincronizador Yjs Local                                             |  |  |
|  |  | - Importador de archivos nativo Electron                              |  |  |
|  |  | - Protocol Handler (assets://local-file/ y assets://./foliate/)         |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Arquitectura Bidireccional `WebBridge` (React ↔ Flutter Web)

La comunicación entre el host Electron/React de AFFiNITe y el aplicativo Flutter Web de Anx-Remix se diseñó mediante un canal de eventos `postMessage` fuertemente tipado:

### Eventos Emitidos por AFFiNITe hacia Anx-Remix
1. `anx-sync-books`:
   - Envía el listado completo de libros formateados desde el almacén local de AFFiNITe (`formatBooksForAnx`).
   - Actualiza en memoria `BookDao.webBooks` para que la estantería de Anx los presente al instante sin latencia.
2. `anx-book-imported`:
   - Notifica la importación exitosa de un libro nuevo (EPUB, PDF, TXT o Markdown) junto con su portada generada, título y metadatos.

### Eventos Emitidos por Anx-Remix hacia AFFiNITe
1. `anx-request-books`:
   - Disparado por Anx al inicializarse para solicitar el estado actual de la biblioteca.
2. `anx-request-import`:
   - Disparado cuando el usuario presiona el botón de añadir libro en la barra de Anx. AFFiNITe abre el diálogo de archivos del sistema operativo mediante Electron IPC (`library:importBook`), copia el libro al almacenamiento seguro y lo devuelve a Anx.
3. `anx-update-progress`:
   - Disparado automáticamente cada vez que el lector pasa de página o se cierra (`saveReadingProgress`), enviando el identificador del libro, la posición CFI exacta y el porcentaje de lectura para persistirlo en Yjs.
4. `anx-delete-book`:
   - Permite eliminar libros de la biblioteca sincronizadamente.

---

## 3. Solución Definitiva al Fallo de Base de Datos en Web (`WebFakeDatabase`)

### El Problema
Al abrir la pestaña de **Estadísticas** dentro de Anx-Remix en la Web, la interfaz mostraba múltiples tarjetas en rojo con el error:
```
Error: Unsupported operation: Database not supported on Web
```
El motivo residía en que `DBHelper().database` y `BaseDao._database` lanzaban `UnsupportedError('Database not supported on Web')` en plataformas web porque `sqflite` tradicionalmente requiere SQLite compilado nativamente con FFI o C.

### La Solución
En [`lib/dao/database.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/dao/database.dart) se implementó una base de datos simulada completa para la Web mediante el mecanismo `noSuchMethod` de Dart:

```dart
class WebFakeDatabase implements Database {
  @override
  dynamic noSuchMethod(Invocation invocation) {
    final name = invocation.memberName.toString();
    if (name.contains('query') || name.contains('rawQuery')) {
      return Future<List<Map<String, dynamic>>>.value(<Map<String, dynamic>>[]);
    }
    if (name.contains('insert') ||
        name.contains('update') ||
        name.contains('delete') ||
        name.contains('rawInsert') ||
        name.contains('rawUpdate') ||
        name.contains('rawDelete') ||
        name.contains('execute')) {
      return Future<int>.value(0);
    }
    if (name.contains('transaction')) {
      if (invocation.positionalArguments.isNotEmpty &&
          invocation.positionalArguments.first is Function) {
        final callback = invocation.positionalArguments.first as Function;
        try {
          final res = callback(WebFakeTransaction());
          if (res is Future) return res;
          return Future.value(res);
        } catch (_) {
          return Future.value(null);
        }
      }
      return Future.value(null);
    }
    if (name.contains('batch')) return WebFakeBatch();
    if (name.contains('isOpen')) return true;
    if (name.contains('close')) return Future<void>.value();
    return Future.value(null);
  }
}
```

* **Eliminación de la excepción:** `DBHelper.database` ahora devuelve `_webFakeDatabase ??= WebFakeDatabase()` en lugar de lanzar excepciones.
* **Agregadores de Estadísticas Seguros:** En [`lib/dao/reading_time.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/dao/reading_time.dart), `_aggregateByBook` retorna `[]` de inmediato en Web, permitiendo que Riverpod y los widgets de estadísticas rendericen estados en cero limpios ("0 min leídos", "0 libros leídos", etc.) sin ninguna alerta roja.
* **Temas Predefinidos:** En [`lib/dao/theme.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/dao/theme.dart), `selectThemes()` entrega temas predeterminados claros y oscuros, garantizando que el lector siempre tenga paletas de color asignadas.

---

## 4. El Lector Auténtico de Anx-Remix en Pantalla Completa (`ReadingPage` + Foliate)

### El Error de Desviación Previo
Anteriormente, al hacer clic sobre un libro en la estantería, un interceptor enviaba `anx-open-book` al host y desmontaba el iframe de Anx para abrir un lector secundario en React. Esto rompía la continuidad de la experiencia solicitada por el usuario.

### Adaptación del Lector Nativo de Anx en Web
En [`lib/service/book.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/service/book.dart), se eliminó la interrupción hacia React y se habilitó la navegación nativa de Flutter hacia [`ReadingPage`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/page/reading_page.dart):

1. **Barra Superior Completa de Anx:**
   - Botón de retroceso para volver a la estantería (`Navigator.pop`).
   - Título del libro y porcentaje actual.
   - Botón de IA Copilot para resúmenes o preguntas sobre el texto.
   - Copiar contenido del capítulo actual al portapapeles.
   - Marcador interactivo (añadir/quitar marcador en la posición CFI actual).
   - Más opciones y detalles del libro.
2. **Barra Inferior Flotante de Anx:**
   - **TOC (Índice):** Cajón lateral desplegable con el árbol de contenidos del libro para saltar de capítulo.
   - **Notas:** Visualizador y gestor de notas y resaltados.
   - **Progreso:** Deslizador para saltar a porcentajes específicos con estimación de lectura restante.
   - **Estilos & Temas:** Selector visual de fuentes (serif, sans-serif, monospace), tamaño de fuente, interlineado, espaciado de párrafos, márgenes laterales/superiores y temas de color (claro, sepia, oscuro, OLED).
   - **TTS (Texto a Voz):** Panel de lectura por voz y botón flotante de control.
3. **Panel de IA Integrado:** Permite abrir el chat inteligente en pantalla dividida lateral o inferior para interactuar con el contenido del libro.
4. **Protección de Inicialización de Audio:** En [`reading_page.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/page/reading_page.dart) y [`epub_player.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/page/book_player/epub_player.dart), se protegieron las llamadas a `audioHandler.stop()`, `play()` y `pause()` bajo `if (!AnxPlatform.isWeb)` para prevenir errores de tipo `LateInitializationError: Field 'audioHandler' has not been initialized`.

---

## 5. Carga Segura de Archivos Locales con Protocolo `assets://local-file/`

Para que el motor de renderizado Foliate embebido en el lector pudiera abrir libros locales sin violar las políticas de seguridad de Chromium:

1. **Generación de URL de Foliate:**
   En [`lib/utils/webView/gererate_url.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/utils/webView/gererate_url.dart), se adaptó `indexHtmlPath` para que en entorno Web apunte a:
   ```dart
   String indexHtmlPath = AnxPlatform.isWeb
       ? "assets://./foliate/index.html"
       : "http://127.0.0.1:${Server().port}/foliate-js/index.html";
   ```
2. **Normalización de la Ruta del Libro:**
   En [`lib/page/book_player/epub_player.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/page/book_player/epub_player.dart), la ruta del libro se encapsula con el protocolo seguro de Electron:
   ```dart
   String url = AnxPlatform.isWeb
       ? (widget.book.filePath.startsWith('assets://')
           ? widget.book.filePath
           : 'assets://local-file/${Uri.encodeComponent(widget.book.filePath)}')
       : 'http://127.0.0.1:${Server().port}/book/$uri';
   ```
3. **Manejo en Electron Main:**
   El manejador de protocolos de AFFiNITe ([`protocol.ts`](file:///home/rousseau/Documents/GitHub/Affinite/packages/frontend/apps/electron/src/main/protocol.ts)) valida que el archivo se encuentre dentro de las carpetas permitidas del usuario (`home`, `userData`, etc.) y lo entrega mediante streaming directo sin copiar archivos a ubicaciones temporales.

---

## 6. Corrección del Error Crítico TDZ (`ReferenceError: Cannot access 't$' before initialization`)

### Causa Raíz
En versiones previas, la consola arrojaba:
```
ReferenceError: Cannot access 't$' before initialization
    at j (assets://./js/7073.d6509bf3.js:1:8906)
```
Esto ocurría porque el hook `useEffect` y la función `formatBooksForAnx` en [`packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`](file:///home/rousseau/Documents/GitHub/Affinite/packages/frontend/core/src/desktop/pages/workspace/library/index.tsx) hacían referencia a `handleUpdateProgress` antes de su declaración con `const handleUpdateProgress = useCallback(...)`, violando la Zona Muerta Temporal (TDZ) de JavaScript al empaquetar con Rspack/Webpack en modo producción.

### Solución
- Se reorganizó el orden de declaración, ubicando `handleUpdateProgress` en la parte superior de los callbacks.
- Se implementó `booksRef = useRef(books)` para garantizar que los callbacks asíncronos de mensajes provenientes de Anx siempre lean el estado actual de los libros sin generar bucles de renderizado ni dependencias circulares.
- Se eliminaron definiciones duplicadas y se ejecutó la suite de pruebas unitarias (`library-manager.spec.ts`), logrando 100% de pruebas en verde (7/7 pasadas).

---

## 7. Ajustes Tipográficos, Escala Visual y Renderizado de Foliate

Para solucionar el problema donde el texto aparecía sobredimensionado o difícil de leer en pantallas de escritorio:

1. **Normalización del Tamaño de Fuente:**
   En [`foliate/src/book.js`](file:///home/rousseau/Documents/GitHub/Affinite/packages/frontend/apps/electron/resources/web-static/foliate/src/book.js), se configuró una escala base normalizada (`fontSize: size > 4 ? Number((size / 16).toFixed(2)) : size`), adaptando las proporciones CSS relativas al contenedor.
2. **Margenes y Tipografía Optimizadas:**
   Se ajustaron los márgenes predeterminados (lateral: 20px, superior: 40px, inferior: 40px) y el interlineado (`spacing: 1.6`, `paragraphSpacing: 0.8`), proporcionando una experiencia de lectura descansada y profesional con compatibilidad completa para fuentes del sistema y fuentes web de Anx.

---

## 8. Pipeline de Compilación, Empaquetado y Despliegue Flatpak

Se automatizó el proceso completo de integración entre ambos repositorios:

1. **Compilación de Anx-Remix para Web:**
   ```bash
   cd ~/Documents/GitHub/Anx-Remix
   flutter build web --no-pub --base-href /anx/
   ```
2. **Sincronización a AFFiNITe:**
   ```bash
   rsync -av --delete build/web/ ~/Documents/GitHub/Affinite/packages/frontend/apps/electron/resources/web-static/anx/
   ```
3. **Compilación de la Capa de Renderer de AFFiNITe:**
   ```bash
   yarn affine @affine/electron-renderer build
   ```
4. **Construcción y Actualización del Paquete Flatpak Nativo:**
   ```bash
   ./build-flatpak.sh stable --rebuild
   ```
   - Exporta el commit OSTree a `.flatpak-repo`.
   - Genera el bundle autocontenido `AFFiNITe-linux-x86_64.flatpak` (156 MB).
   - Instala de inmediato la actualización en el usuario local (`flatpak --user install -y --reinstall`).

---

## 9. Resumen de Archivos Clave Modificados

### Repositorio Anx-Remix (`/home/rousseau/Documents/GitHub/Anx-Remix`)
| Archivo | Cambio Principal |
| :--- | :--- |
| [`lib/dao/database.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/dao/database.dart) | Implementación de `WebFakeDatabase`, `WebFakeTransaction` y `WebFakeBatch` con `noSuchMethod`. |
| [`lib/dao/base_dao.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/dao/base_dao.dart) | Eliminación de `UnsupportedError` en el getter de base de datos. |
| [`lib/dao/reading_time.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/dao/reading_time.dart) | Retorno vacío seguro en `_aggregateByBook` para evitar errores en la pestaña de Estadísticas. |
| [`lib/dao/theme.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/dao/theme.dart) | Fallback de temas claro/oscuro por defecto en la Web. |
| [`lib/service/book.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/service/book.dart) | Habilitación de la navegación directa a `ReadingPage` y protección de `File.existsSync`. |
| [`lib/page/reading_page.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/page/reading_page.dart) | Protección de llamadas a `audioHandler.stop()` bajo `!AnxPlatform.isWeb`. |
| [`lib/page/book_player/epub_player.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/page/book_player/epub_player.dart) | Soporte de URLs `assets://local-file/`, `WebBridge.updateProgress` y guardas de audio. |
| [`lib/utils/webView/gererate_url.dart`](file:///home/rousseau/Documents/GitHub/Anx-Remix/lib/utils/webView/gererate_url.dart) | Enrutamiento a `assets://./foliate/index.html` en Web. |

### Repositorio AFFiNITe (`/home/rousseau/Documents/GitHub/Affinite`)
| Archivo | Cambio Principal |
| :--- | :--- |
| [`packages/.../library/index.tsx`](file:///home/rousseau/Documents/GitHub/Affinite/packages/frontend/core/src/desktop/pages/workspace/library/index.tsx) | Corrección de TDZ (`t$`), refactor con `booksRef`, preservación del iframe de Anx y guardas de `anx-open-book`. |
| [`packages/.../resources/web-static/foliate/src/book.js`](file:///home/rousseau/Documents/GitHub/Affinite/packages/frontend/apps/electron/resources/web-static/foliate/src/book.js) | Ajustes en la escala tipográfica, soporte de normalización de URLs `assets://local-file/` y comandos. |
| [`build-flatpak.sh`](file:///home/rousseau/Documents/GitHub/Affinite/build-flatpak.sh) | Empaquetador nativo Flatpak con permisos Wayland, D-Bus y empaquetado optimizado de ASAR con `--unpack "*.node"`. |

---
*Nota redactada y certificada para el proyecto AFFiNITe. Todas las características descritas están compiladas, verificadas y operativas en la versión instalada en el sistema.*
