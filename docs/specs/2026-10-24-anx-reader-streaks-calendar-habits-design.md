# Especificación de Diseño: AFFiNITe v0.30
## Anx-Remix Reader Encapsulado, Supercharged Calendar v2, Sección Dedicada Streaks & Bloque Interactivo `/habit`

> **Fecha:** 2026-10-24  
> **Estado:** Propuesta de Diseño Aprobada para Planificación  
> **Autores:** Rousseau & Antigravity  
> **Plataformas Objetivo:** Linux (Flatpak / Wayland / Hyprland), Windows, Android  

---

## 1. Resumen Ejecutivo & Objetivos

La versión **v0.30** de AFFiNITe consolida el salto hacia una suite de productividad y conocimiento integral:
1. **Biblioteca y Lector Anx-Remix (`/library`):** Integración completa del visor de lectura Foliate-js de Anx-Remix dentro del proceso Electron/Desktop de AFFiNITe, con almacenamiento encapsulado en el directorio de datos local (sin dependencias de WebDAV para sincronización interna) y extracción de citas hacia notas de BlockSuite.
2. **Supercharged Calendar v2 (`/calendar`):** Rediseño profundo del calendario con precisión horaria estilo Google Calendar (`startTime` a `endTime`), bloques visuales arrastrables, selección de time-blocking por clic y arrastre, franja de eventos de todo el día (*all-day*), mini-calendario lateral interactivo y capas con paletas de colores.
3. **Sección Dedicada `Streaks` (`/streaks`):** Nueva sección en la barra lateral llamada exactamente `Streaks` con contadores en tiempo real por días o por horas, barras de progreso dinámicas, alarmas sonoras nativas (Web Audio API) y notificaciones de escritorio.
4. **Bloque Interactivo `/habit` en Editor (Estilo Mermaid):** Transformación del comando `/habit` de una simple lista de verificación a un componente visual interactivo enriquecido en BlockSuite con selector de hábito, racha en vivo (`🔥`), check animado y minigráfico semanal.

---

## 2. Módulo 1: Biblioteca y Lector Encapsulado (`/library`)

### 2.1. Arquitectura de Almacenamiento & Eliminación de WebDAV
- **Almacenamiento Encapsulado:**
  - Al importar un libro (`.epub`, `.pdf`, `.mobi`, `.azw3`, `.fb2`, `.txt`), el archivo se copia físicamente al directorio seguro de datos de la app:
    `${userData}/library/books/${bookId}.${ext}`
  - Los metadatos de los libros, progreso de lectura (`currentCfi`), porcentaje completado (`0 - 100%`), marcadores y notas de lectura se persisten de forma reactiva en el documento raíz de Yjs del workspace (`affinite_library_v1`).
  - WebDAV queda completamente eliminado como mecanismo de carga/recarga; solo existirá una opción de exportación/backup manual externo si el usuario lo desea.

### 2.2. Motor de Lectura Foliate-js
- Integración de los scripts web de Foliate-js (`assets/foliate-js/` de Anx-Remix) como assets locales empaquetados en `resources/web-static/foliate-js/`.
- Componente `ReaderView`:
  - Contenedor que carga el visor con soporte completo de temas (Light, Sepia, Dark, OLED).
  - Control de tipografía, tamaño de texto, interlineado y márgenes.
  - Tabla de contenidos (Capítulos) y búsqueda en el texto del libro.
  - **Acción "Citar en Diario":** Menú contextual al seleccionar texto para enviar la cita a la Nota Diaria actual con enlace bidireccional (`affinite://reader?book=...&cfi=...`).

### 2.3. Navegación & Estantería (`Bookshelf`)
- Ruta: `/library` registrada en `workbench-router.ts`.
- Entrada en la barra lateral izquierda: Botón con ícono de libro y etiqueta `Biblioteca`.
- Vista de cuadrícula moderna con portadas, barras de progreso y botón de importación nativo.

---

## 3. Módulo 2: Supercharged Calendar v2 (`/calendar`)

Para equiparar o superar la experiencia de Google Calendar:

### 3.1. Time-Blocking con Duración Real
- **Estructura de Evento:**
  ```ts
  interface CalendarEvent {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    startTime?: string; // HH:mm (ej. "09:30")
    endTime?: string; // HH:mm (ej. "11:00")
    isAllDay?: boolean;
    category: 'Trabajo' | 'Estudio' | 'Personal' | 'Salud' | 'Proyectos' | 'Boards';
    color?: string;
    completed: boolean;
    notes?: string;
    boardCardId?: string;
  }
  ```
