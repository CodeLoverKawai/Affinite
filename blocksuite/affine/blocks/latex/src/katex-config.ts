import katex, { type KatexOptions } from 'katex';

export const KATEX_SCIENTIFIC_MACROS: Record<string, string> = {
  // Sets
  '\\R': '\\mathbb{R}',
  '\\N': '\\mathbb{N}',
  '\\Z': '\\mathbb{Z}',
  '\\Q': '\\mathbb{Q}',
  '\\C': '\\mathbb{C}',
  '\\K': '\\mathbb{K}',

  // Vectors/Tensors/Multivariable
  '\\bm': '\\boldsymbol{#1}',
  '\\vec': '\\mathbf{#1}',
  '\\grad': '\\nabla',
  '\\curl': '\\nabla \\times',
  '\\div': '\\nabla \\cdot',
  '\\laplacian': '\\nabla^2',

  // Operators/Derivatives
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

export interface SafeRenderToStringResult {
  success: boolean;
  html?: string;
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

export function safeRenderKatexToString(
  latex: string,
  options?: KatexOptions
): SafeRenderToStringResult {
  const mergedOptions: KatexOptions = {
    ...DEFAULT_KATEX_OPTIONS,
    ...options,
    macros: {
      ...KATEX_SCIENTIFIC_MACROS,
      ...(options?.macros ?? {}),
    },
  };

  try {
    const html = katex.renderToString(latex, mergedOptions);
    return { success: true, html };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error,
      rawError: err instanceof Error ? err : new Error(error),
    };
  }
}

