import { describe, expect, test } from 'vitest';
import * as barrelFromAlias from '@affine/core/modules/affinite-hub';
import {
  ALL_HABIT_ICONS,
  ALL_PRESET_COLORS,
  getReadableTextColor,
  HABIT_COLOR_PALETTES,
  HABIT_ICON_GROUPS,
  isValidHexColor,
  normalizeHexColor,
  searchIcons,
  type HabitColorPalette,
  type HabitIconGroup,
  type HabitIconItem,
} from '../index';

describe('habit-catalog module', () => {
  describe('icon taxonomy and groups', () => {
    test('contains exactly 14 icon groups with required names', () => {
      expect(HABIT_ICON_GROUPS).toHaveLength(14);
      const expectedGroupNames = [
        'Salud',
        'Fitness y Deporte',
        'Mente y Bienestar',
        'Estudio y Lectura',
        'Trabajo y Código',
        'Hogar y Rutina',
        'Finanzas',
        'Social y Familia',
        'Creatividad y Arte',
        'Naturaleza y Mascotas',
        'Comida y Bebida',
        'Viajes y Aire Libre',
        'Hábitos a Dejar',
        'Símbolos y Logros',
      ];
      const actualGroupNames = HABIT_ICON_GROUPS.map(g => g.name);
      expect(actualGroupNames).toEqual(expectedGroupNames);
    });

    test('each group contains valid metadata and icons array with >= 10 icons', () => {
      HABIT_ICON_GROUPS.forEach(group => {
        expect(group.id).toBeTruthy();
        expect(group.name).toBeTruthy();
        expect(group.icon).toBeTruthy();
        expect(Array.isArray(group.icons)).toBe(true);
        expect(group.icons.length).toBeGreaterThanOrEqual(10);
      });
    });

    test('ALL_HABIT_ICONS contains >= 180 icons and zero duplicate emojis across catalogue', () => {
      expect(ALL_HABIT_ICONS.length).toBeGreaterThanOrEqual(180);

      const emojiSet = new Set<string>();
      const duplicates: string[] = [];

      for (const item of ALL_HABIT_ICONS) {
        expect(item.emoji).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.group).toBeTruthy();
        expect(Array.isArray(item.keywords)).toBe(true);
        expect(item.keywords.length).toBeGreaterThan(0);

        if (emojiSet.has(item.emoji)) {
          duplicates.push(item.emoji);
        }
        emojiSet.add(item.emoji);
      }

      expect(duplicates).toEqual([]);
      expect(emojiSet.size).toBe(ALL_HABIT_ICONS.length);
    });
  });

  describe('searchIcons', () => {
    test('matches icons with accent-insensitive search in Spanish', () => {
      const meditationResults = searchIcons('meditacion');
      expect(meditationResults.some(item => item.emoji === '🧘')).toBe(true);

      const runningResults = searchIcons('correr');
      expect(runningResults.some(item => item.emoji === '🏃')).toBe(true);

      const waterResults = searchIcons('agua');
      expect(waterResults.some(item => item.emoji === '💧')).toBe(true);

      const coffeeResults = searchIcons('cafe');
      expect(coffeeResults.some(item => item.emoji === '☕')).toBe(true);

      const musicResults = searchIcons('musica');
      expect(musicResults.some(item => item.emoji === '🎵')).toBe(true);
    });

    test('handles case-insensitivity and extra whitespace', () => {
      const resUpper = searchIcons('  MEDITACION  ');
      expect(resUpper.some(item => item.emoji === '🧘')).toBe(true);
    });

    test('matches english keywords correctly', () => {
      const waterRes = searchIcons('water');
      expect(waterRes.some(item => item.emoji === '💧')).toBe(true);

      const runningRes = searchIcons('running');
      expect(runningRes.some(item => item.emoji === '🏃')).toBe(true);
    });

    test('matches by direct emoji character', () => {
      const res = searchIcons('🧘');
      expect(res.some(item => item.emoji === '🧘')).toBe(true);
    });

    test('returns all icons when query is empty or whitespace', () => {
      expect(searchIcons('')).toEqual(ALL_HABIT_ICONS);
      expect(searchIcons('   ')).toEqual(ALL_HABIT_ICONS);
    });

    test('returns empty array when no icon matches', () => {
      const res = searchIcons('xyznonexistentquery999');
      expect(res).toEqual([]);
    });
  });

  describe('color palettes and presets', () => {
    test('HABIT_COLOR_PALETTES contains 12 harmonized color palettes with 5 tones each', () => {
      expect(HABIT_COLOR_PALETTES).toHaveLength(12);

      const expectedNames = [
        'Azul',
        'Cian',
        'Esmeralda',
        'Verde',
        'Ámbar',
        'Naranja',
        'Rojo',
        'Rosa',
        'Púrpura',
        'Violeta',
        'Índigo',
        'Neutro',
      ];
      expect(HABIT_COLOR_PALETTES.map(p => p.name)).toEqual(expectedNames);

      HABIT_COLOR_PALETTES.forEach(palette => {
        expect(palette.id).toBeTruthy();
        expect(palette.colors).toHaveLength(5);
        palette.colors.forEach(color => {
          expect(isValidHexColor(color)).toBe(true);
          expect(color).toMatch(/^#[0-9a-f]{6}$/);
        });
      });
    });

    test('ALL_PRESET_COLORS has ~60 colors and all are valid hex strings', () => {
      expect(ALL_PRESET_COLORS).toHaveLength(60);
      ALL_PRESET_COLORS.forEach(color => {
        expect(isValidHexColor(color)).toBe(true);
      });
    });
  });

  describe('color utilities', () => {
    describe('isValidHexColor', () => {
      test('accepts valid 3-digit and 6-digit hex formats with #', () => {
        expect(isValidHexColor('#fff')).toBe(true);
        expect(isValidHexColor('#FFF')).toBe(true);
        expect(isValidHexColor('#000')).toBe(true);
        expect(isValidHexColor('#3b82f6')).toBe(true);
        expect(isValidHexColor('#3B82F6')).toBe(true);
        expect(isValidHexColor('#fef08a')).toBe(true);
      });

      test('rejects invalid hex strings', () => {
        expect(isValidHexColor('fff')).toBe(false);
        expect(isValidHexColor('#ff')).toBe(false);
        expect(isValidHexColor('#ffff')).toBe(false);
        expect(isValidHexColor('#gggggg')).toBe(false);
        expect(isValidHexColor('rgb(0,0,0)')).toBe(false);
        expect(isValidHexColor('')).toBe(false);
        expect(isValidHexColor('   ')).toBe(false);
        // @ts-expect-error test non-string input
        expect(isValidHexColor(null)).toBe(false);
        // @ts-expect-error test non-string input
        expect(isValidHexColor(undefined)).toBe(false);
      });
    });

    describe('normalizeHexColor', () => {
      test('expands 3-digit hex to 6-digit lowercase hex with #', () => {
        expect(normalizeHexColor('#fff')).toBe('#ffffff');
        expect(normalizeHexColor('#FFF')).toBe('#ffffff');
        expect(normalizeHexColor('fff')).toBe('#ffffff');
        expect(normalizeHexColor('#abc')).toBe('#aabbcc');
      });

      test('adds # if missing and normalizes casing to lowercase', () => {
        expect(normalizeHexColor('3B82F6')).toBe('#3b82f6');
        expect(normalizeHexColor('#3B82F6')).toBe('#3b82f6');
        expect(normalizeHexColor('#3b82f6')).toBe('#3b82f6');
      });

      test('falls back safely for invalid input', () => {
        expect(normalizeHexColor('')).toBe('#000000');
        // @ts-expect-error test non-string input
        expect(normalizeHexColor(null)).toBe('#000000');
      });
    });

    describe('getReadableTextColor', () => {
      test('returns dark text #0f172a for bright backgrounds (WCAG contrast)', () => {
        expect(getReadableTextColor('#ffffff')).toBe('#0f172a');
        expect(getReadableTextColor('#fef08a')).toBe('#0f172a');
        expect(getReadableTextColor('#67e8f9')).toBe('#0f172a');
        expect(getReadableTextColor('#86efac')).toBe('#0f172a');
        expect(getReadableTextColor('#fdba74')).toBe('#0f172a');
      });

      test('returns white text #ffffff for dark backgrounds (WCAG contrast)', () => {
        expect(getReadableTextColor('#000000')).toBe('#ffffff');
        expect(getReadableTextColor('#1e3a8a')).toBe('#ffffff');
        expect(getReadableTextColor('#701a75')).toBe('#ffffff');
        expect(getReadableTextColor('#15803d')).toBe('#ffffff');
        expect(getReadableTextColor('#334155')).toBe('#ffffff');
      });

      test('handles short hex codes and un-prefixed hex codes', () => {
        expect(getReadableTextColor('#fff')).toBe('#0f172a');
        expect(getReadableTextColor('000')).toBe('#ffffff');
      });
    });
  });

  describe('barrel exports', () => {
    test('exports all catalog entities from root barrel alias', () => {
      expect(typeof barrelFromAlias.searchIcons).toBe('function');
      expect(typeof barrelFromAlias.isValidHexColor).toBe('function');
      expect(typeof barrelFromAlias.normalizeHexColor).toBe('function');
      expect(typeof barrelFromAlias.getReadableTextColor).toBe('function');
      expect(Array.isArray(barrelFromAlias.HABIT_ICON_GROUPS)).toBe(true);
      expect(Array.isArray(barrelFromAlias.ALL_HABIT_ICONS)).toBe(true);
      expect(Array.isArray(barrelFromAlias.HABIT_COLOR_PALETTES)).toBe(true);
      expect(Array.isArray(barrelFromAlias.ALL_PRESET_COLORS)).toBe(true);
    });

    test('types are exported and compile without issue', () => {
      const icon: HabitIconItem = {
        emoji: '🧘',
        label: 'Meditación',
        group: 'mente-bienestar',
        keywords: ['meditacion', 'zen'],
      };
      const group: HabitIconGroup = {
        id: 'mente-bienestar',
        name: 'Mente y Bienestar',
        icon: '🧘',
        icons: [icon],
      };
      const palette: HabitColorPalette = {
        id: 'blue',
        name: 'Azul',
        colors: ['#3b82f6'],
      };

      expect(icon.emoji).toBe('🧘');
      expect(group.id).toBe('mente-bienestar');
      expect(palette.name).toBe('Azul');
    });
  });
});
