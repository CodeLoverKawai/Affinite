import { describe, expect, test } from 'vitest';

import {
  formatWeeklyJournalKey,
  getWeekDateRange,
  isJournalString,
  isWeeklyJournalString,
} from '../store/journal';

describe('weekly journal helpers', () => {
  test('isJournalString accepts both daily YYYY-MM-DD and weekly YYYY-Www', () => {
    expect(isJournalString('2026-10-17')).toBe(true);
    expect(isJournalString('2026-W42')).toBe(true);
    expect(isJournalString('2026-W01')).toBe(true);
    expect(isJournalString('invalid')).toBe(false);
    expect(isJournalString('')).toBe(false);
    expect(isJournalString(false)).toBe(false);
    expect(isJournalString(undefined)).toBe(false);
  });

  test('isWeeklyJournalString accepts only weekly YYYY-Www', () => {
    expect(isWeeklyJournalString('2026-W42')).toBe(true);
    expect(isWeeklyJournalString('2026-W05')).toBe(true);
    expect(isWeeklyJournalString('2026-10-17')).toBe(false);
    expect(isWeeklyJournalString('2026-W5')).toBe(false);
    expect(isWeeklyJournalString(undefined)).toBe(false);
  });

  test('formatWeeklyJournalKey formats dates into ISO week keys YYYY-Www', () => {
    // 2026-10-17 is a Saturday in ISO week 42 of 2026
    expect(formatWeeklyJournalKey('2026-10-17')).toBe('2026-W42');
    // 2026-01-05 is a Monday in ISO week 2 of 2026
    expect(formatWeeklyJournalKey('2026-01-05')).toBe('2026-W02');
  });

  test('getWeekDateRange returns Monday start and Sunday end of the ISO week', () => {
    const range = getWeekDateRange('2026-W42');
    expect(range.year).toBe(2026);
    expect(range.weekNumber).toBe(42);
    expect(range.start.format('YYYY-MM-DD')).toBe('2026-10-12'); // Monday
    expect(range.end.format('YYYY-MM-DD')).toBe('2026-10-18'); // Sunday
  });
});
