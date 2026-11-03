import { CATEGORY_COLORS, normalizeCategory } from '../categories';
import { AFFINITE_YMAP_CALENDAR } from '../keys';
import type { DatedItem, DateRange } from '../types';
import { resolveRootYDoc } from '../yjs-root';

function itemOverlapsRange(
  start: string,
  end: string | undefined,
  range: DateRange
): boolean {
  if (!start) return false;
  const effectiveEnd = end || start;

  if (
    range.start.includes('T') &&
    range.end.includes('T') &&
    start.includes('T')
  ) {
    const itemEndTime = effectiveEnd.includes('T')
      ? effectiveEnd
      : `${effectiveEnd}T23:59:59`;
    return itemEndTime >= range.start && start <= range.end;
  }

  const rangeStartDay = range.start.slice(0, 10);
  const rangeEndDay = range.end.slice(0, 10);
  const itemStartDay = start.slice(0, 10);
  const itemEndDay = effectiveEnd.slice(0, 10);

  return itemEndDay >= rangeStartDay && itemStartDay <= rangeEndDay;
}

export function extractCalendarDatedItems(
  rootDoc: any,
  dateRange?: DateRange
): DatedItem[] {
  if (!rootDoc) {
    return [];
  }

  try {
    const doc =
      typeof rootDoc.getMap === 'function'
        ? (resolveRootYDoc(rootDoc) ?? rootDoc)
        : null;

    if (!doc || typeof doc.getMap !== 'function') {
      return [];
    }

    const yMap = doc.getMap(AFFINITE_YMAP_CALENDAR);
    if (!yMap) {
      return [];
    }

    const raw = yMap.get('tasks');
    if (!raw) {
      return [];
    }

    let tasks: any[] = [];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          tasks = parsed;
        } else {
          return [];
        }
      } catch {
        return [];
      }
    } else if (Array.isArray(raw)) {
      tasks = raw;
    } else {
      return [];
    }

    const result: DatedItem[] = [];

    for (const task of tasks) {
      if (!task || typeof task !== 'object') {
        continue;
      }

      const rawDate = task.date || task.start || '';
      const isAllDay =
        task.isAllDay !== undefined
          ? Boolean(task.isAllDay)
          : !task.startTime && !task.time && !rawDate.includes('T');

      let start = rawDate;
      if (!isAllDay && !rawDate.includes('T') && (task.startTime || task.time)) {
        start = `${rawDate}T${task.startTime || task.time}`;
      }

      let end: string | undefined = undefined;
      if (task.endDate) {
        if (!isAllDay && !task.endDate.includes('T') && task.endTime) {
          end = `${task.endDate}T${task.endTime}`;
        } else {
          end = task.endDate;
        }
      } else if (!isAllDay && task.endTime && rawDate) {
        end = `${rawDate}T${task.endTime}`;
      } else if (task.end) {
        end = task.end;
      }

      if (dateRange && !itemOverlapsRange(start, end, dateRange)) {
        continue;
      }

      const category = normalizeCategory(task.category);
      const color = task.color || CATEGORY_COLORS[category];
      const done = Boolean(task.completed ?? task.done);
      const rawId = String(task.id ?? '');
      const id = rawId.startsWith('calendar-') ? rawId : `calendar-${rawId}`;

      result.push({
        id,
        source: 'calendar',
        title: task.title || '',
        start,
        end,
        allDay: isAllDay,
        category,
        color,
        done,
        href: '/calendar',
        metadata: {
          taskId: task.id,
          calendarId: task.calendarId,
          priority: task.priority,
        },
      });
    }

    return result;
  } catch {
    return [];
  }
}
