import dayjs from 'dayjs';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear';

import {
  expectedCompletionsInRange,
  normalizeSchedule,
} from './habit-schedule';
import { normalizeHabitId } from './keys';
import {
  extractBoardDatedItems,
  extractCalendarDatedItems,
  extractHabitDatedItems,
  extractStreakDatedItems,
} from './providers';
import { readHabitsFromDoc } from './providers/habits-provider';
import { resolveRootYDoc } from './yjs-root';

dayjs.extend(isLeapYear);
dayjs.extend(isoWeek);
dayjs.extend(isoWeeksInYear);

export interface WeeklyHabitSummary {
  totalActive: number;
  totalTargetCompletions: number; // sum of expected completions in range
  totalCompleted: number;
  completionRate: number; // 0 to 100 percentage
  days: Array<{
    date: string;
    dayIndex: number;
    completedCount: number;
    targetCount: number;
    rate: number;
  }>;
  topHabits: Array<{
    id: string;
    title: string;
    completedDays: number;
    rate: number;
  }>;
}

export interface WeeklyStreakSummary {
  activeCount: number;
  completedCount: number;
  sprintsEndingThisWeek: Array<{
    id: string;
    title: string;
    targetDate: string;
    isCompleted: boolean;
  }>;
}

export interface WeeklyTaskSummary {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
}

export interface WeeklyBoardSummary {
  totalCardsDue: number;
  completedCards: number;
  pendingCards: number;
  completionRate: number;
}

export interface WeeklySnapshot {
  weekKey: string; // e.g. "2026-W45"
  range: { start: string; end: string }; // YYYY-MM-DD to YYYY-MM-DD
  habits: WeeklyHabitSummary;
  streaks: WeeklyStreakSummary;
  tasks: WeeklyTaskSummary;
  boards: WeeklyBoardSummary;
  consistencyScore: number; // 0 to 100 overall weighted score
}

export function parseWeekRange(
  weekKeyOrRange: string | { start: string; end: string }
): {
  weekKey: string;
  start: string;
  end: string;
  dates: string[];
} {
  if (typeof weekKeyOrRange === 'string') {
    const trimmed = weekKeyOrRange.trim();
    const match = trimmed.match(/^(\d{4})-W(\d{1,2})$/i);
    if (match) {
      const year = parseInt(match[1], 10);
      const weekNumber = parseInt(match[2], 10);
      const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;
      const week1Monday = dayjs(`${year}-01-04`).startOf('isoWeek');
      const monday = week1Monday.add(weekNumber - 1, 'week').startOf('day');
      const dates = Array.from({ length: 7 }, (_, i) =>
        monday.add(i, 'day').format('YYYY-MM-DD')
      );
      return {
        weekKey,
        start: dates[0],
        end: dates[6],
        dates,
      };
    }

    const d = dayjs(trimmed);
    const target = d.isValid() ? d : dayjs();
    const monday = target.startOf('isoWeek');
    const weekKey = `${monday.isoWeekYear()}-W${String(monday.isoWeek()).padStart(2, '0')}`;
    const dates = Array.from({ length: 7 }, (_, i) =>
      monday.add(i, 'day').format('YYYY-MM-DD')
    );
    return {
      weekKey,
      start: dates[0],
      end: dates[6],
      dates,
    };
  }

  if (weekKeyOrRange && typeof weekKeyOrRange === 'object') {
    const startDay = dayjs(weekKeyOrRange.start).startOf('day');
    const endDay = dayjs(weekKeyOrRange.end).startOf('day');
    const weekKey = `${startDay.isoWeekYear()}-W${String(startDay.isoWeek()).padStart(2, '0')}`;
    const diff = Math.max(0, endDay.diff(startDay, 'day'));
    const dates: string[] = [];
    for (let i = 0; i <= diff; i++) {
      dates.push(startDay.add(i, 'day').format('YYYY-MM-DD'));
    }
    if (dates.length === 0) {
      dates.push(startDay.format('YYYY-MM-DD'));
    }
    return {
      weekKey,
      start: dates[0],
      end: dates[dates.length - 1],
      dates,
    };
  }

  const now = dayjs();
  const monday = now.startOf('isoWeek');
  const weekKey = `${monday.isoWeekYear()}-W${String(monday.isoWeek()).padStart(2, '0')}`;
  const dates = Array.from({ length: 7 }, (_, i) =>
    monday.add(i, 'day').format('YYYY-MM-DD')
  );
  return {
    weekKey,
    start: dates[0],
    end: dates[6],
    dates,
  };
}

