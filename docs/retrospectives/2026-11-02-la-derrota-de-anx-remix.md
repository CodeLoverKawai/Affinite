# La Odisea de Anx-Remix en AFFiNITe: Crónica de una Derrota con Honor (Post-Mortem 10 Días)

> *"No hay nada tan inútil como hacer con gran eficiencia algo que no debería haberse hecho en absoluto."*  
> — Peter Drucker

---

## 1. Prólogo: El Sueño Prometeico

Todo comenzó con una ambición noble y deslumbrante: convertir a **AFFiNITe** (fork avanzado de AFFiNE) no solo en un sistema operativo para el pensamiento, notas y gestión del conocimiento, sino en el **hogar definitivo de la lectura reflexiva**.

La visión:
- Una biblioteca integrada que alojara libros EPUB, PDF y documentos.
- Conexión orgánica con **Anx Reader**, un lector moderno, estético y rico en estadísticas.
- Capacidad de subrayar con paletas armoniosas, tomar notas marginales y exportar citas directamente al Diario/Journal de AFFiNE mediante un puente reactivo.
- Persistencia local-first sincronizada mediante **CRDTs (Yjs)** sin depender de servicios externos o nubes privativas.

Lo que parecía una integración de componentes terminó convirtiéndose en una guerra de trincheras entre tres paradigmas antagónicos: **React (Frontend Web)**, **Flutter (WebAssembly/CanvasKit)** y **Electron (Node.js/Chromium Runtime)**.

```mermaid
flowchart TD
    subgraph VisionOriginal["El Sueño Inicial"]
        AF[AFFiNITe Core] <--> |CRDT / Yjs| BR[Puente React]
        BR <--> |postMessage| AR[Anx Reader Flutter]
        AR <--> |Lectura| FL[Foliate-js Engine]
    end
    subgraph RealidadTecnica["La Realidad de los 10 Días"]
        E1[Race conditions de render] -.-> AR
        E2[Feedback Loops destructivos] -.-> BR
        E3[SQLite WASM & FakeDB] -.-> AR
        E4[Texto colapsado a 0px] -.-> FL
    end
```

---

## 2. Los Diez Días: Crónica Cronológica del Descenso al Abismo

### Días 1 al 3: La Ilusión del Prototipo y Foliate-js
*Commits clave: `1c62181`, `b92b9ff`, `fec0225`, `fc6c656`*

Comenzamos integrando **Foliate-js** en un iframe puro, creando un visualizador básico de libros con una barra lateral de herramientas.
- **Los primeros roces con la realidad**: El protocolo personalizado de Electron (`assets://`) bloqueaba los recursos por CORS; las fuentes no cargaban; el escalado tipográfico `font-size: 100%` en Foliate alteraba los ratios relativos del libro; el cajón de la tabla de contenidos (TOC) no se comunicaba con el host.
- **La solución temporal**: Se inyectaron parches de normalización de rutas y se ajustó el despachador de eventos. Parecía que todo avanzaba viento en popa.

---

### Días 4 al 6: La Fascinación por Flutter Web y la Trampa del Iframe
*Commits clave: `1e056e6`, `249ebca`, `054612f`, `aeb0785`, `cbfc7e4`*

Aquí ocurrió el punto de inflexión decisivo. En lugar de limitarse a un visor web ligero, surgió la tentación irresistible: *"¿Por qué conformarse con una interfaz web si podemos incrustar la app completa de Anx-Remix (escrita en Flutter) dentro de AFFiNITe?"*.
- Se configuró la compilación de **Anx-Remix Web** (`flutter build web --base-href /anx/`).
- Se montó un `<iframe>` apuntando a `assets://./anx/index.html`.
- Se diseñó el **Full Bridge Protocol**: intercambio continuo de libros, notas, tiempos de lectura, etiquetas y progreso mediante `window.postMessage`.

