import { describe, expect, it } from 'vitest';

import {
  calculateMonthlyConsistency,
  calculateStreak,
  calculateWeeklyConsistency,
  isHabitDoneOnDate,
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
});
