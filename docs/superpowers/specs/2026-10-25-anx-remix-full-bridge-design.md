# Especificación de Diseño: Integración Unificada Anx-Remix + AFFiNITe (Full Bridge)

- **Fecha:** 2026-10-25
- **Estado:** Validado para revisión final
- **Repositorios involucrados:**
  - Host AFFiNITe: `/home/rousseau/Documents/GitHub/Affinite`
  - App Anx-Remix: `/home/rousseau/Documents/GitHub/Anx-Remix`

---

## 1. Objetivo y Alcance

Unificar **Anx-Remix** y **AFFiNITe** en una única aplicación integrada dentro de la ruta `/library` de AFFiNITe, eliminando la duplicidad de interfaces (`anx` vs `integrated`) y reparando de raíz la comunicación entre el lector **Foliate**, el motor **Flutter Web de Anx-Remix**, la base de datos local **Yjs (`affinite_library_v1`)**, las notas/documentos **BlockSuite / Diario**, el narrador **TTS Web** y el asistente de **IA Antigravity Zero-Key**.

---

## 2. Arquitectura del Sistema

```
+---------------------------------------------------------------------------------------------------+
|                           AFFiNITe Host (Electron + React + Yjs + IPC)                            |
|   packages/frontend/core/src/desktop/pages/workspace/library/index.tsx                            |
|                                                                                                   |
|  - Persistencia en tiempo real en Yjs (`affinite_library_v1`: books, notes, readingTime, groups)  |
|  - Protocolo seguro Electron (`assets://local-file/`, `assets://./foliate/`, `assets://./anx/`)   |
|  - Integración BlockSuite (`Notas: <Libro>`) y Diario (`JournalService`)                          |
|  - Puente IA Antigravity Zero-Key (`window.__apis.handler.ai.chat`)                               |
+---------------------------------------------------------------------------------------------------+
                                                 ▲
                                                 │ Canal postMessage (`WebBridge`)
                                                 ▼
+---------------------------------------------------------------------------------------------------+
|                        Anx-Remix (Flutter Web Single Unified App)                                 |
|   /home/rousseau/Documents/GitHub/Anx-Remix/lib/                                                  |
|                                                                                                   |
|  +---------------------------+  +---------------------------+  +-------------------------------+  |
|  | Estantería, Grupos y Tags |  | Estadísticas y Notas      |  | Lector ReadingPage + Foliate  |  |
|  | BookDao.webBooks          |  | ReadingTimeDao.webRecords |  | Scroll Infinito por defecto   |  |
|  | GroupDao.webGroups        |  | BookNoteDao.webNotes      |  | Menú Contextual + Diario/Doc  |  |
|  | TagDao.webTags            |  | Sincronizado con Yjs      |  | IA Antigravity + TTS Web      |  |
|  +---------------------------+  +---------------------------+  +-------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Diseño Detallado por Componentes

### 3.1. Interfaz Única en AFFiNITe (`packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`)
1. **Eliminación de la vista duplicada**:
   - Se elimina el estado `displayMode` (`'anx' | 'integrated'`) y el renderizado duplicado del clon en React.
   - El componente `Library` renderiza el contenedor de Anx-Remix (`assets://./anx/index.html`) a pantalla completa ocupando el 100% de `ViewBody`.
2. **Almacén Yjs Unificado (`affinite_library_v1`)**:
   - Claves gestionadas en `rootYDoc.getMap('affinite_library_v1')`:
     - `books`: Lista de libros (`LibraryBook[]`).
     - `notes`: Lista de notas, subrayados y marcadores (`AnxWebNote[]`, mapeados 1:1 con `BookNote` de Anx-Remix).
     - `readingTimes`: Historial de sesiones de lectura (`AnxWebReadingTime[]`, mapeados 1:1 con `ReadingTime` de Anx-Remix).
     - `groups`: Grupos/carpetas de la estantería (`AnxWebGroup[]`).
