# Plan de Implementación — Fase 3: Sistema Unificado de Recordatorios y Sonido

**Objetivo:** Centralizar el motor de audio Web Audio y el servicio de notificaciones/recordatorios en `modules/affinite-hub/` para que Hábitos, Calendario, Streaks y Tableros compartan una única cola de alarmas, deduplicación de alertas y permisos de notificación, con retrocompatibilidad absoluta.

---

## Tareas

### Task 3.1: Módulo Centralizado de Sonido Sintetizado (`affinite-hub/sound.ts`)
- **Archivos:**
  - `[+] packages/frontend/core/src/modules/affinite-hub/sound.ts`
  - `[*] packages/frontend/core/src/desktop/pages/workspace/streaks/streaks-sound.ts` (re-export backward compatible)
  - `[+] packages/frontend/core/src/modules/affinite-hub/__tests__/sound.spec.ts`
- **Detalle:**
  - Implementar sintetizador armónico Web Audio API sin assets externos (`playChimeSound`, `playCompletionSound`).
  - Tolerar entornos sin DOM / Node / SSR / audio bloqueado sin lanzar excepciones.
  - Re-exportar desde `streaks/streaks-sound.ts` para no romper llamadas existentes.

### Task 3.2: Motor de Deduplicación y Notificaciones (`affinite-hub/reminders.ts`)
- **Archivos:**
  - `[+] packages/frontend/core/src/modules/affinite-hub/reminders.ts`
  - `[+] packages/frontend/core/src/modules/affinite-hub/__tests__/reminders.spec.ts`
- **Detalle:**
  - `requestNotificationPermission(): Promise<NotificationPermission>`
  - `triggerDesktopNotification(title, options, playSound?)`
  - `shouldTriggerReminder(targetDateTimeStr, offsetMinutes, now, firedSet): boolean`
  - `evaluateDueDatedItemReminders(items: DatedItem[], now: Date, firedSet: Set<string>): DatedItem[]`
  - Tests unitarios exhaustivos con fechas fijas y deduplicación.

### Task 3.3: Soporte de Recordatorios en Hábitos y Modelo de Datos
- **Archivos:**
  - `[*] packages/frontend/core/src/desktop/pages/workspace/habits/habits-calculator.ts`
  - `[*] packages/frontend/core/src/modules/affinite-hub/providers/habits-provider.ts`
  - `[*] packages/frontend/core/src/modules/affinite-hub/__tests__/providers.spec.ts`
- **Detalle:**
  - Extender la interfaz de hábitos para soportar opcionalmente `reminderTime?: string` (formato "HH:mm").
  - En `habits-provider.ts`, inyectar `reminderMinutes` y `startTime` en el `DatedItem` cuando esté configurado.

### Task 3.4: Integración del Bucle de Recordatorios en el Calendario y Barrel Hub
- **Archivos:**
  - `[*] packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx`
  - `[*] packages/frontend/core/src/modules/affinite-hub/index.ts`
  - `[+] packages/frontend/core/src/desktop/pages/workspace/calendar/__tests__/calendar-reminders-integration.spec.ts`
- **Detalle:**
  - Reemplazar el bucle manual de recordatorios de `calendar/index.tsx` con `evaluateDueDatedItemReminders` y `triggerDesktopNotification`.
  - Exportar `sound.ts` y `reminders.ts` desde el barrel `affinite-hub/index.ts`.
  - Verificar suite completa con Vitest y Oxlint.
