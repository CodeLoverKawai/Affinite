# Plan de Implementación — Fase 4: Reportes e Inteligencia

**Objetivo:** Construir el agregador `buildWeeklySnapshot` en `modules/affinite-hub/weekly-snapshot.ts` para consolidar datos reales de Hábitos, Streaks, Calendario y Tableros para cualquier semana ISO seleccionada, e integrarlo reactivamente en `weekly-reports/index.tsx`, transformando la sección de Hábitos y Métricas en un dashboard vivo y real.

---

## Tareas

### Task 4.1: Modelo y Motor de Agregación `buildWeeklySnapshot`
- **Archivos:**
  - `[+] packages/frontend/core/src/modules/affinite-hub/weekly-snapshot.ts`
  - `[+] packages/frontend/core/src/modules/affinite-hub/__tests__/weekly-snapshot.spec.ts`
- **Detalle:**
  - Definir interfaces en `types.ts` o `weekly-snapshot.ts`:
    - `WeeklyHabitSummary`: total de hábitos activos, porcentaje de cumplimiento semanal, conteo por día (lun-dom), hábitos más cumplidos.
    - `WeeklyStreakSummary`: streaks activos en la semana, streaks finalizados/alcanzados.
    - `WeeklyTaskSummary`: tareas del calendario en la semana (total, completadas, pendientes).
    - `WeeklyBoardSummary`: tarjetas con fecha límite en la semana (total, completadas, pendientes).
    - `WeeklySnapshot`: consolidado con rango de fechas, resumen de hábitos, streaks, tareas, tableros y métrica de consistencia global (0-100%).
  - Implementar `buildWeeklySnapshot(rootDoc: any, weekKeyOrRange: string | { start: string; end: string }, boardDocs?: any[])`:
    - Función pura, defensiva ante documentos nulos o vacíos.
    - Utiliza `extractHabitDatedItems`, `extractStreakDatedItems`, `extractCalendarDatedItems`, `extractBoardDatedItems`.
  - TDD: tests unitarios con `new Y.Doc()` y fixtures fijas de hábitos, streaks y tareas.

### Task 4.2: Exportación en Barrel Hub y Helpers de Formato
- **Archivos:**
  - `[*] packages/frontend/core/src/modules/affinite-hub/index.ts`
  - `[*] packages/frontend/core/src/modules/affinite-hub/types.ts`
- **Detalle:**
  - Exportar `buildWeeklySnapshot`, `WeeklySnapshot`, y sub-tipos desde `@affine/core/modules/affinite-hub`.
  - Añadir helper `calculateConsistencyScore(snapshot: WeeklySnapshot): number` (ponderado hábitos 50% + tareas/tableros 50%).

### Task 4.3: Integración Reactiva en Página `weekly-reports`
- **Archivos:**
  - `[*] packages/frontend/core/src/desktop/pages/workspace/weekly-reports/index.tsx`
  - `[*] packages/frontend/core/src/desktop/pages/workspace/weekly-reports/weekly-reports.css.ts`
  - `[+] packages/frontend/core/src/desktop/pages/workspace/weekly-reports/__tests__/weekly-reports-integration.spec.ts`
- **Detalle:**
  - En `weekly-reports/index.tsx`:
    - Observar `affinite_habits_v1`, `affinite_streaks_v1`, `affinite_calendar_v1` en `workspaceService.workspace.rootYDoc`.
    - Calcular `weeklySnapshot` reactivamente con `useMemo` en función de `selectedWeekKey` y el estado de los documentos.
    - Remplazar el placeholder estático de "Hábitos & Rutinas" por:
      - Barra de progreso de cumplimiento de hábitos (% global y desglose por día).
      - Resumen de Streaks activos y metas de la semana.
      - Tarjeta de entregables y compromisos (tareas de calendario y tableros completadas vs pendientes).
  - TDD y test de integración verificando el render y actualización de datos.
