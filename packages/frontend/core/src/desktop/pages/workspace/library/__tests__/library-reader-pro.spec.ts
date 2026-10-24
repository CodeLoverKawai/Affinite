import { describe, expect, it } from 'vitest';
import {
  computeQuoteCardFontSize,
  createInitialTtsState,
  formatSearchSnippet,
  HIGHLIGHT_COLORS,
  QUOTE_CARD_THEMES,
  sanitizeTtsText,
} from '../library-manager';

describe('Library Reader Pro Suite Logic', () => {
  describe('In-Book Search Formatting', () => {
    it('formats and cleans search snippets correctly', () => {
      const longSnippet =
        '   En un lugar de la Mancha,    de cuyo nombre no quiero acordarme,   no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.   ';
      const formatted = formatSearchSnippet(longSnippet, 80);
      expect(formatted).not.toContain('   ');
      expect(formatted.endsWith('...')).toBe(true);
      expect(formatted.length).toBeLessThanOrEqual(83);
    });

    it('preserves short search snippets without truncation', () => {
      const short = 'Una breve cita.';
      expect(formatSearchSnippet(short, 50)).toBe('Una breve cita.');
    });
  });

  describe('TTS Speech State Machine & Text Sanitization', () => {
    it('initializes with idle state and 1.0x rate', () => {
      const state = createInitialTtsState();
      expect(state.status).toBe('idle');
      expect(state.rate).toBe(1.0);
      expect(state.currentSentence).toBe('');
    });

    it('sanitizes multi-line and tabbed text for speech synthesis', () => {
      const raw = 'Capítulo I:\n\n\tLa filosofía\r\nde la naturaleza y la mente.';
      const clean = sanitizeTtsText(raw);
      expect(clean).toBe('Capítulo I: La filosofía de la naturaleza y la mente.');
    });
  });

  describe('Highlight Colors Palette', () => {
    it('provides all 5 standard reading highlight colors', () => {
      expect(HIGHLIGHT_COLORS.length).toBe(5);
      const ids = HIGHLIGHT_COLORS.map(c => c.id);
      expect(ids).toContain('yellow');
      expect(ids).toContain('green');
      expect(ids).toContain('blue');
      expect(ids).toContain('pink');
      expect(ids).toContain('purple');
    });

    it('ensures each color has valid hex and rgba background values', () => {
      for (const color of HIGHLIGHT_COLORS) {
        expect(color.hex.startsWith('#')).toBe(true);
        expect(color.bg.startsWith('rgba')).toBe(true);
      }
    });
  });

  describe('Quote Card Generator Layout & Themes', () => {
    it('defines 4 aesthetic themes for quote cards', () => {
      const themes = Object.keys(QUOTE_CARD_THEMES);
      expect(themes).toContain('modern-dark');
      expect(themes).toContain('editorial-sepia');
      expect(themes).toContain('oled-obsidian');
      expect(themes).toContain('emerald-night');
    });

    it('dynamically calculates font size based on quotation length', () => {
      expect(computeQuoteCardFontSize(30)).toBe(24);
      expect(computeQuoteCardFontSize(100)).toBe(20);
      expect(computeQuoteCardFontSize(200)).toBe(16);
      expect(computeQuoteCardFontSize(400)).toBe(14);
    });
  });
});
