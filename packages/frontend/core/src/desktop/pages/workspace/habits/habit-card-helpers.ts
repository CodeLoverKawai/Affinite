import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear';
import isLeapYear from 'dayjs/plugin/isLeapYear';

import { getWeekDateRange } from '../../../../modules/journal';
import {
  isHabitDoneOnDate,
  type HabitItem,
  type HabitType,
} from './habits-calculator';

dayjs.extend(isLeapYear);
dayjs.extend(isoWeeksInYear);
dayjs.extend(isoWeek);

export interface HabitCardData {
  habitId: string;
  title: string;
  icon?: string;
  category?: string;
  type: HabitType;
  targetValue?: number;
  unit?: string;
  date?: string; // YYYY-MM-DD
}

export const SPANISH_DAY_ABBR = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

export function parseHabitCardData(
  rawCode: string,
  fallbackDate?: string
): HabitCardData {
  const defaultDate = fallbackDate || dayjs().format('YYYY-MM-DD');
  const trimmed = rawCode.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        habitId: parsed.habitId || 'h-custom',
        title: parsed.title || 'Hábito',
        icon: parsed.icon || '🎯',
        category: parsed.category || 'Personal',
        type: (parsed.type === 'quantitative' ? 'quantitative' : 'boolean') as HabitType,
        targetValue: typeof parsed.targetValue === 'number' ? parsed.targetValue : undefined,
        unit: parsed.unit || '',
        date: parsed.date || defaultDate,
      };
    } catch {
      // Fall through to text-based parser
    }
  }

  // Parse key-value lines or plain text fallback
  const lines = trimmed.split('\n');
  let title = 'Hábito';
  let icon = '🎯';
  let habitId = 'h-custom';
  let category = 'Personal';
  let type: HabitType = 'boolean';
  let targetValue: number | undefined;
  let unit = '';
  let date = defaultDate;

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();
      if (key === 'habit' || key === 'title' || key === 'id') {
        title = val;
        habitId = val.toLowerCase().replace(/[^a-z0-9]/g, '-');
      } else if (key === 'icon' || key === 'emoji') {
        icon = val;
      } else if (key === 'category') {
        category = val;
      } else if (key === 'type') {
        type = val === 'quantitative' ? 'quantitative' : 'boolean';
      } else if (key === 'target' || key === 'targetvalue') {
        targetValue = Number(val) || undefined;
      } else if (key === 'unit') {
        unit = val;
      } else if (key === 'date') {
        date = val;
      }
    } else if (line.trim().length > 0 && title === 'Hábito') {
      title = line.trim().replace(/^[#\-*]\s*/, '');
      habitId = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
  }

  return {
    habitId,
    title,
    icon,
    category,
    type,
    targetValue,
    unit,
    date,
  };
}

export function serializeHabitCardData(data: HabitCardData): string {
  return JSON.stringify(data, null, 2);
}

export interface HabitDayStatus {
  date: string;
  dayName: string;
  isDone: boolean;
  isToday: boolean;
  value: boolean | number | undefined;
}

export function getHabitWeekDaysStatus(
  habit: HabitItem,
  weekKey?: string,
  todayStr?: string
): HabitDayStatus[] {
  const currentToday = todayStr || dayjs().format('YYYY-MM-DD');
  const targetWeek = weekKey || dayjs(currentToday).format('YYYY-[W]WW');
  const { start } = getWeekDateRange(targetWeek);
  const result: HabitDayStatus[] = [];

  for (let i = 0; i < 7; i++) {
    const curDay = start.add(i, 'day');
    const dateStr = curDay.format('YYYY-MM-DD');
    const val = habit.entries[dateStr];
    const isDone = isHabitDoneOnDate(val, habit.type, habit.targetValue);
    const isToday = dateStr === currentToday;

    result.push({
      date: dateStr,
      dayName: SPANISH_DAY_ABBR[i],
      isDone,
      isToday,
      value: val,
    });
  }

  return result;
}

export function toggleHabitEntry(
  entries: Record<string, boolean | number>,
  dateKey: string,
  type: HabitType,
  targetValue?: number
): Record<string, boolean | number> {
  const copy = { ...entries };
  const currentVal = copy[dateKey];
  const isDone = isHabitDoneOnDate(currentVal, type, targetValue);

  if (type === 'boolean') {
    copy[dateKey] = !isDone;
  } else {
    // quantitative
    const target = targetValue ?? 1;
    copy[dateKey] = isDone ? 0 : target;
  }

  return copy;
}
