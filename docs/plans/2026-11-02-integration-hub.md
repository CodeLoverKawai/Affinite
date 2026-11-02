# AFFiNITe Integration Hub — Plan Maestro

> **Para agentes:** usar `subagent-driven-development` o `executing-plans`. Los pasos usan checkboxes (`- [ ]`). Este documento detalla la **Fase 0** (bite-sized, TDD). Las Fases 1–6 son hoja de ruta: cada una recibe su propio plan detallado al aprobarse la fase anterior (regla de `writing-plans`: un plan por subsistema).

**Goal:** que Tableros, Calendario, Hábitos, Streaks, Reportes Semanales, Journals, Editor e IA compartan datos, recordatorios y navegación, sin módulos aislados ni código muerto.

**Architecture:** una capa de dominio `affinite-hub` (TypeScript puro + Yjs, sin DI al inicio) con (a) un único resolvedor de documentos/claves Yjs, (b) un tipo unificado `DatedItem` que cada módulo proyecta, (c) un servicio único de recordatorios y (d) un snapshot semanal reutilizable por Reportes e IA. Los módulos dejan de leerse entre sí directamente y consumen el hub.

**Tech Stack:** Yjs, React 19, Vanilla Extract, Vitest 3 (`yarn vitest run --browser.headless=true <ruta>`), Electron 39 IPC (`window.__apis`), oxlint.

## Global Constraints

- **Plataforma de este plan:** Desktop (Electron) primero; móvil/web en Fase 6.
- **Local-first y privacidad:** cero llamadas externas obligatorias; secretos nunca en Yjs.
- **Estilos:** solo `.css.ts` con tokens `@toeverything/theme` (`cssVarV2`), ya sea Light o Dark.
- **Verificación por tarea:** `yarn oxlint <rutas>` = 0 errores y `yarn vitest run --browser.headless=true <spec>` = exit 0. (Sin `--browser.headless=true` vitest se queda esperando input por los proyectos `@blocksuite/integration-test`.)
- **Compatibilidad de datos:** claves existentes `affinite_calendar_v1`, `affinite_habits_v1`, `affinite_streaks_v1` y `board_data` no se renombran; toda migración es aditiva e idempotente.
- Commits convencionales (`ada-commit`), un commit por tarea.

## Diagnóstico verificado (base del plan)

| # | Desconexión | Evidencia |
|---|---|---|
| D1 | Puente Electron del calendario devuelve `{ok, content\|data, error}`; el renderer espera `string`/objeto crudo | `main/calendar/index.ts:10-62,64-147` vs `calendar/index.tsx:79-86,1475,1601-1607` |
| D2 | `refreshGoogleAccessToken` nunca se llama; el push a Google ignora el resultado | `calendar/index.tsx:1702-1710` |
| D3 | Token de Google guardado en Yjs del workspace (se sincroniza) | `saveGoogleConfigToYjs` → `yMap.set('google_config', …)` `calendar/index.tsx:407` |
| D4 | `handlers.ts` importa `./calendar` y ese archivo **no está versionado** (commit parcial rompe el build) | `git status`: `?? main/calendar/index.ts` |
| D5 | Widget de hábitos busca primero `store.spaceDoc` (subdoc de página, mapa aislado del root — verificado con Yjs) | `habit-preview.ts:354-361` vs `habits/index.tsx:171-172` |
| D6 | Slash menu lee caché localStorage `affinite_habits_cache_v1` (obsoleto/por dispositivo) | `slash-menu/src/config.ts` `getCachedHabits` |
| D7 | Reportes semanales solo leen journals; tarjeta de hábitos vacía | `weekly-reports/index.tsx:12-17,495` |
| D8 | Calendario no muestra hábitos ni streaks; solo reutiliza el sonido | `calendar/index.tsx:29,1192` |
| D9 | Tarjetas de tablero sin `category`; el filtro del calendario solo funciona por `labels` | `boards/index.tsx:46-55` |
| D10 | Tres sistemas de notificación sueltos, solo con la página abierta | `calendar/index.tsx:1162-1214`, `streaks/streaks-sound.ts:62-96`, hábitos: ninguno |
| D11 | Sin entradas en cmdk/búsqueda rápida | `commands/affine-navigation.tsx` sin referencias |
| D12 | IA sin acceso a datos propios | `main/ai/index.ts:210` (prompt plano) |
| D13 | Streaks demo sembrados como reales; id/título incoherentes | `streaks/index.tsx` `DEFAULT_STREAKS` |
| D14 | Móvil: `/calendar`, `/habits`, `/streaks`, `/weekly-reports` sin ruta | `mobile/workbench-router.ts` |
| D15 | Dos calendarios paralelos (custom vs `modules/integration` de upstream) | `modules/integration/**` |

