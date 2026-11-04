import { describe, expect, it } from 'vitest';

import {
  calculateMonthlyConsistency,
  calculateStreak,
  calculateWeeklyConsistency,
  isHabitDoneOnDate,
  LEGACY_HABIT_ID_MAP,
  normalizeHabitCreatedAt,
  parseHabitsPayload,
  resolveHabitById,
  type HabitItem,
  type HabitSchedule,
} from '../habits-calculator';

describe('Habits Calculator', () => {
  describe('isHabitDoneOnDate', () => {
    it('should correctly evaluate boolean habits', () => {
      expect(isHabitDoneOnDate(true, 'boolean')).toBe(true);
      expect(isHabitDoneOnDate(false, 'boolean')).toBe(false);
      expect(isHabitDoneOnDate(undefined, 'boolean')).toBe(false);
    });

    it('should correctly evaluate quantitative habits with targets', () => {
      expect(isHabitDoneOnDate(2000, 'quantitative', 2000)).toBe(true);
      expect(isHabitDoneOnDate(2500, 'quantitative', 2000)).toBe(true);
      expect(isHabitDoneOnDate(1500, 'quantitative', 2000)).toBe(false);
      expect(isHabitDoneOnDate(0, 'quantitative', 2000)).toBe(false);
      expect(isHabitDoneOnDate(undefined, 'quantitative', 2000)).toBe(false);
    });
  });

  describe('calculateStreak', () => {
    it('should calculate current streak and best streak accurately', () => {
      // 5 consecutive days: 2026-10-13 to 2026-10-17
      const entries: Record<string, boolean | number> = {
        '2026-10-01': true,
        '2026-10-02': true,
        '2026-10-03': true, // Streak of 3
        '2026-10-04': false, // Break
        '2026-10-13': true,
        '2026-10-14': true,
        '2026-10-15': true,
        '2026-10-16': true,
        '2026-10-17': true, // Current streak of 5
      };

      const result = calculateStreak(entries, 'boolean', undefined, '2026-10-17');
      expect(result.currentStreak).toBe(5);
      expect(result.bestStreak).toBe(5);
      expect(result.totalCompletions).toBe(8);
    });

    it('should keep streak alive if yesterday was completed even if today is not yet done', () => {
      // Reference date: 2026-10-18 (today). Yesterday (2026-10-17) was done.
      const entries: Record<string, boolean | number> = {
        '2026-10-15': true,
        '2026-10-16': true,
        '2026-10-17': true,
      };

      const result = calculateStreak(entries, 'boolean', undefined, '2026-10-18');
      expect(result.currentStreak).toBe(3);
    });

    it('should reset current streak to 0 if last completion was more than 1 day ago', () => {
      const entries: Record<string, boolean | number> = {
        '2026-10-10': true,
        '2026-10-11': true,
      };

      const result = calculateStreak(entries, 'boolean', undefined, '2026-10-17');
      expect(result.currentStreak).toBe(0);
      expect(result.bestStreak).toBe(2);
    });
  });

  describe('calculateWeeklyConsistency', () => {
    it('should return completion count and percentage for a given ISO week', () => {
      // Week 2026-W42: 2026-10-12 to 2026-10-18
      const entries: Record<string, boolean | number> = {
        '2026-10-12': true,
        '2026-10-13': true,
        '2026-10-14': false,
        '2026-10-15': true,
        '2026-10-16': true,
        '2026-10-17': true,
        '2026-10-18': false,
      };

      const { count, total, percentage } = calculateWeeklyConsistency(
        entries,
        '2026-W42',
        'boolean'
      );
      expect(count).toBe(5);
      expect(total).toBe(7);
      expect(percentage).toBe(71); // 5/7 = 71.4% -> 71%
    });
  });

  describe('calculateMonthlyConsistency', () => {
    it('should return completion count and rate for a given month', () => {
      // October 2026 (31 days)
      const entries: Record<string, boolean | number> = {
        '2026-10-01': true,
        '2026-10-02': true,
        '2026-10-03': true,
      };

      const { count, daysInMonth, percentage } = calculateMonthlyConsistency(
        entries,
        '2026-10',
        'boolean'
      );
      expect(count).toBe(3);
      expect(daysInMonth).toBe(31);
      expect(percentage).toBe(10); // 3/31 = 9.67% -> 10%
    });
  });

  describe('parseHabitsPayload & Legacy ID Migration', () => {
    it('should parse both JSON string and direct Array payloads while normalizing legacy IDs', () => {
      const rawArray = [
        {
          id: 'h-read',
          title: 'Lectura 20 Páginas',
          icon: '📚',
          category: 'Estudio',
          type: 'quantitative',
          targetValue: 20,
          unit: 'págs',
          entries: { '2026-10-15': 20 },
        },
        {
          id: 'h-water',
          title: 'Tomar 2L de Agua',
          icon: '💧',
          category: 'Salud',
          type: 'quantitative',
          targetValue: 2000,
          unit: 'ml',
          entries: { '2026-10-15': 2000 },
        },
      ];

      const fromArray = parseHabitsPayload(rawArray);
      expect(fromArray).not.toBeNull();
      expect(fromArray?.[0].id).toBe('habit-reading');
      expect(fromArray?.[1].id).toBe('habit-water');

      const fromJsonString = parseHabitsPayload(JSON.stringify(rawArray));
      expect(fromJsonString).toEqual(fromArray);

      expect(parseHabitsPayload(null)).toBeNull();
      expect(parseHabitsPayload(undefined)).toBeNull();
      expect(parseHabitsPayload('invalid-json')).toBeNull();
      expect(parseHabitsPayload({ notAnArray: true })).toBeNull();
    });

    it('should resolve habits across legacy and canonical IDs via resolveHabitById', () => {
      expect(LEGACY_HABIT_ID_MAP['h-water']).toBe('habit-water');
      expect(LEGACY_HABIT_ID_MAP['h-exercise']).toBe('habit-exercise');
      expect(LEGACY_HABIT_ID_MAP['h-read']).toBe('habit-reading');
      expect(LEGACY_HABIT_ID_MAP['h-meditate']).toBe('habit-meditation');
      expect(LEGACY_HABIT_ID_MAP['h-code']).toBe('habit-code');

      const habits: HabitItem[] = [
        {
          id: 'habit-reading',
          title: 'Lectura 20 Páginas',
          icon: '📚',
          category: 'Estudio',
          type: 'quantitative',
          targetValue: 20,
          unit: 'págs',
          entries: {},
        },
      ];

      expect(resolveHabitById(habits, 'h-read')?.id).toBe('habit-reading');
      expect(resolveHabitById(habits, 'habit-reading')?.id).toBe('habit-reading');
    });
  });

  describe('normalizeHabitCreatedAt', () => {
    it('should preserve valid positive numbers and floor them', () => {
      const fixedTimestamp = 1730500000000;
      expect(normalizeHabitCreatedAt(fixedTimestamp)).toBe(1730500000000);
      expect(normalizeHabitCreatedAt(1730500000000.85)).toBe(1730500000000);
    });

    it('should parse ISO and date strings to millisecond timestamps', () => {
      const isoStr = '2026-10-01T12:00:00.000Z';
      expect(normalizeHabitCreatedAt(isoStr)).toBe(Date.parse(isoStr));

      const dateStr = '2026-10-01';
      expect(normalizeHabitCreatedAt(dateStr)).toBe(Date.parse(dateStr));

      // String representation of a numeric timestamp
      expect(normalizeHabitCreatedAt('1730500000000')).toBe(1730500000000);
    });

    it('should fallback to fallbackNow for null, undefined, empty string, NaN, or non-positive numbers', () => {
      const fallback = 1730000000000;
      expect(normalizeHabitCreatedAt(undefined, fallback)).toBe(fallback);
      expect(normalizeHabitCreatedAt(null, fallback)).toBe(fallback);
      expect(normalizeHabitCreatedAt('', fallback)).toBe(fallback);
      expect(normalizeHabitCreatedAt('   ', fallback)).toBe(fallback);
      expect(normalizeHabitCreatedAt(NaN, fallback)).toBe(fallback);
      expect(normalizeHabitCreatedAt(0, fallback)).toBe(fallback);
      expect(normalizeHabitCreatedAt(-100, fallback)).toBe(fallback);
      expect(normalizeHabitCreatedAt('invalid-date-string', fallback)).toBe(fallback);
    });

    it('should default fallbackNow to approximately Date.now() when not provided', () => {
      const before = Date.now();
      const result = normalizeHabitCreatedAt(undefined);
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe('Schedule-Aware calculateStreak', () => {
    describe('Backward compatibility / daily mode', () => {
      it('returns unit days and exact streak when schedule is undefined or daily', () => {
        const entries: Record<string, boolean | number> = {
          '2026-10-15': true,
          '2026-10-16': true,
          '2026-10-17': true,
        };

        const resultUndef = calculateStreak(entries, 'boolean', undefined, '2026-10-17');
        expect(resultUndef.currentStreak).toBe(3);
        expect(resultUndef.bestStreak).toBe(3);
        expect(resultUndef.unit).toBe('days');

        const resultDaily = calculateStreak(
          entries,
          'boolean',
          undefined,
          '2026-10-17',
          { mode: 'daily' }
        );
        expect(resultDaily.currentStreak).toBe(3);
        expect(resultDaily.bestStreak).toBe(3);
        expect(resultDaily.unit).toBe('days');
      });
    });

    describe('Weekdays schedule (L-M-V / 1, 3, 5)', () => {
      const schedule: HabitSchedule = { mode: 'weekdays', days: [1, 3, 5] };

      it('evaluates scheduled days and does not break streak on unscheduled days', () => {
        // Week 42: Mon 10-12, Wed 10-14, Fri 10-16 completed
        // Tue 10-13, Thu 10-15, Sat 10-17, Sun 10-18 are unscheduled
        const entries: Record<string, boolean | number> = {
          '2026-10-12': true, // Mon (scheduled)
          '2026-10-14': true, // Wed (scheduled)
          '2026-10-16': true, // Fri (scheduled)
        };

        // Reference date on Saturday (unscheduled day after Friday)
        const onSat = calculateStreak(entries, 'boolean', undefined, '2026-10-17', schedule);
        expect(onSat.currentStreak).toBe(3);
        expect(onSat.bestStreak).toBe(3);
        expect(onSat.totalCompletions).toBe(3);
        expect(onSat.unit).toBe('days');

        // Reference date on Sunday (unscheduled day after Friday)
        const onSun = calculateStreak(entries, 'boolean', undefined, '2026-10-18', schedule);
        expect(onSun.currentStreak).toBe(3);
        expect(onSun.bestStreak).toBe(3);
        expect(onSun.unit).toBe('days');
      });

      it('activates grace period when reference date is a scheduled day not yet completed', () => {
        const entries: Record<string, boolean | number> = {
          '2026-10-12': true, // Mon
          '2026-10-14': true, // Wed
          // Fri 10-16 not yet logged
        };

        // On Friday (scheduled, but today is in progress)
        const onFridayPending = calculateStreak(
          entries,
          'boolean',
          undefined,
          '2026-10-16',
          schedule
        );
        expect(onFridayPending.currentStreak).toBe(2); // Grace period checks Wednesday
        expect(onFridayPending.bestStreak).toBe(2);

        // Once Friday is completed:
        entries['2026-10-16'] = true;
        const onFridayDone = calculateStreak(
          entries,
          'boolean',
          undefined,
          '2026-10-16',
          schedule
        );
        expect(onFridayDone.currentStreak).toBe(3);
      });

      it('breaks streak when a scheduled day was missed', () => {
        const entries: Record<string, boolean | number> = {
          '2026-10-12': true,  // Mon (scheduled)
          // Wed 10-14 was missed
          '2026-10-16': true,  // Fri (scheduled)
        };

        const onSat = calculateStreak(entries, 'boolean', undefined, '2026-10-17', schedule);
        expect(onSat.currentStreak).toBe(1); // Only Friday
        expect(onSat.bestStreak).toBe(1);

        // If Friday was also missed, on Saturday current streak is 0
        const entriesMissedFri: Record<string, boolean | number> = {
          '2026-10-12': true,
          '2026-10-14': true,
          // Fri 10-16 missed
        };
        const onSatMissed = calculateStreak(
          entriesMissedFri,
          'boolean',
          undefined,
          '2026-10-17',
          schedule
        );
        expect(onSatMissed.currentStreak).toBe(0);
        expect(onSatMissed.bestStreak).toBe(2);
      });
    });

    describe('Interval schedule (alternate days / every 2)', () => {
      const schedule: HabitSchedule = {
        mode: 'interval',
        every: 2,
        anchor: '2026-10-01',
      };
      // Scheduled: 10-01, 10-03, 10-05, 10-07, 10-09...

      it('calculates streak across alternate days without being broken by off-days', () => {
        const entries: Record<string, boolean | number> = {
          '2026-10-01': true,
          '2026-10-03': true,
          '2026-10-05': true,
          '2026-10-07': true,
        };

        // On 10-08 (off-day)
        const onOffDay = calculateStreak(entries, 'boolean', undefined, '2026-10-08', schedule);
        expect(onOffDay.currentStreak).toBe(4);
        expect(onOffDay.bestStreak).toBe(4);
        expect(onOffDay.unit).toBe('days');

        // On 10-09 (scheduled day, not yet done -> grace period)
        const onPending = calculateStreak(entries, 'boolean', undefined, '2026-10-09', schedule);
        expect(onPending.currentStreak).toBe(4);

        // On 10-10 (off-day, but 10-09 was missed)
        const onMissed = calculateStreak(entries, 'boolean', undefined, '2026-10-10', schedule);
        expect(onMissed.currentStreak).toBe(0);
        expect(onMissed.bestStreak).toBe(4);
      });
    });

    describe('Weekly-count schedule (3x per week)', () => {
      const schedule: HabitSchedule = { mode: 'weekly-count', timesPerWeek: 3 };

      it('counts consecutive weeks meeting target and returns unit weeks', () => {
        // Week 41 (2026-10-05 to 2026-10-11): 3 completions
        // Week 42 (2026-10-12 to 2026-10-18): 3 completions
        const entries: Record<string, boolean | number> = {
          '2026-10-05': true,
          '2026-10-07': true,
          '2026-10-09': true,
          '2026-10-12': true,
          '2026-10-14': true,
          '2026-10-16': true,
        };

        // Reference date on Sunday of Week 42 (target met)
        const onSundayW42 = calculateStreak(
          entries,
          'boolean',
          undefined,
          '2026-10-18',
          schedule
        );
        expect(onSundayW42.currentStreak).toBe(2);
        expect(onSundayW42.bestStreak).toBe(2);
        expect(onSundayW42.totalCompletions).toBe(6);
        expect(onSundayW42.unit).toBe('weeks');
      });

      it('applies grace period to current week in progress when target not yet met', () => {
        const entries: Record<string, boolean | number> = {
          // Week 41: 3 completions
          '2026-10-05': true,
          '2026-10-07': true,
          '2026-10-09': true,
          // Week 42: 3 completions
          '2026-10-12': true,
          '2026-10-14': true,
          '2026-10-16': true,
          // Week 43 (2026-10-19 to 2026-10-25): only 1 completion so far on Wednesday
          '2026-10-21': true,
        };

        // On Wednesday of Week 43: current week has 1 (< 3), but is in progress
        const onWedW43 = calculateStreak(
          entries,
          'boolean',
          undefined,
          '2026-10-21',
          schedule
        );
        expect(onWedW43.currentStreak).toBe(2); // Grace period: streak of 2 completed past weeks
        expect(onWedW43.bestStreak).toBe(2);
        expect(onWedW43.unit).toBe('weeks');

        // Once user logs 2 more days in Week 43:
        entries['2026-10-22'] = true;
        entries['2026-10-23'] = true;
        const onFriW43 = calculateStreak(
          entries,
          'boolean',
          undefined,
          '2026-10-23',
          schedule
        );
        expect(onFriW43.currentStreak).toBe(3);
        expect(onFriW43.bestStreak).toBe(3);
      });

      it('breaks streak when a past week failed to meet target', () => {
        const entries: Record<string, boolean | number> = {
          // Week 41: 3 completions (met)
          '2026-10-05': true,
          '2026-10-07': true,
          '2026-10-09': true,
          // Week 42: only 1 completion (failed!)
          '2026-10-12': true,
        };

        // On Monday of Week 43 (2026-10-19): Week 42 finished with only 1 (< 3)
        const onMonW43 = calculateStreak(
          entries,
          'boolean',
          undefined,
          '2026-10-19',
          schedule
        );
        expect(onMonW43.currentStreak).toBe(0);
        expect(onMonW43.bestStreak).toBe(1);
        expect(onMonW43.unit).toBe('weeks');
      });
    });
  });

  describe('Schedule-Aware calculateWeeklyConsistency', () => {
    it('calculates weekdays consistency against scheduled days in the week', () => {
      const schedule: HabitSchedule = { mode: 'weekdays', days: [1, 3, 5] };
      // Week 42: 3 scheduled days (Mon 10-12, Wed 10-14, Fri 10-16)

      const perfectWeek = {
        '2026-10-12': true,
        '2026-10-14': true,
        '2026-10-16': true,
      };
      const res1 = calculateWeeklyConsistency(
        perfectWeek,
        '2026-W42',
        'boolean',
        undefined,
        schedule
      );
      expect(res1.count).toBe(3);
      expect(res1.total).toBe(3);
      expect(res1.percentage).toBe(100);

      const partialWeek = {
        '2026-10-12': true,
        '2026-10-14': true,
      };
      const res2 = calculateWeeklyConsistency(
        partialWeek,
        '2026-W42',
        'boolean',
        undefined,
        schedule
      );
      expect(res2.count).toBe(2);
      expect(res2.total).toBe(3);
      expect(res2.percentage).toBe(67);
    });

    it('calculates weekly-count consistency against target timesPerWeek', () => {
      const schedule: HabitSchedule = { mode: 'weekly-count', timesPerWeek: 3 };

      const entries = {
        '2026-10-12': true,
        '2026-10-13': true,
        '2026-10-15': true,
        '2026-10-16': true, // 4 completions
      };
      const res = calculateWeeklyConsistency(
        entries,
        '2026-W42',
        'boolean',
        undefined,
        schedule
      );
      expect(res.count).toBe(4);
      expect(res.total).toBe(3);
      expect(res.percentage).toBe(100); // Capped at 100%
    });

    it('calculates interval consistency against scheduled days in that week', () => {
      const schedule: HabitSchedule = {
        mode: 'interval',
        every: 2,
        anchor: '2026-10-12',
      };
      // In Week 42 (10-12 to 10-18): 10-12, 10-14, 10-16, 10-18 are scheduled (4 days)
      const entries = {
        '2026-10-12': true,
        '2026-10-14': true,
      };
      const res = calculateWeeklyConsistency(
        entries,
        '2026-W42',
        'boolean',
        undefined,
        schedule
      );
      expect(res.count).toBe(2);
      expect(res.total).toBe(4);
      expect(res.percentage).toBe(50);
    });
  });

  describe('Schedule-Aware calculateMonthlyConsistency', () => {
    it('calculates weekdays monthly consistency against scheduled days in the month', () => {
      const schedule: HabitSchedule = { mode: 'weekdays', days: [1, 3, 5] };
      // October 2026 has 13 scheduled days (4 Mon, 4 Wed, 5 Fri)
      const entries: Record<string, boolean> = {
        '2026-10-02': true, // Fri
        '2026-10-05': true, // Mon
        '2026-10-07': true, // Wed
        '2026-10-09': true, // Fri
        '2026-10-12': true, // Mon
        '2026-10-14': true, // Wed
        '2026-10-16': true, // Fri
        '2026-10-19': true, // Mon
        '2026-10-21': true, // Wed
        '2026-10-23': true, // Fri
        '2026-10-26': true, // Mon
        '2026-10-28': true, // Wed
        '2026-10-30': true, // Fri
      };

      const resAll = calculateMonthlyConsistency(
        entries,
        '2026-10',
        'boolean',
        undefined,
        schedule
      );
      expect(resAll.count).toBe(13);
      expect(resAll.daysInMonth).toBe(13);
      expect(resAll.percentage).toBe(100);

      // 10 completions out of 13 scheduled days
      delete entries['2026-10-26'];
      delete entries['2026-10-28'];
      delete entries['2026-10-30'];
      const resPartial = calculateMonthlyConsistency(
        entries,
        '2026-10',
        'boolean',
        undefined,
        schedule
      );
      expect(resPartial.count).toBe(10);
      expect(resPartial.daysInMonth).toBe(13);
      expect(resPartial.percentage).toBe(77); // 10/13 = 76.9% -> 77%
    });

    it('calculates weekly-count monthly consistency against expected monthly completions', () => {
      const schedule: HabitSchedule = { mode: 'weekly-count', timesPerWeek: 3 };
      // October 2026 (31 days): expected completions = round(3 * 31 / 7) = 13
      const entries: Record<string, boolean> = {};
      for (let d = 1; d <= 13; d++) {
        entries[`2026-10-${String(d).padStart(2, '0')}`] = true;
      }

      const res = calculateMonthlyConsistency(
        entries,
        '2026-10',
        'boolean',
        undefined,
        schedule
      );
      expect(res.count).toBe(13);
      expect(res.daysInMonth).toBe(13);
      expect(res.percentage).toBe(100);
    });
  });

  describe('parseHabitsPayload with schedule', () => {
    it('preserves and normalizes schedule on habit items', () => {
      const payload = [
        {
          id: 'habit-gym',
          title: 'Gimnasio',
          icon: '🏋️',
          category: 'Salud',
          type: 'boolean',
          schedule: { mode: 'weekdays', days: [1, 3, 5] },
          frequency: 'weekly',
          reminderTime: '07:30',
          reminderMinutes: 15,
          entries: {},
        },
        {
          id: 'habit-run',
          title: 'Correr',
          icon: '🏃',
          category: 'Salud',
          type: 'boolean',
          schedule: { mode: 'interval', every: 2, anchor: '2026-10-01' },
          entries: {},
        },
        {
          id: 'habit-read',
          title: 'Leer',
          icon: '📖',
          category: 'Personal',
          type: 'boolean',
          schedule: { mode: 'weekly-count', timesPerWeek: 4 },
          entries: {},
        },
        {
          id: 'habit-corrupt',
          title: 'Corrupto',
          icon: '❓',
          category: 'Personal',
          type: 'boolean',
          schedule: { mode: 'invalid' },
          entries: {},
        },
      ];

      const parsed = parseHabitsPayload(payload);
      expect(parsed).not.toBeNull();
      expect(parsed?.[0].schedule).toEqual({ mode: 'weekdays', days: [1, 3, 5] });
      expect(parsed?.[0].frequency).toBe('weekly');
      expect(parsed?.[0].reminderTime).toBe('07:30');
      expect(parsed?.[0].reminderMinutes).toBe(15);

      expect(parsed?.[1].schedule).toEqual({
        mode: 'interval',
        every: 2,
        anchor: '2026-10-01',
      });

      expect(parsed?.[2].schedule).toEqual({
        mode: 'weekly-count',
        timesPerWeek: 4,
      });

      // Malformed schedule degenerates to daily
      expect(parsed?.[3].schedule).toEqual({ mode: 'daily' });
    });

    it('sets schedule to undefined when omitted', () => {
      const payload = [
        {
          id: 'habit-simple',
          title: 'Simple',
          icon: '⭐',
          category: 'Personal',
          type: 'boolean',
          entries: {},
        },
      ];

      const parsed = parseHabitsPayload(payload);
      expect(parsed?.[0].schedule).toBeUndefined();
    });
  });
});


