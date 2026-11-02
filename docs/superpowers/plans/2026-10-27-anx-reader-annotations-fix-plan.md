# Plan de Implementación: Corrección Integral de Anotaciones en Anx Reader y AFFiNITe

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reparar integralmente el sistema de anotaciones, subrayados y marcadores en la integración de Anx Reader y AFFiNITe al abrir y cerrar libros, eliminando los fallos matemáticos de CFI (`NaN`), evitando la corrupción y migración destructiva de notas entre libros, corrigiendo las APIs de BlockSuite/DocRecord y asegurando tipado estricto y paso de pruebas.

**Architecture:**
1. En **Foliate JS** (`book.js` tanto en Anx-Remix como en `electron/resources/web-static/anx`): sustituir la heurística que produce `NaN` con resolución robusta de spine usando `view.resolveNavigation` y `parseInt`.
2. En **Anx-Remix WebBridge** (`web_bridge.dart`): desactivar la mutación forzada de `_reconcileOrphanedNotes` para proteger los `bookId`.
3. En **AFFiNITe Library** (`library-manager.ts`, `index.tsx`, tests): soportar sobrecarga en `exportAnxNotesToMarkdown`, acceso seguro a `BlockSuiteDoc` desde `DocRecord`, uso de `docsService.createDoc`, estabilización de IDs deterministas, y corrección de imports verbatim.

**Tech Stack:** TypeScript, React, BlockSuite / Yjs, Dart / Flutter Web, Foliate.js, Vitest.

---

## Tareas de Implementación

### Tarea 1: Reparar `library-manager.ts` y sus Pruebas Unitarias

**Archivos:**
- Modificar: `packages/frontend/core/src/desktop/pages/workspace/library/library-manager.ts`
- Modificar: `packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-manager.spec.ts`
- Modificar: `packages/frontend/core/src/desktop/pages/workspace/library/__tests__/anx-ui-helpers.spec.ts`

- [ ] **Paso 1: Escribir pruebas unitarias que expongan los fallos actuales**
  - Probar `exportAnxNotesToMarkdown` recibiendo un `LibraryBook` como primer argumento.
  - Probar `createLibraryBook` preservando el `id` cuando se provee, o generando un id determinista a partir de `filePath`.
  - Probar `convertAnxNotesToHighlights` con CFIs complejos que contienen selectores entre corchetes.
  - Corregir en `library-manager.spec.ts` las llamadas a `createLibraryBook` que omitían `filePath`.
  - Asegurar imports con `import type` para cumplir con `verbatimModuleSyntax`.

- [ ] **Paso 2: Ejecutar los tests para verificar los fallos**
  - Ejecutar `npx vitest run packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-manager.spec.ts`

- [ ] **Paso 3: Implementar la solución en `library-manager.ts`**
  - Permitir `id?: string` en `createLibraryBook`.
  - Si no viene `id`, generar ID determinista a partir de `filePath` (o timestamp seguro).
  - Añadir sobrecarga flexible a `exportAnxNotesToMarkdown` para aceptar `(bookOrTitle: LibraryBook | string, authorOrNotes: string | AnxWebNote[], notes?: AnxWebNote[])`.

- [ ] **Paso 4: Verificar que todos los tests de library pasen**
  - Ejecutar `npx vitest run packages/frontend/core/src/desktop/pages/workspace/library/__tests__/`

---

### Tarea 2: Corregir el Bug Matemático `NaN` en `assets/foliate-js/src/book.js`

**Archivos:**
- Modificar: `packages/frontend/apps/electron/resources/web-static/anx/assets/assets/foliate-js/src/book.js`
- Modificar: `/home/rousseau/Documents/GitHub/Anx-Remix/assets/foliate-js/src/book.js`

- [ ] **Paso 1: Corregir `addAnnotation(annotation)`**
  - En lugar de `(value.split('/')[2]?.split('!')?.[0] - 2) / 2`:
    1. Intentar resolver el índice de spine nativamente vía `this.view?.resolveNavigation?.(value)?.index`.
    2. Si no está disponible de inmediato, extraer el segmento con `parseInt(value.split('/')[2]?.split('!')?.[0], 10)` y calcular `(step - 2) / 2`.
    3. Nunca descartar la anotación si el cálculo numérico directo falló pero `value` es un CFI válido.
    4. Levantar la restricción `if (isPdf) return` para permitir que el modelo y mapa de anotaciones retenga la nota.

- [ ] **Paso 2: Corregir `removeAnnotation(cfi)`**
  - Aplicar la misma resolución robusta para que eliminar anotaciones no falle con `NaN`.

- [ ] **Paso 3: Validar que el script evaluado desde Flutter no lance SyntaxError**
  - Asegurar que `window.allAnnotations = ...; renderAnnotations();` se maneje sin errores de sintaxis en `new Function()`.

---

### Tarea 3: Corregir Desincronización y Reasignación en Anx-Remix `web_bridge.dart`

**Archivos:**
- Modificar: `/home/rousseau/Documents/GitHub/Anx-Remix/lib/service/web_bridge.dart`

- [ ] **Paso 1: Desactivar la reasignación forzada de notas en `_reconcileOrphanedNotes()`**
  - Eliminar la lógica que sobreescribe `n.bookId = targetEpub.id`. Las notas huérfanas o en sincronización asíncrona deben conservar su `bookId` original intacto.

- [ ] **Paso 2: Evitar llamadas recursivas de `syncNotes` al sincronizar desde host**
  - Al procesar `anx-full-sync`, no reenviar `anx-sync-notes` de vuelta a menos que el usuario haya realizado una mutación real.

---

### Tarea 4: Reparar `index.tsx` de la Biblioteca AFFiNITe

**Archivos:**
- Modificar: `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`

- [ ] **Paso 1: Corregir importaciones de tipos**
  - Convertir a `import type { AnxWebBookTag, AnxWebGroup, ... }` para `verbatimModuleSyntax`.
  - Remover `React` no utilizado.

- [ ] **Paso 2: Corregir integración con BlockSuite / DocRecord**
  - En `handleQuoteToDailyJournal`: `doc` obtenido de `journalService.ensureJournalByDate(todayStr)` es un `DocRecord`.
  - Obtener el BlockSuite Doc subyacente mediante `doc.blockSuiteDoc` (o `workspace.open(doc.id)`).
  - En `handleExportBookNotesToDoc`: usar `docsService.createDoc(...)` (inyectando `DocsService` desde `@toeverything/infra`), resolver el BlockSuite doc y llamar a `exportAnxNotesToMarkdown(targetBook.title, targetBook.author, incomingNotes)`.
  - En `anx-update-progress`: corregir `b.lastCfi` a `b.lastReadPosition`.

- [ ] **Paso 3: Sincronización Yjs sin bucles**
  - En `syncFromYjs`: si `anx_notes` no existe pero `highlights` sí existe, migrar automáticamente los `highlights` existentes a `anx_notes`.
  - Usar un flag de sincronización (`isSyncingRef`) para no volver a enviar `sendFullSyncToAnx` en respuesta a mensajes entrantes de Anx.

---

### Tarea 5: Verificación Integral de Compilación y Pruebas

- [ ] **Paso 1: Ejecutar suite de pruebas unitarias de la biblioteca**
  - `npx vitest run packages/frontend/core/src/desktop/pages/workspace/library/__tests__/`
- [ ] **Paso 2: Typecheck en frontend core**
  - Verificar que los 18 errores de TypeScript en `library/` queden completamente en 0.
- [ ] **Paso 3: Verificación empírica de archivos modificados y estado git**
