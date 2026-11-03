# AFFiNITe Integration Hub — Fase 2 (Calendario Unificado) Implementation Plan

> **Para agentes:** Usar `superpowers:subagent-driven-development` para implementar este plan tarea por tarea. Cada paso usa sintaxis de checkbox (`- [ ]`).

**Goal:** Integrar el Calendario nativo de AFFiNITe con el núcleo de dominio `affinite-hub`, permitiendo visualizar y conmutar capas de Tableros (Kanban), Hábitos, Streaks y Diarios, con edición y completado bidireccional desde la propia vista del calendario.

**Architecture:** El Calendario (`packages/frontend/core/src/desktop/pages/workspace/calendar/`) consume los adaptadores puros de `modules/affinite-hub/providers/` (`extractHabitDatedItems`, `extractStreakDatedItems`, `extractBoardDatedItems`). Los eventos de fuentes externas se mapean a capas independientes (`layer-habits`, `layer-boards`, `layer-streaks`) gobernadas por visibilidad conmutable. Al marcar como completado un evento en el calendario, se despacha la mutación a su almacén de origen (`affinite_habits_v1`, `board_data` o `affinite_calendar_v1`).

**Tech Stack:** React 19, Yjs, Vanilla Extract, Vitest 3 (`yarn vitest run --browser.headless=true <spec>`), oxlint (`yarn oxlint <rutas>`).

## Global Constraints

- **Local-first y no regresión:** No se agregan llamadas remotas; todo opera sobre `workspace.rootYDoc` y documentos locales de Tableros.
- **Fronteras arquitectónicas:** `modules/affinite-hub/` permanece desacoplado de React y hooks. `calendar/` consume `affinite-hub`, pero `affinite-hub` nunca importa de `calendar/`.
- **Verificación obligatoria por tarea:** `yarn oxlint <rutas>` = 0 errores y `yarn vitest run --browser.headless=true <spec>` = exit 0.
- Commits convencionales, un commit por tarea.

---

### File Impact Table (Fase 2)

| Impacto | Ruta | Descripción |
|---|---|---|
| `[*] ` | `packages/frontend/core/src/desktop/pages/workspace/habits/habits-calculator.ts` | Re-exportar `LEGACY_HABIT_ID_MAP` y `normalizeHabitId` desde `affinite-hub` (DRY) |
| `[*] ` | `packages/frontend/core/src/modules/affinite-hub/providers/habits-provider.ts` | Simetría de envoltura `{ yDoc }` para `rootDoc` |
| `[*] ` | `packages/frontend/core/src/modules/affinite-hub/providers/streaks-provider.ts` | Simetría de envoltura `{ yDoc }` para `rootDoc` |
| `[*] ` | `packages/frontend/core/src/modules/affinite-hub/providers/calendar-provider.ts` | Simetría de envoltura `{ yDoc }` para `rootDoc` |
| `[*] ` | `packages/frontend/core/src/desktop/pages/workspace/calendar/calendar-types.ts` | Extender `CalendarLayer` con tipos del hub y definir `AFFINITE_HUB_LAYERS` |
| `[+] ` | `packages/frontend/core/src/desktop/pages/workspace/calendar/calendar-hub-layers.ts` | Helper puro `mergeHubCalendarLayers` y conversión `datedItemToCalendarEvent` |
| `[+] ` | `packages/frontend/core/src/desktop/pages/workspace/calendar/__tests__/calendar-hub-layers.spec.ts` | Pruebas de fusión de capas y conversión de eventos |
| `[*] ` | `packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx` | Inyección de capas del hub, carga reactiva de Hábitos/Streaks y toggle bidireccional |
| `[+] ` | `packages/frontend/core/src/desktop/pages/workspace/calendar/__tests__/calendar-hub-integration.spec.ts` | Pruebas de completado bidireccional hacia Yjs de hábitos y tableros |

---

### Task 2.1: DRY de Habit IDs y simetría de envoltorios en Hub Providers

**Files:**
- `[*] habits/habits-calculator.ts`
- `[*] modules/affinite-hub/providers/habits-provider.ts`
- `[*] modules/affinite-hub/providers/streaks-provider.ts`
- `[*] modules/affinite-hub/providers/calendar-provider.ts`
- `[*] modules/affinite-hub/__tests__/providers.spec.ts`

- [ ] **Step 1 (Test):** En `providers.spec.ts`, agregar pruebas verificando que `extractHabitDatedItems`, `extractStreakDatedItems` y `extractCalendarDatedItems` aceptan un objeto contenedor `{ yDoc: rootDoc }` al igual que un `Y.Doc` directo.
- [ ] **Step 2 (Rojo):** Correr vitest sobre `providers.spec.ts` y ver fallar.
- [ ] **Step 3 (Implementar):**
  - En `habits-provider.ts`, `streaks-provider.ts` y `calendar-provider.ts`, agregar `const doc = rootDoc?.yDoc ?? rootDoc;` antes de `resolveRootYDoc(doc)`.
  - En `habits-calculator.ts`, reemplazar la definición duplicada de `LEGACY_HABIT_ID_MAP` y `normalizeHabitId` importándolas y re-exportándolas desde `@affine/core/modules/affinite-hub`.
- [ ] **Step 4 (Verde):** `yarn vitest run --browser.headless=true packages/frontend/core/src/modules/affinite-hub packages/frontend/core/src/desktop/pages/workspace/habits` -> EXIT 0.
- [ ] **Step 5 (Linter):** `yarn oxlint packages/frontend/core/src/modules/affinite-hub packages/frontend/core/src/desktop/pages/workspace/habits` -> 0 errores.
- [ ] **Step 6 (Commit):** `git commit -m "refactor(hub): enforce wrapper symmetry across providers and deduplicate habit id maps"`

