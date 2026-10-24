# Plan de Implementación: AFFiNITe v0.30
## Anx-Remix Reader Encapsulado, Supercharged Calendar v2, Sección Dedicada Streaks & Bloque Interactivo `/habit`

> **Fecha:** 2026-10-24  
> **Estado:** Listo para Ejecución  
> **Basado en:** `docs/specs/2026-10-24-anx-reader-streaks-calendar-habits-design.md`  

---

## 1. File Impact Table

| Impact | Path | Description |
|---|---|---|
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/habits/__tests__/habit-card-widget.spec.ts` | Pruebas unitarias para el componente interactivo de hábitos |
| `[+]` | `packages/frontend/core/src/blocksuite/view-extensions/habit-card/habit-card.ts` | Componente interactivo enriquecido para el bloque `/habit` en BlockSuite |
| `[*]` | `blocksuite/affine/widgets/slash-menu/src/config.ts` | Actualizar comando `/habit` para insertar el bloque visual interactivo |
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/streaks/__tests__/streaks-calculator.spec.ts` | Pruebas unitarias para contadores en días/horas y alertas |
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/streaks/streaks-calculator.ts` | Lógica de cálculo temporal de días, horas y estado de metas |
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/streaks/streaks-sound.ts` | Generador de tonos y campanas de alerta mediante Web Audio API |
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/streaks/index.tsx` | Página dedicada de Streaks con contadores dinámicos y métricas |
| `[*]` | `packages/frontend/core/src/desktop/workbench-router.ts` | Registro de rutas `/streaks` y `/library` |
| `[*]` | `packages/frontend/core/src/components/root-app-sidebar/index.tsx` | Añadir botones `<StreaksButton />` y `<LibraryButton />` en la barra lateral |
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/calendar/__tests__/calendar-timeblock.spec.ts` | Pruebas unitarias de posicionamiento de eventos y cálculo de duraciones |
| `[*]` | `packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx` | Renderizado proporcional de horas, creación por arrastre, All-Day banner y mini-calendario |
| `[+]` | `packages/frontend/apps/electron/src/main/library/index.ts` | IPC Handlers de Electron para almacenamiento local encapsulado de libros |
| `[*]` | `packages/frontend/apps/electron/src/main/handlers.ts` | Registro del namespace `library` en los handlers de Electron |
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-manager.spec.ts` | Pruebas unitarias del catálogo y progreso de lectura |
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/library/library-store.ts` | Store y adaptadores de libros, progreso CFI y marcadores en Yjs |
| `[+]` | `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx` | Estantería de libros moderna y visor de lectura Foliate-js |
| `[*]` | `packages/frontend/apps/electron/scripts/manual-package.sh` | Incluir assets de Foliate-js en el empaquetado de producción |

---

## 2. Bite-Sized Task Breakdown

### Fase 1: Bloque Interactivo `/habit` en el Editor (Estilo Mermaid)

#### Task 1.1: Pruebas Unitarias del Bloque Interactivo de Hábitos
- **Files:** `[+] packages/frontend/core/src/desktop/pages/workspace/habits/__tests__/habit-card-widget.spec.ts`
- **Paso 1 (Test):** Crear pruebas para el formateo de racha, cálculo de estado del hábito en fecha contextual (nota diaria) y toggle de completado.
- **Paso 2 (Verify Red):** Ejecutar `yarn vitest run --browser.headless packages/frontend/core/src/desktop/pages/workspace/habits/__tests__/habit-card-widget.spec.ts` -> Debe fallar.

#### Task 1.2: Implementar Componente Visual `<habit-card-widget>` e Integrar en Slash Menu
- **Files:** `[+] packages/frontend/core/src/blocksuite/view-extensions/habit-card/habit-card.ts`, `[*] blocksuite/affine/widgets/slash-menu/src/config.ts`
- **Paso 3 (Implement):** Construir el componente con tarjeta glassmorphic, insignia de hábito, selector de hábitos, botón de verificación interactivo, racha `🔥` y tira semanal interactiva. Actualizar el slash menu para insertar este bloque enriquecido en lugar de texto plano.
- **Paso 4 (Verify Green):** Ejecutar `yarn vitest run --browser.headless packages/frontend/core/src/desktop/pages/workspace/habits/__tests__/habit-card-widget.spec.ts` -> Debe pasar.
- **Paso 5 (Commit):** `git commit -m "feat(habits): add rich interactive habit card block in editor"`

---

### Fase 2: Sección Dedicada `Streaks` (`/streaks`)

#### Task 2.1: Pruebas Unitarias del Motor de Streaks
- **Files:** `[+] packages/frontend/core/src/desktop/pages/workspace/streaks/__tests__/streaks-calculator.spec.ts`
- **Paso 1 (Test):** Crear pruebas para cálculo de tiempo restante (días, horas, minutos), verificación de cumplimiento de metas y cálculo de progreso.
- **Paso 2 (Verify Red):** Ejecutar `yarn vitest run --browser.headless packages/frontend/core/src/desktop/pages/workspace/streaks/__tests__/streaks-calculator.spec.ts` -> Debe fallar.

