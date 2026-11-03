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
    const doc =
      typeof rootDoc.getMap === 'function'
        ? (resolveRootYDoc(rootDoc) ?? rootDoc)
        : null;

    if (!doc || typeof doc.getMap !== 'function') {
      return [];
    }

    const yMap = doc.getMap(AFFINITE_YMAP_HABITS);
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
      const category = normalizeCategory(habit.category);
      const color = habit.color || CATEGORY_COLORS[category];
      const title = (habit.icon ? `${habit.icon} ` : '') + (habit.title ?? '');
      const done = Boolean(habit.entries?.[targetDateStr]);

      result.push({
        id: `habit-${habitId}-${targetDateStr}`,
        source: 'habit',
        title,
        start: targetDateStr,
        allDay: true,
        category,
        color,
        done,
        href: '/habits',
        metadata: {
          habitId,
          type: habit.type,
          targetValue: habit.targetValue,
          unit: habit.unit,
        },
      });
    }

    return result;
  } catch {
    return [];
  }
}