> [!NOTE]
> D5 y D6 se confirmaron a nivel de código y Yjs, pero no en ejecución dentro de la app. La Tarea 0.5 incluye la prueba que lo fija.

## Mapa de fases

| Fase | Resultado | Cierra |
|---|---|---|
| **0** Estabilizar | Calendario funciona en Electron, token fuera de Yjs, hábitos en un solo doc, build verde | D1–D6, D13 |
| **1** Núcleo `affinite-hub` | Resolvedor Yjs, `DatedItem`, esquema común de categorías y fechas | base de todo |
| **2** Calendario unificado | Calendario muestra tarjetas, hábitos, streaks y journals; edición vuelve a la fuente | D8, D9, D15 |
| **3** Recordatorios únicos | Un `ReminderService`, permisos y sonido centralizados; recordatorios de hábitos | D10 |
| **4** Reportes e inteligencia | `WeeklySnapshot` real (hábitos, streaks, tareas, tableros) | D7 |
| **5** Navegación e IA | cmdk/slash/búsqueda rápida; contexto de IA con datos propios | D11, D12 |
| **6** Móvil y web | Rutas móviles y puente web sin CORS | D14 |

---

# FASE 0 — Estabilizar (detallada)

### File Impact Table (Fase 0)

| Impacto | Ruta | Descripción |
|---|---|---|
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/calendar/calendar-bridge.ts` | Desenvuelve respuestas `{ok,…}` del puente y lanza errores tipados |
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/calendar/__tests__/calendar-bridge.spec.ts` | Pruebas del desenvuelto |
| `[*]` | `packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx` | Usa `calendar-bridge`, refresco en 401, valida push, token fuera de Yjs |
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/calendar/calendar-secrets.ts` | Guardado local por dispositivo del token (localStorage) y limpieza de Yjs |
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/calendar/__tests__/calendar-secrets.spec.ts` | Pruebas de migración/limpieza |
| `[+]` | `packages/frontend/core/src/modules/affinite-hub/yjs-root.ts` | `resolveRootYDoc(doc)` (sube por `_item.parent.doc`) |
| `[+]` | `packages/frontend/core/src/modules/affinite-hub/__tests__/yjs-root.spec.ts` | Prueba subdoc → raíz |
| `[*]` | `packages/frontend/core/src/blocksuite/view-extensions/code-block-preview/habit-preview.ts` | `getYMap()` usa raíz |
| `[*]` | `blocksuite/affine/widgets/slash-menu/src/config.ts` | `completeHabitToday` y lista de hábitos usan raíz |
| `[*]` | `packages/frontend/core/src/desktop/pages/workspace/streaks/index.tsx` | Elimina siembra de demos |
| `[*]` | `packages/frontend/apps/electron/src/main/handlers.ts` | (ya modificado) se commitea junto a `main/calendar/index.ts` |

### Task 0.1: Commit atómico del puente Electron (cierra D4)

**Files:** `packages/frontend/apps/electron/src/main/handlers.ts`, `packages/frontend/apps/electron/src/main/calendar/index.ts`, motores/tipos/specs del calendario sin versionar.

