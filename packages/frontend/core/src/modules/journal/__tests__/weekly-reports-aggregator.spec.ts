import { describe, expect, test } from 'vitest';

import {
  aggregateWeeklyReportOverview,
  getWeeklyReportDays,
} from '../store/journal';

describe('weekly reports aggregator helpers', () => {
  test('getWeeklyReportDays returns 7 days from Monday to Sunday for a given ISO week', () => {
    const days = getWeeklyReportDays('2026-W42');
    expect(days).toHaveLength(7);

    expect(days[0]).toMatchObject({
      date: '2026-10-12',
      dayName: 'Lunes',
      isoWeekday: 1,
    });
    expect(days[1]).toMatchObject({
      date: '2026-10-13',
      dayName: 'Martes',
      isoWeekday: 2,
    });
    expect(days[2]).toMatchObject({
      date: '2026-10-14',
      dayName: 'Miércoles',
      isoWeekday: 3,
    });
    expect(days[3]).toMatchObject({
      date: '2026-10-15',
      dayName: 'Jueves',
      isoWeekday: 4,
    });
    expect(days[4]).toMatchObject({
      date: '2026-10-16',
      dayName: 'Viernes',
      isoWeekday: 5,
    });
    expect(days[5]).toMatchObject({
      date: '2026-10-17',
      dayName: 'Sábado',
      isoWeekday: 6,
    });
    expect(days[6]).toMatchObject({
      date: '2026-10-18',
      dayName: 'Domingo',
      isoWeekday: 7,
    });
  });

  test('aggregateWeeklyReportOverview accurately identifies days with daily notes and stats', () => {
    const mockDocList = [
      { id: 'doc-1', journalDate: '2026-10-12', title: '2026-10-12' },
      { id: 'doc-2', journalDate: '2026-10-13', title: '2026-10-13' },
      { id: 'doc-3', journalDate: '2026-10-14', title: '2026-10-14' },
      { id: 'doc-4', journalDate: '2026-10-15', title: '2026-10-15' },
      { id: 'doc-5', journalDate: '2026-10-16', title: '2026-10-16' },
      // Saturday and Sunday are missing
      { id: 'doc-other', journalDate: '2026-10-19', title: '2026-10-19' }, // Next week
    ];

    const overview = aggregateWeeklyReportOverview('2026-W42', mockDocList);

    expect(overview.totalDays).toBe(7);
    expect(overview.daysWithJournal).toBe(5);
    expect(overview.completionRate).toBe(71); // 5/7 = ~71%

    expect(overview.days).toHaveLength(7);
    expect(overview.days[0].exists).toBe(true);
    expect(overview.days[0].docId).toBe('doc-1');
    expect(overview.days[0].date).toBe('2026-10-12');

    expect(overview.days[4].exists).toBe(true);
    expect(overview.days[4].docId).toBe('doc-5');

    expect(overview.days[5].exists).toBe(false);
    expect(overview.days[5].docId).toBeUndefined();
    expect(overview.days[6].exists).toBe(false);
    expect(overview.days[6].docId).toBeUndefined();
  });
});
