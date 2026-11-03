import { CATEGORY_COLORS, normalizeCategory } from '../categories';
import { AFFINITE_YMAP_HABITS, normalizeHabitId } from '../keys';
import type { DatedItem } from '../types';
import { resolveRootYDoc } from '../yjs-root';

export function extractHabitDatedItems(
  rootDoc: any,
  targetDateStr: string
): DatedItem[] {
  if (!rootDoc || !targetDateStr) {
    return [];
  }

  try {
    const doc = rootDoc?.yDoc ?? rootDoc?.doc ?? rootDoc;
    const resolvedDoc =
      typeof doc?.getMap === 'function'
        ? (resolveRootYDoc(doc) ?? doc)
        : null;

    if (!resolvedDoc || typeof resolvedDoc.getMap !== 'function') {
      return [];
    }

    const yMap = resolvedDoc.getMap(AFFINITE_YMAP_HABITS);
    if (!yMap) {
      return [];
    }

    const raw = yMap.get('habits');
    if (!raw) {
      return [];
    }

    let habits: any[] = [];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          habits = parsed;
        } else {
          return [];
        }
      } catch {
        return [];
      }
    } else if (Array.isArray(raw)) {
      habits = raw;
    } else {
      return [];
    }

    const result: DatedItem[] = [];

    for (const habit of habits) {
      if (!habit || typeof habit !== 'object') {
        continue;
      }

      const habitId = normalizeHabitId(String(habit.id ?? ''));
      const cleanId = habitId.startsWith('habit-')
        ? habitId
        : `habit-${habitId}`;
      const category = normalizeCategory(habit.category);
      const color = habit.color || CATEGORY_COLORS[category];
      const title = (habit.icon ? `${habit.icon} ` : '') + (habit.title ?? '');

      const entryVal = habit.entries?.[targetDateStr];
      const done =
        habit.type === 'quantitative'
          ? typeof entryVal === 'number' &&
            entryVal >= (habit.targetValue ?? 1)
          : Boolean(entryVal);

      const hasReminderTime =
        typeof habit.reminderTime === 'string' &&
        habit.reminderTime.trim().length > 0;
      const start = hasReminderTime
        ? `${targetDateStr} ${habit.reminderTime.trim()}`
        : targetDateStr;
      const allDay = !hasReminderTime;

      const metadata: Record<string, unknown> = {
        habitId,
        type: habit.type,
        targetValue: habit.targetValue,
        unit: habit.unit,
      };

      if (habit.reminderTime !== undefined) {
        metadata.reminderTime = habit.reminderTime;
      }
      if (habit.reminderMinutes !== undefined) {
        metadata.reminderMinutes =
          typeof habit.reminderMinutes === 'number'
            ? habit.reminderMinutes
            : undefined;
      }

      result.push({
        id: `${cleanId}-${targetDateStr}`,
        source: 'habit',
        title,
        start,
        allDay,
        category,
        color,
        done,
        href: '/habits',
        metadata,
      });
    }

    return result;
  } catch {
    return [];
  }
}