- [ ] **Step 1:** Ver el estado: `git status --short`
- [ ] **Step 2:** Verificar que lo sin versionar pasa antes de commitear:
  `yarn vitest run --browser.headless=true packages/frontend/core/src/desktop/pages/workspace/calendar && yarn oxlint packages/frontend/core/src/desktop/pages/workspace/calendar packages/frontend/apps/electron/src/main` → exit 0.
- [ ] **Step 3:** Commit conjunto (nunca `handlers.ts` solo):
  ```bash
  git add packages/frontend/apps/electron/src/main/handlers.ts \
          packages/frontend/apps/electron/src/main/calendar/index.ts \
          packages/frontend/core/src/desktop/pages/workspace/calendar
  git commit -m "feat(calendar): add Electron calendar bridge, ICS and recurrence engines"
  ```
  (`docs/notes/...master-note.md` y `CHANGELOG.md` van en un commit `docs:` aparte.)

### Task 0.2: Desenvolver respuestas del puente (cierra D1)

**Files:** `[+] calendar-bridge.ts`, `[+] __tests__/calendar-bridge.spec.ts`, `[*] calendar/index.tsx`

**Interfaces — Produces:**
```ts
export class CalendarBridgeError extends Error { status?: number }
export function unwrapIcsResult(result: unknown): string;
export function unwrapGoogleResult(result: unknown): Record<string, unknown>;
```

- [ ] **Step 1 (Test, falla):** crear `__tests__/calendar-bridge.spec.ts`:
  ```ts
  import { describe, expect, test } from 'vitest';
  import {
    CalendarBridgeError,
    unwrapGoogleResult,
    unwrapIcsResult,
  } from '../calendar-bridge';

  describe('calendar-bridge', () => {
    test('ICS: acepta string crudo (fallback web)', () => {
      expect(unwrapIcsResult('BEGIN:VCALENDAR')).toBe('BEGIN:VCALENDAR');
    });
    test('ICS: extrae content de {ok:true}', () => {
      expect(unwrapIcsResult({ ok: true, content: 'BEGIN:VCALENDAR' })).toBe('BEGIN:VCALENDAR');
    });
    test('ICS: lanza con el error del handler', () => {
      expect(() => unwrapIcsResult({ ok: false, status: 404, error: 'HTTP 404: Not Found' }))
        .toThrow(CalendarBridgeError);
    });
    test('Google: extrae data de {ok:true}', () => {
      expect(unwrapGoogleResult({ ok: true, data: { items: [1] } })).toEqual({ items: [1] });
    });
    test('Google: objeto crudo con items pasa tal cual (fallback fetch)', () => {
      expect(unwrapGoogleResult({ items: [1] })).toEqual({ items: [1] });
    });
    test('Google: propaga status y mensaje', () => {
      try {
        unwrapGoogleResult({ ok: false, status: 401, error: 'Invalid Credentials' });
        throw new Error('should throw');
      } catch (e) {
        expect(e).toBeInstanceOf(CalendarBridgeError);
        expect((e as CalendarBridgeError).status).toBe(401);
      }
    });
  });
  ```
- [ ] **Step 2 (Rojo):** `yarn vitest run --browser.headless=true packages/frontend/core/src/desktop/pages/workspace/calendar/__tests__/calendar-bridge.spec.ts` → FALLA (módulo inexistente).
- [ ] **Step 3 (Implementar):** crear `calendar-bridge.ts`:
  ```ts
  export class CalendarBridgeError extends Error {
    constructor(message: string, public status?: number) {
      super(message);
      this.name = 'CalendarBridgeError';
    }
  }

  interface Wrapped { ok?: boolean; status?: number; error?: string }

  export function unwrapIcsResult(result: unknown): string {
    if (typeof result === 'string') return result;
    const r = (result ?? {}) as Wrapped & { content?: string };
    if (r.ok && typeof r.content === 'string') return r.content;
    throw new CalendarBridgeError(r.error ?? 'ICS feed request failed', r.status);
  }

  export function unwrapGoogleResult(result: unknown): Record<string, unknown> {
    const r = (result ?? {}) as Wrapped & { data?: unknown };
    if (typeof r.ok === 'boolean') {
      if (!r.ok) throw new CalendarBridgeError(r.error ?? 'Google API request failed', r.status);
      return (r.data && typeof r.data === 'object' ? r.data : {}) as Record<string, unknown>;
    }
    return r as Record<string, unknown>;
  }
  ```
