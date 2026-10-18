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

export interface WeeklyReportDay {
  date: string; // YYYY-MM-DD
  dayName: string; // Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo
  dayShort: string; // Lun, Mar, Mié, Jue, Vie, Sáb, Dom
  isoWeekday: number; // 1 = Monday, ..., 7 = Sunday
  isToday: boolean;
  dayNumber: number; // 1..31
}

export function getWeeklyReportDays(
  weekKey: string,
  todayDate?: string
): WeeklyReportDay[] {
  const { start } = getWeekDateRange(weekKey);
  const dayNames = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
  ];
  const dayShorts = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const today = todayDate ? dayjs(todayDate) : dayjs();

  return Array.from({ length: 7 }, (_, i) => {
    const d = start.add(i, 'day');
    const dateStr = d.format('YYYY-MM-DD');
    return {
      date: dateStr,
      dayName: dayNames[i],
      dayShort: dayShorts[i],
      isoWeekday: i + 1,
      isToday: d.isSame(today, 'day'),
      dayNumber: d.date(),
    };
  });
}

export interface DayJournalSummary extends WeeklyReportDay {
  exists: boolean;
  hasJournal: boolean;
  docId?: string;
  title?: string;
}

export interface WeeklyReportOverview {
  weekKey: string;
  year: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  days: DayJournalSummary[];
  daysWithJournal: number;
  totalDays: 7;
  completionRate: number; // 0..100
  weeklyNoteDocId?: string;
  hasWeeklyNote: boolean;
}

export function aggregateWeeklyReportOverview(
  weekKey: string,
  docList: Array<{ id: string; journalDate?: string; journal?: string; title?: string }>,
  todayDate?: string
): WeeklyReportOverview {
  const { start, end, weekNumber, year } = getWeekDateRange(weekKey);
  const days = getWeeklyReportDays(weekKey, todayDate);

  const journalMap = new Map<string, { id: string; title?: string }>();
  let weeklyNoteDocId: string | undefined;

  for (const doc of docList) {
    const jDate = doc.journalDate || doc.journal;
    if (jDate) {
      if (jDate === weekKey) {
        weeklyNoteDocId = doc.id;
      } else {
        journalMap.set(jDate, { id: doc.id, title: doc.title });
      }
    }
  }

  const summarizedDays: DayJournalSummary[] = days.map(d => {
    const doc = journalMap.get(d.date);
    const hasDoc = !!doc;
    return {
      ...d,
      exists: hasDoc,
      hasJournal: hasDoc,
      docId: doc?.id,
      title: doc?.title,
    };
  });

  const daysWithJournal = summarizedDays.filter(d => d.hasJournal).length;
  const completionRate = Math.round((daysWithJournal / 7) * 100);

  return {
    weekKey,
    year,
    weekNumber,
    startDate: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD'),
    days: summarizedDays,
    daysWithJournal,
    totalDays: 7,
    completionRate,
    weeklyNoteDocId,
    hasWeeklyNote: !!weeklyNoteDocId,
  };
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
