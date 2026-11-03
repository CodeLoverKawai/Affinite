# Plan de Implementación — Fase 6: Móvil y Web

**Objetivo:** Completar el soporte multi-plataforma de AFFiNITe conectando las rutas móviles de todos los módulos (`/calendar`, `/habits`, `/streaks`, `/weekly-reports`, `/chat`) en `mobile/workbench-router.ts` para que ningún enlace de la navegación móvil caiga en 404, y robustecer las peticiones de feeds de calendario (ICS/Google) en entornos web sin Electron.

---

## Tareas

### Task 6.1: Enrutamiento Móvil de Módulos Hub y Tests
- **Archivos:**
  - `[*] packages/frontend/core/src/mobile/workbench-router.ts`
  - `[+] packages/frontend/core/src/mobile/__tests__/workbench-router.spec.ts`
- **Detalle:**
  - En `workbench-router.ts`, registrar bajo lazy imports idénticos a `/boards`:
    - `/chat` -> `lazy: () => import('../desktop/pages/workspace/chat/index')`
    - `/calendar` -> `lazy: () => import('../desktop/pages/workspace/calendar/index')`
    - `/habits` -> `lazy: () => import('../desktop/pages/workspace/habits/index')`
    - `/streaks` -> `lazy: () => import('../desktop/pages/workspace/streaks/index')`
    - `/weekly-reports` -> `lazy: () => import('../desktop/pages/workspace/weekly-reports/index')`
  - Crear `workbench-router.spec.ts` verificando:
    - Todas las rutas hub (`/boards`, `/calendar`, `/habits`, `/streaks`, `/weekly-reports`, `/chat`) están presentes en `workbenchRoutes`.
    - Tienen funciones de carga perezosa (`lazy`) válidas y no colisionan con comodines (`/:pageId` o `*`).
    - Las rutas preceden al comodín `/:pageId` para evitar captura accidental.

### Task 6.2: Resiliencia de Red Web para Feeds de Calendario
- **Archivos:**
  - `[*] packages/frontend/core/src/desktop/pages/workspace/calendar/calendar-bridge.ts`
  - `[*] packages/frontend/core/src/desktop/pages/workspace/calendar/__tests__/calendar-bridge.spec.ts`
- **Detalle:**
  - Implementar en `calendar-bridge.ts`:
    - `buildCalendarProxyUrl(targetUrl: string, proxyEndpoint?: string): string`: función pura que prepara la URL para proxy de CORS si se especifica un endpoint de proxy (e.g. `/api/calendar/proxy?url=...`).
    - `isCorsSafeUrl(url: string): boolean`: chequea si la URL es del mismo origen o segura.
  - Actualizar pruebas unitarias en `calendar-bridge.spec.ts`.

---

## Verificación y Criterios de Aceptación
1. `yarn vitest run --browser.headless=true packages/frontend/core/src/mobile packages/frontend/core/src/desktop/pages/workspace/calendar` → todos los tests pasan.
2. `yarn oxlint packages/frontend/core/src/mobile packages/frontend/core/src/desktop/pages/workspace/calendar` → 0 errores.
3. Navegar a `/calendar`, `/habits`, `/streaks` o `/weekly-reports` en móvil renderiza la vista en lugar de 404.
