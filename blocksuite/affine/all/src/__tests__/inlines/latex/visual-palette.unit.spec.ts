import {
  safeRenderKatex,
  safeRenderKatexToString,
} from '@blocksuite/affine-block-latex';
import {
  findNextSquareSlot,
  VISUAL_PALETTE_CATEGORIES,
  VISUAL_PALETTE_MAP,
} from '@blocksuite/affine-inline-latex';
import { describe, expect, it } from 'vitest';

describe('Visual Equation Palette Data & Helper Functions', () => {
  const createContainer = () => {
    const doc = document.implementation.createHTMLDocument();
    return doc.createElement('div');
  };

  describe('VISUAL_PALETTE_CATEGORIES structure', () => {
    it('should include all 5 required categories', () => {
      const categoryIds = VISUAL_PALETTE_CATEGORIES.map(c => c.id);
      expect(categoryIds).toContain('algebra');
      expect(categoryIds).toContain('calculus');
      expect(categoryIds).toContain('matrices');
      expect(categoryIds).toContain('symbols');
      expect(categoryIds).toContain('formulas');
    });

    it('should provide VISUAL_PALETTE_MAP with fast category lookup', () => {
      expect(VISUAL_PALETTE_MAP['algebra']).toBeDefined();
      expect(VISUAL_PALETTE_MAP['calculus']).toBeDefined();
      expect(VISUAL_PALETTE_MAP['matrices']).toBeDefined();
      expect(VISUAL_PALETTE_MAP['symbols']).toBeDefined();
      expect(VISUAL_PALETTE_MAP['formulas']).toBeDefined();
    });

    it('should ensure all items have valid non-empty id, label, preview, and snippet', () => {
      for (const category of VISUAL_PALETTE_CATEGORIES) {
        expect(category.items.length).toBeGreaterThan(0);
        for (const item of category.items) {
          expect(item.id).toBeTruthy();
          expect(item.label).toBeTruthy();
          expect(item.preview).toBeTruthy();
          expect(item.snippet).toBeTruthy();
        }
      }
    });
  });

  describe('KaTeX rendering of all visual palette previews and snippets', () => {
    it('should render all preview LaTeX strings without syntax errors', () => {
      const container = createContainer();
      for (const category of VISUAL_PALETTE_CATEGORIES) {
        for (const item of category.items) {
          container.replaceChildren();
          const result = safeRenderKatex(item.preview, container);
          if (!result.success) {
            console.error(
              `Failed preview in [${category.id} -> ${item.label}]: ${item.preview}`,
              result.error
            );
          }
          expect(
            result.success,
            `Category ${category.id}, item ${item.label} preview should render without error`
          ).toBe(true);
        }
      }
    });

    it('should render all snippet LaTeX templates (including \\square) without syntax errors', () => {
      const container = createContainer();
      for (const category of VISUAL_PALETTE_CATEGORIES) {
        for (const item of category.items) {
          container.replaceChildren();
          const result = safeRenderKatex(item.snippet, container);
          if (!result.success) {
            console.error(
              `Failed snippet in [${category.id} -> ${item.label}]: ${item.snippet}`,
              result.error
            );
          }
          expect(
            result.success,
            `Category ${category.id}, item ${item.label} snippet should render without error`
          ).toBe(true);
        }
      }
    });

    it('should render all previews to HTML string via safeRenderKatexToString', () => {
      for (const category of VISUAL_PALETTE_CATEGORIES) {
        for (const item of category.items) {
          const result = safeRenderKatexToString(item.preview);
          expect(
            result.success,
            `Category ${category.id}, item ${item.label} string render should succeed`
          ).toBe(true);
          expect(result.html).toContain('katex');
        }
      }
    });
  });

  describe('findNextSquareSlot slot navigation helper', () => {
    it('should return null when text has no \\square placeholders', () => {
      expect(findNextSquareSlot('E = m c^2')).toBeNull();
      expect(findNextSquareSlot('')).toBeNull();
    });

    it('should find the first \\square slot in a formula', () => {
      const latex = '\\frac{\\square}{\\square}';
      const slot = findNextSquareSlot(latex, 0);
      expect(slot).not.toBeNull();
      expect(slot?.index).toBe(6); // '\\frac{'.length
      expect(slot?.length).toBe(7); // '\\square'.length
    });

    it('should navigate to the next \\square slot after current offset', () => {
      const latex = '\\frac{\\square}{\\square}';
      // First slot is at index 6, ending at 13. Next slot is at index 15
      const secondSlot = findNextSquareSlot(latex, 14);
      expect(secondSlot).not.toBeNull();
      expect(secondSlot?.index).toBe(15);
      expect(secondSlot?.length).toBe(7);
    });

    it('should wrap around to the first slot when searching past the last slot', () => {
      const latex = '\\frac{\\square}{\\square}';
      const wrappedSlot = findNextSquareSlot(latex, 23);
      expect(wrappedSlot).not.toBeNull();
      expect(wrappedSlot?.index).toBe(6);
    });
  });
});
