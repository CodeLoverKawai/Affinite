# Anx Remix: Documentación de Lanzamientos (Releases)

Este documento centraliza el control de versiones y los detalles de los lanzamientos (releases) de **Anx Remix**, un fork optimizado e independiente de *ANX Reader*.

## Historial de Lanzamientos

- [v1.15.2 (Lanzamiento Inicial Remix)](file:///home/rousseau/Documents/GitHub/Anx-Remix/docs/releases/v1.15.2/README.md) - Primera versión oficial compilada, independiente y optimizada.

---

## Características Core de Anx Remix (Frente a ANX Reader Base)

| Característica | Proyecto Base (ANX Reader) | Anx Remix (Nuestro Proyecto) |
| :--- | :--- | :--- |
| **Resaltado de Narrador TTS** | Color y opacidad estáticos y cableados en el código (`#39c5bc83`). Sin opción de personalización. | **Totalmente personalizable**. Ajuste dinámico de color mediante selector de color e intensidad de opacidad (0% - 100%) mediante control deslizante (Slider) en Ajustes. |
| **Diccionario Nativo Offline** | No tiene soporte para diccionarios locales ni offline. | **Soporte completo para MDict (`.mdx`)**. Importación física, gestión de múltiples archivos y almacenamiento seguro en el directorio de la aplicación. |
| **Búsqueda Inteligente (Stemming)** | No aplica. | **Algoritmo de conjugación y flexión**. Si una palabra no se encuentra (ej. "thinking"), busca automáticamente formas base ("think") en el diccionario. |
| **Resolución de Redirecciones** | No aplica. | **Soporte recursivo de redirecciones (`@@@LINK=`)** hasta 5 niveles para evitar definiciones vacías en diccionarios complejos. |
| **Búsqueda Online de Respaldo** | No aplica. | **Cliente REST API de Wiktionary** integrado. Filtra automáticamente las definiciones según el idioma del libro actual y ofrece inglés como respaldo. |
| **Menú Contextual (Un solo clic)** | Error conocido en Linux y Android donde al seleccionar una sola palabra no siempre se despliega el menú contextual del lector. | **Corrección del Bridge JS (Foliate)**. Eventos personalizados (`pointerup` y `selectionchange` con debounce) para forzar la aparición del menú al tocar una sola palabra. |
| **Navegación Interactiva** | No aplica. | **Enlaces interactivos en la definición**. Al tocar cualquier palabra con enlace (`entry://`) en el panel inferior, realiza una búsqueda recursiva inmediata en caliente. |
| **Identidad Visual / Rebranding** | Identificado como "ANX Reader" de manera genérica. | **Rebranded a "Anx Remix"**. Personalizado en las pantallas, barra de títulos de escritorio (Linux), recursos XML nativos de Android, Info.plist de iOS, y archivos de traducción (ARB). |

---

## Compilación y Despliegue de Releases
Los lanzamientos se gestionan mediante scripts automatizados locales:
- [run_release.sh](file:///home/rousseau/Documents/GitHub/Anx-Remix/run_release.sh): Automatiza el incremento de versión, el etiquetado y los commits locales.
- [build_apk.sh](file:///home/rousseau/Documents/GitHub/Anx-Remix/scripts/build_apk.sh): Genera los instaladores de Android compilados e independientes.
- [build_appimage.sh](file:///home/rousseau/Documents/GitHub/Anx-Remix/scripts/build_appimage.sh): Genera el ejecutable portable AppImage para sistemas Linux.
