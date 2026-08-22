# Suite Integral de Ecuaciones Profesionales - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar una suite avanzada de ecuaciones matemáticas en BlockSuite/AFFiNITe con editor modal expandible y responsivo, Live Preview dual en tiempo real, barra de snippets rápidos, motor KaTeX con macros científicas precargadas, captura de errores no destructiva, adaptadores HTML completos y copiado rápido de fórmulas.

**Architecture:** 
1. Módulo centralizado `katex-config.ts` con diccionario de macros y función `safeRenderKatex` tolerante a fallos de sintaxis.
2. Componente de UI `LatexEditorMenu` rediseñado con ancho dinámico (`540px-840px`), panel dual (Editor Shiki + Live Preview KaTeX) y barra de atajos (`\frac`, `\sqrt`, `\sum`, `\int`, `\begin{pmatrix}`, `\begin{cases}`, `\begin{aligned}`).
3. Actualización de `LatexBlockComponent` y `AffineLatexNode` con `user-select: text`, botón flotante "Copiar LaTeX" y tooltips de error descriptivos.
4. Nuevos adaptadores `LatexBlockHtmlAdapter` y `LatexInlineHtmlAdapter` para exportación limpia a HTML/MathML y mejoras al preprocesador Markdown para ecuaciones multilínea.

**Tech Stack:** Lit, TypeScript, KaTeX, Shiki, Yjs, Preact Signals, BlockSuite Std / Store.

---

## Task 1: Motor KaTeX Centralizado y Diccionario de Macros Científicas

**Files:**
- Create: `blocksuite/affine/blocks/latex/src/katex-config.ts`
- Create: `blocksuite/affine/all/src/__tests__/blocks/latex/katex-config.unit.spec.ts`
- Modify: `blocksuite/affine/blocks/latex/src/index.ts`
- Modify: `blocksuite/affine/inlines/latex/src/index.ts`

**Interfaces:**
- Produces:
  - `KATEX_SCIENTIFIC_MACROS: Record<string, string>`
  - `DEFAULT_KATEX_OPTIONS: KatexOptions`
  - `safeRenderKatex(latex: string, container: HTMLElement, options?: { displayMode?: boolean }): { success: boolean; error?: string; rawError?: Error }`

- [ ] **Step 1: Escribir el test unitario de renderizado y macros**

Crear `blocksuite/affine/all/src/__tests__/blocks/latex/katex-config.unit.spec.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { safeRenderKatex, KATEX_SCIENTIFIC_MACROS } from '@blocksuite/affine-block-latex';

describe('katex-config', () => {
  it('should include scientific macros like \\R, \\N, \\bm, \\diff', () => {
    expect(KATEX_SCIENTIFIC_MACROS['\\R']).toBe('\\mathbb{R}');
    expect(KATEX_SCIENTIFIC_MACROS['\\N']).toBe('\\mathbb{N}');
    expect(KATEX_SCIENTIFIC_MACROS['\\bm']).toBe('\\boldsymbol{#1}');
    expect(KATEX_SCIENTIFIC_MACROS['\\diff']).toBe('\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}');
  });

  it('should safely render valid LaTeX with macros without throwing', () => {
    const container = document.createElement('div');
    const result = safeRenderKatex('\\R \\times \\N = \\diff{y}{x}', container);
    expect(result.success).toBe(true);
    expect(container.querySelector('.katex')).not.toBeNull();
  });

  it('should capture syntax errors gracefully and return error description', () => {
    const container = document.createElement('div');
    const result = safeRenderKatex('\\frac{1}{', container);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Ejecutar:
```bash
yarn test blocksuite/affine/all/src/__tests__/blocks/latex/katex-config.unit.spec.ts
```

- [ ] **Step 3: Implementar `katex-config.ts`**

Crear `blocksuite/affine/blocks/latex/src/katex-config.ts`:
```typescript
import katex, { type KatexOptions } from 'katex';

