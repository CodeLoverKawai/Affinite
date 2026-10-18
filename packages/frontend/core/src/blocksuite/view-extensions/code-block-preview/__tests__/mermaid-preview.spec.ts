import { describe, expect, it } from 'vitest';

import {
  computeWheelZoom,
  MERMAID_TEMPLATES,
  normalizeMermaidCode,
} from '../mermaid-preview';

describe('MermaidPreview utilities', () => {
  describe('normalizeMermaidCode', () => {
    it('returns empty string for null or whitespace-only input', () => {
      expect(normalizeMermaidCode(null)).toBe('');
      expect(normalizeMermaidCode(undefined)).toBe('');
      expect(normalizeMermaidCode('   \n  ')).toBe('');
    });

    it('strips accidental ```mermaid outer fences and normalizes CRLF', () => {
      const fenced = '```mermaid\r\nflowchart TD\r\n  A --> B\r\n```';
      expect(normalizeMermaidCode(fenced)).toBe('flowchart TD\n  A --> B');
    });

    it('preserves clean mermaid syntax untouched', () => {
      const raw = 'sequenceDiagram\n  Alice->>Bob: Hola';
      expect(normalizeMermaidCode(raw)).toBe(raw);
    });
  });

  describe('computeWheelZoom', () => {
    it('computes zoom-in translation anchored at the cursor position using prevScale', () => {
      const result = computeWheelZoom({
        scale: 1,
        translateX: 0,
        translateY: 0,
        deltaY: -100, // zoom in (1.1x)
        mouseX: 200,
        mouseY: 100,
      });

      expect(result.scale).toBeCloseTo(1.1, 5);
      // Because newScale / prevScale = 1.1, translateX should shift by -20 and translateY by -10
      expect(result.translateX).toBeCloseTo(-20, 5);
      expect(result.translateY).toBeCloseTo(-10, 5);
    });

    it('clamps zoom scale between 0.1 and 5', () => {
      const zoomedOut = computeWheelZoom({
        scale: 0.11,
        translateX: 0,
        translateY: 0,
        deltaY: 100,
        mouseX: 50,
        mouseY: 50,
      });
      expect(zoomedOut.scale).toBeGreaterThanOrEqual(0.1);

      const zoomedIn = computeWheelZoom({
        scale: 4.8,
        translateX: 0,
        translateY: 0,
        deltaY: -100,
        mouseX: 50,
        mouseY: 50,
      });
      expect(zoomedIn.scale).toBeLessThanOrEqual(5);
    });
  });

  describe('MERMAID_TEMPLATES', () => {
    it('provides 6 ready-to-use diagram templates', () => {
      expect(MERMAID_TEMPLATES.length).toBeGreaterThanOrEqual(6);
      const ids = MERMAID_TEMPLATES.map(t => t.id);
      expect(ids).toEqual([
        'flowchart',
        'sequence',
        'class',
        'state',
        'er',
        'mindmap',
      ]);
      for (const preset of MERMAID_TEMPLATES) {
        expect(preset.code.trim().length).toBeGreaterThan(10);
      }
    });
  });
});
