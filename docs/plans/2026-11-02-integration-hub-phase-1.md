# AFFiNITe Integration Hub — Fase 1 (Núcleo de Dominio) Implementation Plan

> **Para agentes:** Usar `superpowers:subagent-driven-development` para implementar este plan tarea por tarea. Cada paso usa sintaxis de checkbox (`- [ ]`).

**Goal:** Construir el núcleo unificado de dominio `packages/frontend/core/src/modules/affinite-hub/` con catálogo único de claves, tipos de datos transversales (`DatedItem`), normalizador taxonómico de categorías, y adaptadores de lectura puros (`providers/`) para Tableros, Hábitos, Streaks y Calendario.

**Architecture:** Capa pura de dominio TypeScript en `@affine/core/modules/affinite-hub/` desacoplada de la UI de React. Toda lectura y proyección se realiza a través de funciones puras `(rootDoc, range) => DatedItem[]`, permitiendo que Calendario (Fase 2), Recordatorios (Fase 3), Reportes (Fase 4) e IA (Fase 5) consuman una interfaz unificada sin acoplamiento circular.

**Tech Stack:** TypeScript, Yjs, Vitest 3 (`yarn vitest run --browser.headless=true <spec>`), oxlint (`yarn oxlint <rutas>`).

## Global Constraints

- **Inmutabilidad y retrocompatibilidad:** Las claves Yjs (`affinite_calendar_v1`, `affinite_habits_v1`, `affinite_streaks_v1`, `board_data`) se conservan sin renombrar; la normalización de esquemas es 100% aditiva e idempotente.
- **Sin acoplamiento de UI:** Ningún archivo dentro de `modules/affinite-hub/` debe importar componentes React ni hooks (`useState`, `useEffect`). Debe ser TypeScript puro y comprobable en Node / Vitest sin navegador.
- **Fronteras de paquetes:** Los paquetes internos de `blocksuite/` no deben importar desde `@affine/core` (previene dependencias circulares).
- **Verificación obligatoria por tarea:** `yarn oxlint <rutas>` = 0 errores y `yarn vitest run --browser.headless=true <spec>` = exit 0.
- Commits convencionales, un commit por tarea en la rama de trabajo.

---

### File Impact Table (Fase 1)

| Impacto | Ruta | Descripción |
|---|---|---|
| `[*] ` | `packages/frontend/core/src/modules/affinite-hub/yjs-root.ts` | Refinar firma de tipos con genéricos `resolveRootYDoc<T>` |
| `[*] ` | `packages/frontend/core/src/desktop/pages/workspace/calendar/calendar-bridge.ts` | Añadir guarda de primitivos / no-objetos en `unwrapGoogleResult` |
| `[+] ` | `packages/frontend/core/src/modules/affinite-hub/keys.ts` | Constantes canónicas de claves Yjs, localStorage y mapa de legacy IDs |
| `[+] ` | `packages/frontend/core/src/modules/affinite-hub/__tests__/keys.spec.ts` | Pruebas de claves y normalización de IDs |
| `[+] ` | `packages/frontend/core/src/modules/affinite-hub/types.ts` | Definición de `DatedItem`, `DatedItemSource`, `DateRange` |
| `[+] ` | `packages/frontend/core/src/modules/affinite-hub/categories.ts` | Catálogo de categorías, colores estándar y función `normalizeCategory` |
| `[+] ` | `packages/frontend/core/src/modules/affinite-hub/__tests__/categories.spec.ts` | Pruebas de mapeo de alias y categorías estándar |
| `[*] ` | `packages/frontend/core/src/desktop/pages/workspace/boards/index.tsx` | Añadir propiedad opcional `category?: string` a `BoardCard` |
| `[*] ` | `packages/frontend/core/src/desktop/pages/workspace/habits/habits-calculator.ts` | Añadir helper puro `normalizeHabitCreatedAt(createdAt?: number \| string): number` |
| `[*] ` | `packages/frontend/core/src/desktop/pages/workspace/habits/__tests__/habits-calculator.spec.ts` | Pruebas de normalización de timestamps `createdAt` |
| `[+] ` | `packages/frontend/core/src/modules/affinite-hub/providers/habits-provider.ts` | Proveedor puro `extractHabitDatedItems` |
| `[+] ` | `packages/frontend/core/src/modules/affinite-hub/providers/streaks-provider.ts` | Proveedor puro `extractStreakDatedItems` |
| `[+] ` | `packages/frontend/core/src/modules/affinite-hub/providers/boards-provider.ts` | Proveedor puro `extractBoardDatedItems` |
| `[+] ` | `packages/frontend/core/src/modules/affinite-hub/providers/calendar-provider.ts` | Proveedor puro `extractCalendarDatedItems` |
| `[+] ` | `packages/frontend/core/src/modules/affinite-hub/providers/index.ts` | Exportador barril de proveedores |
| `[+] ` | `packages/frontend/core/src/modules/affinite-hub/index.ts` | Punto de entrada consolidado de `affinite-hub` |
| `[+] ` | `packages/frontend/core/src/modules/affinite-hub/__tests__/providers.spec.ts` | Pruebas unitarias de todos los adaptadores de datos temporales |