export const KATEX_SCIENTIFIC_MACROS: Record<string, string> = {
  // Conjuntos
  '\\R': '\\mathbb{R}',
  '\\N': '\\mathbb{N}',
  '\\Z': '\\mathbb{Z}',
  '\\Q': '\\mathbb{Q}',
  '\\C': '\\mathbb{C}',
  '\\K': '\\mathbb{K}',

  // Vectores y cálculo multivariable
  '\\bm': '\\boldsymbol{#1}',
  '\\vec': '\\mathbf{#1}',
  '\\grad': '\\nabla',
  '\\curl': '\\nabla \\times',
  '\\div': '\\nabla \\cdot',
  '\\laplacian': '\\nabla^2',

  // Operadores y diferenciales
  '\\d': '\\mathrm{d}',
  '\\diff': '\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}',
  '\\pdiff': '\\frac{\\partial #1}{\\partial #2}',
  '\\norm': '\\left\\|#1\\right\\|',
  '\\abs': '\\left|#1\\right|',
  '\\degree': '^\\circ',
  '\\hbar': '\\hslash',
};

export const DEFAULT_KATEX_OPTIONS: KatexOptions = {
  trust: true,
  strict: false,
  output: 'htmlAndMathml',
  macros: KATEX_SCIENTIFIC_MACROS,
};

export interface SafeRenderResult {
  success: boolean;
  error?: string;
  rawError?: Error;
}