- [ ] **Step 4 (Verde):** mismo comando del Step 2 → exit 0.
- [ ] **Step 5 (Integrar):** en `calendar/index.tsx`: `icsContent = unwrapIcsResult(await bridge.fetchIcsFeed(normalizedUrl))` (línea ~1475); `data = unwrapGoogleResult(await bridge.googleApiRequest({...}))` (línea ~1601); en el loop de push (~1703) envolver con `unwrapGoogleResult(await …)` y contar errores para el toast. Actualizar la interfaz `AffiniteCalendarBridge` (líneas 78-90) a `Promise<unknown>`.
- [ ] **Step 6:** `yarn oxlint packages/frontend/core/src/desktop/pages/workspace/calendar` y `yarn vitest run --browser.headless=true packages/frontend/core/src/desktop/pages/workspace/calendar` → exit 0.
- [ ] **Step 7:** `git commit -m "fix(calendar): unwrap Electron bridge responses and surface errors"`

### Task 0.3: Refresco de token en 401 (cierra D2)

**Files:** `[*] calendar/index.tsx`, `[*] calendar-bridge.ts`

- [ ] **Step 1 (Test, falla):** añadir a `calendar-bridge.spec.ts` un test de `withTokenRefresh`:
  ```ts
  test('withTokenRefresh reintenta una vez tras 401 con token nuevo', async () => {
    const calls: string[] = [];
    const result = await withTokenRefresh({
      token: 'old',
      request: async t => { calls.push(t); if (t === 'old') throw new CalendarBridgeError('x', 401); return { ok: true }; },
      refresh: async () => 'new',
    });
    expect(calls).toEqual(['old', 'new']);
    expect(result).toEqual({ ok: true });
  });
  test('withTokenRefresh no reintenta errores != 401', async () => {
    await expect(withTokenRefresh({
      token: 'old',
      request: async () => { throw new CalendarBridgeError('x', 500); },
      refresh: async () => 'new',
    })).rejects.toThrow('x');
  });
  ```
- [ ] **Step 2 (Rojo):** correr el spec → FALLA (`withTokenRefresh` no existe).
- [ ] **Step 3 (Implementar)** en `calendar-bridge.ts`:
  ```ts
  export async function withTokenRefresh<T>(opts: {
    token: string;
    request: (token: string) => Promise<T>;
    refresh: () => Promise<string | null>;
  }): Promise<T> {
    try {
      return await opts.request(opts.token);
    } catch (e) {
      if (!(e instanceof CalendarBridgeError) || e.status !== 401) throw e;
      const fresh = await opts.refresh();
      if (!fresh) throw e;
      return opts.request(fresh);
    }
  }
  ```
- [ ] **Step 4 (Verde):** correr el spec → exit 0.
- [ ] **Step 5 (Integrar):** en `calendar/index.tsx`, `refresh` llama `bridge.refreshGoogleAccessToken({clientId, clientSecret, refreshToken})` solo si hay `refreshToken` y `clientId` en la config local (Task 0.4); si devuelve `{ok:true,accessToken}` guarda el nuevo token con `saveGoogleSecrets` y lo usa. Añadir los campos `refreshToken`/`clientId`/`clientSecret` al formulario de Google en `calendar/index.tsx` (cerca de la línea 4064, donde está el input de `accessToken`).
- [ ] **Step 6:** oxlint + vitest del calendario → exit 0. **Step 7:** `git commit -m "feat(calendar): refresh Google token on 401"`

### Task 0.4: Secretos fuera de Yjs (cierra D3)

**Files:** `[+] calendar-secrets.ts`, `[+] __tests__/calendar-secrets.spec.ts`, `[*] calendar/index.tsx` (`saveGoogleConfigToYjs`, líneas ~358-407)

