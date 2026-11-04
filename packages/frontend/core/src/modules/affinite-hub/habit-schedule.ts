import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export type HabitSchedule =
  | { mode: 'daily' }
  | { mode: 'weekdays'; days: number[] } // 1=Lun ... 7=Dom
  | { mode: 'interval'; every: number; anchor: string } // every >= 2, anchor 'YYYY-MM-DD'
  | { mode: 'weekly-count'; timesPerWeek: number }; // 1..7

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_NAMES_ES: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
};

/**
 * Defensively normalizes any raw or malformed schedule shape into a guaranteed valid HabitSchedule.
 * Invalid values degenerate safely to { mode: 'daily' }.
 */
export function normalizeSchedule(raw: unknown): HabitSchedule {
  if (!raw || typeof raw !== 'object' || !('mode' in raw)) {
    return { mode: 'daily' };
  }

  const candidate = raw as Record<string, unknown>;

  switch (candidate.mode) {
    case 'daily':
      return { mode: 'daily' };

    case 'weekdays': {
      if (!Array.isArray(candidate.days)) {
        return { mode: 'daily' };
      }

      const validDays = candidate.days
        .filter(
          (d): d is number =>
            typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 7
        )
        .sort((a, b) => a - b);

      const uniqueDays = Array.from(new Set(validDays));

      // Degenerate to daily if empty or full week
      if (uniqueDays.length === 0 || uniqueDays.length === 7) {
        return { mode: 'daily' };
      }

      return {
        mode: 'weekdays',
        days: uniqueDays,
      };
    }

    case 'interval': {
      const every = candidate.every;
      if (typeof every !== 'number' || !Number.isInteger(every) || every < 2) {
        return { mode: 'daily' };
      }

      let anchor: string;
      if (
        typeof candidate.anchor === 'string' &&
        ISO_DATE_REGEX.test(candidate.anchor) &&
        dayjs(candidate.anchor).isValid()
      ) {
        anchor = candidate.anchor;
      } else {
        anchor = dayjs().format('YYYY-MM-DD');
      }

      return {
        mode: 'interval',
        every,
        anchor,
      };
    }

    case 'weekly-count': {
      const tpw = candidate.timesPerWeek;
      if (typeof tpw !== 'number' || Number.isNaN(tpw)) {
        return { mode: 'daily' };
      }

      const rounded = Math.round(tpw);
      const clamped = Math.max(1, rounded);

      if (clamped >= 7) {
        return { mode: 'daily' };
      }

      return {
        mode: 'weekly-count',
        timesPerWeek: clamped,
      };
    }

    default:
      return { mode: 'daily' };
  }
}

/**
 * Determines whether a habit is scheduled to occur on a specific ISO date string ('YYYY-MM-DD').
 */
export function isHabitScheduledOn(
  schedule: HabitSchedule | undefined | null,
  dateStr: string
): boolean {
  if (!dateStr || typeof dateStr !== 'string' || !ISO_DATE_REGEX.test(dateStr)) {
    return false;
  }

  const date = dayjs(dateStr);
  if (!date.isValid()) {
    return false;
  }

  const normalized = normalizeSchedule(schedule);

  switch (normalized.mode) {
    case 'daily':
      return true;

    case 'weekdays': {
      const isoDay = date.isoWeekday();
      return normalized.days.includes(isoDay);
    }

    case 'interval': {
      const anchorDate = dayjs(normalized.anchor).startOf('day');
      const targetDate = date.startOf('day');
      const diff = targetDate.diff(anchorDate, 'day');
      // Euclidean modulo handles dates preceding the anchor properly
      const mod = ((diff % normalized.every) + normalized.every) % normalized.every;
      return mod === 0;
    }

    case 'weekly-count':
      // weekly-count habits are flexible across the week, not bound to specific dates
      return false;
  }
}

/**
 * Returns all dates ('YYYY-MM-DD') within [startStr, endStr] (inclusive) where the habit is scheduled.
 */
