# Diseño Técnico: Suite Integral de Ecuaciones Profesionales (BlockSuite / AFFiNITe)

> **Fecha**: 2026-08-22  
> **Estado**: Aprobado por el usuario  
> **Módulos Afectados**: `@blocksuite/affine-block-latex`, `@blocksuite/affine-inline-latex`, `@blocksuite/affine-shared`, `@blocksuite/affine-model`

---

## 1. Contexto y Objetivos

El sistema de ecuaciones y fórmulas matemáticas de AFFiNITe / BlockSuite presenta limitaciones de usabilidad, espacio restringido en el popover de edición (280px fijos), renderizado destructivo ante errores tipográficos en tiempo real ("Error equation"), ausencia de diccionario de macros científicas avanzadas, bloqueo de selección de texto (`user-select: none`) y falta de adaptadores para exportación HTML.

El objetivo de esta especificación es convertir el subsistema de ecuaciones en una herramienta científica de primer nivel con:
1. Modal de edición expandible y dinámico con **Live Preview** dual y barra de plantillas rápidas.
2. Motor de KaTeX resiliente con diccionario unificado de macros matemáticas/físicas y mensajes de error contextuales.
3. Adaptadores de exportación HTML de alta fidelidad, soporte mejorado de Markdown e interactividad de copiado rápido.

---

## 2. Arquitectura de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                       BlockSuite Editor                     │
│                                                             │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │  LatexBlockComponent  │       │    AffineLatexNode    │  │
│  │     (Display Mode)    │       │     (Inline Mode)     │  │
│  └───────────┬───────────┘       └───────────┬───────────┘  │
│              │                               │              │
│              ▼                               ▼              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            LatexEditorMenu (Popover Modal)            │  │
│  │ ┌───────────────────────────────────────────────────┐ │  │
│  │ │ Quick Snippets Bar (Fracciones, Matrices, etc.)   │ │  │
│  │ ├─────────────────────────┬─────────────────────────┤ │  │
│  │ │ Source Editor (Shiki)   │ Live KaTeX Preview      │ │  │
│  │ ├─────────────────────────┴─────────────────────────┤ │  │
│  │ │ Contextual Error / Status Bar                     │ │  │
│  │ └───────────────────────────────────────────────────┘ │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │             katex-config (Central Engine)             │  │
│  │  - Scientific Macros (\R, \N, \bm, \diff, \vec, ...) │  │
│  │  - Safe Parser & Error Analyzer                       │  │
│  │  - Robust Config (trust: true, strict: false)         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Especificación Detallada de Cambios

### 3.1. Interfaz del Editor Modal (`LatexEditorMenu`)

* **Ubicación**: `blocksuite/affine/inlines/latex/src/latex-node/latex-editor-menu.ts`
* **Layout y Dimensiones**:
  * Ancho responsivo: `min-width: 540px; max-width: 840px; width: calc(100vw - 32px);`.
  * Altura máxima de trabajo de `480px` con scroll suave.
* **Barra de Snippets Rápidos**:
  * Botones superiores para inserción instantánea:
    * `\frac{a}{b}`
    * `\sqrt{x}`
    * `\sum_{i=1}^n`
    * `\int_{a}^b`
    * `\begin{pmatrix} a & b \\ c & d \end{pmatrix}`
    * `\begin{cases} a & \text{si } x>0 \\ b & \text{si } x\le 0 \end{cases}`
    * `\begin{aligned} a &= b \\ c &= d \end{aligned}`
* **Doble Visor (Live Dual-Pane)**:
  * Panel de edición de código con Shiki syntax highlighting.
  * Panel de previsualización en vivo KaTeX renderizado en tiempo real con fondo neutro de contraste.
* **Controles y Atajos**:
  * `Enter`: Confirmar y cerrar.
  * `Shift + Enter`: Salto de línea.
  * `Escape`: Cancelar y cerrar.
  * Botón de confirmación visual (`DoneIcon`).

### 3.2. Motor KaTeX Centralizado (`katex-config.ts`)

