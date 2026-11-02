import { describe, expect, it } from 'vitest';

import {
  excludeRecurringOccurrence,
  expandEventsForRange,
  formatRecurrenceSummary,
} from '../calendar-recurrence-engine';
import type { CalendarTask } from '../calendar-types';

const makeTask = (overrides: Partial<CalendarTask>): CalendarTask => ({
  id: 'task-1',
  title: 'Base Task',
  date: '2026-11-02',
  completed: false,
  priority: 'medium',
  ...overrides,
});

describe('Calendar Recurrence & Multi-Day Engine', () => {
  it('expands a single non-recurring event within range', () => {
    const task = makeTask({ id: 'single-1', date: '2026-11-05' });
    const inRange = expandEventsForRange([task], '2026-11-01', '2026-11-10');
    expect(inRange).toHaveLength(1);
    expect(inRange[0]).toMatchObject({
      id: 'single-1',
      masterId: 'single-1',
      instanceDate: '2026-11-05',
      date: '2026-11-05',
      isRecurringInstance: false,
      isMultiDay: false,
    });

    const outOfRange = expandEventsForRange([task], '2026-11-06', '2026-11-10');
    expect(outOfRange).toHaveLength(0);
  });

  it('expands a multi-day event across each day overlapping the target range', () => {
    const task = makeTask({
      id: 'conf-1',
      title: 'Tech Summit',
      date: '2026-11-02',
      endDate: '2026-11-04',
    });

    const expanded = expandEventsForRange([task], '2026-11-01', '2026-11-05');
    expect(expanded).toHaveLength(3);
    expect(expanded.map(e => e.id)).toEqual([
      'conf-1__span_2026-11-02',
      'conf-1__span_2026-11-03',
      'conf-1__span_2026-11-04',
    ]);
    expect(expanded.map(e => e.spanDayIndex)).toEqual([1, 2, 3]);
    expect(expanded.every(e => e.spanTotalDays === 3 && e.isMultiDay)).toBe(
      true
    );

    // Partial range overlap preserves true spanDayIndex and spanTotalDays
    const partial = expandEventsForRange([task], '2026-11-03', '2026-11-05');
    expect(partial).toHaveLength(2);
    expect(partial.map(e => e.spanDayIndex)).toEqual([2, 3]);
    expect(partial.map(e => e.instanceDate)).toEqual([
      '2026-11-03',
      '2026-11-04',
    ]);
  });

  it('expands daily recurring events with interval, count, until, and exdates', () => {
    const dailyTask = makeTask({
      id: 'daily-standup',
      date: '2026-11-01',
      recurrence: {
        frequency: 'daily',
        interval: 2,
        count: 4,
        exdates: ['2026-11-05'],
      },
    });

    // Generated dates: Nov 1, Nov 3, Nov 5 (excluded), Nov 7
    const expanded = expandEventsForRange(
      [dailyTask],
      '2026-11-01',
      '2026-11-15'
    );
    expect(expanded.map(e => e.instanceDate)).toEqual([
      '2026-11-01',
      '2026-11-03',
      '2026-11-07',
    ]);
    expect(expanded[0]?.id).toBe('daily-standup');
    expect(expanded[0]?.isRecurringInstance).toBe(false);
    expect(expanded[1]?.id).toBe('daily-standup__rec_2026-11-03');
    expect(expanded[1]?.isRecurringInstance).toBe(true);
    expect(expanded[1]?.masterId).toBe('daily-standup');
  });

  it('expands weekdays (Mon-Fri) recurring events skipping weekends', () => {
    // 2026-11-06 is Friday, Nov 7 is Sat, Nov 8 is Sun, Nov 9 is Mon
    const weekdayTask = makeTask({
      id: 'work-checkin',
      date: '2026-11-06',
      recurrence: {
        frequency: 'weekdays',
        until: '2026-11-10',
      },
    });

    const expanded = expandEventsForRange(
      [weekdayTask],
      '2026-11-06',
      '2026-11-12'
    );
    expect(expanded.map(e => e.instanceDate)).toEqual([
      '2026-11-06',
      '2026-11-09',
      '2026-11-10',
    ]);
  });

  it('expands weekly recurring events using byWeekday or master date weekday', () => {
    // 2026-11-02 is Monday (ISO weekday 1)
    const weeklyTask = makeTask({
      id: 'gym',
      date: '2026-11-02',
      recurrence: {
        frequency: 'weekly',
        byWeekday: [1, 3, 5], // Mon, Wed, Fri
        until: '2026-11-09',
      },
    });

    const expanded = expandEventsForRange(
      [weeklyTask],
      '2026-11-02',
      '2026-11-15'
    );
    expect(expanded.map(e => e.instanceDate)).toEqual([
      '2026-11-02',
      '2026-11-04',
      '2026-11-06',
      '2026-11-09',
    ]);
  });

  it('expands monthly and yearly recurring events accurately', () => {
    const monthlyTask = makeTask({
      id: 'rent',
      date: '2026-01-15',
      recurrence: {
        frequency: 'monthly',
        count: 3,
      },
    });
    const monthlyExpanded = expandEventsForRange(
      [monthlyTask],
      '2026-01-01',
      '2026-06-01'
    );
    expect(monthlyExpanded.map(e => e.instanceDate)).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
    ]);

    const yearlyTask = makeTask({
      id: 'birthday',
      date: '2025-05-20',
      recurrence: {
        frequency: 'yearly',
        count: 3,
      },
    });
    const yearlyExpanded = expandEventsForRange(
      [yearlyTask],
      '2025-01-01',
      '2028-12-31'
    );
    expect(yearlyExpanded.map(e => e.instanceDate)).toEqual([
      '2025-05-20',
      '2026-05-20',
      '2027-05-20',
    ]);
  });

  it('excludes a single recurring occurrence via excludeRecurringOccurrence', () => {
    const task = makeTask({
      id: 'weekly-sync',
      date: '2026-11-02',
      recurrence: {
        frequency: 'weekly',
      },
    });

    const updated = excludeRecurringOccurrence(task, '2026-11-09');
    expect(updated.recurrence?.exdates).toEqual(['2026-11-09']);

    // Idempotent when excluding same date twice
    const updatedAgain = excludeRecurringOccurrence(updated, '2026-11-09');
    expect(updatedAgain.recurrence?.exdates).toEqual(['2026-11-09']);
  });

  it('formats recurrence summary in Spanish', () => {
    expect(formatRecurrenceSummary(undefined)).toBe('No se repite');
    expect(formatRecurrenceSummary({ frequency: 'none' })).toBe('No se repite');
    expect(formatRecurrenceSummary({ frequency: 'daily' })).toBe(
      'Todos los días'
    );
    expect(formatRecurrenceSummary({ frequency: 'weekdays' })).toBe(
      'Días laborales (Lun–Vie)'
    );
    expect(formatRecurrenceSummary({ frequency: 'weekly' })).toBe('Semanal');
    expect(formatRecurrenceSummary({ frequency: 'monthly' })).toBe('Mensual');
    expect(formatRecurrenceSummary({ frequency: 'yearly' })).toBe('Anual');
  });
});
