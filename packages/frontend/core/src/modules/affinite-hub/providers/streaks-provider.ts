import { CATEGORY_COLORS, normalizeCategory } from '../categories';
import { AFFINITE_YMAP_STREAKS } from '../keys';
import type { DatedItem } from '../types';
import { resolveRootYDoc } from '../yjs-root';

export function extractStreakDatedItems(rootDoc: any): DatedItem[] {
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

    const yMap = doc.getMap(AFFINITE_YMAP_STREAKS);
    if (!yMap) {
      return [];
    }

    const raw = yMap.get('streaks');
    if (!raw) {
      return [];
    }

    let streaks: any[] = [];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          streaks = parsed;
        } else {
          return [];
        }
      } catch {
        return [];
      }
    } else if (Array.isArray(raw)) {
      streaks = raw;
    } else {
      return [];
    }

    const result: DatedItem[] = [];

    for (const streak of streaks) {
      if (!streak || typeof streak !== 'object') {
        continue;
      }

      const category = normalizeCategory(streak.category);
      const color = streak.color || CATEGORY_COLORS[category];
      const title = (streak.icon ? `${streak.icon} ` : '') + (streak.title ?? '');
      const done = streak.status === 'completed';
      const allDay = streak.mode === 'days';

      let progressPercent =
        typeof streak.progressPercent === 'number'
          ? streak.progressPercent
          : undefined;

      if (
        progressPercent === undefined &&
        streak.startDateTime &&
        streak.targetDateTime
      ) {
        const start = new Date(streak.startDateTime).getTime();
        const target = new Date(streak.targetDateTime).getTime();
        if (!isNaN(start) && !isNaN(target) && target > start) {
          const now = Date.now();
          const totalMs = target - start;
          const elapsedMs = Math.max(0, Math.min(now - start, totalMs));
          progressPercent = Math.min(
            100,
            Math.max(0, Math.round((elapsedMs / totalMs) * 100))
          );
        }
      }

      const metadata: Record<string, unknown> = {
        streakId: streak.id,
        mode: streak.mode,
        status: streak.status,
      };

      if (progressPercent !== undefined) {
        metadata.progressPercent = progressPercent;
      }

      const rawId = String(streak.id ?? '');
      const cleanStreakId = rawId.startsWith('streak-')
        ? rawId
        : `streak-${rawId}`;

      result.push({
        id: cleanStreakId,
        source: 'streak',
        title,
        start: streak.startDateTime,
        end: streak.targetDateTime,
        allDay,
        category,
        color,
        done,
        href: '/streaks',
        metadata,
      });
    }

    return result;
  } catch {
    return [];
  }
}