---

### Task 1.1: Claves canónicas, tipos de DatedItem y mejoras diferidas

**Files:** `[+] modules/affinite-hub/keys.ts`, `[+] modules/affinite-hub/types.ts`, `[+] modules/affinite-hub/__tests__/keys.spec.ts`, `[*] modules/affinite-hub/yjs-root.ts`, `[*] calendar/calendar-bridge.ts`, `[*] calendar/__tests__/calendar-bridge.spec.ts`

- [ ] **Step 1 (Test):** Crear `keys.spec.ts` probando que las claves Yjs son strings no vacíos y que `normalizeHabitId` mapea correctamente IDs legados ('h-water' -> 'habit-water'). En `calendar-bridge.spec.ts`, añadir pruebas de aserción de `e.message` y prueba de `unwrapGoogleResult(null)` o primitives devolviendo `{}` defensivamente.
- [ ] **Step 2 (Rojo):** Ejecutar vitest sobre los archivos y ver fallar.
- [ ] **Step 3 (Implementar):**
  - Crear `keys.ts` con `AFFINITE_YMAP_HABITS`, `AFFINITE_YMAP_STREAKS`, `AFFINITE_YMAP_CALENDAR`, `AFFINITE_YMAP_BOARD`, `AFFINITE_CACHE_HABITS`, `AFFINITE_CACHE_STREAKS`, `AFFINITE_CACHE_CALENDAR_SECRETS_PREFIX`, `LEGACY_HABIT_ID_MAP`, `normalizeHabitId`.
  - Crear `types.ts` con interfaces `DatedItemSource`, `DatedItem`, `DateRange`.
  - En `yjs-root.ts`, agregar genéricos: `export function resolveRootYDoc<T extends { _item?: any } = any>(doc: T | null | undefined): T | null | undefined`.
  - En `calendar-bridge.ts:25`, agregar guarda defensiva `if (!result || typeof result !== 'object') return {};`.
- [ ] **Step 4 (Verde):** Ejecutar `yarn vitest run --browser.headless=true packages/frontend/core/src/modules/affinite-hub packages/frontend/core/src/desktop/pages/workspace/calendar/__tests__/calendar-bridge.spec.ts` -> EXIT 0.
- [ ] **Step 5 (Linter):** `yarn oxlint packages/frontend/core/src/modules/affinite-hub packages/frontend/core/src/desktop/pages/workspace/calendar` -> 0 errores.
- [ ] **Step 6 (Commit):** `git commit -m "feat(hub): define canonical keys, DatedItem types and harden bridge guards"`

---

### Task 1.2: Taxonomía y normalización de categorías

**Files:** `[+] modules/affinite-hub/categories.ts`, `[+] modules/affinite-hub/__tests__/categories.spec.ts`

- [ ] **Step 1 (Test):** Crear `categories.spec.ts` verificando:
  - Lista de categorías canónicas estándar (`CANONICAL_CATEGORIES`).
  - Mapeo de colores predeterminados por categoría (`CATEGORY_COLORS`).
  - Función `normalizeCategory(input?: string): string`:
    - Normaliza mayúsculas/minúsculas y acentos (`salud` -> `Salud`, `fitness` -> `Fitness`, `trabajo` -> `Trabajo`, `work` -> `Trabajo`, `study` -> `Estudio`, `health` -> `Salud`).
    - Valores vacíos o no reconocidos caen limpiamente a `'General'`.
- [ ] **Step 2 (Rojo):** Ejecutar vitest y verificar que falla.
- [ ] **Step 3 (Implementar):** Escribir `categories.ts` con `CANONICAL_CATEGORIES`, `CATEGORY_COLORS`, `CATEGORY_ALIASES` y la función pura `normalizeCategory`.
- [ ] **Step 4 (Verde):** Correr `yarn vitest run --browser.headless=true packages/frontend/core/src/modules/affinite-hub` -> EXIT 0.
- [ ] **Step 5 (Linter):** `yarn oxlint packages/frontend/core/src/modules/affinite-hub` -> 0 errores.
- [ ] **Step 6 (Commit):** `git commit -m "feat(hub): add canonical category taxonomy and alias normalizer"`

