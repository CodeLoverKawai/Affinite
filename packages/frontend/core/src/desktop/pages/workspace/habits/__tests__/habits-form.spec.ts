import { describe, expect, it } from 'vitest';

import {
  buildScheduleFromForm,
  isMatrixDayScheduled,
  sanitizeReminder,
  validateReminderMinutes,
  validateReminderTime,
} from '../habits-form';

describe('habits-form: buildScheduleFromForm', () => {
  it('should assemble daily schedule when mode is daily', () => {
    const schedule = buildScheduleFromForm({
      scheduleMode: 'daily',
      scheduleWeekdays: [1, 2, 3],
      scheduleIntervalEvery: 2,
      scheduleIntervalAnchor: '2026-11-01',
      scheduleWeeklyTimes: 3,
    });
    expect(schedule).toEqual({ mode: 'daily' });
  });

  it('should assemble weekdays schedule correctly and sort unique days', () => {
    const schedule = buildScheduleFromForm({
      scheduleMode: 'weekdays',
      scheduleWeekdays: [5, 1, 3, 1],
      scheduleIntervalEvery: 2,
      scheduleIntervalAnchor: '2026-11-01',
      scheduleWeeklyTimes: 3,
    });
    expect(schedule).toEqual({
      mode: 'weekdays',
      days: [1, 3, 5],
    });
  });

  it('should degenerate to daily if weekdays is empty or all 7 days', () => {
    expect(
      buildScheduleFromForm({
        scheduleMode: 'weekdays',
        scheduleWeekdays: [],
        scheduleIntervalEvery: 2,
        scheduleIntervalAnchor: '2026-11-01',
        scheduleWeeklyTimes: 3,
      })
    ).toEqual({ mode: 'daily' });

    expect(
      buildScheduleFromForm({
        scheduleMode: 'weekdays',
        scheduleWeekdays: [1, 2, 3, 4, 5, 6, 7],
        scheduleIntervalEvery: 2,
        scheduleIntervalAnchor: '2026-11-01',
        scheduleWeeklyTimes: 3,
      })
    ).toEqual({ mode: 'daily' });
  });

  it('should assemble interval schedule and enforce every >= 2', () => {
    const schedule1 = buildScheduleFromForm({
      scheduleMode: 'interval',
      scheduleIntervalEvery: 3,
      scheduleIntervalAnchor: '2026-11-04',
      scheduleWeekdays: [],
      scheduleWeeklyTimes: 3,
    });
    expect(schedule1).toEqual({
      mode: 'interval',
      every: 3,
      anchor: '2026-11-04',
    });

    const schedule2 = buildScheduleFromForm({
      scheduleMode: 'interval',
      scheduleIntervalEvery: 1, // Invalid, should be clamped to 2
      scheduleIntervalAnchor: '2026-11-04',
      scheduleWeekdays: [],
      scheduleWeeklyTimes: 3,
    });
    expect(schedule2).toEqual({
      mode: 'interval',
      every: 2,
      anchor: '2026-11-04',
    });
  });

  it('should assemble weekly-count schedule clamped between 1 and 6', () => {
    const schedule = buildScheduleFromForm({
      scheduleMode: 'weekly-count',
      scheduleWeeklyTimes: 4,
      scheduleWeekdays: [],
      scheduleIntervalEvery: 2,
      scheduleIntervalAnchor: '2026-11-01',
    });
    expect(schedule).toEqual({
      mode: 'weekly-count',
      timesPerWeek: 4,
    });

    const clampedLow = buildScheduleFromForm({
      scheduleMode: 'weekly-count',
      scheduleWeeklyTimes: 0,
      scheduleWeekdays: [],
      scheduleIntervalEvery: 2,
      scheduleIntervalAnchor: '2026-11-01',
    });
    expect(clampedLow).toEqual({
      mode: 'weekly-count',
      timesPerWeek: 1,
    });
  });
});