3. **Manejadores de Eventos `postMessage` en el Host**:
   - `anx-request-sync`: Envía el payload inicial completo (`anx-full-sync`) con `books`, `notes`, `readingTimes` y `groups`.
   - `anx-request-import`: Abre el selector nativo de Electron (`__apis.handler.library.importBook`), registra el libro en Yjs y emite `anx-book-imported`.
   - `anx-update-book` / `anx-delete-book`: Actualiza metadatos, calificación, progreso (`readingPercentage`, `lastReadPosition`) o elimina el libro en Yjs y disco.
   - `anx-sync-notes`: Persiste la lista actualizada de notas/subrayados/marcadores en `yMap.set('notes', ...)` y mantiene compatibilidad con `highlights`/`bookmarks`.
   - `anx-sync-reading-times`: Persiste las sesiones de tiempo de lectura en `yMap.set('readingTimes', ...)`.
   - `anx-sync-groups`: Persiste la estructura de carpetas en `yMap.set('groups', ...)`.
   - `anx-quote-to-journal`: Recibe `{ bookTitle, author, chapter, cfi, text, note }`, genera el bloque Markdown con `generateJournalQuoteMarkdown`, lo copia al portapapeles e inserta/abre el documento del Diario del día actual mediante `journalService.ensureJournalByDate`.
   - `anx-export-to-doc`: Recibe `{ bookTitle, author, notes }`, crea un documento BlockSuite titulado `Notas: ${bookTitle}` con el resumen estructurado de citas y notas, y lo abre en una pestaña o panel de AFFiNITe.
   - `anx-ai-request`: Recibe `{ requestId, messages, bookContext }`, invoca `__apis.handler.ai.chat` con el proveedor `'antigravity'`, y responde a Anx-Remix mediante `anx-ai-response` (`{ requestId, content, done: true }` o `{ requestId, error }`).

---

### 3.2. Puente `EpubPlayer` ↔ `Foliate` y Scroll Infinito (`Anx-Remix`)
1. **Scroll Infinito Continuo por Defecto (`lib/config/shared_preference_provider.dart`)**:
   - En `Prefs.pageTurnStyle` (L578–582), cuando `prefs.getString('pageTurnStyle')` sea `null`, retornar `PageTurn.scroll` en lugar de `PageTurn.slide`.