---

### Task 1.3: Normalización de esquemas: createdAt en hábitos y category en BoardCard

**Files:** `[*] habits/habits-calculator.ts`, `[*] habits/__tests__/habits-calculator.spec.ts`, `[*] boards/index.tsx`

- [ ] **Step 1 (Test):** En `habits-calculator.spec.ts`, agregar pruebas para `normalizeHabitCreatedAt`:
  - Si recibe un número válido de timestamp (ej. `1730500000000`), lo preserva.
  - Si recibe un string ISO o fecha (`'2026-10-01'`), lo convierte al timestamp numérico correspondiente en milisegundos.
  - Si es undefined o corrupto, devuelve un timestamp coherente por defecto (`Date.now()`).
- [ ] **Step 2 (Rojo):** Correr el spec de hábitos -> Falla.
- [ ] **Step 3 (Implementar):**
  - Implementar y exportar `normalizeHabitCreatedAt` en `habits-calculator.ts`.
  - En `boards/index.tsx`, actualizar la interfaz `BoardCard` para incluir `category?: string;`.
- [ ] **Step 4 (Verde):** Correr `yarn vitest run --browser.headless=true packages/frontend/core/src/desktop/pages/workspace/habits` -> EXIT 0.
- [ ] **Step 5 (Linter):** `yarn oxlint packages/frontend/core/src/desktop/pages/workspace/habits packages/frontend/core/src/desktop/pages/workspace/boards` -> 0 errores.
- [ ] **Step 6 (Commit):** `git commit -m "feat(hub): normalize habit createdAt timestamps and add category to BoardCard"`

---

### Task 1.4: Adaptadores de datos temporales (Providers) y consolidación del Hub

**Files:**
- `[+] modules/affinite-hub/providers/habits-provider.ts`
- `[+] modules/affinite-hub/providers/streaks-provider.ts`
- `[+] modules/affinite-hub/providers/boards-provider.ts`
- `[+] modules/affinite-hub/providers/calendar-provider.ts`
- `[+] modules/affinite-hub/providers/index.ts`
- `[+] modules/affinite-hub/index.ts`
- `[+] modules/affinite-hub/__tests__/providers.spec.ts`

- [ ] **Step 1 (Test):** Crear `providers.spec.ts` probando con estructuras Yjs reales (sin mocks sintéticos):
  - `extractHabitDatedItems(rootDoc, targetDateStr)`: extrae hábitos configurados como `DatedItem` con `source: 'habit'`, `category` normalizada, `done: boolean` reflejando el estado en `entries[date]`.
  - `extractStreakDatedItems(rootDoc)`: extrae streaks activos con `source: 'streak'`, `start: startDateTime`, `end: targetDateTime`, y porcentaje en `metadata`.
  - `extractBoardDatedItems(boardDoc)`: extrae tarjetas con `dueDate` asignado como `DatedItem` con `source: 'board'`, `start: card.dueDate`, `done: boolean` basado en checklists o estado de columna.
  - `extractCalendarDatedItems(rootDoc, dateRange)`: extrae eventos y timeblocks almacenados en `affinite_calendar_v1`.
- [ ] **Step 2 (Rojo):** Correr el spec -> Falla.
- [ ] **Step 3 (Implementar):**
  - Implementar cada adaptador en `providers/` asegurando manejo seguro de `null`, `try/catch` defensivos y uso de `normalizeCategory`.
  - Exportar todo desde `modules/affinite-hub/index.ts`.
- [ ] **Step 4 (Verde):** `yarn vitest run --browser.headless=true packages/frontend/core/src/modules/affinite-hub` -> EXIT 0.
- [ ] **Step 5 (Linter):** `yarn oxlint packages/frontend/core/src/modules/affinite-hub` -> 0 errores.
- [ ] **Step 6 (Commit):** `git commit -m "feat(hub): implement temporal providers for habits, streaks, boards, and calendar"`

---

### Gate de salida de la Fase 1

- [ ] `yarn vitest run --browser.headless=true packages/frontend/core/src/modules/affinite-hub packages/frontend/core/src/desktop/pages/workspace` -> EXIT 0 (todas las pruebas unitarias previas y nuevas en verde).
- [ ] `yarn oxlint packages/frontend/core/src/modules/affinite-hub packages/frontend/core/src/desktop/pages/workspace` -> 0 errores, 0 warnings.
- [ ] `git status` limpio sin archivos huérfanos.