- **Renderizado Proporcional en Vistas Semana y Día:**
  - Cada evento con hora se posiciona en su franja horaria exacta:
    `top = (horaInicio - 6) * alturaHora + (minutoInicio / 60) * alturaHora`
    `height = (duraciónMinutos / 60) * alturaHora`
  - Se visualizan como tarjetas con color de borde, etiqueta y estado de completado.

### 3.2. Creación Interactiva por Arrastre
- En la cuadrícula de horas de Semana/Día, hacer clic en una hora y arrastrar hacia abajo calcula automáticamente `startTime` y `endTime`.
- Al soltar, se abre el diálogo de creación con las horas ya seleccionadas.

### 3.3. Barra de Todo el Día (*All-Day Banner*)
- Franja fija en la parte superior para eventos que no tienen hora asignada, festivos y tarjetas de tableros con fecha límite global.

### 3.4. Mini-Calendario Lateral
- En el lateral del planificador, un mini-calendario mensual permite saltar a cualquier fecha con un solo clic.

---

## 4. Módulo 3: Sección Dedicada `Streaks` (`/streaks`)

### 4.1. Ubicación & Navegación
- Ruta: `/streaks` en `workbench-router.ts`.
- Barra lateral izquierda: Botón exclusivo con ícono de llama y texto exacto **`Streaks`**.

### 4.2. Tipos de Contadores
1. **Modo Días (Metas y Retos Diarios):**
   - Objetivo en cantidad de días (ej. 30 días, 100 días).
   - Cuenta progresiva o regresiva de días y horas restantes.
2. **Modo Horas (Temporizadores de Sprints o Ayunos):**
   - Objetivo en cantidad de horas (ej. 16h, 24h, 48h).
   - Cuenta regresiva de alta precisión en tiempo real (horas, minutos, segundos).

### 4.3. Alertas & Notificaciones
- **Alarma Sonora:** Síntesis sonora mediante Web Audio API (`AudioContext`) generando tonos armónicos agradables al completarse la meta (sin dependencias de archivos de audio pesados).
- **Notificación de Escritorio:** Envío de notificación nativa en Linux (`org.freedesktop.Notifications`) y Electron alertando al usuario.
- **Celebración Visual:** Animación de logro alcanzado al cumplir el 100%.

---

## 5. Módulo 4: Bloque Interactivo `/habit` en el Editor (Estilo Mermaid)

### 5.1. Componente Enriquecido en BlockSuite
- El comando slash `/habit` o `/habits` (restringido a documentos Journal) ya no inserta una lista plana de texto.
- Inserta una tarjeta visual dedicada (estilo glassmorphism similar a `<mermaid-preview>`):
  - **Cabecera de la Tarjeta:** Insignia `🎯 Hábito`, nombre del hábito seleccionado y fecha objetivo.
  - **Selector Desplegable:** Permite cambiar el hábito asociado o crear uno nuevo sin salir del editor.
  - **Botón de Completado Interactivo:** Botón central táctil con animación de verificación que actualiza el estado en Yjs de forma inmediata.
  - **Indicador de Racha:** Muestra la racha actual (`🔥 15 días`).
  - **Minigráfico Semanal:** Fila interactiva con los 7 días de la semana (L M X J V S D) con estados de completado.
  - **Sincronización Contextual:** Si el bloque está en una nota de diario de fecha pasada, marcarlo registra el hábito para esa fecha específica.

---

## 6. Criterios de Aceptación & Verificación

1. **Biblioteca:**
   - Importar un archivo `.epub` guarda el archivo en el directorio local encapsulado y aparece en la estantería.
   - Al abrir el libro, Foliate-js lo renderiza fluidamente con tabla de contenidos y cambio de temas.
   - Seleccionar texto permite copiar la cita directamente con formato de nota de AFFiNITe.
2. **Calendario:**
   - Los eventos con hora se visualizan como bloques verticales proporcionales a su duración.
   - Arrastrar en la cuadrícula de horas permite crear un evento con hora de inicio y fin.
   - El mini-calendario lateral permite navegar fechas al instante.
3. **Streaks:**
   - La pestaña `Streaks` aparece en la barra lateral con su vista dedicada.
   - Se pueden crear contadores en días y en horas.
   - Al cumplirse la meta, suena la alerta sonora y se dispara la notificación del sistema.
4. **Bloque `/habit` en Editor:**
   - Escribir `/habit` en una Nota Diaria despliega el componente interactivo con su propia interfaz.
   - Hacer clic en el botón de completado conmuta el hábito y actualiza la racha visualmente.
5. **Calidad & Tests:**
   - Suites de pruebas unitarias cubriendo la lógica de biblioteca, calculadora de streaks y time-blocking.
   - Cero errores de TypeScript y compilación limpia de Electron y Flatpak.