---

### Task 2.2: Definición y fusión de capas del Hub en Calendario

**Files:**
- `[*] calendar/calendar-types.ts`
- `[+] calendar/calendar-hub-layers.ts`
- `[+] calendar/__tests__/calendar-hub-layers.spec.ts`

- [ ] **Step 1 (Test):** Crear `calendar-hub-layers.spec.ts` probando:
  - `mergeHubCalendarLayers(userLayers)`: Si el usuario tiene capas guardadas en Yjs, las capas canónicas del hub (`layer-boards`, `layer-habits`, `layer-streaks`) se fusionan sin duplicarse, preservando su visibilidad configurada.
  - `datedItemToCalendarEvent(datedItem, layerColor)`: Mapea correctamente un `DatedItem` a `ExpandedCalendarEvent` (ajustando `calendarId`, `isAllDay`, `color`, `completed`).
- [ ] **Step 2 (Rojo):** Correr vitest sobre el spec y ver fallar.
- [ ] **Step 3 (Implementar):**
  - En `calendar-types.ts`, extender `CalendarLayer.type` con `'boards' | 'habits' | 'streaks' | 'journals'`.
  - En `calendar-hub-layers.ts`, definir `AFFINITE_HUB_LAYERS`, `mergeHubCalendarLayers` y `datedItemToCalendarEvent`.
- [ ] **Step 4 (Verde):** `yarn vitest run --browser.headless=true packages/frontend/core/src/desktop/pages/workspace/calendar` -> EXIT 0.
- [ ] **Step 5 (Linter):** `yarn oxlint packages/frontend/core/src/desktop/pages/workspace/calendar` -> 0 errores.
- [ ] **Step 6 (Commit):** `git commit -m "feat(calendar): define hub integration layers and event mapping adapters"`

---

### Task 2.3: Despachador de mutaciones bidireccionales hacia Yjs

**Files:**
- `[+] calendar/calendar-hub-mutations.ts`
- `[+] calendar/__tests__/calendar-hub-mutations.spec.ts`

- [ ] **Step 1 (Test):** Crear `calendar-hub-mutations.spec.ts` verificando:
  - `toggleHabitCompletionInYjs(rootDoc, habitId, dateStr)`: Invierte el estado booleano en `entries[dateStr]` del mapa `affinite_habits_v1` en el documento raíz.
  - `toggleBoardCardCompletionInYjs(boardDoc, cardId)`: Si la tarjeta tiene checklist, marca todos los ítems como completados (o viceversa); si no, conmuta su estado/columna en `board_data`.
- [ ] **Step 2 (Rojo):** Correr vitest y ver fallar.
- [ ] **Step 3 (Implementar):** Implementar funciones puras de mutación en `calendar-hub-mutations.ts` operando sobre `Y.Doc` con transacciones atómicas `doc.transact(...)`.
- [ ] **Step 4 (Verde):** `yarn vitest run --browser.headless=true packages/frontend/core/src/desktop/pages/workspace/calendar` -> EXIT 0.
- [ ] **Step 5 (Linter):** `yarn oxlint packages/frontend/core/src/desktop/pages/workspace/calendar` -> 0 errores.
- [ ] **Step 6 (Commit):** `git commit -m "feat(calendar): implement bidirectional Yjs mutation dispatchers for habits and boards"`

---

### Task 2.4: Integración reactiva en Componente de Calendario

**Files:**
- `[*] calendar/index.tsx`
- `[+] calendar/__tests__/calendar-hub-integration.spec.ts`

- [ ] **Step 1 (Test):** En `calendar-hub-integration.spec.ts`, probar el ciclo completo de integración: inyección de eventos de hábitos y tableros en el feed de eventos y despacho al hacer clic en el checkbox.
- [ ] **Step 2 (Rojo):** Correr el spec y verificar que falla.
- [ ] **Step 3 (Implementar):**
  - En `calendar/index.tsx`, utilizar `mergeHubCalendarLayers` para asegurar que las capas del Hub aparezcan en la barra lateral del calendario con sus switches de visibilidad.
  - Al generar los eventos visibles en la vista activa (Día, Semana, Mes), invocar `extractHabitDatedItems` y `extractStreakDatedItems` sobre `workspaceService?.workspace?.rootYDoc`, convirtiéndolos con `datedItemToCalendarEvent` cuando su capa respectiva esté visible.
  - En `toggleTaskCompleted` / `handleEventClick`: si el evento proviene de `layer-habits`, llamar a `toggleHabitCompletionInYjs`; si proviene de `layer-boards`, llamar a `toggleBoardCardCompletionInYjs`; si es de calendario local, mantener el comportamiento existente.
- [ ] **Step 4 (Verde):** `yarn vitest run --browser.headless=true packages/frontend/core/src/desktop/pages/workspace/calendar` -> EXIT 0.
- [ ] **Step 5 (Linter):** `yarn oxlint packages/frontend/core/src/desktop/pages/workspace/calendar` -> 0 errores.
- [ ] **Step 6 (Commit):** `git commit -m "feat(calendar): integrate hub layers and bidirectional completion in calendar UI"`

---

### Gate de salida de la Fase 2

- [ ] `yarn vitest run --browser.headless=true packages/frontend/core/src/desktop/pages/workspace packages/frontend/core/src/modules/affinite-hub` -> EXIT 0 (todas las pruebas unitarias previas y nuevas en verde).
- [ ] `yarn oxlint packages/frontend/core/src/desktop/pages/workspace packages/frontend/core/src/modules/affinite-hub` -> 0 errores, 0 warnings.
- [ ] `git status` limpio sin archivos huérfanos.