describe('habits-form: reminder validation and sanitization', () => {
  it('validates HH:mm time format', () => {
    expect(validateReminderTime('08:30')).toBe(true);
    expect(validateReminderTime('00:00')).toBe(true);
    expect(validateReminderTime('23:59')).toBe(true);
    expect(validateReminderTime('24:00')).toBe(false);
    expect(validateReminderTime('8:30')).toBe(false);
    expect(validateReminderTime('')).toBe(false);
    expect(validateReminderTime(undefined)).toBe(false);
  });

  it('validates reminder offset minutes', () => {
    expect(validateReminderMinutes(0)).toBe(true);
    expect(validateReminderMinutes(5)).toBe(true);
    expect(validateReminderMinutes(15)).toBe(true);
    expect(validateReminderMinutes(30)).toBe(true);
    expect(validateReminderMinutes(-5)).toBe(false);
    expect(validateReminderMinutes(NaN)).toBe(false);
  });

  it('sanitizes valid and invalid reminders', () => {
    expect(sanitizeReminder('09:15', 10)).toEqual({
      reminderTime: '09:15',
      reminderMinutes: 10,
    });

    expect(sanitizeReminder('', 15)).toEqual({
      reminderTime: undefined,
      reminderMinutes: undefined,
    });

    expect(sanitizeReminder('invalid', 0)).toEqual({
      reminderTime: undefined,
      reminderMinutes: undefined,
    });

    // Default minutes to 0 if time is valid but minutes are invalid
    expect(sanitizeReminder('09:15', -1)).toEqual({
      reminderTime: '09:15',
      reminderMinutes: 0,
    });
  });
});

describe('habits-form: matrix unscheduled day detection', () => {
  it('treats undefined or daily schedule as scheduled on every day', () => {
    expect(isMatrixDayScheduled(undefined, '2026-11-02')).toBe(true);
    expect(isMatrixDayScheduled({ mode: 'daily' }, '2026-11-02')).toBe(true);
    expect(isMatrixDayScheduled({ mode: 'daily' }, '2026-11-07')).toBe(true);
  });

  it('detects weekdays schedule matching and non-matching days', () => {
    // 2026-11-02 is Monday (isoWeekday 1), 2026-11-07 is Saturday (isoWeekday 6)
    const weekdaysSchedule = { mode: 'weekdays' as const, days: [1, 2, 3, 4, 5] };
    expect(isMatrixDayScheduled(weekdaysSchedule, '2026-11-02')).toBe(true); // Monday
    expect(isMatrixDayScheduled(weekdaysSchedule, '2026-11-07')).toBe(false); // Saturday
    expect(isMatrixDayScheduled(weekdaysSchedule, '2026-11-08')).toBe(false); // Sunday
  });

  it('detects interval schedule matching and non-matching days', () => {
    // Anchor: 2026-11-01 (day 0). Every 2 days: 2026-11-03, 2026-11-05 are scheduled.
    const intervalSchedule = {
      mode: 'interval' as const,
      every: 2,
      anchor: '2026-11-01',
    };
    expect(isMatrixDayScheduled(intervalSchedule, '2026-11-01')).toBe(true);
    expect(isMatrixDayScheduled(intervalSchedule, '2026-11-02')).toBe(false);
    expect(isMatrixDayScheduled(intervalSchedule, '2026-11-03')).toBe(true);
    expect(isMatrixDayScheduled(intervalSchedule, '2026-11-04')).toBe(false);
  });

  it('treats weekly-count schedule as scheduled on every day for matrix cell interaction', () => {
    const weeklyCountSchedule = {
      mode: 'weekly-count' as const,
      timesPerWeek: 3,
    };
    expect(isMatrixDayScheduled(weeklyCountSchedule, '2026-11-02')).toBe(true);
    expect(isMatrixDayScheduled(weeklyCountSchedule, '2026-11-05')).toBe(true);
  });
});
