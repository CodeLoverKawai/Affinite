# Anx Remix: Plan de Expansión Futuro y Evaluación Técnica

Este documento detalla el plan de desarrollo de las futuras características del proyecto **Anx Remix** (la bifurcación mejorada de *ANX Reader*), evaluando su viabilidad, la arquitectura propuesta y el impacto de cada componente.

---

## 1. Integración de VPN Local (Tailscale / Zero-Trust)
* **Objetivo**: Garantizar que Anx Remix (en formato AppImage en Linux o como app en Android) tenga acceso automático a servicios privados (servidor de sincronización WebDAV local, servidores de IA locales como Ollama, etc.) mediante conexiones cifradas de confianza cero al arrancar.

### Evaluación y Arquitectura Técnica
* **El Desafío de Privilegios**: Levantar una interfaz de red VPN típica (`tun/tap`) requiere privilegios de superusuario (root) en Linux y solicitar permisos de sistema en Android. Esto perjudica la experiencia de usuario portable (AppImage).
* **Solución Propuesta: Userspace Networking (`tsnet`)**:
  * **Qué es**: Tailscale proporciona una biblioteca en Go llamada `tsnet` que permite empotrar un nodo de Tailscale directamente dentro de un binario sin requerir privilegios de root ni crear una interfaz de red virtual a nivel de sistema operativo.
  * **Linux (AppImage)**: Podemos escribir un pequeño servicio/puente en Go o C que utilice `tsnet` y exporte un socket proxy SOCKS5/HTTP local. La app en Flutter simplemente redirige sus peticiones HTTP (WebDAV, APIs de IA) a través de este proxy local.
  * **Android**: Se puede compilar la biblioteca de Tailscale en Go para Android usando `gomobile` y cargarla mediante JNI. Esto permite conectar la app a la vpn local de forma aislada, sin interferir con la VPN global del sistema del usuario.
* **Alternativa Simple**: Permitir al usuario configurar un perfil WireGuard (.conf) dentro de la app y utilizar una biblioteca cliente WireGuard pura en Dart/Kotlin para levantar un túnel a nivel de aplicación (userspace).

---

## 2. Sincronización WebDAV Expandida (Ajustes y Diccionarios)
* **Objetivo**: Extender el sistema WebDAV actual para que respalde no solo el progreso de lectura, sino también las preferencias visuales personalizadas (como los estilos/colores de subrayado del narrador TTS) y los diccionarios físicos importados (.mdx).

### Evaluación y Arquitectura Técnica
* **Sincronización de Preferencias (Muy Viable)**:
  * Los ajustes personalizados (colores, opacidades, fuentes, configuración de API de IA) se serializan a un archivo JSON ligero (e.g., `remix_settings.json`).
  * Al sincronizar, la app sube este JSON a una ruta reservada en el servidor WebDAV (e.g., `/anx_remix/config/settings.json`).
  * En caso de conflicto de fechas, se utiliza una estrategia de "el último cambio gana" o combinación de campos no conflictivos.
* **Sincronización de Diccionarios .mdx (Desafío de Rendimiento)**:
  * Los archivos de diccionario `.mdx` son binarios y frecuentemente pesan más de 50-100 MB. Subirlos o descargarlos en cada inicio congelaría la aplicación.
  * **Solución Propuesta: Manifiesto de Sincronización (`dictionaries.json`)**:
    1. En lugar de subir el archivo `.mdx` completo a ciegas, la app gestiona un archivo de manifiesto `/anx_remix/dictionaries/manifest.json` en WebDAV que contiene metadatos de los diccionarios activos: nombre, tamaño, fecha de modificación y hash MD5.
    2. Cuando se añade un nuevo diccionario localmente, se sube a `/anx_remix/dictionaries/[md5].mdx` solo si no existe ya en el servidor (verificado por el hash).
    3. Si otro dispositivo detecta en el manifiesto que falta un diccionario localmente, la descarga se realiza **en segundo plano** con una notificación de progreso, permitiendo al usuario seguir leyendo y usando el diccionario online (Wiktionary) de respaldo mientras finaliza.

---

## 3. Integración de IA Local (Ollama / Odysseus)
* **Objetivo**: Sustituir el backend de IA propietario (OpenAI/Copilot) por motores de inferencia locales ejecutándose en el dispositivo del usuario o en su red local, proporcionando total privacidad y offline total.

### Evaluación y Arquitectura Técnica
* **Endpoint de IA Unificado y Compatible con OpenAI**:
  * La mayoría de herramientas locales de IA (como Ollama, Llama.cpp, LM Studio, Odysseus) exponen APIs REST compatibles con la especificación de OpenAI (e.g., el endpoint `/v1/chat/completions`).
  * **Implementación en la App**:
    1. Añadir un proveedor de IA llamado "IA Local / Personalizada".
    2. Permitir configurar el **Base URL** (por defecto `http://localhost:11434/v1` para Ollama o la IP de la red de Tailscale).
    3. Permitir configurar el **Model Name** (e.g., `llama3`, `mistral`, `phi3`, `qwen2`).
    4. Permitir configurar el **API Key** (vacío por defecto, usado si el proxy local requiere autenticación).
  * Esta arquitectura de configuración genérica da soporte inmediato a Ollama, Odysseus y cualquier otro servidor compatible sin tener que escribir código específico para cada uno.

---

## 4. Rebranding: de "Anx Reader" a "Anx Remix"
* **Objetivo**: Consolidar la identidad visual del fork personalizado como un "hijo" o versión modificada ("Remix") de ANX Reader.
* **Estado de la Implementación**:
  * [x] Modificado el título de la aplicación en el punto de entrada principal (`lib/main.dart`).
  * [x] Modificado el nombre del gestor de ventanas de escritorio (`lib/utils/window_position_validator.dart`).
  * [x] Actualizados los archivos de localización ARB en Inglés (`lib/l10n/app_en.arb`) y Español (`lib/l10n/app_es.arb`).
  * [x] Actualizados los nombres de visualización para la compilación de Android (`android/app/src/main/res/values/strings.xml` y `values-zh/strings.xml`).
  * [x] Actualizado el nombre del bundle display para iOS (`ios/Runner.xcodeproj/project.pbxproj`).
  * [x] Modificado el título del WebView embebido (`assets/foliate-js/index.html`).
  * [x] Regenerados los bindings de traducción mediante `flutter gen-l10n`.
