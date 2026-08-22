# Diseño Técnico: Graphical Equation Builder (Ecuaciones Gráficas)

> **Fecha**: 2026-08-22  
> **Estado**: Aprobado por el usuario  
> **Módulos Afectados**: `@blocksuite/affine-block-latex`, `@blocksuite/affine-inline-latex`, `@blocksuite/affine-widget-slash-menu`

---

## 1. Contexto y Objetivos

Para usuarios que estudian o trabajan con matemáticas, física o ingeniería y no dominan o no desean escribir código LaTeX manualmente, se introduce la funcionalidad **Graphical Equations (Ecuaciones Gráficas)** como una herramienta visual dedicada e independiente.

La función coexiste con las ecuaciones estándar (`/eq`) pero ofrece una experiencia centrada en paletas visuales categorizadas, inserción con 1-clic con placeholders inteligentes (`\square`), selector de símbolos griegos, matrices y biblioteca de fórmulas clásicas.

---

## 2. Arquitectura y Componentes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Graphical Equation System                          │
│                                                                         │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────┐  │
│  │   Slash Menu: /greq /vmath      │   │   Slash Menu: /eq (LaTeX)   │  │
│  │   "Graphical Equation"          │   │   "Equation (LaTeX Block)"  │  │
│  └────────────────┬────────────────┘   └──────────────┬──────────────┘  │
│                   │                                   │                 │
│                   ▼                                   ▼                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     LatexEditorMenu Popover                       │  │
│  │                                                                   │  │
│  │  [ Tab: 🎨 Visual Builder ]  [ Tab: ⚡ Code Editor ]               │  │
│  │ ┌───────────────────────────────────────────────────────────────┐ │  │
│  │ │ Categorías: Álgebra | Cálculo | Matrices | Griego | Fórmulas  │ │  │
│  │ ├───────────────────────────────────────────────────────────────┤ │  │
│  │ │ Grid de Botones Visuales (Fracciones, Raíces, Integrales, ..) │ │  │
│  │ ├───────────────────────────────────────────────────────────────┤ │  │
│  │ │ Canvas / Live Preview en Tiempo Real                          │ │  │
│  │ └───────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
│                                     │                                   │
│                                     ▼                                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                  Guía Permanente de Fórmulas                      │  │
│  │         ~/Documents/Affinite_Notes/Matematicas/...                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Especificación de Cambios

### 3.1. Modo Visual Builder en `LatexEditorMenu`
* **Selector de Modo**: Pestañas superiores `[ 🎨 Visual Builder ]` y `[ ⚡ Code Editor ]`.
* **Pestañas de Categorías**:
  1. 📐 **Álgebra**: $\frac{\square}{\square}$, $\square^{\square}$, $\square_{\square}$, $\sqrt{\square}$, $\sqrt[\square]{\square}$, $\log_{\square}(\square)$, $\ln(\square)$, $\binom{\square}{\square}$, $\left(\square\right)$, $\left[\square\right]$, $\left\{\square\right\}$.
  2. 📈 **Cálculo**: $\frac{\d \square}{\d \square}$, $\frac{\partial \square}{\partial \square}$, $\int \square \, \d \square$, $\int_{\square}^{\square} \square \, \d \square$, $\lim_{\square \to \square} \square$, $\sum_{\square}^{\square} \square$, $\prod_{\square}^{\square} \square$.
  3. 🔢 **Matrices**: Matriz $2\times2$, $3\times3$, Determinantes $2\times2$, $3\times3$, Vectores columna, Vectores fila.
  4. 🔤 **Letras Griegas & Símbolos**: $\alpha, \beta, \gamma, \delta, \theta, \lambda, \mu, \pi, \sigma, \phi, \omega, \infty, \nabla, \pm, \approx, \neq, \le, \ge, \mathbb{R}, \mathbb{N}, \mathbb{Z}, \mathbb{C}$.
  5. 📚 **Fórmulas Clásicas**: Cuadrática, Pitágoras, Bayes, Euler, Normal, Maxwell, Schrödinger, Fourier.

### 3.2. Integración en el Slash Menu
* **Nuevo Comando**: `Graphical equation` en el grupo `4_Content & Media` con alias de búsqueda: `graphicalEquation`, `greq`, `visualEquation`, `vmath`, `formulaBuilder`.
* **Acción**: Inserta el bloque y abre el editor directamente en el modo **Visual Builder**.

### 3.3. Documento de Guía de Estudio (.md)
* Generar `~/Documents/Affinite_Notes/Matematicas/guia-ecuaciones-graficas.md` con la tabla y catálogo de todas las fórmulas para estudio y consulta rápida.
