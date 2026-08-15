<div align="center">

<img src="packages/frontend/apps/electron/resources/icons/icon_stable_512x512.png" width="128" height="128" alt="AFFiNITe Logo" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);" />

<h1 style="border-bottom: none; margin-top: 16px;">
    <b>AFFiNITe</b><br />
    <span>Local-First Knowledge, Canvas & Project Boards Workspace</span>
</h1>

<p align="center">
  <b>El espacio de trabajo autónomo, privado y de alto rendimiento que fusiona documentos en bloques, pizarras infinitas y tableros Kanban nativos con sincronización CRDT y modelos de IA locales.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.27.1-blue.svg?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/platform-Linux%20%7C%20Android%20%7C%20Web%20%7C%20Docker-orange.svg?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/local--first-CRDT%20%2B%20SQLite-purple.svg?style=flat-square" alt="Local First" />
  <img src="https://img.shields.io/badge/AI-Ollama%20%2B%20MCP-black.svg?style=flat-square" alt="AI Engine" />
</p>

</div>

---

## 🌟 ¿Qué es AFFiNITe?

**AFFiNITe** es un ecosistema de productividad y gestión del conocimiento de nueva generación diseñado bajo la filosofía **Local-First**. Tus datos residen primero en tu disco duro (SQLite local y memoria CRDT) garantizando velocidad instantánea, soberanía absoluta de datos y funcionamiento sin conexión a internet.

AFFiNITe combina en una sola aplicación fluida:
1. **Editor Hiper-Fusionado**: Documentos modulares en bloques que se transforman en pizarras infinitas (*Edgeless Canvas*) con un solo clic.
2. **Tableros de Proyectos Nativos (`/boards`)**: Sistema Kanban con estética glassmórfica, fondos dinámicos y persistencia directa en el workspace sin requerir bases de datos o servicios externos.
3. **Inteligencia Artificial Local & Privada**: Conexión nativa con **Ollama** (`host.docker.internal:11434`) y **Model Context Protocol (MCP)**, permitiendo consultar LLMs locales sin enviar información confidencial a servidores de terceros.
4. **Suite Completa de PDF**: Visor WebAssembly de alto desempeño (PDFium) y motor de exportación vectorial con soporte para tablas de datos, fórmulas LaTeX y resiliencia 100% offline.

---

## 🚀 Características Principales

### 📋 1. Tableros de Proyectos Nativos (*Project Boards*)
- **Kanban Integrado sin Contenedores**: Tableros organizados en listas, tarjetas con fechas límite, etiquetas y estados directamente almacenados en el árbol CRDT/Yjs.
- **Estética Glassmórfica & Fondos Dinámicos**: Selector visual de fondos de pantalla con transparencias, desenfoques en tiempo real y soporte responsivo móvil/escritorio.
- **Interacción Fluida**: Arrastrar y soltar (*drag & drop*) de tarjetas y columnas con soporte táctil optimizado.

### 📝 2. Canvas & Editor de Documentos Multimodal
- **Bloques Vivos**: Párrafos, encabezados, listas jerárquicas, llamadas destacadas (*callouts*), código con resaltado de sintaxis, fórmulas LaTeX y tablas de bases de datos.
- **Pizarra Infinita (Edgeless Mode)**: Dibuja, conecta notas con conectores inteligentes, inserta marcos, formas vectoriales e imágenes en un lienzo infinito.
- **Exportación Versátil**: Exporta tus notas y pizarras a PDF estructurado, Markdown, HTML o imágenes PNG de alta resolución.

### 🤖 3. Ecosistema de IA Híbrida (Local + Cloud + MCP)
- **Ollama Nativo**: Compatible de fábrica con cualquier modelo de código abierto (`llama3`, `qwen`, `mistral`, `deepseek-r1`) corriendo en tu máquina o servidor local.
- **Model Context Protocol (MCP)**: Conecta herramientas del sistema de archivos, terminales y agentes inteligentes mediante el protocolo estándar MCP.
- **Soporte Multi-Proveedor**: Conmutación transparente hacia proveedores de nube (OpenAI, Anthropic Claude, Google Gemini).

### ⚡ 4. Núcleo Nativo de Alto Desempeño
- **Motor CRDT en Rust (`y-octo`)**: Resolución determinista y sin bloqueo de conflictos de edición en tiempo real.
- **Gestión de Memoria con `jemalloc`**: Optimización de fragmentación de memoria en V8 y bindings nativos en Linux y Docker.
- **Móvil Ultrarrápido**: Reducción de latencia de carga en Android mediante fast-path *Offline-First* y particionado inteligente de paquetes.

---

## 🏛️ Arquitectura del Sistema