export function safeRenderKatex(
  latex: string,
  container: HTMLElement,
  options?: KatexOptions
): SafeRenderResult {
  const mergedOptions: KatexOptions = {
    ...DEFAULT_KATEX_OPTIONS,
    ...options,
    macros: {
      ...KATEX_SCIENTIFIC_MACROS,
      ...(options?.macros ?? {}),
    },
  };

  try {
    katex.render(latex, container, mergedOptions);
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error,
      rawError: err instanceof Error ? err : new Error(error),
    };
  }
}
```

Exportar en `blocksuite/affine/blocks/latex/src/index.ts` y re-exportar si aplica en inlines.

- [ ] **Step 4: Ejecutar los tests y verificar que pasen**

Ejecutar:
```bash
yarn test blocksuite/affine/all/src/__tests__/blocks/latex/katex-config.unit.spec.ts
```

- [ ] **Step 5: Commit de Task 1**

```bash
git add blocksuite/affine/blocks/latex/src/katex-config.ts blocksuite/affine/blocks/latex/src/index.ts blocksuite/affine/all/src/__tests__/blocks/latex/katex-config.unit.spec.ts
git commit -m "feat(latex): add central katex config with scientific macros and safe render"
```

---

## Task 2: Rediseño de `LatexEditorMenu` (Popover Modal con Live Preview y Snippets)

**Files:**
- Modify: `blocksuite/affine/inlines/latex/src/latex-node/latex-editor-menu.ts`
- Modify: `blocksuite/affine/inlines/latex/package.json`

**Interfaces:**
- Consumes: `safeRenderKatex`, `KATEX_SCIENTIFIC_MACROS` from `@blocksuite/affine-block-latex`
- Produces: `LatexEditorMenu` con panel dual (código + live preview), toolbar de plantillas rápidas y ancho adaptativo.

- [ ] **Step 1: Diseñar los estilos modernos y layout en `latex-editor-menu.ts`**

Actualizar `static override styles` en `LatexEditorMenu`:
- `.latex-editor-container`: ancho adaptable (`min-width: 540px; max-width: 840px; width: calc(100vw - 32px);`), `display: flex; flex-direction: column; gap: 8px;`.
- `.latex-snippets-bar`: barra horizontal de chips scrolleable con botones para plantillas (`\frac`, `\sqrt`, `\sum`, `\int`, `\begin{pmatrix}`, `\begin{cases}`, `\begin{aligned}`).
- `.latex-editor-main`: contenedor con editor Shiki y visor de live preview KaTeX.
- `.latex-live-preview`: caja con borde sutil, fondo `backgroundSecondaryColor`, padding de 8px y visualización en tiempo real.
- `.latex-editor-error-hint`: banner de advertencia si `safeRenderKatex` detecta sintaxis incompleta.

- [ ] **Step 2: Implementar la inserción de Snippets y el Live Preview**

En `LatexEditorMenu`:
1. Agregar método `insertSnippet(snippet: string)` que inserta la plantilla en la posición del cursor de `yText`.
2. Crear un Signal o efecto para actualizar el elemento `.latex-live-preview` mediante `safeRenderKatex(latexText, previewContainer, { displayMode: true })`.
3. Renderizar el template completo en `render()`:
   - Snippets Bar
   - Editor Box con RichText
   - Live Preview Box
   - Hint & Status Bar con botón Confirm (`DoneIcon`).

- [ ] **Step 3: Verificar compilación y tipos**

Ejecutar:
```bash
yarn build
```

- [ ] **Step 4: Commit de Task 2**

```bash
git add blocksuite/affine/inlines/latex/src/latex-node/latex-editor-menu.ts
git commit -m "feat(latex): enhance latex editor menu with live dual-preview and quick snippets bar"
```

---

## Task 3: Actualización de `LatexBlockComponent` y `AffineLatexNode` (Copiado Rápido y Selección)

**Files:**
- Modify: `blocksuite/affine/blocks/latex/src/latex-block.ts`
- Modify: `blocksuite/affine/blocks/latex/src/styles.ts`
- Modify: `blocksuite/affine/inlines/latex/src/latex-node/latex-node.ts`

**Interfaces:**
- Consumes: `safeRenderKatex`
- Produces: Bloques e inlines de LaTeX con `user-select: text`, botón flotante "Copiar LaTeX" en hover y tooltips descriptivos de error.

- [ ] **Step 1: Actualizar `styles.ts` en bloque LaTeX**

En `latexBlockStyles`:
- Cambiar `user-select: none;` a `user-select: text;`.
- Añadir estilos para el botón de acción `.latex-copy-button` (posicionado en la esquina superior derecha del bloque al hacer hover, con icono de copiado y tooltip "Copiar LaTeX" / "Copiado!").
- Añadir estilos para el indicador de error con tooltip `.latex-block-error-tooltip`.

- [ ] **Step 2: Actualizar `LatexBlockComponent`**

En `latex-block.ts`:
- Usar `safeRenderKatex(latex, katexContainer, { displayMode: true })`.
- Si `!result.success`: renderizar el badge de error con el mensaje específico `result.error` en un atributo title/tooltip.
- Agregar botón de copiado:
```typescript
private async _copyLatex(e: MouseEvent) {
  e.stopPropagation();
  const latex = this.model.props.latex$.value;
  await navigator.clipboard.writeText(latex);
  // Mostrar estado temporal de copiado con feedback
}
```

- [ ] **Step 3: Actualizar `AffineLatexNode`**

En `latex-node.ts`:
- Cambiar `user-select: none` por `user-select: text;`.
- Usar `safeRenderKatex(latex, latexContainer, { displayMode: false })`.
- Mostrar tooltip descriptivo cuando `!result.success`.

- [ ] **Step 4: Commit de Task 3**

```bash
git add blocksuite/affine/blocks/latex/src/latex-block.ts blocksuite/affine/blocks/latex/src/styles.ts blocksuite/affine/inlines/latex/src/latex-node/latex-node.ts
git commit -m "feat(latex): enable formula text selection, copy button and descriptive error tooltips"
```

---

## Task 4: Adaptadores HTML para Bloques e Inlines de Ecuaciones

**Files:**
- Create: `blocksuite/affine/blocks/latex/src/adapters/html.ts`
- Create: `blocksuite/affine/inlines/latex/src/adapters/html.ts`
- Modify: `blocksuite/affine/blocks/latex/src/adapters/index.ts`
- Modify: `blocksuite/affine/inlines/latex/src/adapters/index.ts`
- Create: `blocksuite/affine/all/src/__tests__/adapters/latex-html.unit.spec.ts`

**Interfaces:**
- Produces: `LatexBlockHtmlAdapterExtension`, `LatexInlineHtmlAdapterExtension`

- [ ] **Step 1: Escribir el test unitario de exportación e importación HTML**

Crear `blocksuite/affine/all/src/__tests__/adapters/latex-html.unit.spec.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { HtmlAdapter } from '@blocksuite/affine-shared/adapters';
import { createJob } from '../utils/create-job.js';
import { getProvider } from '../utils/get-provider.js';

