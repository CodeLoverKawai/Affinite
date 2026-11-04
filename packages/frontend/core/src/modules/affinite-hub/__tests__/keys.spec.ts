import { describe, expect, test } from 'vitest';

import {
  AFFINITE_CACHE_CALENDAR_SECRETS_PREFIX,
  AFFINITE_CACHE_STREAKS,
  AFFINITE_YMAP_BOARD,
  AFFINITE_YMAP_CALENDAR,
  AFFINITE_YMAP_HABITS,
  AFFINITE_YMAP_STREAKS,
  LEGACY_HABIT_ID_MAP,
  normalizeHabitId,
} from '../keys';

describe('affinite-hub keys', () => {
  test('canonical Yjs map keys are non-empty strings', () => {
    expect(AFFINITE_YMAP_HABITS).toBe('affinite_habits_v1');
    expect(AFFINITE_YMAP_STREAKS).toBe('affinite_streaks_v1');
    expect(AFFINITE_YMAP_CALENDAR).toBe('affinite_calendar_v1');
    expect(AFFINITE_YMAP_BOARD).toBe('board_data');
  });

  test('canonical cache keys and prefixes are non-empty strings', () => {
    expect(AFFINITE_CACHE_STREAKS).toBe('affinite_streaks_cache_v1');
    expect(AFFINITE_CACHE_CALENDAR_SECRETS_PREFIX).toBe('affinite_calendar_secrets_v1:');
  });

  test('LEGACY_HABIT_ID_MAP unifies historical habit IDs', () => {
    expect(LEGACY_HABIT_ID_MAP['h-water']).toBe('habit-water');
    expect(LEGACY_HABIT_ID_MAP['h-exercise']).toBe('habit-exercise');
    expect(LEGACY_HABIT_ID_MAP['h-read']).toBe('habit-reading');
    expect(LEGACY_HABIT_ID_MAP['h-meditate']).toBe('habit-meditation');
    expect(LEGACY_HABIT_ID_MAP['h-code']).toBe('habit-code');
  });

  test('normalizeHabitId maps legacy IDs to canonical IDs', () => {
    expect(normalizeHabitId('h-water')).toBe('habit-water');
    expect(normalizeHabitId('h-read')).toBe('habit-reading');
    expect(normalizeHabitId('h-exercise')).toBe('habit-exercise');
    expect(normalizeHabitId('h-meditate')).toBe('habit-meditation');
    expect(normalizeHabitId('h-code')).toBe('habit-code');
  });

  test('normalizeHabitId preserves canonical and unknown IDs', () => {
    expect(normalizeHabitId('habit-water')).toBe('habit-water');
    expect(normalizeHabitId('custom-habit-123')).toBe('custom-habit-123');
    expect(normalizeHabitId('')).toBe('');
  });
});
