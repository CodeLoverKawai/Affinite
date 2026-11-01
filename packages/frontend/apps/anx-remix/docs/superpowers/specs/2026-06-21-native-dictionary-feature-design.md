# Diseño de Funcionalidad de Diccionario Nativo (MDict y Wiktionary Fallback)

Implementar una funcionalidad de diccionario nativo en ANX Reader que soporte la importación de archivos de diccionario en formato MDict (`.mdx`), permita la consulta offline/online en un panel inferior deslizante (bottom sheet), y solucione el problema de despliegue del menú contextual al seleccionar una sola palabra.

## Requisitos de Usuario

1. **Soporte de Diccionarios Locales (Offline)**: Permitir importar y consultar archivos de diccionario MDict (`.mdx`) usando el paquete de Dart `dict_reader`.
2. **Administración de Ajustes**: Crear una página de configuración de diccionarios para importar, habilitar/deshabilitar y eliminar archivos `.mdx`.
3. **Persistencia**: Almacenar la configuración y metadatos de los archivos importados en una base de datos local SQLite (Tabla `tb_dictionaries`, requiriendo actualizar la versión de base de datos a `8`).
4. **Fallback Online**: Si no hay diccionarios locales activos o no se encuentra la palabra, consultar la API REST de Wiktionary usando el idioma del libro (con inglés como fallback general).
5. **Solución del Menú de Selección**: Asegurar que el menú de selección (con la opción de "Diccionario") aparezca inmediatamente al seleccionar una sola palabra en entornos táctiles (Android) y de escritorio (Linux).

---

## 1. Esquema de Base de Datos y Migración

Incrementamos la versión de la base de datos de `7` a `8`.

### Tabla `tb_dictionaries`
```sql
CREATE TABLE tb_dictionaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
```

### Rutas de Migración
En `lib/dao/database.dart`:
* Modificar la variable `currentDbVersion` a `8`.
* En la función `onUpgrade`, añadir el caso `case 7:`, que ejecuta el comando SQL de creación de la tabla `tb_dictionaries`.

### Modelo de Datos (`lib/models/dictionary.dart`)
Una clase `DictionaryModel` con propiedades:
* `id` (int?)
* `name` (String)
* `path` (String)
* `isActive` (bool)
* `createdAt` (DateTime)

### Data Access Object (`lib/dao/dictionary.dart`)
Clase `DictionaryDao` para administrar consultas:
* `Future<int> insert(DictionaryModel dictionary)`
* `Future<void> update(DictionaryModel dictionary)`
* `Future<void> delete(int id)`
* `Future<List<DictionaryModel>> selectAll()`
* `Future<DictionaryModel?> getActive()`
* `Future<void> setActive(int id)`: Pone como activo el diccionario seleccionado y desactiva todos los demás.

---

## 2. Servidor de Diccionarios (`lib/service/dictionary/dictionary_service.dart`)

Un servicio Singleton (`DictionaryService`) encargado de la lógica y la memoria intermedia:

* **Propiedades**:
  * `DictReader? _cachedReader`: Instancia activa de `DictReader` cargada en memoria.
  * `int? _cachedDictionaryId`: ID de base de datos del diccionario actualmente en caché.
* **Flujo de Consulta (`lookup`)**:
  1. Limpiar y normalizar la palabra (remover espacios adicionales, convertir a minúsculas).
  2. Buscar en base de datos si existe algún diccionario local marcado como `is_active`.
  3. Si existe y su ID difiere de `_cachedDictionaryId` (o `_cachedReader` es nulo):
     * Cerrar y liberar el lector anterior.
     * Inicializar un nuevo `DictReader` apuntando a la ruta del archivo local.
     * Guardar la referencia en caché.
  4. Realizar la consulta en el lector. Si se encuentra la definición, retornar el texto HTML.
  5. Si no hay diccionario activo o la consulta no retorna resultados, realizar fallback a Wiktionary.

### API REST de Wiktionary
Se consulta la URL:
`https://{lang}.wiktionary.org/api/rest_v1/page/definition/{word}`

Donde `{lang}` se obtiene del idioma del libro activo (e.g., `'es'`, `'en'`, `'fr'`).
* **Respuesta**: Se parsea la lista de definiciones y ejemplos de uso por cada categoría gramatical (partOfSpeech) y se formatea dinámicamente como un bloque HTML estructurado con CSS básico para su renderización con `flutter_html`.

---

## 3. UI - Subpágina de Configuración del Diccionario

Ubicación: `lib/page/settings_page/subpage/dictionary_settings.dart`
* **Importación**: Permite seleccionar un archivo `.mdx` local mediante `file_picker`.
  * Copia el archivo físico al directorio de documentos interno seguro del sistema para evitar pérdidas.
  * Agrega el registro correspondiente en la tabla `tb_dictionaries`.
* **Administración**:
  * Muestra una lista de todos los diccionarios importados.
  * Permite cambiar el diccionario activo usando un interruptor o botón de tipo radio (solo un diccionario activo a la vez).
  * Permite eliminar diccionarios (borra el registro en SQLite y el archivo físico en el almacenamiento interno de la app).

---

## 4. Solución en el Lector y Menú de Selección

### Modificaciones en Foliate-JS (`assets/foliate-js/src/book.js`)
* **Soporte Escritorio (Linux)**: Modificar el bloque de condiciones de plataformas para incluir `Linux` (no móvil) como entorno de escritorio clásico, escuchando eventos de `pointerup` para desplegar el menú inmediatamente al finalizar una selección con ratón.
* **Soporte Android (Una palabra)**: Añadir un detector del evento `selectionchange` debanado (debounced) a 600ms en el bloque de Android. Si hay una selección activa (no vacía), este llamará a `handleSelection` para notificar a Flutter y abrir el menú flotante, superando la restricción previa de requerir movimientos de controles de selección nativos.
* **Compilación**: Ejecutar `npm run build` en el directorio de `foliate-js` para empaquetar los cambios en el archivo `bundle.js`.

### Integración en Flutter
* **Opción en Menú**: Agregar el botón "Diccionario" en `lib/widgets/context_menu/excerpt_menu.dart`.
* **Panel Inferior (Bottom Sheet)**:
  * Mostrar un panel deslizable inferior (`showModalBottomSheet`) al pulsar el botón.
  * Mientras carga la consulta, mostrar un spinner.
  * Al completarse, renderizar el resultado HTML usando `flutter_html`.

---

## Plan de Verificación

1. **Compilación de Localización y Dependencias**:
   * Añadir la dependencia en `pubspec.yaml`.
   * Ejecutar `flutter pub get` y regenerar traducciones con `flutter gen-l10n`.
2. **Prueba de Configuración**:
   * Navegar a Configuración -> Diccionario.
   * Importar un archivo `.mdx` de prueba y verificar que se copia correctamente.
   * Alternar el estado activo y eliminar registros.
3. **Prueba en Lector (Linux y Android)**:
   * Seleccionar una sola palabra en el lector.
   * Comprobar que el menú contextual se despliega al instante.
   * Presionar "Diccionario" y verificar la correcta visualización de la definición en el Bottom Sheet, tanto para diccionarios locales `.mdx` como para el fallback de Wiktionary con ejemplos de uso.