**Aparecieron los primeros síntomas del monstruo:**
1. **La Carrera de Referencia Temporal (TDZ)**: React renderizaba componentes antes de inicializar handlers, disparando `ReferenceError: Cannot access 'handleUpdateProgress' before initialization`.
2. **Desfase de Referencias Asíncronas**: Los mensajes que llegaban desde el iframe de Flutter leían estados obsoletos de React (`booksRef` vs `books`).
3. **Pérdida de foco y doble scroll**: Dos motores de eventos (el DOM de React y el Canvas de Flutter) compitiendo por el teclado y el cursor.

---

### Días 7 y 8: La Guerra Fría de los Datos y el Bucle de la Muerte
*Commits clave: `6e0d8f6`, `001b6d8`, `b471f5d`, `f7a0193`*

Cuando parecía que la interfaz se sostenía, estalló el problema más crítico: **la pérdida y corrupción de notas**.

```mermaid
sequenceDiagram
    participant Flutter as Anx-Remix (Flutter Web)
    participant Host as React Host (AFFiNITe)
    participant Yjs as Yjs CRDT Doc

    Flutter->>Host: postMessage(anx-update-progress / anx-sync-notes)
    Host->>Yjs: Actualiza Map Yjs
    Yjs-->>Host: yMap.observe() se dispara
    Note over Host: Sin control de origen, cree que es un cambio externo
    Host->>Flutter: postMessage(anx-full-sync)
    Note over Flutter: Flutter recibe sync total, recarga DB y limpia sesión
    Flutter->>Host: postMessage(anx-sync-notes con array vacío)
    Host->>Yjs: Borra las notas de Yjs (Destrucción total)
```

Para intentar erradicar esto:
1. **Migración a Monorepo (`packages/frontend/apps/anx-remix`)**: Trajimos los 3,200 archivos de Flutter al monorepo para tener control milimétrico sobre el código.
2. **Inyección de SQLite WASM Real**: Descubrimos que Flutter Web estaba usando `WebFakeDatabase`, un mock en memoria que tiraba las consultas complejas a la basura. Introdujimos `sqflite_common_ffi_web`, `sqlite3.wasm` y el Service Worker `sqflite_sw.js` para persistir en IndexedDB.
3. **Semáforo `isOriginAnxRef`**: Implementamos banderas en React para romper el bucle infinito de postMessage.

---

### Día 9: El Asalto de los 10 Subagentes Autónomos
*Commits clave: `45e8ff4`, `c72d545`, `7b1e6bb`, `73d1369`*

Aplicando el paradigma de **Subagent-Driven Development (SDD)** con rigor absoluto, desplegamos un ejército de agentes paralelos:
- **Task 1**: Migración limpia del monorepo y configuración de Yarn workspaces.
- **Task 2**: Implementación de `sqlite3.wasm` y eliminación de DAOs mockeados.
- **Task 3**: Refactorización del puente React y aislamiento de listeners Yjs.
- **Task 4**: Empaquetado en Electron y verificación en Linux.
- **Reviewers dedicados**: Cada tarea fue evaluada por un revisor senior independiente con diffs formales.

El plan se ejecutó al 100%. Todos los tests pasaban en verde (35/35). La arquitectura en papel era intachable.

---

### Día 10: La Rebelión del DOM y la Derrota Final
*Commits clave: `ef87bd1`, `bf2240a`, `7bdd87a`, `f76153c`, `5c0007a`*

A pesar de tener SQLite WASM y sincronización blindada, la experiencia de usuario se tornó una pesadilla kafkiana:
1. **Los marcadores y notas no se pintaban en los libros**: El log de diagnóstico arrojaba auditorías implacables:
   `Auditoría detectó 1 error(es) y 23 advertencia(s): totalNotes: 24, invalidColorCount: 24`.
2. **El "Enfoque A"**: Decidimos que Flutter solo mostrara la estantería y que al abrir un libro, React interceptara el evento y montara directamente el lector Foliate.
3. **El Síndrome de las Letras Invisibles**: El usuario abrió el libro y... **las letras desaparecieron**.  
   *Causa*: Foliate asumía `pageTurnStyle: 'scroll'` sin columna definida, calculando un ancho de `0px` e inyectando `body { max-width: 0px !important }`. Todo el libro quedó aplastado en una línea de 0 píxeles.
