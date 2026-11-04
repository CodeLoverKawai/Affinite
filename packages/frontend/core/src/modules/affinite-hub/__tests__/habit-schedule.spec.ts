import { describe, expect, test } from 'vitest';
import dayjs from 'dayjs';

import * as barrelFromAlias from '@affine/core/modules/affinite-hub';
import {
  describeSchedule,
  expectedCompletionsInRange,
  getScheduledDates,
  type HabitSchedule,
  isHabitScheduledOn,
  nextScheduledDates,
  normalizeSchedule,
} from '../habit-schedule';
import type { HabitSchedule as HabitScheduleFromTypes } from '../types';

describe('habit-schedule', () => {
  describe('normalizeSchedule', () => {
    test('normalizes null, undefined, primitives and empty objects to daily', () => {
      expect(normalizeSchedule(null)).toEqual({ mode: 'daily' });
      expect(normalizeSchedule(undefined)).toEqual({ mode: 'daily' });
      expect(normalizeSchedule('string')).toEqual({ mode: 'daily' });
      expect(normalizeSchedule(123)).toEqual({ mode: 'daily' });
      expect(normalizeSchedule(true)).toEqual({ mode: 'daily' });
      expect(normalizeSchedule({})).toEqual({ mode: 'daily' });
      expect(normalizeSchedule({ mode: 'unknown' })).toEqual({ mode: 'daily' });
    });

    test('normalizes valid daily mode', () => {
      expect(normalizeSchedule({ mode: 'daily' })).toEqual({ mode: 'daily' });
    });

    test('normalizes weekdays mode correctly', () => {
      // Valid sorted unique array
      expect(normalizeSchedule({ mode: 'weekdays', days: [1, 3, 5] })).toEqual({
        mode: 'weekdays',
        days: [1, 3, 5],
      });

      // Unsorted with duplicates
      expect(normalizeSchedule({ mode: 'weekdays', days: [5, 1, 3, 1, 5] })).toEqual({
        mode: 'weekdays',
        days: [1, 3, 5],
      });

      // Filter out non-integers, strings, and numbers outside 1..7
      expect(
        normalizeSchedule({
          mode: 'weekdays',
          days: [0, 1.5, 2, 8, '3', null, -1, 7],
        })
      ).toEqual({
        mode: 'weekdays',
        days: [2, 7],
      });

      // If all 7 days are selected, degenerates to daily
      expect(
        normalizeSchedule({
          mode: 'weekdays',
          days: [1, 2, 3, 4, 5, 6, 7],
        })
      ).toEqual({ mode: 'daily' });

      // If empty array or no valid days, degenerates to daily
      expect(normalizeSchedule({ mode: 'weekdays', days: [] })).toEqual({ mode: 'daily' });
      expect(normalizeSchedule({ mode: 'weekdays', days: [0, 9] })).toEqual({ mode: 'daily' });
      expect(normalizeSchedule({ mode: 'weekdays' })).toEqual({ mode: 'daily' });
      expect(normalizeSchedule({ mode: 'weekdays', days: 'invalid' })).toEqual({ mode: 'daily' });
    });

    test('normalizes interval mode correctly', () => {
      // Valid interval
      expect(
        normalizeSchedule({ mode: 'interval', every: 3, anchor: '2026-01-01' })
      ).toEqual({
        mode: 'interval',
        every: 3,
        anchor: '2026-01-01',
      });

      // every < 2 defaults to daily
      expect(
        normalizeSchedule({ mode: 'interval', every: 1, anchor: '2026-01-01' })
      ).toEqual({ mode: 'daily' });
      expect(
        normalizeSchedule({ mode: 'interval', every: 0, anchor: '2026-01-01' })
      ).toEqual({ mode: 'daily' });
      expect(
        normalizeSchedule({ mode: 'interval', every: -2, anchor: '2026-01-01' })
      ).toEqual({ mode: 'daily' });
      expect(
        normalizeSchedule({ mode: 'interval', every: 2.5, anchor: '2026-01-01' })
      ).toEqual({ mode: 'daily' });

      // Invalid anchor falls back to today formatted as YYYY-MM-DD
      const today = dayjs().format('YYYY-MM-DD');
      const normalizedWithBadAnchor = normalizeSchedule({
        mode: 'interval',
        every: 2,
        anchor: 'invalid-date',
      });
      expect(normalizedWithBadAnchor).toEqual({
        mode: 'interval',
        every: 2,
        anchor: today,
      });

      const normalizedWithMissingAnchor = normalizeSchedule({
        mode: 'interval',
        every: 4,
      });
      expect(normalizedWithMissingAnchor).toEqual({
        mode: 'interval',
        every: 4,
        anchor: today,
      });
    });

    test('normalizes weekly-count mode correctly', () => {
      // Valid count
      expect(normalizeSchedule({ mode: 'weekly-count', timesPerWeek: 3 })).toEqual({
        mode: 'weekly-count',
        timesPerWeek: 3,
      });

      // Clamps < 1 to 1
      expect(normalizeSchedule({ mode: 'weekly-count', timesPerWeek: 0 })).toEqual({
        mode: 'weekly-count',
        timesPerWeek: 1,
      });
      expect(normalizeSchedule({ mode: 'weekly-count', timesPerWeek: -3 })).toEqual({
        mode: 'weekly-count',
        timesPerWeek: 1,
      });

      // >= 7 degenerates to daily
      expect(normalizeSchedule({ mode: 'weekly-count', timesPerWeek: 7 })).toEqual({
        mode: 'daily',
      });
      expect(normalizeSchedule({ mode: 'weekly-count', timesPerWeek: 10 })).toEqual({
        mode: 'daily',
      });

      // Floats are rounded
      expect(normalizeSchedule({ mode: 'weekly-count', timesPerWeek: 3.7 })).toEqual({
        mode: 'weekly-count',
        timesPerWeek: 4,
      });
      expect(normalizeSchedule({ mode: 'weekly-count', timesPerWeek: 2.2 })).toEqual({
        mode: 'weekly-count',
        timesPerWeek: 2,
      });

      // Invalid / non-number timesPerWeek defaults to daily
      expect(normalizeSchedule({ mode: 'weekly-count' })).toEqual({ mode: 'daily' });
      expect(normalizeSchedule({ mode: 'weekly-count', timesPerWeek: 'invalid' })).toEqual({
        mode: 'daily',
      });
      expect(normalizeSchedule({ mode: 'weekly-count', timesPerWeek: Number.NaN })).toEqual({
        mode: 'daily',
      });
    });
  });

  describe('isHabitScheduledOn', () => {
    test('returns false for invalid date strings', () => {
      expect(isHabitScheduledOn({ mode: 'daily' }, 'not-a-date')).toBe(false);
      expect(isHabitScheduledOn({ mode: 'daily' }, '')).toBe(false);
    });

    test('daily is true for any valid date', () => {
      expect(isHabitScheduledOn({ mode: 'daily' }, '2026-11-03')).toBe(true);
      expect(isHabitScheduledOn(undefined, '2026-11-03')).toBe(true);
      expect(isHabitScheduledOn(null, '2026-12-31')).toBe(true);
    });

    test('weekdays matches ISO day of week (1=Lun ... 7=Dom)', () => {
      // 2026-11-02 is Monday (1), 2026-11-03 is Tuesday (2), 2026-11-08 is Sunday (7)
      const schedule: HabitSchedule = { mode: 'weekdays', days: [1, 5] }; // Mon & Fri

      expect(isHabitScheduledOn(schedule, '2026-11-02')).toBe(true); // Monday
      expect(isHabitScheduledOn(schedule, '2026-11-03')).toBe(false); // Tuesday
      expect(isHabitScheduledOn(schedule, '2026-11-04')).toBe(false); // Wednesday
      expect(isHabitScheduledOn(schedule, '2026-11-06')).toBe(true); // Friday
      expect(isHabitScheduledOn(schedule, '2026-11-07')).toBe(false); // Saturday
      expect(isHabitScheduledOn(schedule, '2026-11-08')).toBe(false); // Sunday
    });

    test('interval matches dates with euclidean modulo relative to anchor', () => {
      const schedule: HabitSchedule = {
        mode: 'interval',
        every: 3,
        anchor: '2026-11-01',
      };

      // Anchor day (diff = 0)
      expect(isHabitScheduledOn(schedule, '2026-11-01')).toBe(true);

      // Future dates
      expect(isHabitScheduledOn(schedule, '2026-11-02')).toBe(false); // diff 1
      expect(isHabitScheduledOn(schedule, '2026-11-03')).toBe(false); // diff 2
      expect(isHabitScheduledOn(schedule, '2026-11-04')).toBe(true); // diff 3
      expect(isHabitScheduledOn(schedule, '2026-11-07')).toBe(true); // diff 6

      // Past dates before anchor (negative diff)
      expect(isHabitScheduledOn(schedule, '2026-10-31')).toBe(false); // diff -1
      expect(isHabitScheduledOn(schedule, '2026-10-30')).toBe(false); // diff -2
      expect(isHabitScheduledOn(schedule, '2026-10-29')).toBe(true); // diff -3
      expect(isHabitScheduledOn(schedule, '2026-10-26')).toBe(true); // diff -6
    });

    test('weekly-count is always false on specific dates', () => {
      const schedule: HabitSchedule = { mode: 'weekly-count', timesPerWeek: 3 };
      expect(isHabitScheduledOn(schedule, '2026-11-02')).toBe(false);
      expect(isHabitScheduledOn(schedule, '2026-11-03')).toBe(false);
      expect(isHabitScheduledOn(schedule, '2026-11-08')).toBe(false);
    });

    test('handles leap years and month boundaries in interval calculations', () => {
      // 2024 is leap year (Feb has 29 days)
      const leapSchedule: HabitSchedule = {
        mode: 'interval',
        every: 2,
        anchor: '2024-02-28',
      };
      expect(isHabitScheduledOn(leapSchedule, '2024-02-28')).toBe(true); // diff 0
      expect(isHabitScheduledOn(leapSchedule, '2024-02-29')).toBe(false); // diff 1
      expect(isHabitScheduledOn(leapSchedule, '2024-03-01')).toBe(true); // diff 2
      expect(isHabitScheduledOn(leapSchedule, '2024-03-02')).toBe(false); // diff 3

      // Month boundary across 30-day month
      const monthBoundarySchedule: HabitSchedule = {
        mode: 'interval',
        every: 2,
        anchor: '2026-04-30',
      };
      expect(isHabitScheduledOn(monthBoundarySchedule, '2026-04-30')).toBe(true);
      expect(isHabitScheduledOn(monthBoundarySchedule, '2026-05-01')).toBe(false);
      expect(isHabitScheduledOn(monthBoundarySchedule, '2026-05-02')).toBe(true);
    });
  });

  describe('getScheduledDates', () => {
    test('returns all dates in range for daily', () => {
      const dates = getScheduledDates(
        { mode: 'daily' },
        '2026-11-01',
        '2026-11-04'
      );
      expect(dates).toEqual([
        '2026-11-01',
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
      ]);
    });

    test('returns only matching weekdays in range', () => {
      // 2026-11-02 is Lun, 2026-11-04 is Mié, 2026-11-06 is Vie
      const schedule: HabitSchedule = { mode: 'weekdays', days: [1, 3, 5] };
      const dates = getScheduledDates(
        schedule,
        '2026-11-02',
        '2026-11-08'
      );
      expect(dates).toEqual(['2026-11-02', '2026-11-04', '2026-11-06']);
    });

    test('returns matching interval dates in range', () => {
      const schedule: HabitSchedule = {
        mode: 'interval',
        every: 3,
        anchor: '2026-11-01',
      };
      const dates = getScheduledDates(
        schedule,
        '2026-11-01',
        '2026-11-10'
      );
      expect(dates).toEqual([
        '2026-11-01',
        '2026-11-04',
        '2026-11-07',
        '2026-11-10',
      ]);
    });

    test('returns empty array for weekly-count mode', () => {
      const schedule: HabitSchedule = { mode: 'weekly-count', timesPerWeek: 4 };
      const dates = getScheduledDates(
        schedule,
        '2026-11-01',
        '2026-11-07'
      );
      expect(dates).toEqual([]);
    });

    test('returns empty array when start > end or invalid dates', () => {
      expect(
        getScheduledDates({ mode: 'daily' }, '2026-11-05', '2026-11-01')
      ).toEqual([]);
      expect(getScheduledDates({ mode: 'daily' }, 'invalid', '2026-11-01')).toEqual([]);
    });
  });

  describe('expectedCompletionsInRange', () => {
    test('calculates completions for daily and weekdays based on scheduled dates count', () => {
      expect(
        expectedCompletionsInRange(
          { mode: 'daily' },
          '2026-11-02',
          '2026-11-08'
        )
      ).toBe(7);

      expect(
        expectedCompletionsInRange(
          { mode: 'weekdays', days: [1, 3, 5] },
          '2026-11-02',
          '2026-11-08'
        )
      ).toBe(3);

      expect(
        expectedCompletionsInRange(
          { mode: 'interval', every: 2, anchor: '2026-11-02' },
          '2026-11-02',
          '2026-11-08'
        )
      ).toBe(4); // Nov 2, 4, 6, 8
    });

    test('calculates completions for weekly-count mode proportionally', () => {
      const schedule: HabitSchedule = { mode: 'weekly-count', timesPerWeek: 3 };

      // Exact 7 days (ISO week)
      expect(
        expectedCompletionsInRange(schedule, '2026-11-02', '2026-11-08')
      ).toBe(3);

      // 14 days (2 weeks)
      expect(
        expectedCompletionsInRange(schedule, '2026-11-02', '2026-11-15')
      ).toBe(6);

      // 3 days: round(3 * 3 / 7) = round(1.285) = 1
      expect(
        expectedCompletionsInRange(schedule, '2026-11-02', '2026-11-04')
      ).toBe(1);

      // 5 days: round(3 * 5 / 7) = round(2.14) = 2
      expect(
        expectedCompletionsInRange(schedule, '2026-11-02', '2026-11-06')
      ).toBe(2);
    });

    test('returns 0 when start > end or invalid dates', () => {
      expect(
        expectedCompletionsInRange(
          { mode: 'daily' },
          '2026-11-10',
          '2026-11-05'
        )
      ).toBe(0);
      expect(
        expectedCompletionsInRange({ mode: 'daily' }, 'invalid', '2026-11-05')
      ).toBe(0);
    });
  });

  describe('describeSchedule', () => {
    test('describes daily mode', () => {
      expect(describeSchedule({ mode: 'daily' })).toBe('Todos los días');
      expect(describeSchedule(undefined)).toBe('Todos los días');
      expect(describeSchedule(null)).toBe('Todos los días');
    });

    test('describes weekdays presets and combinations in Spanish', () => {
      expect(
        describeSchedule({ mode: 'weekdays', days: [1, 2, 3, 4, 5] })
      ).toBe('Lunes a viernes');

      expect(describeSchedule({ mode: 'weekdays', days: [6, 7] })).toBe(
        'Fines de semana'
      );

      expect(describeSchedule({ mode: 'weekdays', days: [1, 3, 5] })).toBe(
        'Lun · Mié · Vie'
      );

      expect(describeSchedule({ mode: 'weekdays', days: [2, 4] })).toBe(
        'Mar · Jue'
      );

      expect(describeSchedule({ mode: 'weekdays', days: [7] })).toBe('Dom');
    });

    test('describes interval mode in Spanish', () => {
      expect(
        describeSchedule({ mode: 'interval', every: 2, anchor: '2026-01-01' })
      ).toBe('Un día sí, uno no');

      expect(
        describeSchedule({ mode: 'interval', every: 3, anchor: '2026-01-01' })
      ).toBe('Cada 3 días');

      expect(
        describeSchedule({ mode: 'interval', every: 5, anchor: '2026-01-01' })
      ).toBe('Cada 5 días');
    });

    test('describes weekly-count mode in Spanish', () => {
      expect(describeSchedule({ mode: 'weekly-count', timesPerWeek: 1 })).toBe(
        '1 vez por semana'
      );
      expect(describeSchedule({ mode: 'weekly-count', timesPerWeek: 3 })).toBe(
        '3 veces por semana'
      );
      expect(describeSchedule({ mode: 'weekly-count', timesPerWeek: 5 })).toBe(
        '5 veces por semana'
      );
    });
  });

  describe('nextScheduledDates', () => {
    test('returns next count dates for daily mode starting at fromStr', () => {
      const dates = nextScheduledDates(
        { mode: 'daily' },
        '2026-11-03',
        3
      );
      expect(dates).toEqual(['2026-11-03', '2026-11-04', '2026-11-05']);
    });

    test('returns next count dates for weekdays mode', () => {
      // 2026-11-03 is Tuesday (2). Schedule is Mon(1) & Fri(5).
      // Next scheduled dates: 2026-11-06 (Fri), 2026-11-09 (Mon), 2026-11-13 (Fri)
      const schedule: HabitSchedule = { mode: 'weekdays', days: [1, 5] };
      const dates = nextScheduledDates(schedule, '2026-11-03', 3);
      expect(dates).toEqual(['2026-11-06', '2026-11-09', '2026-11-13']);
    });

    test('returns next count dates for interval mode', () => {
      const schedule: HabitSchedule = {
        mode: 'interval',
        every: 3,
        anchor: '2026-11-01',
      };
      // From 2026-11-02: next is 11-04, 11-07, 11-10
      const dates = nextScheduledDates(schedule, '2026-11-02', 3);
      expect(dates).toEqual(['2026-11-04', '2026-11-07', '2026-11-10']);
    });

    test('returns empty array for weekly-count mode', () => {
      const schedule: HabitSchedule = { mode: 'weekly-count', timesPerWeek: 3 };
      expect(nextScheduledDates(schedule, '2026-11-03', 5)).toEqual([]);
    });

    test('returns empty array when count <= 0', () => {
      expect(nextScheduledDates({ mode: 'daily' }, '2026-11-03', 0)).toEqual([]);
      expect(nextScheduledDates({ mode: 'daily' }, '2026-11-03', -2)).toEqual([]);
    });

    test('defaults to today when fromStr is omitted or invalid', () => {
      const dates = nextScheduledDates({ mode: 'daily' }, undefined, 2);
      expect(dates).toHaveLength(2);
      expect(dates[0]).toBe(dayjs().format('YYYY-MM-DD'));
    });
  });

  describe('barrel re-exports', () => {
    test('exports functions and types from index and alias', () => {
      expect(typeof barrelFromAlias.describeSchedule).toBe('function');
      expect(typeof barrelFromAlias.expectedCompletionsInRange).toBe('function');
      expect(typeof barrelFromAlias.getScheduledDates).toBe('function');
      expect(typeof barrelFromAlias.isHabitScheduledOn).toBe('function');
      expect(typeof barrelFromAlias.nextScheduledDates).toBe('function');
      expect(typeof barrelFromAlias.normalizeSchedule).toBe('function');

      const typed: HabitScheduleFromTypes = { mode: 'daily' };
      expect(typed.mode).toBe('daily');
    });
  });
});
