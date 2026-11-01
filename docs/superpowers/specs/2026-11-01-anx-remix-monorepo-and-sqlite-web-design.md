# Especificación de Diseño: Monorepo Anx-Remix & Motor SQLite Web

> **Fecha:** 1 de Noviembre, 2026  
> **Estado:** Aprobado para Planificación  
> **Área:** Biblioteca Digital, Arquitectura Monorepo, Base de Datos Web, Foliate Reader  
> **Objetivo:** Trasladar Anx-Remix al monorepo de AFFiNITe y sustituir los mocks frágiles en memoria por SQLite Web real (`sqflite_common_ffi_web`) para garantizar persistencia robusta de notas, progreso y estadísticas.

---

## 1. Motivación y Diagnóstico de Fallos

### 1.1. Problemas Identificados
1. **Desacoplamiento de Repositorios:** Anx-Remix se encuentra actualmente en un repositorio externo (`~/Documents/GitHub/Anx-Remix`), lo que complica el control de versiones, la integración continua y el empaquetado unificado de AFFiNITe.
2. **Falsos Mocks en Base de Datos (`WebFakeDatabase`):** Al compilar para Web, Anx-Remix recurría a un mock con `noSuchMethod` que devolvía listas vacías y 0 a la mayoría de llamadas SQL. Aunque se crearon listas en memoria para algunas entidades, las estadísticas complejas (agregaciones semanales, mensuales y de por vida) devolvían listas vacías para prevenir caídas de la interfaz, dejando las pantallas en blanco.
3. **Bucle de Rebote y Pérdida de Datos en el Puente:** Cuando Anx notificaba cambios en notas o progreso a React, React actualizaba el mapa Yjs (`affinite_library_v1`). El observador de Yjs disparaba un re-render que volvía a enviar `anx-full-sync` hacia Flutter, invalidando los estados de Riverpod en caliente y generando condiciones de carrera que destruían notas recién creadas o reiniciaban el CFI de lectura.
4. **Inconsistencias en Identificadores:** El cálculo de IDs numéricos para libros mediante hashing de cadenas difería entre JavaScript y Dart, provocando discrepancias de asociación entre notas y libros.

---

## 2. Arquitectura Propuesta

