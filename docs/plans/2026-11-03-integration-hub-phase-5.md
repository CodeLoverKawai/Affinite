# Plan de Implementación — Fase 5: Navegación e IA

**Objetivo:** Integrar completamente todos los módulos de AFFiNITe (Tableros, Calendario, Hábitos, Streaks, Reportes Semanales) en la paleta de comandos CMDK/búsqueda rápida para navegación instantánea y creación de ítems, y alimentar el motor de IA local (`copilot-client.ts` / `main/ai`) con un contexto unificado y estructurado en tiempo real del workspace (`buildHubAIContext`) que incluya el `WeeklySnapshot` y los próximos `DatedItem`s.

---

## Tareas

### Task 5.1: Comandos CMDK de Navegación y Creación Rápida
- **Archivos:**
  - `[*] packages/frontend/core/src/commands/affine-navigation.tsx`
  - `[*] packages/frontend/core/src/commands/affine-creation.tsx`
  - `[+] packages/frontend/core/src/commands/__tests__/affine-hub-commands.spec.ts`
- **Detalle:**
  - En `affine-navigation.tsx`:
    - Añadir comandos de navegación a la paleta CMDK:
      - `affine:goto-boards` ("Go to Boards / Ir a Tableros", categoría `affine:navigation`, icono de capas).
      - `affine:goto-calendar` ("Go to Calendar / Ir a Calendario", categoría `affine:navigation`, icono de calendario, atajo `$mod+Alt+C` si disponible).
      - `affine:goto-habits` ("Go to Habits / Ir a Hábitos", categoría `affine:navigation`, icono de checklist).
      - `affine:goto-streaks` ("Go to Streaks / Ir a Rachas", categoría `affine:navigation`, icono de fuego).
      - `affine:goto-weekly-reports` ("Go to Weekly Reports / Ir a Reportes Semanales", categoría `affine:navigation`, icono de reporte).
    - Acción: `workbenchService?.workbench.open('/...') ?? navigationHelper.jumpToPage(docCollection.id, '...')`.
  - En `affine-creation.tsx`:
    - Añadir comandos de creación rápida / saltos:
      - `affine:quick-habit` ("New Habit / Ir a Hábitos para crear", o abrir diálogo/ruta de hábitos).
      - `affine:goto-calendar-today` ("Calendar: Go to Today / Ir a Hoy en Calendario").
  - TDD: `affine-hub-commands.spec.ts` verificando que todos los comandos quedan registrados, tienen sus IDs canónicos y ejecutan la navegación esperada.

### Task 5.2: Motor de Contexto de IA (`buildHubAIContext`)
- **Archivos:**
  - `[+] packages/frontend/core/src/modules/affinite-hub/ai-context.ts`
  - `[+] packages/frontend/core/src/modules/affinite-hub/__tests__/ai-context.spec.ts`
  - `[*] packages/frontend/core/src/modules/affinite-hub/index.ts`
  - `[*] packages/frontend/core/src/modules/affinite-hub/types.ts`
- **Detalle:**
  - Crear `buildHubAIContext(rootDocOrWrapper: any, options?: { now?: Date; boardDocs?: any[]; maxUpcomingDays?: number }): string`:
    - Resuelve `rootYDoc` de forma segura y defensiva con `resolveRootYDoc`.
    - Genera un bloque estructurado en Markdown apto para inyección en el prompt de IA con:
      1. **Snapshot de la Semana en Curso**: consistencia, cumplimiento de hábitos, tareas pendientes vs completadas, tarjetas de tableros, streaks activos.
      2. **Agenda de Hoy y Próximos Días**: lista cronológica de eventos, hábitos y tareas pendientes para hoy y los próximos `maxUpcomingDays` (por defecto 7 días).
      3. **Metas y Rachas**: estado de streaks activos y sprints que vencen pronto.
    - Exportar en `types.ts` e `index.ts`.
  - TDD: pruebas unitarias completas en `ai-context.spec.ts` con Y.Doc real, verificando la estructura generada y la resiliencia ante documentos vacíos.

### Task 5.3: Integración del Contexto de Hub en el Asistente de IA Local
- **Archivos:**
  - `[*] packages/frontend/core/src/blocksuite/ai/provider/copilot-client.ts`
  - `[+] packages/frontend/core/src/__tests__/ai/hub-ai-context-integration.spec.ts`
- **Detalle:**
  - En `copilot-client.ts`:
    - En `executeLocalAIChat`:
      - Cuando existe acceso al workspace (`docCollection` o `rootYDoc` disponible en el entorno o vía sesión):
        - Construir el bloque `workspaceIntelligenceContext = buildHubAIContext(rootYDoc)`.
        - Anexar la sección de inteligencia del workspace en las instrucciones del sistema (`System: ...\n\n[AFFINITE_WORKSPACE_INTELLIGENCE]\n...`).
        - Así, cuando el usuario pregunte "¿qué tengo hoy?", "¿cuáles son mis hábitos pendientes?" o "¿cómo va mi semana?", el modelo local (Antigravity, Ollama, Gemini CLI) tiene los datos reales consolidados.
  - TDD: pruebas unitarias verificando que `buildHubAIContext` se inyecta correctamente en el flujo de ejecución local.

---

## Verificación y Criterios de Aceptación
1. `yarn vitest run --browser.headless=true packages/frontend/core/src/commands packages/frontend/core/src/modules/affinite-hub packages/frontend/core/src/__tests__/ai` → todos los tests pasan.
2. `yarn oxlint packages/frontend/core/src/commands packages/frontend/core/src/modules/affinite-hub packages/frontend/core/src/blocksuite/ai` → 0 errores.
3. CMDK expone los 5 módulos para navegación inmediata.
4. El asistente de IA responde con información real de hábitos, calendarios y reportes semanales del usuario.
