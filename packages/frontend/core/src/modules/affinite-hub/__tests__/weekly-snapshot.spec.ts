import { describe, expect, test } from 'vitest';
import * as Y from 'yjs';

import {
  AFFINITE_YMAP_BOARD,
  AFFINITE_YMAP_CALENDAR,
  AFFINITE_YMAP_HABITS,
  AFFINITE_YMAP_STREAKS,
} from '../keys';
import {
  buildWeeklySnapshot,
  parseWeekRange,
  type WeeklySnapshot,
} from '../weekly-snapshot';

describe('weekly-snapshot module', () => {
  describe('parseWeekRange', () => {
    test('parses ISO week key format YYYY-Www into Monday to Sunday', () => {
      const range = parseWeekRange('2026-W45');
      expect(range.weekKey).toBe('2026-W45');
      expect(range.start).toBe('2026-11-02');
      expect(range.end).toBe('2026-11-08');
      expect(range.dates).toEqual([
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
        '2026-11-05',
        '2026-11-06',
        '2026-11-07',
        '2026-11-08',
      ]);
    });

    test('parses range object { start, end } correctly', () => {
      const range = parseWeekRange({
        start: '2026-11-02',
        end: '2026-11-08',
      });
      expect(range.weekKey).toBe('2026-W45');
      expect(range.start).toBe('2026-11-02');
      expect(range.end).toBe('2026-11-08');
      expect(range.dates).toHaveLength(7);
      expect(range.dates[0]).toBe('2026-11-02');
      expect(range.dates[6]).toBe('2026-11-08');
    });

    test('parses single date string into its enclosing ISO week', () => {
      const range = parseWeekRange('2026-11-05');
      expect(range.weekKey).toBe('2026-W45');
      expect(range.start).toBe('2026-11-02');
      expect(range.end).toBe('2026-11-08');
      expect(range.dates).toHaveLength(7);
    });
  });

  describe('buildWeeklySnapshot - empty and edge cases', () => {
    test('returns zeroed snapshot safely when doc is null or undefined', () => {
      const snapshot: WeeklySnapshot = buildWeeklySnapshot(null, '2026-W45');
      expect(snapshot.weekKey).toBe('2026-W45');
      expect(snapshot.range).toEqual({
        start: '2026-11-02',
        end: '2026-11-08',
      });
      expect(snapshot.habits).toEqual({
        totalActive: 0,
        totalTargetCompletions: 0,
        totalCompleted: 0,
        completionRate: 0,
        days: expect.any(Array),
        topHabits: [],
      });
      expect(snapshot.habits.days).toHaveLength(7);
      expect(snapshot.streaks).toEqual({
        activeCount: 0,
        completedCount: 0,
        sprintsEndingThisWeek: [],
      });
      expect(snapshot.tasks).toEqual({
        total: 0,
        completed: 0,
        pending: 0,
        completionRate: 0,
      });
      expect(snapshot.boards).toEqual({
        totalCardsDue: 0,
        completedCards: 0,
        pendingCards: 0,
        completionRate: 0,
      });
      expect(snapshot.consistencyScore).toBe(0);
    });

    test('returns zeroed snapshot when Y.Doc is empty', () => {
      const doc = new Y.Doc();
      const snapshot = buildWeeklySnapshot(doc, '2026-W45');
      expect(snapshot.habits.totalActive).toBe(0);
      expect(snapshot.streaks.activeCount).toBe(0);
      expect(snapshot.tasks.total).toBe(0);
      expect(snapshot.boards.totalCardsDue).toBe(0);
      expect(snapshot.consistencyScore).toBe(0);
    });
  });

  describe('buildWeeklySnapshot - habits aggregation', () => {
    test('computes accurate completion percentage and daily breakdown for habits', () => {
      const doc = new Y.Doc();
      const habitsMap = doc.getMap(AFFINITE_YMAP_HABITS);

      const habitsData = [
        {
          id: 'habit-water',
          title: 'Beber 2L de agua',
          type: 'quantitative',
          targetValue: 2000,
          entries: {
            '2026-11-02': 2000, // completed
            '2026-11-03': 2000, // completed
            '2026-11-04': 1000, // incomplete
            '2026-11-05': 2500, // completed
            '2026-11-06': 2000, // completed
            '2026-11-07': 0, // incomplete
            '2026-11-08': 2000, // completed (total: 5)
          },
        },
        {
          id: 'habit-workout',
          title: 'Entrenamiento',
          type: 'boolean',
          entries: {
            '2026-11-02': true, // completed
            '2026-11-03': false,
            '2026-11-04': true, // completed
            '2026-11-05': false,
            '2026-11-06': true, // completed
            '2026-11-07': false,
            '2026-11-08': false, // (total: 3)
          },
        },
      ];

      habitsMap.set('habits', JSON.stringify(habitsData));

      const snapshot = buildWeeklySnapshot(doc, '2026-W45');

      // 2 habits * 7 days = 14 target completions
      expect(snapshot.habits.totalActive).toBe(2);
      expect(snapshot.habits.totalTargetCompletions).toBe(14);
      // Total completed = 5 + 3 = 8
      expect(snapshot.habits.totalCompleted).toBe(8);
      // 8 / 14 = 57.14% -> 57%
      expect(snapshot.habits.completionRate).toBe(57);

      // Check daily breakdown (7 days)
      expect(snapshot.habits.days).toHaveLength(7);
      // Monday 2026-11-02: both completed (2/2 = 100%)
      expect(snapshot.habits.days[0]).toEqual({
        date: '2026-11-02',
        dayIndex: 0,
        completedCount: 2,
        targetCount: 2,
        rate: 100,
      });
      // Tuesday 2026-11-03: 1 completed (1/2 = 50%)
      expect(snapshot.habits.days[1]).toEqual({
        date: '2026-11-03',
        dayIndex: 1,
        completedCount: 1,
        targetCount: 2,
        rate: 50,
      });

      // Top habits ranking
      expect(snapshot.habits.topHabits).toHaveLength(2);
      expect(snapshot.habits.topHabits[0]).toEqual({
        id: 'habit-water',
        title: 'Beber 2L de agua',
        completedDays: 5,
        rate: 71, // 5/7 = 71.4% -> 71%
      });
      expect(snapshot.habits.topHabits[1]).toEqual({
        id: 'habit-workout',
        title: 'Entrenamiento',
        completedDays: 3,
        rate: 43, // 3/7 = 42.8% -> 43%
      });
    });

    test('calcula totalTargetCompletions sumando expectativas individuales y topHabits proporcional a cada meta', () => {
      const doc = new Y.Doc();
      const habitsMap = doc.getMap(AFFINITE_YMAP_HABITS);

      // 1 diario (meta 7) + 1 L-M-V (meta 3) = totalTargetCompletions 10 (no 14)
      const habitsData = [
        {
          id: 'habit-daily-read',
          title: 'Lectura diaria',
          type: 'boolean',
          schedule: { mode: 'daily' },
          entries: {
            '2026-11-02': true,
            '2026-11-03': true,
            '2026-11-04': true,
            '2026-11-05': true,
            '2026-11-06': true,
            '2026-11-07': false,
            '2026-11-08': false, // 5 de 7
          },
        },
        {
          id: 'habit-gym-mwf',
          title: 'Gimnasio L-M-V',
          type: 'boolean',
          schedule: { mode: 'weekdays', days: [1, 3, 5] },
          entries: {
            '2026-11-02': true, // Lunes (programado)
            '2026-11-04': true, // Miércoles (programado)
            '2026-11-06': true, // Viernes (programado)
          },
        },
      ];

      habitsMap.set('habits', JSON.stringify(habitsData));

      const snapshot = buildWeeklySnapshot(doc, '2026-W45');

      expect(snapshot.habits.totalActive).toBe(2);
      // Meta total = 7 (diario) + 3 (L-M-V) = 10
      expect(snapshot.habits.totalTargetCompletions).toBe(10);
      // Total completado = 5 (diario) + 3 (gym) = 8
      expect(snapshot.habits.totalCompleted).toBe(8);
      // 8 / 10 = 80%
      expect(snapshot.habits.completionRate).toBe(80);

      // Top habits:
      // Lectura diaria: 5/7 = 71%
      // Gimnasio L-M-V: 3/3 = 100% (proporcional a su meta de 3, no a 7)
      expect(snapshot.habits.topHabits).toEqual([
        {
          id: 'habit-daily-read',
          title: 'Lectura diaria',
          completedDays: 5,
          rate: 71,
        },
        {
          id: 'habit-gym-mwf',
          title: 'Gimnasio L-M-V',
          completedDays: 3,
          rate: 100,
        },
      ]);
    });

    test('incluye completaciones de hábitos weekly-count en el resumen semanal', () => {
      const doc = new Y.Doc();
      const habitsMap = doc.getMap(AFFINITE_YMAP_HABITS);

      const habitsData = [
        {
          id: 'habit-call-family',
          title: 'Llamar a familiares',
          type: 'boolean',
          schedule: { mode: 'weekly-count', timesPerWeek: 3 },
          entries: {
            '2026-11-03': true,
            '2026-11-07': true,
          },
        },
        {
          id: 'habit-interval-run',
          title: 'Correr día de por medio',
          type: 'boolean',
          // Ancla 2026-11-02 (Lunes) -> Lun, Mié, Vie, Dom en W45 (4 días)
          schedule: { mode: 'interval', every: 2, anchor: '2026-11-02' },
          entries: {
            '2026-11-02': true,
            '2026-11-04': true,
            '2026-11-06': true,
            '2026-11-08': true,
          },
        },
      ];

      habitsMap.set('habits', JSON.stringify(habitsData));

      const snapshot = buildWeeklySnapshot(doc, '2026-W45');

      expect(snapshot.habits.totalActive).toBe(2);
      // Meta = 3 (weekly-count) + 4 (intervalo cada 2 días en semana de 7) = 7
      expect(snapshot.habits.totalTargetCompletions).toBe(7);
      // Completados = 2 (weekly-count) + 4 (interval) = 6
      expect(snapshot.habits.totalCompleted).toBe(6);
      // 6 / 7 = 85.7% -> 86%
      expect(snapshot.habits.completionRate).toBe(86);

      expect(snapshot.habits.topHabits).toEqual([
        {
          id: 'habit-interval-run',
          title: 'Correr día de por medio',
          completedDays: 4,
          rate: 100,
        },
        {
          id: 'habit-call-family',
          title: 'Llamar a familiares',
          completedDays: 2,
          rate: 67, // 2 / 3 = 66.6% -> 67%
        },
      ]);
    });
  });

  describe('buildWeeklySnapshot - streaks aggregation', () => {
    test('filters streaks overlapping the week and tallies sprints ending this week', () => {
      const doc = new Y.Doc();
      const streaksMap = doc.getMap(AFFINITE_YMAP_STREAKS);

      const streaksData = [
        {
          id: 'streak-running',
          title: '30 días de meditación',
          startDateTime: '2026-11-01',
          targetDateTime: '2026-11-30',
          mode: 'days',
          status: 'running', // active, does NOT end this week
        },
        {
          id: 'streak-open-ended',
          title: 'Hábito continuo sin fin',
          startDateTime: '2026-10-15',
          mode: 'days',
          status: 'running', // active open-ended from previous month
        },
        {
          id: 'streak-sprint-1',
          title: 'Mini Sprint de diseño',
          startDateTime: '2026-11-02',
          targetDateTime: '2026-11-05',
          mode: 'days',
          status: 'completed', // ends this week (Nov 5) and completed
        },
        {
          id: 'streak-sprint-2',
          title: 'Fasting 24h',
          startDateTime: '2026-11-06T08:00:00Z',
          targetDateTime: '2026-11-07T08:00:00Z',
          mode: 'hours',
          status: 'running', // ends this week (Nov 7) but not completed
        },
        {
          id: 'streak-past',
          title: 'Reto de Octubre',
          startDateTime: '2026-10-01',
          targetDateTime: '2026-10-25',
          mode: 'days',
          status: 'completed', // outside week (ended before Nov 2)
        },
      ];

      streaksMap.set('streaks', JSON.stringify(streaksData));

      const snapshot = buildWeeklySnapshot(doc, '2026-W45');

      // Relevant overlapping streaks: streak-running (active), streak-open-ended (active), streak-sprint-1 (completed), streak-sprint-2 (active)
      // streak-past is excluded
      expect(snapshot.streaks.activeCount).toBe(3);
      expect(snapshot.streaks.completedCount).toBe(1);

      // Sprints ending this week: streak-sprint-1 (Nov 5) and streak-sprint-2 (Nov 7)
      expect(snapshot.streaks.sprintsEndingThisWeek).toHaveLength(2);
      expect(snapshot.streaks.sprintsEndingThisWeek).toEqual([
        {
          id: 'streak-sprint-1',
          title: 'Mini Sprint de diseño',
          targetDate: '2026-11-05',
          isCompleted: true,
        },
        {
          id: 'streak-sprint-2',
          title: 'Fasting 24h',
          targetDate: '2026-11-07T08:00:00Z',
          isCompleted: false,
        },
      ]);
    });
  });

  describe('buildWeeklySnapshot - calendar tasks aggregation', () => {
    test('extracts calendar tasks in week and tallies completed vs pending', () => {
      const doc = new Y.Doc();
      const calendarMap = doc.getMap(AFFINITE_YMAP_CALENDAR);

      const tasksData = [
        {
          id: 'task-1',
          title: 'Planificación Sprint',
          date: '2026-11-03',
          completed: true,
        },
        {
          id: 'task-2',
          title: 'Demo con clientes',
          date: '2026-11-05',
          completed: false,
        },
        {
          id: 'task-3',
          title: 'Deploy a producción',
          date: '2026-11-06',
          completed: true,
        },
        {
          id: 'task-future',
          title: 'Revisión anual',
          date: '2026-11-20',
          completed: false, // outside week range
        },
      ];

      calendarMap.set('tasks', JSON.stringify(tasksData));

      const snapshot = buildWeeklySnapshot(doc, '2026-W45');

      expect(snapshot.tasks).toEqual({
        total: 3,
        completed: 2,
        pending: 1,
        completionRate: 67, // 2/3 = 66.6% -> 67%
      });
    });
  });

  describe('buildWeeklySnapshot - board cards aggregation', () => {
    test('extracts cards due in week when boardDocs provided', () => {
      const rootDoc = new Y.Doc();
      const boardDoc = new Y.Doc();
      const boardMap = boardDoc.getMap(AFFINITE_YMAP_BOARD);

      const columns = [
        { id: 'c-todo', title: 'To Do' },
        { id: 'c-done', title: 'Done' },
      ];
      const cards = [
        {
          id: 'card-1',
          columnId: 'c-done',
          title: 'Refactor auth',
          dueDate: '2026-11-04',
          done: true,
        },
        {
          id: 'card-2',
          columnId: 'c-todo',
          title: 'Write docs',
          dueDate: '2026-11-07',
          done: false,
        },
        {
          id: 'card-next-week',
          columnId: 'c-todo',
          title: 'Next week task',
          dueDate: '2026-11-15',
          done: false,
        },
      ];

      boardMap.set('columns', JSON.stringify(columns));
      boardMap.set('cards', JSON.stringify(cards));

      const snapshot = buildWeeklySnapshot(rootDoc, '2026-W45', [boardDoc]);

      expect(snapshot.boards).toEqual({
        totalCardsDue: 2,
        completedCards: 1,
        pendingCards: 1,
        completionRate: 50,
      });
    });
  });

  describe('buildWeeklySnapshot - consistencyScore calculation', () => {
    test('weights habits (50%) and actionable tasks/boards (50%) when both exist', () => {
      const doc = new Y.Doc();
      const habitsMap = doc.getMap(AFFINITE_YMAP_HABITS);
      const calendarMap = doc.getMap(AFFINITE_YMAP_CALENDAR);
      const boardMap = doc.getMap(AFFINITE_YMAP_BOARD);

      // Habit with 7 days, 4 completed => 4/7 = 57% completion rate
      habitsMap.set(
        'habits',
        JSON.stringify([
          {
            id: 'h1',
            title: 'H1',
            type: 'boolean',
            entries: {
              '2026-11-02': true,
              '2026-11-03': true,
              '2026-11-04': true,
              '2026-11-05': true,
              '2026-11-06': false,
              '2026-11-07': false,
              '2026-11-08': false,
            },
          },
        ])
      );

      // Tasks: 2 total, 2 completed
      calendarMap.set(
        'tasks',
        JSON.stringify([
          { id: 't1', date: '2026-11-03', completed: true },
          { id: 't2', date: '2026-11-04', completed: true },
        ])
      );

      // Board card: 1 total due in week, not completed => 2 completed out of 3 total = 67%
      boardMap.set(
        'cards',
        JSON.stringify([
          { id: 'b1', title: 'Card 1', dueDate: '2026-11-05', columnId: 'col-todo' },
        ])
      );
      boardMap.set('columns', JSON.stringify([{ id: 'col-todo', title: 'To Do' }]));

      const snapshot = buildWeeklySnapshot(doc, '2026-W45');
      expect(snapshot.habits.completionRate).toBe(57);
      expect(snapshot.tasks.completionRate).toBe(100);
      expect(snapshot.boards.completionRate).toBe(0);

      // Actionable total = 2 tasks + 1 board = 3 items. Completed = 2. Rate = 2/3 = 67%
      // Score = Math.round(57 * 0.5 + 67 * 0.5) = Math.round(28.5 + 33.5) = 62
      expect(snapshot.consistencyScore).toBe(62);
    });

    test('uses only habits completionRate when no tasks exist', () => {
      const doc = new Y.Doc();
      const habitsMap = doc.getMap(AFFINITE_YMAP_HABITS);

      habitsMap.set(
        'habits',
        JSON.stringify([
          {
            id: 'h1',
            title: 'H1',
            type: 'boolean',
            entries: {
              '2026-11-02': true,
              '2026-11-03': true,
              '2026-11-04': true,
              '2026-11-05': true,
              '2026-11-06': true,
              '2026-11-07': true,
              '2026-11-08': true,
            },
          },
        ])
      );

      const snapshot = buildWeeklySnapshot(doc, '2026-W45');
      expect(snapshot.habits.completionRate).toBe(100);
      expect(snapshot.tasks.total).toBe(0);
      expect(snapshot.consistencyScore).toBe(100);
    });

    test('uses only tasks completionRate when no habits exist', () => {
      const doc = new Y.Doc();
      const calendarMap = doc.getMap(AFFINITE_YMAP_CALENDAR);

      calendarMap.set(
        'tasks',
        JSON.stringify([
          { id: 't1', date: '2026-11-03', completed: true },
          { id: 't2', date: '2026-11-04', completed: false },
        ])
      );

      const snapshot = buildWeeklySnapshot(doc, '2026-W45');
      expect(snapshot.habits.totalActive).toBe(0);
      expect(snapshot.tasks.completionRate).toBe(50);
      expect(snapshot.consistencyScore).toBe(50);
    });

    test('returns 0 when neither habits nor tasks exist', () => {
      const doc = new Y.Doc();
      const snapshot = buildWeeklySnapshot(doc, '2026-W45');
      expect(snapshot.consistencyScore).toBe(0);
    });
  });
});
