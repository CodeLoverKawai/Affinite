import {
  DEFAULT_KATEX_OPTIONS,
  KATEX_SCIENTIFIC_MACROS,
  safeRenderKatex,
} from '@blocksuite/affine-block-latex';
import {
  DEFAULT_KATEX_OPTIONS as INLINE_DEFAULT_KATEX_OPTIONS,
  KATEX_SCIENTIFIC_MACROS as INLINE_KATEX_SCIENTIFIC_MACROS,
  safeRenderKatex as inlineSafeRenderKatex,
} from '@blocksuite/affine-inline-latex';
import { describe, expect, it } from 'vitest';

describe('KaTeX configuration & scientific macros', () => {
  describe('KATEX_SCIENTIFIC_MACROS', () => {
    it('should define all required mathematical set macros', () => {
      expect(KATEX_SCIENTIFIC_MACROS['\\R']).toBe('\\mathbb{R}');
      expect(KATEX_SCIENTIFIC_MACROS['\\N']).toBe('\\mathbb{N}');
      expect(KATEX_SCIENTIFIC_MACROS['\\Z']).toBe('\\mathbb{Z}');
      expect(KATEX_SCIENTIFIC_MACROS['\\Q']).toBe('\\mathbb{Q}');
      expect(KATEX_SCIENTIFIC_MACROS['\\C']).toBe('\\mathbb{C}');
      expect(KATEX_SCIENTIFIC_MACROS['\\K']).toBe('\\mathbb{K}');
    });

    it('should define all required vector, tensor, and multivariable macros', () => {
      expect(KATEX_SCIENTIFIC_MACROS['\\bm']).toBe('\\boldsymbol{#1}');
      expect(KATEX_SCIENTIFIC_MACROS['\\vec']).toBe('\\mathbf{#1}');
      expect(KATEX_SCIENTIFIC_MACROS['\\grad']).toBe('\\nabla');
      expect(KATEX_SCIENTIFIC_MACROS['\\curl']).toBe('\\nabla \\times');
      expect(KATEX_SCIENTIFIC_MACROS['\\div']).toBe('\\nabla \\cdot');
      expect(KATEX_SCIENTIFIC_MACROS['\\laplacian']).toBe('\\nabla^2');
    });

    it('should define all required operator and derivative macros', () => {
      expect(KATEX_SCIENTIFIC_MACROS['\\d']).toBe('\\mathrm{d}');
      expect(KATEX_SCIENTIFIC_MACROS['\\diff']).toBe(
        '\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}'
      );
      expect(KATEX_SCIENTIFIC_MACROS['\\pdiff']).toBe(
        '\\frac{\\partial #1}{\\partial #2}'
      );
      expect(KATEX_SCIENTIFIC_MACROS['\\norm']).toBe('\\left\\|#1\\right\\|');
      expect(KATEX_SCIENTIFIC_MACROS['\\abs']).toBe('\\left|#1\\right|');
      expect(KATEX_SCIENTIFIC_MACROS['\\degree']).toBe('^\\circ');
      expect(KATEX_SCIENTIFIC_MACROS['\\hbar']).toBe('\\hslash');
    });
  });

  describe('DEFAULT_KATEX_OPTIONS', () => {
    it('should have standard scientific defaults enabled', () => {
      expect(DEFAULT_KATEX_OPTIONS.trust).toBe(true);
      expect(DEFAULT_KATEX_OPTIONS.strict).toBe(false);
      expect(DEFAULT_KATEX_OPTIONS.output).toBe('htmlAndMathml');
      expect(DEFAULT_KATEX_OPTIONS.macros).toEqual(KATEX_SCIENTIFIC_MACROS);
    });
  });

  describe('safeRenderKatex', () => {
    const createContainer = () => {
      const doc = document.implementation.createHTMLDocument();
      return doc.createElement('div');
    };

    it('should successfully render standard LaTeX expressions with macros', () => {
      const container = createContainer();
      const result = safeRenderKatex(
        '\\R \\times \\N \\subset \\C',
        container
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.rawError).toBeUndefined();
      expect(container.innerHTML).toContain('katex');
    });

    it('should render complex physics equations using custom macros', () => {
      const container = createContainer();
      const maxwell =
        '\\curl \\vec{E} = -\\pdiff{\\vec{B}}{t} + \\laplacian \\bm{A} + \\diff{f}{x}';
      const result = safeRenderKatex(maxwell, container);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(container.children.length).toBeGreaterThan(0);
    });

    it('should render norm, abs, degree, and hbar macros', () => {
      const container = createContainer();
      const formula = 'E = \\hbar \\omega + \\abs{z} + \\norm{\\vec{v}} + 45\\degree';
      const result = safeRenderKatex(formula, container);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(container.innerHTML).not.toBe('');
    });

    it('should safely capture LaTeX syntax errors without throwing', () => {
      const container = createContainer();
      const invalidLatex = '\\frac{unclosed';
      const result = safeRenderKatex(invalidLatex, container);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.rawError).toBeInstanceOf(Error);
      expect(result.rawError?.message).toBe(result.error);
    });

    it('should allow custom option overrides while preserving default macros', () => {
      const container = createContainer();
      const result = safeRenderKatex('\\customMacro + \\R', container, {
        displayMode: true,
        macros: {
          '\\customMacro': '42',
        },
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Re-exports from affine-inline-latex', () => {
    it('should re-export macros and safeRenderKatex correctly', () => {
      expect(INLINE_KATEX_SCIENTIFIC_MACROS).toBe(KATEX_SCIENTIFIC_MACROS);
      expect(INLINE_DEFAULT_KATEX_OPTIONS).toBe(DEFAULT_KATEX_OPTIONS);
      expect(inlineSafeRenderKatex).toBe(safeRenderKatex);
    });
  });
});