**Interfaces — Produces:**
```ts
export const GOOGLE_SECRET_FIELDS = ['accessToken','refreshToken','clientSecret'] as const;
export function splitGoogleConfig(cfg: Record<string, unknown>): { publicConfig: Record<string, unknown>; secrets: Record<string, string> };
export function stripSecretsFromYjsConfig(raw: string | undefined): { cleaned: string | undefined; leaked: Record<string, string> };
```

- [ ] **Step 1 (Test, falla):**
  ```ts
  import { describe, expect, test } from 'vitest';
  import { splitGoogleConfig, stripSecretsFromYjsConfig } from '../calendar-secrets';

  describe('calendar-secrets', () => {
    test('split separa tokens de la config pública', () => {
      const { publicConfig, secrets } = splitGoogleConfig({ calendarId: 'primary', accessToken: 'a', refreshToken: 'r', clientSecret: 's' });
      expect(publicConfig).toEqual({ calendarId: 'primary' });
      expect(secrets).toEqual({ accessToken: 'a', refreshToken: 'r', clientSecret: 's' });
    });
    test('strip limpia un google_config heredado y devuelve lo filtrado', () => {
      const raw = JSON.stringify({ calendarId: 'primary', accessToken: 'a' });
      const { cleaned, leaked } = stripSecretsFromYjsConfig(raw);
      expect(JSON.parse(cleaned!)).toEqual({ calendarId: 'primary' });
      expect(leaked).toEqual({ accessToken: 'a' });
    });
    test('strip es idempotente', () => {
      const raw = JSON.stringify({ calendarId: 'primary' });
      expect(stripSecretsFromYjsConfig(raw).leaked).toEqual({});
    });
  });
  ```
- [ ] **Step 2 (Rojo):** `yarn vitest run --browser.headless=true …/calendar/__tests__/calendar-secrets.spec.ts` → FALLA.
- [ ] **Step 3 (Implementar):**
  ```ts
  export const GOOGLE_SECRET_FIELDS = ['accessToken', 'refreshToken', 'clientSecret'] as const;

  export function splitGoogleConfig(cfg: Record<string, unknown>) {
    const publicConfig: Record<string, unknown> = {};
    const secrets: Record<string, string> = {};
    for (const [k, v] of Object.entries(cfg)) {
      if ((GOOGLE_SECRET_FIELDS as readonly string[]).includes(k)) {
        if (typeof v === 'string' && v) secrets[k] = v;
      } else publicConfig[k] = v;
    }
    return { publicConfig, secrets };
  }

  export function stripSecretsFromYjsConfig(raw: string | undefined) {
    if (!raw) return { cleaned: raw, leaked: {} as Record<string, string> };
    try {
      const { publicConfig, secrets } = splitGoogleConfig(JSON.parse(raw));
      return { cleaned: JSON.stringify(publicConfig), leaked: secrets };
    } catch {
      return { cleaned: raw, leaked: {} as Record<string, string> };
    }
  }
  ```
- [ ] **Step 4 (Verde):** correr el spec → exit 0.
- [ ] **Step 5 (Integrar):** en `calendar/index.tsx`, al leer `google_config` (≈358) ejecutar `stripSecretsFromYjsConfig`; si `leaked` no está vacío, guardar los secretos en localStorage `affinite_calendar_secrets_v1:<workspaceId>` y reescribir el `yMap` con `cleaned`. `saveGoogleConfigToYjs` (≈407) debe guardar solo `publicConfig`; los secretos van a localStorage. Los inputs del formulario siguen leyendo del estado combinado.
- [ ] **Step 6:** oxlint + vitest → exit 0. **Step 7:** `git commit -m "fix(calendar): keep Google credentials out of the synced Yjs doc"`

> [!WARNING]
> Quien ya haya pegado un token en una versión anterior lo tiene en el historial CRDT del workspace. Documentar en el CHANGELOG que debe **revocar y regenerar** el token tras actualizar.

### Task 0.5: Un único documento raíz para hábitos (cierra D5, D6)