2. **Comunicación Bidireccional con Foliate en Web (`lib/page/book_player/epub_player.dart` & `foliate/src/book.js`)**:
   - **Problema actual**: En Flutter Web, `InAppWebView` es un `<iframe>` donde `window.flutter_inappwebview.callHandler` no existe y `webViewController.evaluateJavascript` no se ejecuta de forma fiable sobre el iframe hijo ni devuelve promesas.
   - **Solución Foliate → Flutter (`anx-reader`)**:
     - En `EpubPlayerState`, cuando `AnxPlatform.isWeb` es `true`, suscribirse en `initState` a los mensajes `window.onMessage` cuyo `data['type'] == 'anx-reader'`.
     - Crear un despachador `_handleWebFoliateEvent(String eventName, dynamic payload)` que invoque directamente la lógica de:
       - `onLoadEnd`: llama a `widget.onLoadEnd()`, aplica el estilo inicial (`changeStyle(Prefs().bookStyle)` y `changePageTurnStyle(Prefs().pageTurnStyle)`) y renderiza anotaciones.
       - `onRelocated`: actualiza `cfi`, `percentage`, `chapterTitle`, `chapterHref`, `chapterCurrentPage`, `chapterTotalPages`, `bookmarkExists`, notifica a `currentReadingProvider` y ejecuta `saveReadingProgress()`.
       - `onClick`: invoca `onClick(location)` para mostrar/ocultar la barra superior e inferior de `ReadingPage` o pasar página según la zona pulsada.
       - `onSetToc`: parsea la lista de `TocItem` y actualiza `bookTocProvider`.
       - `onSelectionEnd` / `onSelectionCleared`: muestra u oculta el menú contextual de selección (`showContextMenu` / `removeOverlay`).
       - `onAnnotationClick`: abre el menú contextual sobre un subrayado/nota existente.
       - `onSearch`: envía el progreso y los resultados a `tocSearchProvider`.
       - `renderAnnotations`: llama a `renderAnnotations(webViewController)`.
       - `onPushState`: actualiza `canGoBack`, `canGoForward` y `showHistory`.
       - `handleBookmark`: añade o elimina el marcador en `BookmarkProvider(widget.book.id)`.
       - `onChapterContent`: resuelve las solicitudes de texto del capítulo actual para la IA (`ChapterContentBridge`).
   - **Solución Flutter → Foliate (`anx-eval` / `anx-command`)**:
     - Añadir en `EpubPlayerState` un método `_evalJs(String source)` y `_evalJsWithResult(String source)`:
       - Si `!AnxPlatform.isWeb`, delega a `webViewController.evaluateJavascript(source: source)`.
       - Si `AnxPlatform.isWeb`, envía un mensaje `postMessage` (`{ 'type': 'anx-eval', 'id': reqId, 'source': source }`) a todos los iframes hijos del documento (`web.document.querySelectorAll('iframe')`).
     - En `packages/frontend/apps/electron/resources/web-static/foliate/src/book.js`, añadir soporte en el listener `window.addEventListener('message', ...)` para `data.type === 'anx-eval'`:
       - Ejecuta `await Promise.resolve((0, eval)(data.source))` en el ámbito global de `book.js` (donde están definidos `prevPage`, `nextPage`, `changeStyle`, `goToHref`, `goToCfi`, `goToPercent`, `addAnnotation`, `removeAnnotation`, `search`, `clearSearch`, `ttsHere`, `ttsNext`, `ttsPrev`, `ttsStop`, `theChapterContent`, etc.).
       - Devuelve el resultado a `window.parent.postMessage({ type: 'anx-eval-result', id: data.id, result }, '*')`, permitiendo que métodos como `ttsNext()`, `ttsCurrentDetail()` y `chapterContentBridge` obtengan el valor de retorno en Flutter Web.

---

### 3.3. Persistencia Web en Memoria Sincronizada con Yjs (`lib/dao/` y `lib/providers/`)
1. **`BookNoteDao` (`lib/dao/book_note.dart`)**:
   - Añadir `static List<BookNote> webNotes = [];`.
   - En `AnxPlatform.isWeb`:
     - `save(BookNote bookNote)`: asigna ID incremental si `id == null`, actualiza o inserta en `webNotes`, llama a `WebBridge.syncNotes()` y retorna el `id`.
     - `selectBookNoteByCfiAndBookId`, `selectBookNotesByBookId`, `selectBookNoteById`, `updateBookNoteById`, `deleteBookNoteById`, `selectAllBookIdAndNotes`, `selectNumberOfNotesAndBooks`, `searchBookNotes`, `searchBookNotesAdvanced`, `selectRandomNote`: operan sobre `webNotes` en memoria sin tocar SQLite.
2. **`Bookmark` Provider (`lib/providers/bookmark.dart`)**:
   - En `AnxPlatform.isWeb`:
     - Lee y escribe marcadores en `BookNoteDao.webNotes` filtrando por `type == 'bookmark' && bookId == bookId`, actualiza el estado `AsyncData` del provider y sincroniza mediante `WebBridge.syncNotes()`.
3. **`ReadingTimeDao` (`lib/dao/reading_time.dart`)**:
   - Añadir `static List<ReadingTime> webReadingTimes = [];`.
   - En `AnxPlatform.isWeb`:
     - `insertReadingTime(ReadingTime rt, ...)`: acumula o inserta el registro para `(bookId, date)` en `webReadingTimes` y llama a `WebBridge.syncReadingTimes()`.
     - Implementar los selectores en memoria sobre `webReadingTimes` y `BookDao.webBooks`: `selectAllReadingTime`, `selectTotalReadingTime`, `selectTotalNumberOfBook`, `selectTotalNumberOfDate`, `selectTotalNumberOfNotes` (desde `BookNoteDao.webNotes.length`), `selectReadingTimeOfWeek`, `selectReadingTimeOfMonth`, `selectReadingTimeOfYear`, `selectReadingTimeByBookId`, `selectTotalReadingTimeByBookId`, `_aggregateByBook`, `selectBookDailyReadingTime` y `selectDailyReadingTimeSince`.