* **Ubicación**: `blocksuite/affine/blocks/latex/src/katex-config.ts` y exportado para consumo común.
* **Macros Científicas Preconfiguradas**:
  * Conjuntos: `\R` (`\mathbb{R}`), `\N` (`\mathbb{N}`), `\Z` (`\mathbb{Z}`), `\Q` (`\mathbb{Q}`), `\C` (`\mathbb{C}`), `\K` (`\mathbb{K}`).
  * Vectores y tensores: `\bm` (`\boldsymbol{#1}`), `\vec` (`\mathbf{#1}`), `\grad` (`\nabla`), `\curl` (`\nabla \times`), `\div` (`\nabla \cdot`), `\laplacian` (`\nabla^2`).
  * Cálculo y operadores: `\d` (`\mathrm{d}`), `\diff` (`\frac{\mathrm{d}#1}{\mathrm{d}#2}`), `\pdiff` (`\frac{\partial #1}{\partial #2}`), `\norm` (`\left\|#1\right\|`), `\abs` (`\left|#1\right|`), `\degree` (`^\circ`), `\hbar` (`\hslash`).
* **Configuración de KaTeX**:
  * `trust: true`
  * `strict: false`
  * `output: 'htmlAndMathml'`
* **Diagnóstico de Errores**:
  * Función auxiliar `safeRenderKatex(latex, container, options)` que captura `ParseError` y genera metadata amigable (posición, token faltante) en lugar de lanzar excepciones no controladas.

### 3.3. Bloque de Ecuación (`LatexBlockComponent`) y Nodo Inline (`AffineLatexNode`)

* **Ubicación**:
  * `blocksuite/affine/blocks/latex/src/latex-block.ts`
  * `blocksuite/affine/inlines/latex/src/latex-node/latex-node.ts`
* **Estilos**:
  * Eliminar `user-select: none` y establecer `user-select: text` para permitir resaltar y copiar fórmulas.
  * Agregar botón flotante de 1-clic: **Copiar LaTeX** al pasar el mouse por el bloque de ecuación (`LatexBlockComponent`).
* **Renderizado**:
  * Utilizar `safeRenderKatex` con las macros unificadas.
  * Mostrar indicador de advertencia con tooltip contextual si la fórmula tiene errores de sintaxis en lugar de borrar el contenido.

### 3.4. Adaptadores HTML y Markdown

* **Ubicación**:
  * `blocksuite/affine/blocks/latex/src/adapters/html.ts` (Nuevo)
  * `blocksuite/affine/inlines/latex/src/adapters/html/` (Nuevo)
  * `blocksuite/affine/blocks/latex/src/adapters/markdown/preprocessor.ts`
  * `blocksuite/affine/inlines/latex/src/markdown.ts`
* **Especificación**:
  * `LatexBlockHtmlAdapterMatcher`: Serializa el bloque a `<div class="katex-block" data-latex="...">...</div>` con MathML y fallback textual.
  * `LatexInlineHtmlAdapterMatcher`: Serializa deltas inline con atributo `latex` a `<span class="katex-inline" data-latex="...">...</span>`.
  * Markdown Preprocessor: Soporte robusto para bloques multilínea `$$ ... $$` que contengan líneas vacías o matrices sin romper la estructura de bloques en el AST.

---

## 4. Plan de Verificación

1. **Pruebas Unitarias Automatizadas**:
   * Ejecutar la suite de tests de adaptadores (`pnpm test` / `vitest` en `blocksuite/affine/all`).
   * Tests específicos para `LatexBlockHtmlAdapter` y el `MarkdownAdapter` con ecuaciones multilínea y macros.
2. **Pruebas de Integración y Renderizado**:
   * Verificar la inserción de ecuaciones por menú slash (`/eq`, `/ieq`) y atajos Markdown (`$$$$ `, `$$ `, `$fórmula$`).
   * Verificar la inserción de plantillas desde la barra de snippets (matrices, fracciones, integrales).
   * Probar el Live Preview dual en fórmulas complejas y fórmulas con errores sintácticos temporales.
   * Probar el botón de copiado rápido de código LaTeX.