4. **El Golpe de Gracia**: Al corregir el paginador a modo `slide`, la pantalla crasheó con:
   `ReferenceError: useMemo is not defined at LibraryReader`.
5. **El veredicto del usuario**:
   > *"SAbes que elimina a anx del proyecto ya llevo mas de dos semanas sin progresos, simplemente eliminada todo lo relacionado con eso."*

---

## 3. Matriz de Lecciones Aprendidas (Deontología de Software)

| Ilusión / Suposición Inicial | Realidad Descubierta en Combate | Lección para el Futuro |
|---|---|---|
| *"Incrustar Flutter Web en un iframe dentro de Electron es viable."* | Dos runtimes gráficos pesados con hilos separados devoran memoria, generan carreras de foco y desincronizan el bucle de eventos. | **No mezclar frameworks de renderizado heterogéneos** a través de iframes si requieren sincronización bidireccional continua. |
| *"Un puente postMessage basta para mantener sincronizados dos estados."* | En sistemas distribuidos locales (React + Flutter), un canal asíncrono sin timestamps vectoriales o IDs de transacción genera bucles de retroalimentación destructivos de forma inevitable. | Si se requiere sincronización profunda, el estado debe residir en una **única fuente de verdad** (Single Source of Truth), no en dos bases de datos replicadas a ciegas. |
| *"Si le agregamos WASM SQLite a Flutter Web se resolverá la persistencia."* | La capa de serialización sobre Service Workers añadió complejidad innecesaria a un problema que el proceso de Node.js ya resolvía de forma nativa. | **Evitar la sobreingeniería**: no usar puentes WASM web dentro de Electron cuando se tiene acceso directo al sistema de archivos local (`fs`). |
| *"La perseverancia infinita siempre triunfa en programación."* | Caer en la **Falacia del Costo Hundido** (*Sunk Cost Fallacy*): seguir parcheando un diseño defectuoso durante semanas en lugar de cortarlo de raíz. | **Saber soltar y podar**: El coraje de un ingeniero también reside en saber eliminar código con prontitud cuando la arquitectura no responde. |

---

## 4. El Vaciado y la Liberación del Sistema

La orden fue ejecutada con precisión quirúrgica:

```
3307 files changed, 46 insertions(+), 313,803 deletions(-)
```

### El Antes vs El Después

| Métrica | Con Anx-Remix / Biblioteca | Tras la Purga Radical | Impacto |
|---|---|---|---|
| **Líneas de Código** | +313,000 líneas extrañas (Dart, C++, C#, Kotlin) | Limpio, 100% TypeScript / Rust | **-313,803 líneas** |
| **Tamaño `app.asar`** | 244 MB | 142 MB | **-102 MB (-42% de peso)** |
| **Tiempo de arranque Flatpak** | ~3.5 s (cargando runtime Flutter + WASM) | ~0.6 s (`main window is ready to show`) | **5.8x más rápido** |
| **Estabilidad de la app** | Propensa a ReferenceErrors y bucles de sincronización | Cero procesos bloqueados | **Paz mental garantizada** |

---

## 5. Epílogo: El Valor de lo que Permanece

Aunque la Biblioteca y Anx fueron derrotados y extirpados, los últimos 10 días no fueron tiempo perdido. Durante esta misma campaña construimos los módulos más estables, útiles y celebrados de AFFiNITe:
1. **Streaks & Pomodoro Alarms**: Sistema de rachas con cronómetros en vivo, sonidos y widgets en la barra lateral.
2. **Supercharged Calendar v2**: Bloques de tiempo visuales, banner de todo el día y navegación temporal fluida.
3. **Interactive Habit Block**: Bloque de hábitos dentro del lienzo de notas con checkboxes directos y cinta semanal.

AFFiNITe emerge de esta odisea más rápido, más liviano, con un código base limpio y con la convicción de que **la simplicidad arquitectónica siempre gana a la ambición desmedida**.

> *R.I.P. Anx-Remix en AFFiNITe (Octubre 2026 – Noviembre 2026).*  
> *Luchaste con valor, pero el DOM siempre gana.*
