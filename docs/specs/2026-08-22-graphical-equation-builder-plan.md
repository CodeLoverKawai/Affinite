# Plan de Implementación: Graphical Equation Builder (Ecuaciones Gráficas)

> **Fecha**: 2026-08-22  
> **Rama**: `feat/professional-latex-suite`  
> **Estrategia**: Subagent-Driven Development con TDD y verificación continua

---

## Tareas de Implementación

### Tarea 1: Diccionario y Componentes de Paleta Visual
- **Archivo**: `blocksuite/affine/inlines/latex/src/latex-node/visual-palette-data.ts`
- **Contenido**:
  - Estructura de datos `VISUAL_MATH_CATEGORIES` con las 5 categorías: Álgebra, Cálculo, Matrices, Símbolos/Griego, Fórmulas Clásicas.
  - Cada ítem contiene `label`, `previewLatex`, `snippetLatex`, `tooltip`.
- **Test Unitario**: `blocksuite/affine/all/src/__tests__/inlines/latex/visual-palette.unit.spec.ts`.

### Tarea 2: Integración del Modo Visual Builder en `LatexEditorMenu`
- **Archivo**: `blocksuite/affine/inlines/latex/src/latex-node/latex-editor-menu.ts`
- **Contenido**:
  - `@property() initialMode: 'visual' | 'code' = 'code'`.
  - Pestañas superiores de cambio de modo `[ 🎨 Visual Builder ]` / `[ ⚡ Code Editor ]`.
  - Selector de categorías con chips interactivos y cuadrícula visual de botones con renderizado KaTeX miniatura.
  - Al hacer clic en un botón visual, inserta el fragmento con placeholders `\square` en la posición actual del cursor o al final.
  - Selector de reemplazo rápido de `\square` (al escribir sustituye el siguiente placeholder).

### Tarea 3: Comando y Entrada en el Slash Menu
- **Archivo**: `blocksuite/affine/blocks/latex/src/configs/slash-menu.ts`
- **Contenido**:
  - Agregar `graphicalEquationItem` con nombre `'Graphical equation'`, descripción `'Create an equation visually with categorized templates.'`, alias `['graphicalEquation', 'greq', 'visualEquation', 'vmath', 'formulaBuilder']`.
  - Ejecuta la creación del bloque abriendo el editor en modo visual (`initialMode = 'visual'`).

### Tarea 4: Guía de Referencia Rápida en Markdown (.md)
- **Archivo**: `/home/rousseau/Documents/Affinite_Notes/Matematicas/guia-ecuaciones-graficas.md`
- **Contenido**:
  - Guía completa con tablas, ejemplos paso a paso, fórmulas clásicas y macros científicas para consulta permanente dentro de AFFiNITe.

### Tarea 5: Verificación, Tests & Build
- Ejecución de `npx tsc -b` y Vitest.
- Reconstrucción de `AFFiNITe-Math-linux-x86_64.AppImage`.