**Files:** `[+] modules/affinite-hub/yjs-root.ts`, `[+] modules/affinite-hub/__tests__/yjs-root.spec.ts`, `[*] habit-preview.ts`, `[*] slash-menu/src/config.ts`

**Interfaces — Produces:** `export function resolveRootYDoc(doc: Y.Doc): Y.Doc`

- [ ] **Step 1 (Test, falla):**
  ```ts
  import { describe, expect, test } from 'vitest';
  import * as Y from 'yjs';
  import { resolveRootYDoc } from '../yjs-root';

  describe('resolveRootYDoc', () => {
    test('un subdoc resuelve al documento raíz', () => {
      const root = new Y.Doc();
      const page = new Y.Doc();
      root.getMap('spaces').set('page1', page);
      expect(resolveRootYDoc(page)).toBe(root);
    });
    test('el raíz se resuelve a sí mismo', () => {
      const root = new Y.Doc();
      expect(resolveRootYDoc(root)).toBe(root);
    });
    test('escribir vía raíz resuelto es visible en el mapa de /habits', () => {
      const root = new Y.Doc();
      const page = new Y.Doc();
      root.getMap('spaces').set('p', page);
      resolveRootYDoc(page).getMap('affinite_habits_v1').set('habits', '[]');
      expect(root.getMap('affinite_habits_v1').get('habits')).toBe('[]');
    });
  });
  ```
- [ ] **Step 2 (Rojo):** `yarn vitest run --browser.headless=true packages/frontend/core/src/modules/affinite-hub/__tests__/yjs-root.spec.ts` → FALLA.
- [ ] **Step 3 (Implementar):**
  ```ts
  import type * as Y from 'yjs';

  /** Sube por la cadena de subdocs hasta el documento raíz del workspace. */
  export function resolveRootYDoc(doc: Y.Doc): Y.Doc {
    let current = doc;
    // `_item` es API interna de Yjs; está cubierta por la prueba de subdocs.
    while (current._item?.parent?.doc) {
      current = current._item.parent.doc;
    }
    return current;
  }
  ```
- [ ] **Step 4 (Verde):** correr el spec → exit 0.
- [ ] **Step 5 (Integrar):** `habit-preview.ts getYMap()` → `resolveRootYDoc(this.model.store.spaceDoc).getMap(HABITS_YMAP_KEY)`; mantener los fallbacks existentes solo si `spaceDoc` es `undefined`. `slash-menu/src/config.ts` `completeHabitToday` y la lectura de hábitos → mismo resolvedor. Reemplazar `getCachedHabits` por lectura Yjs con el caché localStorage solo como último recurso.
- [ ] **Step 6:** `yarn vitest run --browser.headless=true packages/frontend/core/src/desktop/pages/workspace/habits packages/frontend/core/src/modules/affinite-hub` y oxlint → exit 0.
- [ ] **Step 7 (Verificación manual en la app):** insertar `/habit`, completarlo, abrir `/habits` y confirmar que la racha coincide en ambas vistas. **Step 8:** `git commit -m "fix(habits): resolve workspace root doc for widget and slash menu"`

### Task 0.6: Sin streaks de demostración (cierra D13)

**Files:** `[*] streaks/index.tsx`, `[*] streaks/__tests__/streaks-calculator.spec.ts` (si cambia la forma de los datos)

- [ ] **Step 1 (Test, falla):** en el spec de streaks añadir `expect(getInitialStreaks()).toEqual([])` para un workspace vacío.
- [ ] **Step 2 (Rojo):** correr el spec → FALLA.
- [ ] **Step 3 (Implementar):** extraer `getInitialStreaks()` que devuelve `[]`; `DEFAULT_STREAKS` pasa a `STREAK_TEMPLATES` ofrecidos como "Plantillas" en el estado vacío (acción explícita del usuario), con id y título coherentes.
- [ ] **Step 4 (Verde):** correr el spec → exit 0.
- [ ] **Step 5:** oxlint → exit 0. **Step 6:** `git commit -m "fix(streaks): stop seeding demo streaks in new workspaces"`

