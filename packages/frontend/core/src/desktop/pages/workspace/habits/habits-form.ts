import {
  type HabitSchedule,
  isHabitScheduledOn,
} from '@affine/core/modules/affinite-hub';

export type ScheduleMode = 'daily' | 'weekdays' | 'interval' | 'weekly-count';

export interface HabitFormScheduleInput {
  scheduleMode: ScheduleMode;
  scheduleWeekdays?: number[];
  scheduleIntervalEvery?: number;
  scheduleIntervalAnchor?: string;
  scheduleWeeklyTimes?: number;
}

export function buildScheduleFromForm(input: HabitFormScheduleInput): HabitSchedule {
  switch (input.scheduleMode) {
    case 'weekdays': {
      const rawDays = input.scheduleWeekdays ?? [];
      const validDays = rawDays
        .filter(d => typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 7)
        .sort((a, b) => a - b);
      const uniqueDays = Array.from(new Set(validDays));

      if (uniqueDays.length === 0 || uniqueDays.length === 7) {
        return { mode: 'daily' };
      }

      return {
        mode: 'weekdays',
        days: uniqueDays,
      };
    }

    case 'interval': {
      const everyRaw = input.scheduleIntervalEvery;
      const every =
        typeof everyRaw === 'number' && Number.isFinite(everyRaw) && everyRaw >= 2
          ? Math.floor(everyRaw)
          : 2;
      const anchor =
        typeof input.scheduleIntervalAnchor === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(input.scheduleIntervalAnchor.trim())
          ? input.scheduleIntervalAnchor.trim()
          : new Date().toISOString().slice(0, 10);

      return {
        mode: 'interval',
        every,
        anchor,
      };
    }

    case 'weekly-count': {
      const timesRaw = input.scheduleWeeklyTimes;
      const times =
        typeof timesRaw === 'number' && Number.isFinite(timesRaw)
          ? Math.max(1, Math.min(6, Math.floor(timesRaw)))
          : 3;

      return {
        mode: 'weekly-count',
        timesPerWeek: times,
      };
    }

    case 'daily':
    default:
      return { mode: 'daily' };
  }
}

const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateReminderTime(time?: string): boolean {
  if (typeof time !== 'string') return false;
  return HH_MM_REGEX.test(time.trim());
}

export function validateReminderMinutes(minutes?: number): boolean {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return false;
  return minutes >= 0 && minutes <= 120;
}

export function sanitizeReminder(
  time?: string,
  minutes?: number
): { reminderTime?: string; reminderMinutes?: number } {
  if (!time || !validateReminderTime(time)) {
    return { reminderTime: undefined, reminderMinutes: undefined };
  }

  const validTime = time.trim();
  const validMinutes =
    minutes !== undefined && validateReminderMinutes(minutes)
      ? Math.floor(minutes)
      : 0;

  return {
    reminderTime: validTime,
    reminderMinutes: validMinutes,
  };
}

export function isMatrixDayScheduled(
  schedule: HabitSchedule | undefined | null,
  dateStr: string
): boolean {
  if (!schedule) return true;
  if (schedule.mode === 'weekly-count') return true;
  return isHabitScheduledOn(schedule, dateStr);
}
