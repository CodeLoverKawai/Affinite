import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

import {
  LEGACY_HABIT_ID_MAP,
  normalizeHabitId,
} from '@affine/core/modules/affinite-hub';
import { getWeekDateRange } from '../../../../modules/journal';

dayjs.extend(isoWeek);

export type HabitType = 'boolean' | 'quantitative';

export interface HabitItem {
  id: string;
  title: string;
  icon: string;
  category: string;
  type: HabitType;
  targetValue?: number;
  unit?: string;
  color?: string;
  frequency?: 'daily' | 'weekly' | string;
  createdAt?: number | string;
  entries: Record<string, boolean | number>;
}

export { LEGACY_HABIT_ID_MAP, normalizeHabitId };

const REVERSE_LEGACY_HABIT_ID_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_HABIT_ID_MAP).map(([legacyId, canonicalId]) => [
    canonicalId,
    legacyId,
  ])
);

export function normalizeHabitCreatedAt(
  createdAt?: number | string | null,
  fallbackNow = Date.now()
): number {
  if (typeof createdAt === 'number') {
    return Number.isFinite(createdAt) && createdAt > 0
      ? Math.floor(createdAt)
      : fallbackNow;
  }

  if (typeof createdAt === 'string') {
    const trimmed = createdAt.trim();
    if (!trimmed) {
      return fallbackNow;
    }

    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      if (Number.isFinite(num) && num > 0) {
        return Math.floor(num);
      }
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }

    const d = dayjs(trimmed);
    if (d.isValid() && d.valueOf() > 0) {
      return d.valueOf();
    }

    return fallbackNow;
  }

  return fallbackNow;
}

export function resolveHabitById<T extends { id: string; title?: string }>(
  habits: T[],
  id?: string,
  title?: string
): T | undefined {
  if (id) {
    const canonicalId = LEGACY_HABIT_ID_MAP[id] ?? id;
    const legacyId = REVERSE_LEGACY_HABIT_ID_MAP[canonicalId];
    const matched = habits.find(
      h =>
        h.id === id ||
        h.id === canonicalId ||
        (legacyId !== undefined && h.id === legacyId)
    );
    if (matched) return matched;
  }
  if (title) {
    const normalizedTitle = title.trim().toLowerCase();
    return habits.find(h => h.title?.trim().toLowerCase() === normalizedTitle);
  }
  return undefined;
}

export function parseHabitsPayload(raw: unknown): HabitItem[] | null {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }

  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(parsed)) {
    return null;
  }

  const validItems = parsed.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item)
  );

  if (validItems.length === 0 && parsed.length > 0) {
    return null;
  }

  return validItems.map(item => {
    const rawId =
      typeof item.id === 'string' && item.id.trim()
        ? item.id.trim()
        : 'habit-custom';
    const id = normalizeHabitId(rawId);
    const type: HabitType =
      item.type === 'quantitative' ? 'quantitative' : 'boolean';
    const rawEntries =
      item.entries &&
      typeof item.entries === 'object' &&
      !Array.isArray(item.entries)
        ? (item.entries as Record<string, boolean | number>)
        : {};

    return {
      ...item,
      id,
      title: typeof item.title === 'string' ? item.title : 'Hábito',
      icon: typeof item.icon === 'string' ? item.icon : '🎯',
      category: typeof item.category === 'string' ? item.category : 'Personal',
      type,
      targetValue:
        typeof item.targetValue === 'number' ? item.targetValue : undefined,
      unit: typeof item.unit === 'string' ? item.unit : undefined,
      color: typeof item.color === 'string' ? item.color : undefined,
      entries: { ...rawEntries },
    } as HabitItem;
  });
}

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