```mermaid
flowchart TB
    subgraph Clients["Frontend & Clientes Multiplataforma"]
        Desktop["AFFiNITe Desktop (Electron 39)<br/>• Linux AppImage / Windows / macOS<br/>• Native Glassmorphic Boards (/boards)<br/>• Rust Native Modules (NAPI-RS)"]
        MobileApp["AFFiNITe Mobile (Capacitor 7 / Android)<br/>• Redimensionamiento reactivo de teclado<br/>• Persistencia SQLite Nativa"]
        FlutterApp["AFFiNITe Flutter (Nativo)<br/>• BLoC + FFI + SQLite3 Embebido<br/>• Canvas Edgeless & Markdown"]
        WebClient["AFFiNITe Web / SPA<br/>• React 19 + Admin Dashboard<br/>• SWR & GraphQL"]
    end

    subgraph NativeRust["Capa Nativa en Rust (High Performance)"]
        YOcto["y-octo (Motor CRDT Propio)"]
        NBStore["nbstore / sqlite_v1 (Doc & Blob Store)"]
        ServerNative["server-native (Tokenizers, PDF/Docx Parsers)"]
    end

    subgraph Backend["AFFiNITe Cloud Server (NestJS 11 + Docker)"]
        GraphQL["GraphQL Gateway (Apollo Server)"]
        SocketIO["Socket.IO Sync (Redis Adapter)"]
        CopilotModule["Copilot & Agentic AI (MCP + Ollama)"]
        QueueService["BullMQ Job Processing (Persistente)"]
    end

    subgraph Persistencia["Persistencia & IA"]
        Postgres[("PostgreSQL 15<br/>+ pgvector")]
        Redis[("Redis 7<br/>AOF Persistente")]
        SQLiteLocal[("SQLite Local<br/>(Local-First)")]
        OllamaLocal["Ollama Local AI<br/>(host:11434)"]
    end

    Desktop --> NativeRust
    Desktop --> SQLiteLocal
    Desktop -.-> GraphQL
    MobileApp --> SQLiteLocal
    MobileApp -.-> GraphQL
    FlutterApp --> SQLiteLocal
    FlutterApp -.-> OllamaLocal

    GraphQL --> Postgres
    GraphQL --> CopilotModule
    SocketIO --> Redis
    SocketIO --> YOcto
    QueueService --> Redis
    CopilotModule --> OllamaLocal
    Backend --> ServerNative
```

---

## 🐳 Despliegue con Docker Compose (Self-Hosted)

Para levantar tu propia instancia de sincronización en la nube con soporte de PostgreSQL, Redis persistente y Ollama:

```bash
# 1. Clonar el repositorio
git clone https://github.com/CodeLoverKawai/Affinite.git
cd Affinite

# 2. Iniciar el stack completo
docker compose up -d
```

El servidor estará disponible de inmediato en **`http://localhost:5320`**.

> [!TIP]
> Si tienes **Ollama** instalado en tu máquina host, el contenedor se conectará automáticamente a través de `host.docker.internal:11434` sin configuración adicional.

---

## 📦 Compilación de Artefactos de Distribución

AFFiNITe incluye pipelines de empaquetado directo en la raíz del proyecto:

| Artefacto | Comando de Compilación | Salida Generada |
|---|---|---|
| **Linux AppImage** | `./build-appimage.sh stable` | `packages/frontend/apps/electron/out/AFFiNITe-linux-x86_64.AppImage` |
| **Android APK** | `./build-apk.sh` | `packages/frontend/apps/android/App/app/build/outputs/apk/stable/release/AFFINITE-release.apk` |
| **Servidor Docker** | `./build-docker.sh [--no-push]` | Imagen `rousseaukairos/affinite:latest` |
| **Release Automatizado** | `./run_release.sh` | Orquesta versionado, builds y publicación en GitHub Releases |

---

## 🛠️ Desarrollo Local

### Requisitos Previos
- **Node.js**: `>=20 <23.0.0` (Recomendado Node 22 LTS)
- **Yarn**: `v4.12.0` (Berry)
- **Rust**: Edición 2024 (Toolchain estable con `cargo`)
- **Docker**: (Opcional, para levantar base de datos de desarrollo)

```bash
# 1. Instalar dependencias del monorepo
yarn

# 2. Inicializar entorno y extensiones
yarn affine init

# 3. Iniciar el servidor de desarrollo
yarn dev
```

---

## 🔒 Privacidad y Soberanía de Datos

- **Cero Telemetría Forzada**: Sentry y los servicios de seguimiento upstream han sido desactivados.
- **Sin Dependencia de Cuentas Propietarias**: Puedes utilizar el 100% de las funciones de tableros, edición, canvas e inteligencia artificial de forma totalmente desconectada o auto-alojada.

---

<div align="center">
  <sub>Construido con pasión por el equipo de desarrollo de <b>AFFiNITe</b>. Licenciado bajo MIT.</sub>
</div>