export function buildWeeklySnapshot(
  rootDocOrWrapper: any,
  weekKeyOrRange: string | { start: string; end: string },
  boardDocs?: any[]
): WeeklySnapshot {
  const { weekKey, start, end, dates } = parseWeekRange(weekKeyOrRange);

  const rawDoc =
    rootDocOrWrapper?.yDoc ?? rootDocOrWrapper?.doc ?? rootDocOrWrapper;
  const resolvedDoc =
    typeof rawDoc?.getMap === 'function'
      ? (resolveRootYDoc(rawDoc) ?? rawDoc)
      : null;

  // 1. Habits aggregation
  const allHabits = resolvedDoc ? readHabitsFromDoc(resolvedDoc) : [];
  const habitStats = new Map<
    string,
    { id: string; title: string; completedDays: number; expected: number }
  >();

  for (const habit of allHabits) {
    if (!habit || typeof habit !== 'object') continue;
    const rawId = String(habit.id ?? '');
    const habitId = normalizeHabitId(rawId);
    const title = (habit.icon ? `${habit.icon} ` : '') + (habit.title ?? '');
    const schedule = habit.schedule
      ? normalizeSchedule(habit.schedule)
      : { mode: 'daily' as const };
    const expected = expectedCompletionsInRange(schedule, start, end);
    habitStats.set(habitId, {
      id: habitId,
      title,
      completedDays: 0,
      expected,
    });
  }

  const habitDays: WeeklyHabitSummary['days'] = [];
  let totalHabitCompleted = 0;

  for (let i = 0; i < dates.length; i++) {
    const dateStr = dates[i];
    if (resolvedDoc) {
      const items = extractHabitDatedItems(resolvedDoc, dateStr);
      let dayCompleted = 0;
      for (const item of items) {
        const habitId = String(
          item.metadata?.habitId ||
            (item.id.endsWith(`-${dateStr}`)
              ? item.id.slice(0, -(dateStr.length + 1))
              : item.id)
        );
        if (!habitStats.has(habitId)) {
          habitStats.set(habitId, {
            id: habitId,
            title: item.title,
            completedDays: 0,
            expected: dates.length,
          });
        }
        if (item.done) {
          dayCompleted++;
          const stats = habitStats.get(habitId);
          if (stats) {
            stats.completedDays++;
          }
        }
      }
      const targetCount = items.length;
      const rate =
        targetCount > 0 ? Math.round((dayCompleted / targetCount) * 100) : 0;
      totalHabitCompleted += dayCompleted;
      habitDays.push({
        date: dateStr,
        dayIndex: i,
        completedCount: dayCompleted,
        targetCount,
        rate,
      });
    } else {
      habitDays.push({
        date: dateStr,
        dayIndex: i,
        completedCount: 0,
        targetCount: 0,
        rate: 0,
      });
    }
  }

  // Include completions of weekly-count habits in the week
  for (const habit of allHabits) {
    if (!habit || typeof habit !== 'object') continue;
    const schedule = habit.schedule
      ? normalizeSchedule(habit.schedule)
      : { mode: 'daily' as const };
    if (schedule.mode === 'weekly-count') {
      let weeklyCompleted = 0;
      for (const dateStr of dates) {
        const entryVal = habit.entries?.[dateStr];
        const done =
          habit.type === 'quantitative'
            ? typeof entryVal === 'number' &&
              entryVal >= (habit.targetValue ?? 1)
            : Boolean(entryVal);
        if (done) {
          weeklyCompleted++;
        }
      }
      totalHabitCompleted += weeklyCompleted;
      const habitId = normalizeHabitId(String(habit.id ?? ''));
      const stats = habitStats.get(habitId);
      if (stats) {
        stats.completedDays += weeklyCompleted;
      }
    }
  }

  const totalActive = habitStats.size;
  const totalTargetCompletions =
    allHabits.length > 0
      ? allHabits.reduce(
          (acc, h) =>
            acc +
            expectedCompletionsInRange(
              h?.schedule ? normalizeSchedule(h.schedule) : { mode: 'daily' },
              start,
              end
            ),
          0
        )
      : totalActive * dates.length;

  const habitCompletionRate =
    totalTargetCompletions > 0
      ? Math.round((totalHabitCompleted / totalTargetCompletions) * 100)
      : 0;

  const topHabits = Array.from(habitStats.values())
    .map(h => ({
      id: h.id,
      title: h.title,
      completedDays: h.completedDays,
      rate:
        h.expected > 0 ? Math.round((h.completedDays / h.expected) * 100) : 0,
    }))
    .sort(
      (a, b) =>
        b.completedDays - a.completedDays || a.title.localeCompare(b.title)
    );

  const habits: WeeklyHabitSummary = {
    totalActive,
    totalTargetCompletions,
    totalCompleted: totalHabitCompleted,
    completionRate: habitCompletionRate,
    days: habitDays,
    topHabits,
  };

  // 2. Streaks aggregation
  let activeCount = 0;
  let completedCount = 0;
  const sprintsEndingThisWeek: WeeklyStreakSummary['sprintsEndingThisWeek'] = [];

  if (resolvedDoc) {
    const streakItems = extractStreakDatedItems(resolvedDoc);
    for (const item of streakItems) {
      const sDay = item.start ? item.start.slice(0, 10) : '';
      const tDay = item.end ? item.end.slice(0, 10) : '';

      const overlaps = (!sDay || sDay <= end) && (!tDay || tDay >= start);
      if (overlaps) {
        if (item.done) {
          completedCount++;
        } else {
          activeCount++;
        }
      }

      if (tDay && tDay >= start && tDay <= end) {
        sprintsEndingThisWeek.push({
          id: item.id,
          title: item.title,
          targetDate: item.end || item.start || '',
          isCompleted: item.done,
        });
      }
    }
  }

  const streaks: WeeklyStreakSummary = {
    activeCount,
    completedCount,
    sprintsEndingThisWeek,
  };

  // 3. Calendar tasks aggregation
  let taskTotal = 0;
  let taskCompleted = 0;

  if (resolvedDoc) {
    const taskItems = extractCalendarDatedItems(resolvedDoc, { start, end });
    taskTotal = taskItems.length;
    taskCompleted = taskItems.filter(t => t.done).length;
  }

  const taskPending = taskTotal - taskCompleted;
  const taskCompletionRate =
    taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;

  const tasks: WeeklyTaskSummary = {
    total: taskTotal,
    completed: taskCompleted,
    pending: taskPending,
    completionRate: taskCompletionRate,
  };

  // 4. Board cards aggregation
  let totalCardsDue = 0;
  let completedCards = 0;

  const candidateDocs =
    Array.isArray(boardDocs) && boardDocs.length > 0
      ? boardDocs
      : resolvedDoc
        ? [resolvedDoc]
        : [];

  for (const bDoc of candidateDocs) {
    const cards = extractBoardDatedItems(bDoc);
    for (const card of cards) {
      if (!card.start) continue;
      const dueDay = card.start.slice(0, 10);
      if (dueDay >= start && dueDay <= end) {
        totalCardsDue++;
        if (card.done) {
          completedCards++;
        }
      }
    }
  }

  const pendingCards = totalCardsDue - completedCards;
  const boardCompletionRate =
    totalCardsDue > 0 ? Math.round((completedCards / totalCardsDue) * 100) : 0;

  const boards: WeeklyBoardSummary = {
    totalCardsDue,
    completedCards,
    pendingCards,
    completionRate: boardCompletionRate,
  };

  // 5. Global consistency score calculation (50% habits, 50% actionable tasks/boards)
  const actionableTotal = tasks.total + boards.totalCardsDue;
  const actionableCompleted = tasks.completed + boards.completedCards;
  const actionableRate =
    actionableTotal > 0
      ? Math.round((actionableCompleted / actionableTotal) * 100)
      : 0;

  const habitsExist = habits.totalTargetCompletions > 0;
  const actionableExist = actionableTotal > 0;

  let consistencyScore = 0;
  if (habitsExist && actionableExist) {
    consistencyScore = Math.round(
      habits.completionRate * 0.5 + actionableRate * 0.5
    );
  } else if (habitsExist) {
    consistencyScore = habits.completionRate;
  } else if (actionableExist) {
    consistencyScore = actionableRate;
  } else {
    consistencyScore = 0;
  }

  return {
    weekKey,
    range: { start, end },
    habits,
    streaks,
    tasks,
    boards,
    consistencyScore,
  };
}
