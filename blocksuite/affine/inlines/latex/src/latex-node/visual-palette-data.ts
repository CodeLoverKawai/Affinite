export interface VisualPaletteItem {
  id: string;
  label: string;
  preview: string;
  snippet: string;
  description?: string;
}

export interface VisualPaletteCategory {
  id: 'algebra' | 'calculus' | 'matrices' | 'symbols' | 'formulas';
  label: string;
  icon?: string;
  items: VisualPaletteItem[];
}

export const VISUAL_PALETTE_CATEGORIES: VisualPaletteCategory[] = [
  {
    id: 'algebra',
    label: 'Álgebra',
    icon: 'x²',
    items: [
      {
        id: 'fraction',
        label: 'Fracción',
        preview: '\\frac{a}{b}',
        snippet: '\\frac{\\square}{\\square}',
      },
      {
        id: 'power',
        label: 'Potencia',
        preview: 'x^{n}',
        snippet: '{\\square}^{\\square}',
      },
      {
        id: 'subscript',
        label: 'Subíndice',
        preview: 'x_{i}',
        snippet: '{\\square}_{\\square}',
      },
      {
        id: 'sub-sup',
        label: 'Sub y Superíndice',
        preview: 'x_{i}^{n}',
        snippet: '{\\square}_{\\square}^{\\square}',
      },
      {
        id: 'sqrt',
        label: 'Raíz cuadrada',
        preview: '\\sqrt{x}',
        snippet: '\\sqrt{\\square}',
      },
      {
        id: 'nroot',
        label: 'Raíz n-ésima',
        preview: '\\sqrt[n]{x}',
        snippet: '\\sqrt[\\square]{\\square}',
      },
      {
        id: 'abs',
        label: 'Valor absoluto',
        preview: '|x|',
        snippet: '\\left|\\square\\right|',
      },
      {
        id: 'norm',
        label: 'Norma',
        preview: '\\|\\vec{v}\\|',
        snippet: '\\left\\|\\square\\right\\|',
      },
      {
        id: 'parens',
        label: 'Paréntesis',
        preview: '\\left(\\frac{a}{b}\\right)',
        snippet: '\\left(\\square\\right)',
      },
      {
        id: 'brackets',
        label: 'Corchetes',
        preview: '\\left[\\frac{a}{b}\\right]',
        snippet: '\\left[\\square\\right]',
      },
      {
        id: 'braces',
        label: 'Llaves',
        preview: '\\left\\{\\frac{a}{b}\\right\\}',
        snippet: '\\left\\{\\square\\right\\}',
      },
      {
        id: 'log',
        label: 'Logaritmo',
        preview: '\\log_{b}(x)',
        snippet: '\\log_{\\square}(\\square)',
      },
      {
        id: 'ln',
        label: 'Log natural',
        preview: '\\ln(x)',
        snippet: '\\ln(\\square)',
      },
      {
        id: 'sin',
        label: 'Seno',
        preview: '\\sin(\\theta)',
        snippet: '\\sin(\\square)',
      },
      {
        id: 'cos',
        label: 'Coseno',
        preview: '\\cos(\\theta)',
        snippet: '\\cos(\\square)',
      },
      {
        id: 'tan',
        label: 'Tangente',
        preview: '\\tan(\\theta)',
        snippet: '\\tan(\\square)',
      },
    ],
  },
  {
    id: 'calculus',
    label: 'Cálculo',
    icon: '∫',
    items: [
      {
        id: 'lim',
        label: 'Límite',
        preview: '\\lim_{x \\to x_0} f(x)',
        snippet: '\\lim_{{\\square} \\to {\\square}} {\\square}',
      },
      {
        id: 'derivative',
        label: 'Derivada',
        preview: '\\frac{\\mathrm{d}y}{\\mathrm{d}x}',
        snippet: '\\frac{\\mathrm{d}{\\square}}{\\mathrm{d}{\\square}}',
      },
      {
        id: 'derivative-n',
        label: 'Derivada n-ésima',
        preview: '\\frac{\\mathrm{d}^n y}{\\mathrm{d}x^n}',
        snippet:
          '\\frac{\\mathrm{d}^{\\square}{\\square}}{\\mathrm{d}{\\square}^{\\square}}',
      },
      {
        id: 'partial-derivative',
        label: 'Derivada parcial',
        preview: '\\frac{\\partial f}{\\partial x}',
        snippet: '\\frac{\\partial {\\square}}{\\partial {\\square}}',
      },
      {
        id: 'partial-derivative-2',
        label: 'Derivada parcial 2da',
        preview: '\\frac{\\partial^2 f}{\\partial x^2}',
        snippet: '\\frac{\\partial^2 {\\square}}{\\partial {\\square}^2}',
      },
      {
        id: 'integral-indef',
        label: 'Integral indefinida',
        preview: '\\int f(x)\\,\\mathrm{d}x',
        snippet: '\\int {\\square}\\,\\mathrm{d}{\\square}',
      },
      {
        id: 'integral-def',
        label: 'Integral definida',
        preview: '\\int_{a}^{b} f(x)\\,\\mathrm{d}x',
        snippet:
          '\\int_{{\\square}}^{{\\square}} {\\square}\\,\\mathrm{d}{\\square}',
      },
      {
        id: 'integral-double',
        label: 'Integral doble',
        preview: '\\iint_D f(x,y)\\,\\mathrm{d}A',
        snippet: '\\iint_{{\\square}} {\\square}\\,\\mathrm{d}{\\square}',
      },
      {
        id: 'integral-triple',
        label: 'Integral triple',
        preview: '\\iiint_V f\\,\\mathrm{d}V',
        snippet: '\\iiint_{{\\square}} {\\square}\\,\\mathrm{d}{\\square}',
      },
      {
        id: 'integral-contour',
        label: 'Integral de contorno',
        preview: '\\oint_C \\vec{F} \\cdot \\mathrm{d}\\vec{r}',
        snippet: '\\oint_{{\\square}} {\\square}\\,\\mathrm{d}{\\square}',
      },
      {
        id: 'sum',
        label: 'Sumatoria',
        preview: '\\sum_{i=1}^{n} a_i',
        snippet: '\\sum_{{\\square}={\\square}}^{{\\square}} {\\square}',
      },
      {
        id: 'prod',
        label: 'Productoria',
        preview: '\\prod_{i=1}^{n} x_i',
        snippet: '\\prod_{{\\square}={\\square}}^{{\\square}} {\\square}',
      },
      {
        id: 'grad',
        label: 'Gradiente',
        preview: '\\nabla f',
        snippet: '\\nabla {\\square}',
      },
      {
        id: 'div',
        label: 'Divergencia',
        preview: '\\nabla \\cdot \\vec{F}',
        snippet: '\\nabla \\cdot {\\square}',
      },
      {
        id: 'curl',
        label: 'Rotacional',
        preview: '\\nabla \\times \\vec{F}',
        snippet: '\\nabla \\times {\\square}',
      },
      {
        id: 'laplacian',
        label: 'Laplaciano',
        preview: '\\nabla^2 f',
        snippet: '\\nabla^2 {\\square}',
      },
    ],
  },
  {
    id: 'matrices',
    label: 'Matrices',
    icon: '[::]',
    items: [
      {
        id: 'matrix-2x2',
        label: 'Matriz 2x2',
        preview: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
        snippet:
          '\\begin{pmatrix} {\\square} & {\\square} \\\\ {\\square} & {\\square} \\end{pmatrix}',
      },
      {
        id: 'matrix-3x3',
        label: 'Matriz 3x3',
        preview:
          '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}',
        snippet:
          '\\begin{pmatrix} {\\square} & {\\square} & {\\square} \\\\ {\\square} & {\\square} & {\\square} \\\\ {\\square} & {\\square} & {\\square} \\end{pmatrix}',
      },
      {
        id: 'matrix-bmatrix-2x2',
        label: 'Matriz corchetes 2x2',
        preview: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}',
        snippet:
          '\\begin{bmatrix} {\\square} & {\\square} \\\\ {\\square} & {\\square} \\end{bmatrix}',
      },
      {
        id: 'matrix-bmatrix-3x3',
        label: 'Matriz corchetes 3x3',
        preview:
          '\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}',
        snippet:
          '\\begin{bmatrix} {\\square} & {\\square} & {\\square} \\\\ {\\square} & {\\square} & {\\square} \\\\ {\\square} & {\\square} & {\\square} \\end{bmatrix}',
      },
      {
        id: 'vector-col-2d',
        label: 'Vector columna 2D',
        preview: '\\begin{pmatrix} x \\\\ y \\end{pmatrix}',
        snippet: '\\begin{pmatrix} {\\square} \\\\ {\\square} \\end{pmatrix}',
      },
      {
        id: 'vector-col-3d',
        label: 'Vector columna 3D',
        preview: '\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}',
        snippet:
          '\\begin{pmatrix} {\\square} \\\\ {\\square} \\\\ {\\square} \\end{pmatrix}',
      },
      {
        id: 'vector-row',
        label: 'Vector fila',
        preview: '\\begin{pmatrix} x_1 & x_2 & x_3 \\end{pmatrix}',
        snippet:
          '\\begin{pmatrix} {\\square} & {\\square} & {\\square} \\end{pmatrix}',
      },
      {
        id: 'det-2x2',
        label: 'Determinante 2x2',
        preview: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',
        snippet:
          '\\begin{vmatrix} {\\square} & {\\square} \\\\ {\\square} & {\\square} \\end{vmatrix}',
      },
      {
        id: 'det-3x3',
        label: 'Determinante 3x3',
        preview:
          '\\begin{vmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{vmatrix}',
        snippet:
          '\\begin{vmatrix} {\\square} & {\\square} & {\\square} \\\\ {\\square} & {\\square} & {\\square} \\\\ {\\square} & {\\square} & {\\square} \\end{vmatrix}',
      },
      {
        id: 'cases',
        label: 'Función a trozos',
        preview:
          '\\begin{cases} a & x > 0 \\\\ b & x \\le 0 \\end{cases}',
        snippet:
          '\\begin{cases} {\\square} & \\text{si } {\\square} \\\\ {\\square} & \\text{si } {\\square} \\end{cases}',
      },
      {
        id: 'aligned',
        label: 'Ecuaciones alineadas',
        preview: '\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}',
        snippet:
          '\\begin{aligned} {\\square} &= {\\square} \\\\ {\\square} &= {\\square} \\end{aligned}',
      },
    ],
  },
  {
    id: 'symbols',
    label: 'Símbolos / Griego',
    icon: 'αΩ',
    items: [
      { id: 'alpha', label: 'alfa', preview: '\\alpha', snippet: '\\alpha' },
      { id: 'beta', label: 'beta', preview: '\\beta', snippet: '\\beta' },
      { id: 'gamma', label: 'gamma', preview: '\\gamma', snippet: '\\gamma' },
      { id: 'Gamma', label: 'Gamma', preview: '\\Gamma', snippet: '\\Gamma' },
      { id: 'delta', label: 'delta', preview: '\\delta', snippet: '\\delta' },
      { id: 'Delta', label: 'Delta', preview: '\\Delta', snippet: '\\Delta' },
      {
        id: 'epsilon',
        label: 'épsilon',
        preview: '\\epsilon',
        snippet: '\\epsilon',
      },
      {
        id: 'varepsilon',
        label: 'varepsilon',
        preview: '\\varepsilon',
        snippet: '\\varepsilon',
      },
      { id: 'zeta', label: 'zeta', preview: '\\zeta', snippet: '\\zeta' },
      { id: 'eta', label: 'eta', preview: '\\eta', snippet: '\\eta' },
      { id: 'theta', label: 'theta', preview: '\\theta', snippet: '\\theta' },
      { id: 'Theta', label: 'Theta', preview: '\\Theta', snippet: '\\Theta' },
      { id: 'lambda', label: 'lambda', preview: '\\lambda', snippet: '\\lambda' },
      { id: 'Lambda', label: 'Lambda', preview: '\\Lambda', snippet: '\\Lambda' },
      { id: 'mu', label: 'mu', preview: '\\mu', snippet: '\\mu' },
      { id: 'nu', label: 'nu', preview: '\\nu', snippet: '\\nu' },
      { id: 'xi', label: 'xi', preview: '\\xi', snippet: '\\xi' },
      { id: 'pi', label: 'pi', preview: '\\pi', snippet: '\\pi' },
      { id: 'Pi', label: 'Pi', preview: '\\Pi', snippet: '\\Pi' },
      { id: 'rho', label: 'rho', preview: '\\rho', snippet: '\\rho' },
      { id: 'sigma', label: 'sigma', preview: '\\sigma', snippet: '\\sigma' },
      { id: 'Sigma', label: 'Sigma', preview: '\\Sigma', snippet: '\\Sigma' },
      { id: 'tau', label: 'tau', preview: '\\tau', snippet: '\\tau' },
      { id: 'phi', label: 'phi', preview: '\\phi', snippet: '\\phi' },
      {
        id: 'varphi',
        label: 'varphi',
        preview: '\\varphi',
        snippet: '\\varphi',
      },
      { id: 'Phi', label: 'Phi', preview: '\\Phi', snippet: '\\Phi' },
      { id: 'chi', label: 'chi', preview: '\\chi', snippet: '\\chi' },
      { id: 'psi', label: 'psi', preview: '\\psi', snippet: '\\psi' },
      { id: 'Psi', label: 'Psi', preview: '\\Psi', snippet: '\\Psi' },
      { id: 'omega', label: 'omega', preview: '\\omega', snippet: '\\omega' },
      { id: 'Omega', label: 'Omega', preview: '\\Omega', snippet: '\\Omega' },
      { id: 'infty', label: 'infinito', preview: '\\infty', snippet: '\\infty' },
      {
        id: 'approx',
        label: 'aproximado',
        preview: '\\approx',
        snippet: '\\approx',
      },
      {
        id: 'neq',
        label: 'distinto',
        preview: '\\neq',
        snippet: '\\neq',
      },
      {
        id: 'le',
        label: 'menor o igual',
        preview: '\\le',
        snippet: '\\le',
      },
      {
        id: 'ge',
        label: 'mayor o igual',
        preview: '\\ge',
        snippet: '\\ge',
      },
      { id: 'll', label: 'mucho menor', preview: '\\ll', snippet: '\\ll' },
      { id: 'gg', label: 'mucho mayor', preview: '\\gg', snippet: '\\gg' },
      { id: 'pm', label: 'más o menos', preview: '\\pm', snippet: '\\pm' },
      {
        id: 'times',
        label: 'multiplicación',
        preview: '\\times',
        snippet: '\\times',
      },
      {
        id: 'cdot',
        label: 'producto punto',
        preview: '\\cdot',
        snippet: '\\cdot',
      },
      {
        id: 'propto',
        label: 'proporcional',
        preview: '\\propto',
        snippet: '\\propto',
      },
      {
        id: 'equiv',
        label: 'equivalente',
        preview: '\\equiv',
        snippet: '\\equiv',
      },
      {
        id: 'forall',
        label: 'para todo',
        preview: '\\forall',
        snippet: '\\forall',
      },
      {
        id: 'exists',
        label: 'existe',
        preview: '\\exists',
        snippet: '\\exists',
      },
      {
        id: 'in',
        label: 'pertenece',
        preview: '\\in',
        snippet: '\\in',
      },
      {
        id: 'notin',
        label: 'no pertenece',
        preview: '\\notin',
        snippet: '\\notin',
      },
      {
        id: 'subset',
        label: 'subconjunto',
        preview: '\\subset',
        snippet: '\\subset',
      },
      {
        id: 'subseteq',
        label: 'subconjunto o igual',
        preview: '\\subseteq',
        snippet: '\\subseteq',
      },
      { id: 'cup', label: 'unión', preview: '\\cup', snippet: '\\cup' },
      {
        id: 'cap',
        label: 'intersección',
        preview: '\\cap',
        snippet: '\\cap',
      },
      {
        id: 'emptyset',
        label: 'conjunto vacío',
        preview: '\\emptyset',
        snippet: '\\emptyset',
      },
      {
        id: 'set-R',
        label: 'Reales',
        preview: '\\mathbb{R}',
        snippet: '\\mathbb{R}',
      },
      {
        id: 'set-C',
        label: 'Complejos',
        preview: '\\mathbb{C}',
        snippet: '\\mathbb{C}',
      },
      {
        id: 'set-N',
        label: 'Naturales',
        preview: '\\mathbb{N}',
        snippet: '\\mathbb{N}',
      },
      {
        id: 'set-Z',
        label: 'Enteros',
        preview: '\\mathbb{Z}',
        snippet: '\\mathbb{Z}',
      },
      {
        id: 'set-Q',
        label: 'Racionales',
        preview: '\\mathbb{Q}',
        snippet: '\\mathbb{Q}',
      },
      { id: 'arrow-to', label: 'tiende a', preview: '\\to', snippet: '\\to' },
      {
        id: 'arrow-implies',
        label: 'implica',
        preview: '\\implies',
        snippet: '\\implies',
      },
      {
        id: 'arrow-iff',
        label: 'si y solo si',
        preview: '\\iff',
        snippet: '\\iff',
      },
    ],
  },
  {
    id: 'formulas',
    label: 'Fórmulas Famosas',
    icon: '∑',
    items: [
      {
        id: 'quadratic-formula',
        label: 'Ecuación cuadrática',
        preview: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        snippet:
          'x = \\frac{-{\\square} \\pm \\sqrt{{\\square}^2 - 4{\\square}{\\square}}}{2{\\square}}',
      },
      {
        id: 'euler-identity',
        label: 'Identidad de Euler',
        preview: 'e^{i\\pi} + 1 = 0',
        snippet: 'e^{i\\pi} + 1 = 0',
      },
      {
        id: 'einstein-energy',
        label: 'Masa-Energía (Einstein)',
        preview: 'E = m c^2',
        snippet: 'E = m c^2',
      },
      {
        id: 'normal-distribution',
        label: 'Campana de Gauss',
        preview:
          'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}',
        snippet:
          'f(x) = \\frac{1}{{\\sigma} \\sqrt{2\\pi}} e^{-\\frac{(x - {\\mu})^2}{2{\\sigma}^2}}',
      },
      {
        id: 'pythagoras',
        label: 'Teorema de Pitágoras',
        preview: 'a^2 + b^2 = c^2',
        snippet: '{\\square}^2 + {\\square}^2 = {\\square}^2',
      },
      {
        id: 'fourier-transform',
        label: 'Transformada de Fourier',
        preview:
          '\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x) e^{-2\\pi i x \\xi} \\mathrm{d}x',
        snippet:
          '\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} {\\square}(x) e^{-2\\pi i x \\xi}\\,\\mathrm{d}x',
      },
      {
        id: 'schrodinger',
        label: 'Ecuación de Schrödinger',
        preview: 'i\\hbar \\frac{\\partial}{\\partial t} \\Psi = \\hat{H} \\Psi',
        snippet:
          'i\\hbar \\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi',
      },
      {
        id: 'gravity',
        label: 'Ley de Gravitación',
        preview: 'F = G \\frac{m_1 m_2}{r^2}',
        snippet: 'F = G \\frac{{\\square} \\cdot {\\square}}{{\\square}^2}',
      },
      {
        id: 'wave-equation',
        label: 'Ecuación de Onda',
        preview: '\\frac{\\partial^2 u}{\\partial t^2} = v^2 \\nabla^2 u',
        snippet:
          '\\frac{\\partial^2 {\\square}}{\\partial t^2} = {\\square}^2 \\nabla^2 {\\square}',
      },
      {
        id: 'maxwell-gauss',
        label: 'Ley de Gauss (Maxwell)',
        preview: '\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\varepsilon_0}',
        snippet:
          '\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\varepsilon_0}',
      },
      {
        id: 'maxwell-faraday',
        label: 'Ley de Faraday (Maxwell)',
        preview:
          '\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}',
        snippet:
          '\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}',
      },
      {
        id: 'fund-calc-theorem',
        label: 'Teorema Fundamental Cálculo',
        preview: '\\int_{a}^{b} f(x)\\,\\mathrm{d}x = F(b) - F(a)',
        snippet:
          '\\int_{{\\square}}^{{\\square}} {\\square}\\,\\mathrm{d}x = {\\square}',
      },
    ],
  },
];

export const VISUAL_PALETTE_MAP: Record<string, VisualPaletteCategory> =
  Object.fromEntries(
    VISUAL_PALETTE_CATEGORIES.map(cat => [cat.id, cat])
  ) as Record<string, VisualPaletteCategory>;

export function findNextSquareSlot(
  text: string,
  currentOffset: number = 0
): { index: number; length: number } | null {
  const target = '\\square';
  if (!text.includes(target)) return null;

  const nextIndex = text.indexOf(target, currentOffset);
  if (nextIndex !== -1) {
    return { index: nextIndex, length: target.length };
  }

  const wrapIndex = text.indexOf(target, 0);
  if (wrapIndex !== -1) {
    return { index: wrapIndex, length: target.length };
  }

  return null;
}
