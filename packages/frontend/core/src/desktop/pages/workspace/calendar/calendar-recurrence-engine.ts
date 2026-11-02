import type {
  CalendarTask,
  ExpandedCalendarEvent,
  RecurrenceRule,
} from './calendar-types';

const MS_PER_DAY = 86_400_000;
const MAX_RECURRENCE_ITERATIONS = 3660; // ~10 years safety cap

function parseDateUTC(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatDateUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function diffDaysUTC(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * Returns ISO weekday: 1 = Monday ... 7 = Sunday.
 */
function getIsoWeekdayUTC(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

function getMondayOfIsoWeekUTC(date: Date): Date {
  const isoWeekday = getIsoWeekdayUTC(date);
  return addDaysUTC(date, -(isoWeekday - 1));
}

function expandMultiDayTask(
  task: CalendarTask,
  rangeStartStr: string,
  rangeEndStr: string
): ExpandedCalendarEvent[] {
  if (!task.endDate || task.endDate <= task.date) {
    return [];
  }
  const startDate = parseDateUTC(task.date);
  const endDate = parseDateUTC(task.endDate);
  if (!startDate || !endDate) {
    return [];
  }

  const totalDays = diffDaysUTC(startDate, endDate) + 1;
  if (totalDays <= 1 || totalDays > MAX_RECURRENCE_ITERATIONS) {
    return [];
  }

  const results: ExpandedCalendarEvent[] = [];
  for (let i = 0; i < totalDays; i++) {
    const currentDate = addDaysUTC(startDate, i);
    const dayStr = formatDateUTC(currentDate);
    if (dayStr >= rangeStartStr && dayStr <= rangeEndStr) {
      results.push({
        ...task,
        id: `${task.id}__span_${dayStr}`,
        masterId: task.id,
        instanceDate: dayStr,
        date: dayStr,
        isRecurringInstance: false,
        isMultiDay: true,
        spanDayIndex: i + 1,
        spanTotalDays: totalDays,
      });
    }
  }

  return results;
}

function generateCandidateDates(
  startDate: Date,
  rule: RecurrenceRule,
  effectiveEndStr: string
): string[] {
  const interval = Math.max(1, Math.floor(rule.interval ?? 1));
  const maxCount =
    rule.count !== undefined && rule.count > 0
      ? Math.floor(rule.count)
      : undefined;
  const candidates: string[] = [];

  if (rule.frequency === 'daily') {
    for (let step = 0; step < MAX_RECURRENCE_ITERATIONS; step++) {
      const candDate = addDaysUTC(startDate, step * interval);
      const occDateStr = formatDateUTC(candDate);
      if (occDateStr > effectiveEndStr) {
        break;
      }
      candidates.push(occDateStr);
      if (maxCount !== undefined && candidates.length >= maxCount) {
        break;
      }
    }
    return candidates;
  }

  if (rule.frequency === 'weekdays') {
    for (let offset = 0; offset < MAX_RECURRENCE_ITERATIONS; offset++) {
      const candDate = addDaysUTC(startDate, offset);
      const occDateStr = formatDateUTC(candDate);
      if (occDateStr > effectiveEndStr) {
        break;
      }
      const isoWeekday = getIsoWeekdayUTC(candDate);
      if (isoWeekday >= 1 && isoWeekday <= 5) {
        candidates.push(occDateStr);
        if (maxCount !== undefined && candidates.length >= maxCount) {
          break;
        }
      }
    }
    return candidates;
  }

  if (rule.frequency === 'weekly') {
    const targetWeekdays =
      rule.byWeekday && rule.byWeekday.length > 0
        ? rule.byWeekday
        : [getIsoWeekdayUTC(startDate)];
    const baseMonday = getMondayOfIsoWeekUTC(startDate);

    for (let offset = 0; offset < MAX_RECURRENCE_ITERATIONS; offset++) {
      const candDate = addDaysUTC(startDate, offset);
      const occDateStr = formatDateUTC(candDate);
      if (occDateStr > effectiveEndStr) {
        break;
      }
      const candMonday = getMondayOfIsoWeekUTC(candDate);
      const weeksElapsed = Math.round(diffDaysUTC(baseMonday, candMonday) / 7);
      if (
        weeksElapsed % interval === 0 &&
        targetWeekdays.includes(getIsoWeekdayUTC(candDate))
      ) {
        candidates.push(occDateStr);
        if (maxCount !== undefined && candidates.length >= maxCount) {
          break;
        }
      }
    }
    return candidates;
  }

  if (rule.frequency === 'monthly') {
    const startYear = startDate.getUTCFullYear();
    const startMonth = startDate.getUTCMonth();
    const startDay = startDate.getUTCDate();

    for (let step = 0; step < MAX_RECURRENCE_ITERATIONS; step++) {
      const totalMonths = startMonth + step * interval;
      const targetYear = startYear + Math.floor(totalMonths / 12);
      const targetMonth = totalMonths % 12;
      const firstOfMonthStr = formatDateUTC(
        new Date(Date.UTC(targetYear, targetMonth, 1))
      );
      if (firstOfMonthStr > effectiveEndStr) {
        break;
      }
      const candDate = new Date(Date.UTC(targetYear, targetMonth, startDay));
      if (candDate.getUTCMonth() !== targetMonth) {
        continue;
      }
      const occDateStr = formatDateUTC(candDate);
      if (occDateStr > effectiveEndStr) {
        break;
      }
      candidates.push(occDateStr);
      if (maxCount !== undefined && candidates.length >= maxCount) {
        break;
      }
    }
    return candidates;
  }

  if (rule.frequency === 'yearly') {
    const startYear = startDate.getUTCFullYear();
    const startMonth = startDate.getUTCMonth();
    const startDay = startDate.getUTCDate();

    for (let step = 0; step < MAX_RECURRENCE_ITERATIONS; step++) {
      const targetYear = startYear + step * interval;
      const firstOfYearStr = `${targetYear}-01-01`;
      if (firstOfYearStr > effectiveEndStr) {
        break;
      }
      const candDate = new Date(Date.UTC(targetYear, startMonth, startDay));
      if (candDate.getUTCMonth() !== startMonth) {
        continue;
      }
      const occDateStr = formatDateUTC(candDate);
      if (occDateStr > effectiveEndStr) {
        break;
      }
      candidates.push(occDateStr);
      if (maxCount !== undefined && candidates.length >= maxCount) {
        break;
      }
    }
    return candidates;
  }

  return candidates;
}

function expandRecurringTask(
  task: CalendarTask,
  rangeStartStr: string,
  rangeEndStr: string
): ExpandedCalendarEvent[] {
  const rule = task.recurrence;
  if (!rule || rule.frequency === 'none') {
    return [];
  }

  const startDate = parseDateUTC(task.date);
  if (!startDate) {
    return [];
  }

  const effectiveEndStr =
    rule.until && rule.until < rangeEndStr ? rule.until : rangeEndStr;
  if (task.date > effectiveEndStr) {
    return [];
  }

  const exdatesSet = new Set(rule.exdates ?? []);
  const candidateDates = generateCandidateDates(
    startDate,
    rule,
    effectiveEndStr
  );

  const results: ExpandedCalendarEvent[] = [];
  for (const occDateStr of candidateDates) {
    if (exdatesSet.has(occDateStr)) {
      continue;
    }
    if (occDateStr >= rangeStartStr && occDateStr <= rangeEndStr) {
      const isMaster = occDateStr === task.date;
      results.push({
        ...task,
        id: isMaster ? task.id : `${task.id}__rec_${occDateStr}`,
        masterId: task.id,
        instanceDate: occDateStr,
        date: occDateStr,
        isRecurringInstance: !isMaster,
        isMultiDay: false,
      });
    }
  }

  return results;
}

/**
 * Expands a list of CalendarTasks into concrete ExpandedCalendarEvent occurrences
 * within the inclusive [rangeStartStr, rangeEndStr] window (YYYY-MM-DD).
 */
export function expandEventsForRange(
  tasks: CalendarTask[],
  rangeStartStr: string,
  rangeEndStr: string
): ExpandedCalendarEvent[] {
  if (!tasks.length || rangeStartStr > rangeEndStr) {
    return [];
  }

  const expanded: ExpandedCalendarEvent[] = [];

  for (const task of tasks) {
    const isRecurring =
      Boolean(task.recurrence) && task.recurrence?.frequency !== 'none';

    if (isRecurring) {
      expanded.push(...expandRecurringTask(task, rangeStartStr, rangeEndStr));
      continue;
    }

    const isMultiDay = Boolean(task.endDate && task.endDate > task.date);
    if (isMultiDay) {
      expanded.push(...expandMultiDayTask(task, rangeStartStr, rangeEndStr));
      continue;
    }

    if (task.date >= rangeStartStr && task.date <= rangeEndStr) {
      expanded.push({
        ...task,
        masterId: task.id,
        instanceDate: task.date,
        isRecurringInstance: false,
        isMultiDay: false,
      });
    }
  }

  return expanded;
}

/**
 * Returns an updated copy of `task` with `dateToExclude` (YYYY-MM-DD) appended
 * to `task.recurrence.exdates` so deleting a single occurrence of a recurring
 * series does not remove the entire series.
 */
export function excludeRecurringOccurrence(
  task: CalendarTask,
  dateToExclude: string
): CalendarTask {
  const existingRule: RecurrenceRule = task.recurrence ?? {
    frequency: 'none',
  };
  const existingExdates = existingRule.exdates ?? [];
  const nextExdates = existingExdates.includes(dateToExclude)
    ? existingExdates
    : [...existingExdates, dateToExclude];

  return {
    ...task,
    recurrence: {
      ...existingRule,
      exdates: nextExdates,
    },
  };
}

/**
 * Formats a RecurrenceRule into a concise human-readable Spanish summary label.
 */
export function formatRecurrenceSummary(rule?: RecurrenceRule): string {
  if (!rule || rule.frequency === 'none') {
    return 'No se repite';
  }

  const interval = rule.interval && rule.interval > 1 ? rule.interval : 1;

  switch (rule.frequency) {
    case 'daily':
      return interval > 1 ? `Cada ${interval} días` : 'Todos los días';
    case 'weekdays':
      return 'Días laborales (Lun–Vie)';
    case 'weekly':
      return interval > 1 ? `Cada ${interval} semanas` : 'Semanal';
    case 'monthly':
      return interval > 1 ? `Cada ${interval} meses` : 'Mensual';
    case 'yearly':
      return interval > 1 ? `Cada ${interval} años` : 'Anual';
    default:
      return 'No se repite';
  }
}
