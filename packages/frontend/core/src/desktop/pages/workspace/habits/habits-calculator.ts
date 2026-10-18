import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

import { getWeekDateRange } from '../../../../modules/journal';

dayjs.extend(isoWeek);

export type HabitType = 'boolean' | 'quantitative';

export function isHabitDoneOnDate(
  value: boolean | number | undefined,
  type: HabitType,
  targetValue?: number
): boolean {
  if (value === undefined || value === null) return false;
  if (type === 'boolean') {
    return value === true;
  }
  if (type === 'quantitative') {
    if (typeof value !== 'number') return false;
    const target = targetValue ?? 1;
    return value >= target;
  }
  return false;
}

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
}

export function calculateStreak(
  entries: Record<string, boolean | number>,
  type: HabitType = 'boolean',
  targetValue?: number,
  referenceDateStr?: string
): StreakResult {
  const refDate = referenceDateStr
    ? dayjs(referenceDateStr)
    : dayjs();

  // Filter only completed dates
  const completedDates = Object.keys(entries)
    .filter(dateKey => isHabitDoneOnDate(entries[dateKey], type, targetValue))
    .sort(); // Lexicographical sort works for 'YYYY-MM-DD'

  const totalCompletions = completedDates.length;

  if (totalCompletions === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      totalCompletions: 0,
    };
  }

  // Calculate best streak across all historical dates
  let bestStreak = 0;
  let currentRun = 0;
  let prevDate: dayjs.Dayjs | null = null;

  for (const dateKey of completedDates) {
    const curDate = dayjs(dateKey);
    if (!prevDate) {
      currentRun = 1;
    } else {
      const diff = curDate.diff(prevDate, 'day');
      if (diff === 1) {
        currentRun++;
      } else if (diff > 1) {
        currentRun = 1;
      }
    }
    if (currentRun > bestStreak) {
      bestStreak = currentRun;
    }
    prevDate = curDate;
  }

  // Calculate current streak walking backwards from refDate
  const completedSet = new Set(completedDates);
  const todayKey = refDate.format('YYYY-MM-DD');
  const yesterdayKey = refDate.subtract(1, 'day').format('YYYY-MM-DD');

  let currentStreak = 0;
  let checkDate: dayjs.Dayjs | null = null;

  if (completedSet.has(todayKey)) {
    checkDate = refDate;
  } else if (completedSet.has(yesterdayKey)) {
    checkDate = refDate.subtract(1, 'day');
  }

  if (checkDate) {
    while (completedSet.has(checkDate.format('YYYY-MM-DD'))) {
      currentStreak++;
      checkDate = checkDate.subtract(1, 'day');
    }
  }

  return {
    currentStreak,
    bestStreak,
    totalCompletions,
  };
}

export function calculateWeeklyConsistency(
  entries: Record<string, boolean | number>,
  weekKey: string,
  type: HabitType = 'boolean',
  targetValue?: number
): { count: number; total: 7; percentage: number } {
  const { start } = getWeekDateRange(weekKey);
  let count = 0;

  for (let i = 0; i < 7; i++) {
    const dateKey = start.add(i, 'day').format('YYYY-MM-DD');
    if (isHabitDoneOnDate(entries[dateKey], type, targetValue)) {
      count++;
    }
  }

  const percentage = Math.round((count / 7) * 100);
  return { count, total: 7, percentage };
}

export function calculateMonthlyConsistency(
  entries: Record<string, boolean | number>,
  yearMonth: string, // 'YYYY-MM'
  type: HabitType = 'boolean',
  targetValue?: number
): { count: number; daysInMonth: number; percentage: number } {
  const start = dayjs(`${yearMonth}-01`);
  const daysInMonth = start.daysInMonth();
  let count = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = start.date(d).format('YYYY-MM-DD');
    if (isHabitDoneOnDate(entries[dateKey], type, targetValue)) {
      count++;
    }
  }

  const percentage = Math.round((count / daysInMonth) * 100);
  return { count, daysInMonth, percentage };
}
