# ADR 0001: Adopción del Calendario Nativo de AFFiNITe frente a la Integración de Upstream

## Estatus

Aceptado

## Fecha

2026-11-02

## Contexto

En el código base de AFFiNITe convergen dos implementaciones y subsistemas de calendario independientes:

1. **Calendario Nativo de AFFiNITe (`packages/frontend/core/src/desktop/pages/workspace/calendar/`)**:
   - Desarrollado como un módulo local-first de alto rendimiento dentro del workspace.
   - Cuenta con soporte completo para time-blocking interactivo (arrastrar y soltar, redimensionado magnético a 15 min, resolución de colisiones lado a lado).
   - Incluye motor de recurrencia RFC 5545 (`RRULE`, `EXDATE`), soporte bidireccional de archivos `.ics` y suscripciones remotas en vivo mediante puente IPC de Electron (`electron/src/main/calendar/`).
   - Soporta sincronización bidireccional con Google Calendar REST API v3 sin requerir infraestructura intermedia.
   - Se integra naturalmente con el modelo PKM de AFFiNITe: vinculación directa con notas de BlockSuite (`linkedDocId`), capas de eventos para Tableros (`boards`) y Journals, alarmas armónicas sintetizadas con Web Audio API y notificaciones locales.
   - No depende de ningún servidor ni backend centralizado para operar.

2. **Módulo de Integración de Upstream (`packages/frontend/core/src/modules/integration/` + servidor `plugins/calendar` / GraphQL)**:
   - Proviene del repositorio original de AFFiNE upstream.
   - Arquitectónicamente dependiente de un servidor en la nube / backend auto-alojado que ejecuta GraphQL y plugins de sincronización de terceros.
   - No ofrece las capacidades avanzadas de time-blocking visual, integración local con BlockSuite ni funcionamiento 100% offline requeridas por los principios de soberanía de datos y rendimiento de AFFiNITe.

Tener dos subsistemas de calendario concurrentes generaba ambigüedad sobre la fuente de la verdad para la planificación temporal y dispersión en el desarrollo de nuevas características (hábitos, streaks, reportes).

## Decisión

Se adopta de manera exclusiva el **Calendario Nativo de AFFiNITe** como la única solución de calendario y agenda en la plataforma.

Las razones principales de esta decisión son:

- **Filosofía Local-First**: Funciona de forma inmediata en entornos offline y sin infraestructura externa obligatoria.
- **Rendimiento y Experiencia de Usuario**: Proporciona interactividad fluida con time-blocking de 24 horas, drag-and-drop, colisiones en columnas paralelas y vistas adaptadas a escritorio.
- **Soberanía y Seguridad**: La sincronización de Google Calendar e importación de feeds iCal se realiza directamente desde el cliente Electron mediante aislamiento local de credenciales, sin intermediarios.
- **Interoperabilidad Interna**: Constituye la base sobre la cual convergen los artefactos de productividad de AFFiNITe (tarjetas de Tableros, hábitos, contadores de Streaks y Journals).

## Consecuencias

- **Módulo Upstream Congelado**: El módulo `packages/frontend/core/src/modules/integration/` y los endpoints GraphQL asociados no recibirán interfaces de usuario adicionales, adaptaciones ni nuevas funcionalidades.
- **Preservación de Upstream**: Para evitar divergencias agresivas y conflictos en futuros merges de upstream, el código existente de `packages/frontend/core/src/modules/integration/` no se eliminará físicamente en esta fase.
- **Evolución Centralizada en el Hub**: Todas las nuevas integraciones temporales —incluyendo la proyección de hábitos diarios, streaks de objetivos, recordatorios unificados y resúmenes semanales— se implementarán exclusivamente sobre el calendario nativo y la capa de dominio `affinite-hub`.