4. **`GroupDao` (`lib/providers/tb_groups.dart`)**:
   - Añadir `static List<TbGroup> webGroups = [];` y operar en memoria en Web sincronizando con `WebBridge.syncGroups()`.

---

### 3.4. Integración de Citas en Diario y Documentos AFFiNITe (`lib/widgets/context_menu/excerpt_menu.dart`)
- En `ExcerptMenuState.build` (`operatorMenu`), cuando `AnxPlatform.isWeb` es `true`, añadir dos botones de acción rápida:
  1. **Diario (`Icons.calendar_today_outlined`, "Diario")**:
     - Guarda el subrayado actual, llama a `WebBridge.quoteToJournal(book: epubPlayerKey.currentState!.book, text: widget.annoContent, cfi: widget.annoCfi, chapter: epubPlayerKey.currentState!.chapterTitle)` y muestra confirmación con `AnxToast.show('Cita enviada al Diario de hoy')`.
  2. **Doc AFFiNITe (`Icons.description_outlined`, "Nota Doc")**:
     - Guarda el subrayado actual, recopila las notas del libro desde `BookNoteDao.webNotes` y llama a `WebBridge.exportToAffineDoc(book: epubPlayerKey.currentState!.book, notes: notes)`.

---

### 3.5. IA Antigravity Zero-Key y TTS Web (`lib/service/ai/` y `lib/service/tts/`)
1. **Historial de IA en Memoria (`lib/service/ai/ai_history.dart`)**:
   - Añadir `static final List<AiChatHistoryEntry> _webHistory = [];`.
   - En `readHistory`, `upsertEntry`, `removeEntry` y `clear`, si `AnxPlatform.isWeb` es `true`, operar sobre `_webHistory` evitando `dart:io File`.
2. **Stream de IA conectado a Antigravity (`lib/service/ai/index.dart`)**:
   - Al inicio de `_generateStream`, si `AnxPlatform.isWeb` es `true`:
     - Serializar la lista de `ChatMessage` (incluyendo el prompt del sistema y el contexto del libro/capítulo).
     - Invocar `await WebBridge.requestAiChat(serializedMessages)` y emitir la respuesta en el `Stream<String>`.
3. **Inicialización Segura de TTS en Web (`lib/main.dart` & `lib/service/tts/tts_handler.dart`)**:
   - En `lib/main.dart`: si `kIsWeb` es `true`, inicializar `audioHandler = TtsHandler();` para que `audioHandler` nunca lance `LateInitializationError`.
   - En `lib/service/tts/tts_handler.dart`: proteger las llamadas a `AudioSession.instance` y `book.coverFullPath` / `mediaItem.add(...)` con `if (!AnxPlatform.isWeb)`, delegando directamente a `tts.speak()`, `tts.pause()`, `tts.stop()`, `tts.prev()` y `tts.next()`.

---

## 4. Estrategia de Pruebas y Verificación

1. **Pruebas Unitarias en AFFiNITe (`vitest`)**:
   - Verificar serialización/deserialización del protocolo `WebBridge` (`anx-full-sync`, `anx-sync-notes`, `anx-sync-reading-times`, `anx-quote-to-journal`, `anx-export-to-doc`, `anx-ai-request`) en `library-manager.spec.ts`.
2. **Análisis Estático y Compilación de Anx-Remix (`flutter analyze` & `flutter build web`)**:
   - Cero errores de compilación en Dart/Flutter Web (`flutter build web --no-pub --base-href /anx/`).
3. **Sincronización y Build de AFFiNITe**:
   - Sincronizar `build/web/` hacia `packages/frontend/apps/electron/resources/web-static/anx/` y `foliate/` hacia `build/web/foliate/`.
   - Compilar `@affine/electron-renderer` con cero errores.