describe('latex html adapter', () => {
  it('should export latex block to html with data-latex attribute and math content', async () => {
    const provider = getProvider();
    const adapter = new HtmlAdapter(createJob(), provider);
    // snapshot con flavour affine:latex
    // verificar que produce <div class="affine-latex-block" data-latex="E=mc^2">...</div>
  });
});
```

- [ ] **Step 2: Implementar `html.ts` en `blocks/latex` e `inlines/latex`**

Crear `LatexBlockHtmlAdapterExtension` y `LatexInlineHtmlAdapterExtension` serializando el bloque con marcado semántico y MathML renderizado por KaTeX.

- [ ] **Step 3: Ejecutar los tests de adaptadores**

Ejecutar:
```bash
yarn test blocksuite/affine/all/src/__tests__/adapters/
```

- [ ] **Step 4: Commit de Task 4**

```bash
git add blocksuite/affine/blocks/latex/src/adapters/html.ts blocksuite/affine/inlines/latex/src/adapters/html.ts blocksuite/affine/blocks/latex/src/adapters/index.ts blocksuite/affine/inlines/latex/src/adapters/index.ts blocksuite/affine/all/src/__tests__/adapters/latex-html.unit.spec.ts
git commit -m "feat(latex): add high-fidelity HTML adapters for latex block and inline equations"
```

---

## Task 5: Mejoras al Preprocesador Markdown y Atajos de Ecuación

**Files:**
- Modify: `blocksuite/affine/blocks/latex/src/adapters/markdown/preprocessor.ts`
- Modify: `blocksuite/affine/inlines/latex/src/markdown.ts`
- Create: `blocksuite/affine/all/src/__tests__/adapters/latex-markdown-multiline.unit.spec.ts`

**Interfaces:**
- Consumes: MarkdownAST, Regex Triggers
- Produces: Robust Markdown parsing for multiline LaTeX equations (`$$...$$` with matrices/newlines) and standard inline triggers.

- [ ] **Step 1: Escribir test para ecuaciones multilínea y matrices en Markdown**

Crear `blocksuite/affine/all/src/__tests__/adapters/latex-markdown-multiline.unit.spec.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { MarkdownAdapter } from '@blocksuite/affine-shared/adapters';
import { createJob } from '../utils/create-job.js';
import { getProvider } from '../utils/get-provider.js';

describe('multiline latex in markdown', () => {
  it('should import multiline equation block with matrices without splitting into paragraphs', async () => {
    const md = `$$\n\\begin{pmatrix}\na & b \\\\\nc & d\n\\end{pmatrix}\n$$\n`;
    const adapter = new MarkdownAdapter(createJob(), getProvider());
    const snapshot = await adapter.toBlockSnapshot({ file: md });
    expect(snapshot.children.some(c => c.flavour === 'affine:latex')).toBe(true);
  });
});
```

- [ ] **Step 2: Actualizar `preprocessor.ts` y `markdown.ts`**

Mejorar regex de preservación de bloques `$$ ... $$` en el preprocesador para que no se corrompan ante saltos de línea internos o comentarios `%`.

- [ ] **Step 3: Ejecutar suite de pruebas de Markdown**

Ejecutar:
```bash
yarn test blocksuite/affine/all/src/__tests__/adapters/markdown.unit.spec.ts
```

- [ ] **Step 4: Commit de Task 5**

```bash
git add blocksuite/affine/blocks/latex/src/adapters/markdown/preprocessor.ts blocksuite/affine/inlines/latex/src/markdown.ts blocksuite/affine/all/src/__tests__/adapters/latex-markdown-multiline.unit.spec.ts
git commit -m "feat(latex): enhance markdown preprocessor to preserve multiline latex environments"
```

---

## Task 6: Verificación Integral del Sistema de Ecuaciones

**Files:**
- Test: `tests/blocksuite/e2e/latex/block.spec.ts`
- Test: `tests/blocksuite/e2e/latex/inline.spec.ts`

- [ ] **Step 1: Ejecutar verificación de tipos y build general**

Ejecutar:
```bash
yarn build
```
Verificar que compile sin errores TypeScript.

- [ ] **Step 2: Ejecutar tests unitarios completos de BlockSuite**

Ejecutar:
```bash
yarn test
```

- [ ] **Step 3: Commit final y resumen de la release**

```bash
git commit -m "chore(latex): complete verification and integration of professional equation suite"
```
