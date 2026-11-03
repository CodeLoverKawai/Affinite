import { describe, expect, test } from 'vitest';

import {
  CANONICAL_CATEGORIES,
  CATEGORY_ALIASES,
  CATEGORY_COLORS,
  normalizeCategory,
} from '../categories';

describe('affinite-hub categories taxonomy', () => {
  test('CANONICAL_CATEGORIES contains standard canonical categories in expected order', () => {
    expect(CANONICAL_CATEGORIES).toEqual([
      'Trabajo',
      'Estudio',
      'Salud',
      'Fitness',
      'Mente',
      'Productividad',
      'Personal',
      'General',
    ]);
    expect(CANONICAL_CATEGORIES).toHaveLength(8);
  });

  test('CATEGORY_COLORS maps each canonical category to standard hex color', () => {
    expect(CATEGORY_COLORS).toEqual({
      Trabajo: '#3b82f6',
      Estudio: '#8b5cf6',
      Salud: '#10b981',
      Fitness: '#f59e0b',
      Mente: '#06b6d4',
      Productividad: '#ec4899',
      Personal: '#6366f1',
      General: '#64748b',
    });

    for (const cat of CANONICAL_CATEGORIES) {
      expect(CATEGORY_COLORS[cat]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test('CATEGORY_ALIASES includes comprehensive English and Spanish aliases', () => {
    // English terms
    expect(CATEGORY_ALIASES['work']).toBe('Trabajo');
    expect(CATEGORY_ALIASES['study']).toBe('Estudio');
    expect(CATEGORY_ALIASES['health']).toBe('Salud');
    expect(CATEGORY_ALIASES['gym']).toBe('Fitness');
    expect(CATEGORY_ALIASES['workout']).toBe('Fitness');
    expect(CATEGORY_ALIASES['meditation']).toBe('Mente');
    expect(CATEGORY_ALIASES['productivity']).toBe('Productividad');

    // Spanish normalized terms
    expect(CATEGORY_ALIASES['trabajo']).toBe('Trabajo');
    expect(CATEGORY_ALIASES['estudio']).toBe('Estudio');
    expect(CATEGORY_ALIASES['salud']).toBe('Salud');
    expect(CATEGORY_ALIASES['fitness']).toBe('Fitness');
    expect(CATEGORY_ALIASES['ejercicio']).toBe('Fitness');
    expect(CATEGORY_ALIASES['meditacion']).toBe('Mente');
    expect(CATEGORY_ALIASES['mente']).toBe('Mente');
  });

  describe('normalizeCategory', () => {
    test('falls back cleanly to General for empty, whitespace, null, or undefined', () => {
      expect(normalizeCategory()).toBe('General');
      expect(normalizeCategory(undefined)).toBe('General');
      // @ts-expect-error testing runtime null handling
      expect(normalizeCategory(null)).toBe('General');
      expect(normalizeCategory('')).toBe('General');
      expect(normalizeCategory('   ')).toBe('General');
      expect(normalizeCategory('\t\n')).toBe('General');
    });

    test('preserves canonical categories verbatim', () => {
      for (const cat of CANONICAL_CATEGORIES) {
        expect(normalizeCategory(cat)).toBe(cat);
      }
    });

    test('normalizes casing and trims whitespace', () => {
      expect(normalizeCategory('  trabajo  ')).toBe('Trabajo');
      expect(normalizeCategory('TRABAJO')).toBe('Trabajo');
      expect(normalizeCategory('sALuD')).toBe('Salud');
      expect(normalizeCategory('  fitness \n')).toBe('Fitness');
      expect(normalizeCategory('ESTUDIO')).toBe('Estudio');
    });

    test('normalizes accented characters correctly', () => {
      expect(normalizeCategory('meditación')).toBe('Mente');
      expect(normalizeCategory('salúd')).toBe('Salud');
      expect(normalizeCategory('nutrición')).toBe('Salud');
      expect(normalizeCategory('educación')).toBe('Estudio');
      expect(normalizeCategory('organización')).toBe('Productividad');
    });

    test('maps common English aliases to canonical Spanish categories', () => {
      expect(normalizeCategory('work')).toBe('Trabajo');
      expect(normalizeCategory('job')).toBe('Trabajo');
      expect(normalizeCategory('study')).toBe('Estudio');
      expect(normalizeCategory('health')).toBe('Salud');
      expect(normalizeCategory('gym')).toBe('Fitness');
      expect(normalizeCategory('workout')).toBe('Fitness');
      expect(normalizeCategory('exercise')).toBe('Fitness');
      expect(normalizeCategory('meditation')).toBe('Mente');
      expect(normalizeCategory('mindfulness')).toBe('Mente');
      expect(normalizeCategory('productivity')).toBe('Productividad');
      expect(normalizeCategory('personal')).toBe('Personal');
    });

    test('falls back cleanly to General for unknown or unrecognized categories', () => {
      expect(normalizeCategory('completely-unknown-category-xyz')).toBe('General');
      expect(normalizeCategory('123456')).toBe('General');
      expect(normalizeCategory('foo_bar_baz')).toBe('General');
    });
  });
});