export function getScheduledDates(
  schedule: HabitSchedule | undefined | null,
  startStr: string,
  endStr: string
): string[] {
  if (
    !startStr ||
    !endStr ||
    typeof startStr !== 'string' ||
    typeof endStr !== 'string' ||
    !ISO_DATE_REGEX.test(startStr) ||
    !ISO_DATE_REGEX.test(endStr)
  ) {
    return [];
  }

  const start = dayjs(startStr).startOf('day');
  const end = dayjs(endStr).startOf('day');

  if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
    return [];
  }

  const normalized = normalizeSchedule(schedule);
  if (normalized.mode === 'weekly-count') {
    return [];
  }

  const results: string[] = [];
  let curr = start;

  while (!curr.isAfter(end)) {
    const currentStr = curr.format('YYYY-MM-DD');
    if (isHabitScheduledOn(normalized, currentStr)) {
      results.push(currentStr);
    }
    curr = curr.add(1, 'day');
  }

  return results;
}

/**
 * Calculates the expected number of completions for a habit schedule across a date range.
 */
export function expectedCompletionsInRange(
  schedule: HabitSchedule | undefined | null,
  startStr: string,
  endStr: string
): number {
  if (
    !startStr ||
    !endStr ||
    typeof startStr !== 'string' ||
    typeof endStr !== 'string' ||
    !ISO_DATE_REGEX.test(startStr) ||
    !ISO_DATE_REGEX.test(endStr)
  ) {
    return 0;
  }

  const start = dayjs(startStr).startOf('day');
  const end = dayjs(endStr).startOf('day');

  if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
    return 0;
  }

  const normalized = normalizeSchedule(schedule);

  if (normalized.mode === 'weekly-count') {
    const totalDays = end.diff(start, 'day') + 1;
    if (totalDays <= 0) {
      return 0;
    }
    if (totalDays === 7) {
      return normalized.timesPerWeek;
    }
    return Math.round(normalized.timesPerWeek * (totalDays / 7));
  }

  return getScheduledDates(normalized, startStr, endStr).length;
}

/**
 * Returns a human-friendly Spanish description of the schedule.
 */
export function describeSchedule(schedule: HabitSchedule | undefined | null): string {
  const normalized = normalizeSchedule(schedule);

  switch (normalized.mode) {
    case 'daily':
      return 'Todos los días';

    case 'weekdays': {
      const days = normalized.days;
      if (
        days.length === 5 &&
        days[0] === 1 &&
        days[1] === 2 &&
        days[2] === 3 &&
        days[3] === 4 &&
        days[4] === 5
      ) {
        return 'Lunes a viernes';
      }
      if (days.length === 2 && days[0] === 6 && days[1] === 7) {
        return 'Fines de semana';
      }
      return days.map(d => WEEKDAY_NAMES_ES[d] ?? '').join(' · ');
    }

    case 'interval':
      if (normalized.every === 2) {
        return 'Un día sí, uno no';
      }
      return `Cada ${normalized.every} días`;

    case 'weekly-count':
      if (normalized.timesPerWeek === 1) {
        return '1 vez por semana';
      }
      return `${normalized.timesPerWeek} veces por semana`;
  }
}

/**
 * Generates the upcoming `count` dates where the habit is scheduled, starting from `fromStr` (inclusive).
 */
export function nextScheduledDates(
  schedule: HabitSchedule | undefined | null,
  fromStr?: string,
  count = 5
): string[] {
  if (count <= 0) {
    return [];
  }

  const normalized = normalizeSchedule(schedule);
  if (normalized.mode === 'weekly-count') {
    return [];
  }

  let curr: dayjs.Dayjs;
  if (fromStr && ISO_DATE_REGEX.test(fromStr) && dayjs(fromStr).isValid()) {
    curr = dayjs(fromStr).startOf('day');
  } else {
    curr = dayjs().startOf('day');
  }

  const results: string[] = [];
  const maxSearchDays = Math.max(count * 365, 3650);
  let checked = 0;

  while (results.length < count && checked < maxSearchDays) {
    const currentStr = curr.format('YYYY-MM-DD');
    if (isHabitScheduledOn(normalized, currentStr)) {
      results.push(currentStr);
    }
    curr = curr.add(1, 'day');
    checked++;
  }

  return results;
}