### Task 0.7: ADR del calendario y aviso de token (decisiones del usuario)

**Files:** `[+] docs/adr/0001-single-calendar.md`, `[*] CHANGELOG.md`

- [ ] **Step 1:** Crear `docs/adr/0001-single-calendar.md` con: **Contexto** (existen el calendario propio en `packages/frontend/core/src/desktop/pages/workspace/calendar/` y el integrado de upstream en `packages/frontend/core/src/modules/integration/` + servidor `plugins/calendar`/GraphQL), **Decisión** (se mantiene solo el calendario propio: time-blocking, recurrencia, ICS, Google vía puente Electron, capas de tableros/journals; es local-first y no depende de servidor), **Consecuencias** (el módulo de integración upstream no recibe UI ni nuevas funciones; no se borra en esta fase para no divergir de upstream; toda capa nueva —hábitos, streaks— se añade al calendario propio).
- [ ] **Step 2:** En `CHANGELOG.md`, sección de la versión en curso, añadir bajo "Seguridad": "Las credenciales de Google Calendar (`accessToken`, `refreshToken`, `clientSecret`) ya no se guardan en el documento Yjs del workspace. **Si pegaste un token en una versión anterior, revócalo en tu cuenta de Google y genera uno nuevo**: puede permanecer en el historial CRDT del workspace."
- [ ] **Step 3:** `yarn prettier --check docs/adr/0001-single-calendar.md CHANGELOG.md` → exit 0.
- [ ] **Step 4:** `git commit -m "docs: add single-calendar ADR and Google token revocation notice"`

### Gate de salida de la Fase 0

- [ ] `yarn vitest run --browser.headless=true packages/frontend/core/src/desktop/pages/workspace packages/frontend/core/src/modules/affinite-hub` → exit 0 (≥ 68 tests previos + los nuevos).
- [ ] `yarn oxlint packages/frontend/core/src/desktop/pages/workspace packages/frontend/core/src/modules/affinite-hub packages/frontend/apps/electron/src/main` → 0 errores.
- [ ] `yarn typecheck` → exit 0.
- [ ] Prueba manual en Electron: importar un `.ics` real, sincronizar Google, `/habit` ↔ `/habits` coherentes.
- [ ] `git ls-files --others --exclude-standard` no lista archivos de código relevantes (`git status --short` no es fiable en este repo para archivos nuevos).

---

# FASES 1–6 — Hoja de ruta (cada una tendrá su plan detallado)

## Fase 1 — Núcleo `affinite-hub`
**Entregables** (en `packages/frontend/core/src/modules/affinite-hub/`):
- `keys.ts`: constantes únicas de claves Yjs/localStorage (reemplaza literales dispersos y `LEGACY_HABIT_ID_MAP` duplicado en slash menu).
- `types.ts`: `DatedItem { id; source: 'calendar'|'board'|'habit'|'streak'|'journal'; title; start: string; end?: string; allDay: boolean; category: string; color?: string; done?: boolean; href: string }`.
- `categories.ts`: catálogo común de categorías (hoy: Habits `CATEGORIES`, slash `Salud/Fitness/…`, calendario `General/Trabajo`) con mapa de alias.
- `providers/`: `boardsProvider`, `habitsProvider`, `streaksProvider`, `calendarProvider`, cada uno `(rootDoc, range) => DatedItem[]`, puros y con tests.
- Normalizar `createdAt` de hábitos a `number` con migración idempotente; añadir `category` a `BoardCard` (default `'General'`).

**Aceptación:** cada provider con test; los módulos existentes usan `keys.ts`; `grep` no encuentra literales `'affinite_*_v1'` fuera del hub.

## Fase 2 — Calendario unificado
- Capas visibles: Tableros (fecha límite), Hábitos (recurrencia diaria/semanal), Streaks (`targetDateTime`), Journals; activar/desactivar por capa.
- Edición bidireccional: marcar hecha una tarjeta/hábito desde el calendario escribe en la fuente (ya existe para `board_data`; generalizar con `DatedItem.source`).
- Decidir **D15**: mantener un solo calendario (el propio) y dejar `modules/integration` de upstream sin UI, o reutilizar sus conectores. Registrar en un ADR corto.
**Aceptación:** crear una tarjeta con fecha en `/boards` aparece en `/calendar`; completar un hábito en el calendario actualiza `/habits` y el widget.

