# Plan de Remediación: Normalización de Colores, Deduplicación de Logs y Auto-Reparación de la Biblioteca

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver integralmente las 19 advertencias y 1 error reportados por la auditoría de diagnóstico (normalizando los colores de notas a formato hex con `#`, asignando colores por defecto ante notas con color vacío o corrupto), eliminar la duplicación de eventos de log entre Foliate y Flutter Web, e incorporar un botón de "Auto-Reparar Biblioteca" en el panel de diagnóstico para dejar el estado del sistema en 100% saludable (0 errores, 0 advertencias).

**Architecture:**
1. **Normalización Automática en Sync & Ingesta** (`library-manager.ts`, `index.tsx`):
   - Crear la función utilitaria `normalizeNoteColor(color?: string): string` que garantice `#` y fallback a `#FFD700` ante colores inválidos/vacíos.
   - Aplicar `normalizeNoteColor` al recibir `anx-sync-notes` y al cargar desde Yjs para que ninguna nota quede con advertencia o error en base de datos.
2. **Función de Auto-Reparación (`autoRepairLibraryNotes`)**:
   - Reparar en un solo clic todas las notas existentes en `books` y `anxNotes`: normalizar colores, reparar CFIs y desasociar/reparar datos anómalos.
   - Añadir el botón `🛠️ Reparar Todo` en `DiagnosticModal`.
3. **Deduplicación de Envíos de Diagnóstico** (`overlayer.js`, `book.js`, `web_bridge.dart`):
   - Foliate solo debe enviar hacia `window.parent` (Flutter), y Flutter lo canaliza a `window.parent` (Electron), o si `window.top !== window.self`, enviar una sola vez con un flag de origen único para evitar que un mismo log se imprima 4 veces.
   - Evitar doble invocación de `view.addAnnotation` dentro de `renderAnnotation`.
4. **Verificación Empírica**:
   - Pruebas unitarias en `diagnostic-logger.spec.ts` y `library-manager.spec.ts`.
   - Reconstrucción de paquetes y comprobación del reporte de auditoría (0 errores, 0 avisos).

**Tech Stack:** TypeScript, React, BlockSuite / Yjs, Foliate.js, Vitest, Flatpak.

---

## Tareas de Implementación

### Tarea 1: Utilidad de Normalización y Función de Auto-Reparación en `diagnostic-logger.ts`

**Archivos:**
- Modificar: `packages/frontend/core/src/desktop/pages/workspace/library/diagnostic-logger.ts`
- Modificar: `packages/frontend/core/src/desktop/pages/workspace/library/__tests__/diagnostic-logger.spec.ts`

- [ ] **Paso 1: Escribir pruebas unitarias para `normalizeNoteColor` y `autoRepairLibraryNotes`**
  - Probar que `normalizeNoteColor('FFD700')` retorne `'#FFD700'`.
  - Probar que `normalizeNoteColor('#66ccff')` retorne `'#66CCFF'`.
  - Probar que `normalizeNoteColor('')`, `normalizeNoteColor(undefined)` o `normalizeNoteColor('invalid')` retornen `'#FFD700'`.
  - Probar que `autoRepairLibraryNotes(notes)` transforme todas las notas anómalas en notas válidas y que `auditLibraryIntegrity` posterior retorne `isHealthy: true` con 0 errores y 0 advertencias.

- [ ] **Paso 2: Ejecutar los tests para verificar que fallen antes de implementar**
  - Ejecutar `yarn vitest run --project '!*blocksuite*' packages/frontend/core/src/desktop/pages/workspace/library/__tests__/diagnostic-logger.spec.ts`

- [ ] **Paso 3: Implementar `normalizeNoteColor` y `autoRepairLibraryNotes` en `diagnostic-logger.ts`**
  - Exportar `normalizeNoteColor(color?: string, fallback = '#FFD700'): string`.
  - Exportar `autoRepairLibraryNotes(notes: AnxWebNote[]): { repairedNotes: AnxWebNote[]; fixedCount: number }`.

- [ ] **Paso 4: Ejecutar los tests para verificar que pasen al 100%**
  - Ejecutar `yarn vitest run --project '!*blocksuite*' packages/frontend/core/src/desktop/pages/workspace/library/__tests__/diagnostic-logger.spec.ts`

---

### Tarea 2: Normalización en Ingesta de Sincronización y Botón de Auto-Reparación en la UI

**Archivos:**
- Modificar: `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`
- Modificar: `packages/frontend/core/src/desktop/pages/workspace/library/diagnostic-modal.tsx`

- [ ] **Paso 1: Normalizar notas en `index.tsx` al sincronizar desde Yjs y Anx Reader**
  - En `syncFromYjs` y en el handler `anx-sync-notes`, mapear cada nota entrante con `normalizeNoteColor(note.color)`.
  - Si alguna nota cambió su color al normalizar, guardar automáticamente la versión limpia en Yjs.

- [ ] **Paso 2: Integrar el botón "🛠️ Reparar Todo" en `DiagnosticModal`**
  - Cuando `auditResult` reporte advertencias o errores, mostrar un botón destacado `🛠️ Reparar Anomalías Automáticamente`.
  - Al presionarlo:
    1. Ejecuta `autoRepairLibraryNotes(notes)`.
    2. Actualiza el estado y guarda en Yjs mediante callback `onRepairNotes(repaired)`.
    3. Registra en el log de diagnóstico: `Reparadas X notas con éxito`.
    4. Re-ejecuta la auditoría, mostrando inmediatamente `0 errores y 0 advertencias (Saludable)`.

---

### Tarea 3: Eliminar Duplicación de Logs y Doble Renderizado en Foliate

**Archivos:**
- Modificar: `assets/foliate-js/src/overlayer.js`
- Modificar: `assets/foliate-js/src/book.js`
- Modificar: `packages/frontend/apps/electron/resources/web-static/anx/assets/assets/foliate-js/src/overlayer.js`
- Modificar: `packages/frontend/apps/electron/resources/web-static/anx/assets/assets/foliate-js/src/book.js`

- [ ] **Paso 1: Corregir el despacho de logs en `overlayer.js` y `book.js`**
  - En lugar de despachar a la vez `window.parent?.postMessage` Y `window.top?.postMessage`, enviar únicamente a `window.parent?.postMessage` (o verificar `window.parent !== window.top` para no duplicar).
  - En `renderAnnotation` de `book.js`:
    - Eliminar la segunda llamada redundante a `this.view.addAnnotation(annotation)` sobre la misma nota cuando `this.addAnnotation` ya la dibujó sobre la sección activa.

- [ ] **Paso 2: Recompilar bundle de Foliate con Webpack**
  - Ejecutar `npm run build` en `Anx-Remix/assets/foliate-js`.
  - Sincronizar archivos a `packages/frontend/apps/electron/resources/web-static/anx/assets/assets/foliate-js/`.

---

### Tarea 4: Verificación Integral de Pruebas y Empaquetado Flatpak

**Archivos:**
- Suite de pruebas de la Biblioteca en `Affinite`
- Script de empaquetado: `./build-flatpak.sh stable`

- [ ] **Paso 1: Ejecutar la suite completa de tests de la biblioteca**
  - `yarn vitest run --project '!*blocksuite*' packages/frontend/core/src/desktop/pages/workspace/library/__tests__/`
  - Comprobar que todas las pruebas pasen (0 fallos).

- [ ] **Paso 2: Reconstruir e instalar Flatpak**
  - Ejecutar `./build-flatpak.sh stable`
  - Validar que instale `app.affinite.Affinite` correctamente.