```
+---------------------------------------------------------------------------------------+
|                                    AFFiNITe Monorepo                                  |
|                                                                                       |
|  packages/frontend/apps/anx-remix/ (Flutter Web + Dart)                              |
|  +---------------------------------------------------------------------------------+  |
|  |  UI: Bookshelf, Estadísticas, Temas, Foliate Reader                              |  |
|  |  Motor DB: sqflite_common_ffi_web (SQLite3 compilado a WebAssembly en IndexedDB) |  |
|  |  - Consultas nativas: tb_books, tb_notes, tb_reading_time, tb_groups, tb_styles    |  |
|  |  - Persistencia 100% confiable y autónoma dentro del navegador / WebView         |  |
|  +---------------------------------------------------------------------------------+  |
|                                           ▲                                           |
|                                           │ postMessage (Acciones específicas)        |
|                                           ▼                                           |
|  packages/frontend/core/src/desktop/pages/workspace/library/index.tsx (React)       |
|  +---------------------------------------------------------------------------------+  |
|  |  - Importador de archivos nativo de Electron (dialog -> assets://local-file/)   |  |
|  |  - Sincronización Yjs como respaldo y puente a Diario / Documentos AFFiNITe       |  |
|  |  - Control de debounce sin bucles de rebote destructivos                           |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

### 2.1. Ubicación en el Monorepo
- **Ruta de destino:** `packages/frontend/apps/anx-remix/`
- **Integración con Yarn Workspaces:** Se incluirá un `package.json` ligero para permitir comandos homogéneos como:
  ```json
  {
    "name": "@affine/anx-remix",
    "version": "0.29.5",
    "private": true,
    "scripts": {
      "build": "flutter build web --no-pub --base-href /anx/",
      "analyze": "flutter analyze"
    }
  }
  ```
- **Scripts de empaquetado actualizados:**
  - `packages/frontend/apps/electron/scripts/generate-assets.ts`
  - `packages/frontend/apps/electron/scripts/manual-package.sh`
  - `build-flatpak.sh`
  Todos apuntarán a la ruta local interna del proyecto (`packages/frontend/apps/anx-remix/build/web`) en lugar de paths absolutos externos.

### 2.2. Motor de Base de Datos Nativo en Web (`sqflite_common_ffi_web`)
- Se integra la biblioteca estándar `sqflite_common_ffi_web` en `pubspec.yaml`.
- En `lib/dao/database.dart`:
  ```dart
  if (AnxPlatform.isWeb) {
    databaseFactory = databaseFactoryFfiWeb;
  }
  ```
- Se copian los binarios `sqlite3.wasm` correspondientes al directorio `web/` de Anx-Remix.
- **Resultado:** Las consultas SQL originales de Anx-Remix (`SUM(reading_time) GROUP BY day`, `DATE(date)`, selects de notas, marcadores, configuración y estilos) se ejecutan contra SQLite real en IndexedDB del navegador. Se eliminan los hacks de `WebFakeDatabase` y los fallos de lectura/escritura.

### 2.3. Estabilización del Puente Bidireccional
- **Separación de responsabilidades:**
  - Anx-Remix es el dueño primario de su base de datos de lectura (notas, tiempos y configuración).
  - React solo envía el catálogo inicial o actualizaciones de libros nuevos importados mediante Electron.
  - Se implementa un filtro de origen y debounce estricto para evitar que un evento de guardado recibido en React rebote de vuelta a Flutter como un `full-sync` que reinicie los providers.
  - La sincronización hacia Yjs se conserva como respaldo de seguridad y para permitir las acciones nativas de AFFiNITe:
    - **Cita al Diario:** Se guarda en la nota diaria del día.
    - **Exportar a Documento:** Crea una página BlockSuite con el resumen de notas.
    - **IA Antigravity:** Responde a consultas del lector con el motor local.

---

## 3. Plan de Ejecución Paso a Paso

### Fase 1: Migración al Monorepo
1. Copiar de forma segura todo el árbol de código de `/home/rousseau/Documents/GitHub/Anx-Remix` a `packages/frontend/apps/anx-remix/`.
2. Crear `package.json` en `packages/frontend/apps/anx-remix/`.
3. Actualizar `generate-assets.ts` y `manual-package.sh` para usar la ruta interna relativa.
4. Verificar que `yarn affine @affine/anx-remix build` compile correctamente en su nueva ubicación.

### Fase 2: Implementación de SQLite Web
1. Añadir `sqflite_common_ffi_web` a `pubspec.yaml` y descargar dependencias / wasm.
2. Configurar la inicialización de `databaseFactoryFfiWeb` en `database.dart` y retirar el bypass destructivo de `WebFakeDatabase`.
3. Probar que las tablas (`tb_books`, `tb_notes`, `tb_reading_time`, etc.) se inicializan y persisten en IndexedDB.

### Fase 3: Estabilización del Puente React ↔ Flutter
1. En `packages/frontend/core/src/desktop/pages/workspace/library/index.tsx`, refactorizar la recepción de eventos para no emitir `sendFullSyncToAnx` como respuesta refleja a eventos originados en Anx.
2. Garantizar que los identificadores de libros se sincronicen de forma determinista entre React y Flutter.
3. Ejecutar pruebas unitarias de `library-manager.spec.ts`.

### Fase 4: Verificación Empírica
1. Compilar el bundle web de Anx-Remix.
2. Ejecutar la app y verificar:
   - Importar un libro y abrirlo.
   - Crear notas y subrayados de distintos colores; reiniciar la app y comprobar que persisten.
   - Navegar por el libro, pasar páginas y cerrar; comprobar que el porcentaje y CFI se conservan exactamente donde se dejó.
   - Abrir la pestaña de Estadísticas y comprobar que las gráficas y tiempos de lectura se muestran con datos reales y sin errores.