## Fase 3 — Recordatorios únicos
- `ReminderService` (hub): `schedule(DatedItem, offsetMin)`, deduplicación, permiso `Notification.requestPermission` una sola vez, sonido unificado (mover `streaks-sound.ts` a `affinite-hub/sound.ts`).
- Recordatorios de hábitos (hora diaria configurable).
- Scheduler en el proceso principal de Electron (`main/calendar` o nuevo `main/reminders`) para avisar con la ventana cerrada a la bandeja (`tray` ya existe).
**Aceptación:** una sola implementación; test del deduplicador y de offsets; aviso con la página cerrada.

## Fase 4 — Reportes e inteligencia
- `buildWeeklySnapshot(rootDoc, weekStart)` → hábitos (cumplimiento %), streaks activos/completados, tareas hechas/pendientes, tarjetas movidas, journals.
- `weekly-reports` consume el snapshot; la tarjeta "Hábitos & Rutinas" se llena; gráficas con `recharts` (ya dependencia).
**Aceptación:** test con datos fijos; el reporte coincide con `/habits`, `/streaks` y `/calendar` para la misma semana.

## Fase 5 — Navegación e IA
- Registrar Tableros/Calendario/Hábitos/Streaks/Reportes en `commands/affine-navigation.tsx` y búsqueda rápida; comandos "Nuevo hábito", "Nueva tarjeta", "Ir a hoy".
- IA: añadir al prompt de `main/ai` un bloque de contexto con `WeeklySnapshot` y los próximos `DatedItem`; herramientas MCP de solo lectura primero (`list_dated_items`, `weekly_snapshot`), escritura detrás de confirmación.
- Sesiones de IA: valorar migrar `affinite_local_ai_sessions_v1` fuera de localStorage solo si hay necesidad real (YAGNI).
**Aceptación:** cmdk encuentra cada módulo; preguntar a la IA "¿qué tengo esta semana?" devuelve datos reales.

## Fase 6 — Móvil y web
- Rutas móviles `/calendar`, `/habits`, `/streaks`, `/weekly-reports` en `mobile/workbench-router.ts` (reutilizando páginas desktop como `/boards`, con layout responsivo).
- Web: sustituir el `fetch` directo de ICS/Google por un proxy opcional en `packages/backend/server` (evita CORS) con la misma forma `{ok,…}` que el puente Electron.
**Aceptación:** los enlaces de `mobile/components/navigation/sections/boards` dejan de caer en not-found.

---

## Riesgos y decisiones abiertas

| Riesgo | Mitigación |
|---|---|
| `_item` de Yjs es API interna | Test de subdocs (Task 0.5) lo detecta si cambia; alternativa: inyectar `workspace.rootYDoc` desde el servicio de workspace |
| `calendar/index.tsx` supera 4 000 líneas | Extraer en la Fase 2 solo lo que se toque (vista de hábitos/capas), sin refactor global |
| Token ya expuesto en historial CRDT | Aviso de revocación en CHANGELOG (Task 0.4) |
| Dos calendarios (D15) | Decisión explícita en Fase 2 con ADR |

## Self-Review

- **Cobertura:** D1–D6 y D13 → Fase 0; D7 → F4; D8, D9, D15 → F1–F2; D10 → F3; D11, D12 → F5; D14 → F6. Sin huecos.
- **Placeholders:** la Fase 0 no tiene; las Fases 1–6 son hoja de ruta por diseño y se detallan en planes propios.
- **Consistencia de tipos:** `CalendarBridgeError`, `unwrapIcsResult`, `unwrapGoogleResult`, `withTokenRefresh`, `splitGoogleConfig`, `stripSecretsFromYjsConfig` y `resolveRootYDoc` se usan con la misma firma en todas las tareas.
