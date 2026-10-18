import { LiveData, Store } from '@toeverything/infra';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear';
import type { Observable } from 'rxjs';

import type { DocsService } from '../../doc';

dayjs.extend(isoWeek);
dayjs.extend(isoWeeksInYear);

export function isWeeklyJournalString(j?: string | false): j is string {
  return j ? /^\d{4}-W\d{2}$/.test(j) : false;
}

export function isJournalString(j?: string | false): j is string {
  return j ? /^\d{4}-\d{2}-\d{2}$/.test(j) || isWeeklyJournalString(j) : false;
}

export function formatWeeklyJournalKey(date?: dayjs.ConfigType): string {
  const d = dayjs(date);
  const year = d.isoWeekYear();
  const week = String(d.isoWeek()).padStart(2, '0');
  return `${year}-W${week}`;
}

export function getWeekDateRange(weekKey: string): {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
  weekNumber: number;
  year: number;
} {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    const now = dayjs();
    return {
      start: now.startOf('isoWeek'),
      end: now.endOf('isoWeek'),
      weekNumber: now.isoWeek(),
      year: now.isoWeekYear(),
    };
  }
  const year = parseInt(match[1], 10);
  const weekNumber = parseInt(match[2], 10);
  // ISO 8601: January 4th is always in ISO week 1 of that year
  const week1Monday = dayjs(`${year}-01-04`).startOf('isoWeek');
  const start = week1Monday.add(weekNumber - 1, 'week').startOf('day');
  const end = start.add(6, 'day').endOf('day');
  return { start, end, weekNumber, year };
}

export class JournalStore extends Store {
  constructor(private readonly docsService: DocsService) {
    super();
  }

  allJournalDates$ = LiveData.computed(get => {
    return new Set(
      get(this.docsService.list.docs$)
        .filter(doc => {
          const journal = get(doc.properties$.selector(p => p.journal));
          return !!journal && isJournalString(journal);
        })
        .map(doc => get(doc.properties$.selector(p => p.journal)))
    );
  });

  watchDocJournalDate(docId: string): Observable<string | undefined> {
    return LiveData.computed(get => {
      const doc = get(this.docsService.list.doc$(docId));
      if (!doc) {
        // if doc not exists
        return undefined;
      }
      const journal = get(doc.properties$.selector(p => p.journal));
      if (journal && !isJournalString(journal)) {
        return undefined;
      }
      return journal ?? undefined;
    });
  }

  setDocJournalDate(docId: string, date: string) {
    const doc = this.docsService.list.doc$(docId).value;
    if (!doc) {
      // doc not exists, do nothing
      return;
    }
    doc.setProperty('journal', date);
  }

  removeDocJournalDate(docId: string) {
    this.setDocJournalDate(docId, '');
  }

  getDocsByJournalDate(date: string) {
    return this.docsService.list.docs$.value.filter(
      doc => doc.properties$.value.journal === date
    );
  }
  docsByJournalDate$(date: string) {
    return LiveData.computed(get => {
      return get(this.docsService.list.docs$).filter(doc => {
        const journal = get(doc.properties$.selector(p => p.journal));
        return journal === date;
      });
    });
  }
}
