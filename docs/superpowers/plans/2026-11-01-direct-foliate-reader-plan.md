# Plan de Implementación: Lector Directo Foliate en React con Preservación de Estantería Anx

## 1. Meta y Alcance
- **Objetivo**: Implementar el Enfoque A: Conservar al 100% la estantería, diseño y organización de Anx Remix, pero interceptar la apertura de libros (`anx-open-book`) para renderizar un lector Foliate directo, rápido y fiable en React/TypeScript.
- **Alcance**:
  - Eliminar los intermediarios de Flutter Web (`FittedBox`, `PointerInterceptor`, transformaciones `matrix3d`) durante la lectura.
  - Diseñar el lector en React con la misma estética oscura (`#090d16`), cinta de marcador visual interactiva, barra de navegación, tabla de contenidos, selector de 5 colores de subrayado y panel lateral de notas y marcadores.
  - Sincronización bidireccional directa con Yjs, SQLite y la estantería de Anx.

---

## 2. Tabla de Impacto de Archivos

| Impacto | Archivo | Descripción |
|---|---|---|
| `[*]` | `packages/frontend/apps/anx-remix/lib/service/web_bridge.dart` | Añadir soporte para parámetro `cfi` en `WebBridge.openBook` |
| `[*]` | `packages/frontend/apps/anx-remix/lib/service/book.dart` | En `pushToReadingPage`, delegar la apertura al host en Web (`WebBridge.openBook`) |
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-reader-integration.spec.ts` | Pruebas unitarias para gestión de marcadores, notas y navegación del lector |
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/library/library-reader.tsx` | Componente de lector directo Foliate con UI nativa, bookmark ribbon y panel lateral |
| `[*]` | `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx` | Manejo del mensaje `anx-open-book`, montaje condicional de `LibraryReader` y sincronización de progreso |

---

## 3. Desglose de Tareas

### Tarea 1: Intercepción de Apertura de Libros en Anx Remix (Dart)
- **Archivos:**
  - `packages/frontend/apps/anx-remix/lib/service/web_bridge.dart`
  - `packages/frontend/apps/anx-remix/lib/service/book.dart`
- **Paso 1:** Actualizar `WebBridge.openBook(Book book, {String? cfi})` para enviar el `cfi` en el payload `anx-open-book`.
- **Paso 2:** En `pushToReadingPage`, si `AnxPlatform.isWeb`, invocar `WebBridge.openBook(book, cfi: cfi)` y salir sin montar `ReadingPage`.
- **Paso 3:** Verificar compilación con `flutter analyze lib/service/book.dart lib/service/web_bridge.dart`.
- **Paso 4:** Commit: `git commit -m "feat(anx): delegate book opening to host in web platform"`

### Tarea 2: Pruebas Unitarias del Lector Directo (TDD)
- **Archivos:**
  - `packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-reader-integration.spec.ts`
- **Paso 1:** Escribir pruebas unitarias para:
  - Detección de marcador activo para la ubicación actual (CFI).
  - Adición y eliminación de marcadores con persistencia.
  - Sincronización de progreso porcentual y navegación.
- **Paso 2:** Ejecutar Vitest -> Las pruebas deben pasar contra la lógica de `library-manager.ts`.
- **Paso 3:** Commit: `git commit -m "test(library): add test coverage for direct reader bookmark and navigation logic"`

### Tarea 3: Componente `LibraryReader` en React
- **Archivos:**
  - `packages/frontend/core/src/desktop/pages/workspace/library/library-reader.tsx`
- **Paso 1:** Crear el componente con:
  - Barra superior: botón regresar, título, autor, icono de TOC, botón de marcadores/notas, ajustes de fuente/tema y la **cinta de marcador visual (Bookmark Ribbon)** activa/inactiva.
  - Núcleo del lector: `<iframe>` apuntando a `assets://./foliate/index.html?url=...&cfi=...`.
  - Drawer lateral colapsable: pestañas para TOC (Índice), Marcadores (con navegación por clic y borrado) y Notas/Citas.
  - Barra inferior: control deslizante de porcentaje de lectura, capítulo actual y botones de página previa/siguiente.
- **Paso 2:** Protocolo postMessage directo con Foliate JS (escuchando `onRelocate`, `onSelectionEnd`, etc.).
- **Paso 3:** Commit: `git commit -m "feat(library): create direct foliate reader component with native bookmarks ribbon"`

### Tarea 4: Integración en `index.tsx`, Compilación de Activos y Empaquetado
- **Archivos:**
  - `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`
- **Paso 1:** En `index.tsx`:
  - Escuchar `anx-open-book` y almacenar el libro activo en `currentReadingBook`.
  - Renderizar `<LibraryReader ... />` cuando `currentReadingBook` esté activo.
  - Al cerrar el libro: actualizar progreso en Yjs y emitir `anx-update-progress` a Anx Remix para reflejar el porcentaje en la estantería.
- **Paso 2:** Recompilar Flutter Web (`flutter build web --no-pub --base-href /anx/`).
- **Paso 3:** Recompilar Electron Renderer (`yarn affine @affine/electron-renderer build`).
- **Paso 4:** Empaquetar binario estable (`BUILD_TYPE=stable bash packages/frontend/apps/electron/scripts/manual-package.sh`).
- **Paso 5:** Commit: `git commit -m "feat(library): integrate direct foliate reader into library host and bundle assets"`

### Tarea 5: Verificación Empírica
- **Verificación:**
  - Ejecutar suite de pruebas completa: `yarn vitest run packages/frontend/core/src/desktop/pages/workspace/library/__tests__/ --browser.headless=true`.
  - Verificar integridad del paquete distribuido en `out/stable/AFFiNITe-stable-linux-x64`.