#### Task 2.2: Implementar Motor de Streaks y Alarma Sonora Web Audio
- **Files:** `[+] packages/frontend/core/src/desktop/pages/workspace/streaks/streaks-calculator.ts`, `[+] packages/frontend/core/src/desktop/pages/workspace/streaks/streaks-sound.ts`
- **Paso 3 (Implement):** Crear funciones puras de cálculo de contadores y el generador de tonos armónicos con `AudioContext` para la alarma sin dependencias de audio externas.
- **Paso 4 (Verify Green):** Ejecutar vitest -> Debe pasar.

#### Task 2.3: Construir Vista `/streaks`, Ruta y Botón en Sidebar
- **Files:** `[+] packages/frontend/core/src/desktop/pages/workspace/streaks/index.tsx`, `[*] packages/frontend/core/src/desktop/workbench-router.ts`, `[*] packages/frontend/core/src/components/root-app-sidebar/index.tsx`
- **Paso 3 (Implement):** Crear UI de Streaks con tarjetas de contadores en vivo por días/horas, modal de creación, selector de sonido/notificación, registrar ruta `/streaks` y añadir `<StreaksButton />` en la barra lateral con la etiqueta exacta `Streaks`.
- **Paso 5 (Commit):** `git commit -m "feat(streaks): add dedicated streaks section with live timers, sound alarms, and sidebar integration"`

---

### Fase 3: Supercharged Calendar v2 (`/calendar`)

#### Task 3.1: Pruebas Unitarias de Duración y Time-Blocking
- **Files:** `[+] packages/frontend/core/src/desktop/pages/workspace/calendar/__tests__/calendar-timeblock.spec.ts`
- **Paso 1 (Test):** Probar el cálculo de coordenadas verticales (`top`, `height`) según horas de inicio y fin, solapamientos y cálculo de duración.
- **Paso 2 (Verify Red):** Ejecutar vitest -> Debe fallar.

#### Task 3.2: Actualizar `calendar/index.tsx` con Capacidades Nivel Google Calendar
- **Files:** `[*] packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx`
- **Paso 3 (Implement):** Implementar renderizado de bloques de eventos proporcionales con hora de inicio/fin, selección de time-blocking por arrastre vertical de ratón, franja superior fija de eventos All-Day y mini-calendario mensual lateral para navegación rápida de fechas.
- **Paso 4 (Verify Green):** Ejecutar vitest -> Debe pasar.
- **Paso 5 (Commit):** `git commit -m "feat(calendar): upgrade to supercharged calendar v2 with visual time-blocking, all-day banner, and mini-navigator"`

---

### Fase 4: Biblioteca y Lector Anx-Remix Encapsulado (`/library`)

#### Task 4.1: Pruebas Unitarias del Almacén de Libros
- **Files:** `[+] packages/frontend/core/src/desktop/pages/workspace/library/__tests__/library-manager.spec.ts`
- **Paso 1 (Test):** Validar adición de libros, actualización de progreso de lectura (CFI y porcentaje), marcadores y notas.
- **Paso 2 (Verify Red):** Ejecutar vitest -> Debe fallar.

#### Task 4.2: Puente IPC de Electron para Almacenamiento Encapsulado
- **Files:** `[+] packages/frontend/apps/electron/src/main/library/index.ts`, `[*] packages/frontend/apps/electron/src/main/handlers.ts`
- **Paso 3 (Implement):** Implementar importación física de libros copiando archivos al directorio seguro de datos de la app `${userData}/library/books/`, lectura de archivos locales para el visor y eliminación de libros.

#### Task 4.3: Estantería de Libros y Visor Foliate-js en React
- **Files:** `[+] packages/frontend/core/src/desktop/pages/workspace/library/library-store.ts`, `[+] packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`, `[*] packages/frontend/core/src/desktop/workbench-router.ts`, `[*] packages/frontend/core/src/components/root-app-sidebar/index.tsx`, `[*] packages/frontend/apps/electron/scripts/manual-package.sh`
- **Paso 3 (Implement):** Construir la estantería visual (`Bookshelf`), visor inmersivo Foliate-js con temas (Light, Sepia, Dark, OLED), botón "Citar en Diario", registrar ruta `/library` y botón de Biblioteca en el sidebar.
- **Paso 4 (Verify Green):** Ejecutar vitest y compilar TypeScript con `yarn affine @affine/electron build`.
- **Paso 5 (Commit):** `git commit -m "feat(library): add encapsulated anx reader with bookshelf, foliate-js engine, and quote-to-journal bridge"`

---

### Fase 5: Verificación Integral & Reconstrucción de Flatpak

#### Task 5.1: Verificación de Todas las Suites de Tests
- Ejecutar `yarn vitest run --browser.headless` sobre todas las suites del proyecto.

#### Task 5.2: Compilación y Empaquetado del Flatpak
- Ejecutar `./build-flatpak.sh` para regenerar e instalar `app.affinite.Affinite` en el sistema.
- Validar apertura de Biblioteca, Calendario, Streaks con sonido y bloque `/habit` en la app instalada.
