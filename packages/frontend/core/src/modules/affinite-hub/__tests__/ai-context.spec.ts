import { describe, expect, test } from 'vitest';
import * as Y from 'yjs';

import * as barrelFromAlias from '@affine/core/modules/affinite-hub';
import {
  buildHubAIContext,
  type HubAIContextOptions,
} from '../ai-context';
import {
  AFFINITE_YMAP_BOARD,
  AFFINITE_YMAP_CALENDAR,
  AFFINITE_YMAP_HABITS,
  AFFINITE_YMAP_STREAKS,
} from '../keys';

describe('ai-context module (buildHubAIContext)', () => {
  describe('null, corrupt, or empty document behavior', () => {
    test('returns informational fallback when doc is null or undefined', () => {
      const resultNull = buildHubAIContext(null);
      expect(resultNull).toBe(
        [
          '[AFFINITE_WORKSPACE_INTELLIGENCE]',
          '# Estado del Workspace',
          'No hay datos registrados de hábitos, calendario o tableros en este workspace.',
          '[/AFFINITE_WORKSPACE_INTELLIGENCE]',
        ].join('\n')
      );

      const resultUndefined = buildHubAIContext(undefined);
      expect(resultUndefined).toBe(resultNull);
    });

    test('returns informational fallback when doc is corrupt or missing getMap', () => {
      const corrupt = { foo: 'bar', invalidDoc: 123 };
      const result = buildHubAIContext(corrupt);
      expect(result).toContain('[AFFINITE_WORKSPACE_INTELLIGENCE]');
      expect(result).toContain('No hay datos registrados de hábitos, calendario o tableros en este workspace.');
      expect(result).toContain('[/AFFINITE_WORKSPACE_INTELLIGENCE]');
    });

    test('returns informational fallback when doc is an empty Y.Doc', () => {
      const emptyDoc = new Y.Doc();
      const result = buildHubAIContext(emptyDoc);
      expect(result).toBe(
        [
          '[AFFINITE_WORKSPACE_INTELLIGENCE]',
          '# Estado del Workspace',
          'No hay datos registrados de hábitos, calendario o tableros en este workspace.',
          '[/AFFINITE_WORKSPACE_INTELLIGENCE]',
        ].join('\n')
      );
    });
  });

  describe('populated workspace intelligence context formatting', () => {
    function createTestWorkspace() {
      const rootDoc = new Y.Doc();
      const habitsMap = rootDoc.getMap(AFFINITE_YMAP_HABITS);
      const calendarMap = rootDoc.getMap(AFFINITE_YMAP_CALENDAR);
      const streaksMap = rootDoc.getMap(AFFINITE_YMAP_STREAKS);

      // Habits
      const habitsData = [
        {
          id: 'habit-water',
          title: 'Beber 2L de agua',
          icon: '💧',
          category: 'health',
          reminderTime: '08:00',
          entries: {
            '2026-11-03': true,
            '2026-11-04': false,
          },
        },
        {
          id: 'habit-reading',
          title: 'Leer 20 páginas',
          icon: '📚',
          category: 'personal',
          entries: {
            '2026-11-03': false,
            '2026-11-04': false,
          },
        },
      ];
      habitsMap.set('habits', JSON.stringify(habitsData));

      // Calendar
      const tasksData = [
        {
          id: 'cal-standup',
          title: 'Daily Standup',
          date: '2026-11-03',
          time: '09:30',
          completed: true,
          category: 'work',
        },
        {
          id: 'cal-review',
          title: 'Architecture Review',
          date: '2026-11-04',
          time: '15:00',
          completed: false,
          category: 'work',
        },
        {
          id: 'cal-out-of-range',
          title: 'Next Month Planning',
          date: '2026-12-15',
          completed: false,
          category: 'work',
        },
      ];
      calendarMap.set('tasks', JSON.stringify(tasksData));

      // Streaks
      const streaksData = [
        {
          id: 'streak-marathon',
          title: 'Preparación Maratón',
          icon: '🏃',
          category: 'fitness',
          startDateTime: '2026-11-01',
          targetDateTime: '2026-11-30',
          progressPercent: 45,
          mode: 'days',
          status: 'running',
        },
        {
          id: 'streak-zen',
          title: 'Mindfulness continuo',
          icon: '🧘',
          category: 'wellness',
          startDateTime: '2026-10-01',
          progressPercent: 70,
          mode: 'days',
          status: 'running',
        },
        {
          id: 'streak-done',
          title: 'Mini Reto 3 días',
          icon: '🎯',
          category: 'focus',
          startDateTime: '2026-11-01',
          targetDateTime: '2026-11-03',
          progressPercent: 100,
          mode: 'days',
          status: 'completed',
        },
      ];
      streaksMap.set('streaks', JSON.stringify(streaksData));

      // Boards
      const boardDoc = new Y.Doc();
      const boardMap = boardDoc.getMap(AFFINITE_YMAP_BOARD);
      boardMap.set(
        'columns',
        JSON.stringify([
          { id: 'col-todo', title: 'To Do' },
          { id: 'col-done', title: 'Done' },
        ])
      );
      boardMap.set(
        'cards',
        JSON.stringify([
          {
            id: 'card-ai-engine',
            columnId: 'col-todo',
            title: 'Implementar Motor de IA',
            dueDate: '2026-11-03',
            done: false,
            category: 'work',
          },
          {
            id: 'card-ui-nav',
            columnId: 'col-done',
            title: 'Diseñar Hub Nav',
            dueDate: '2026-11-04',
            done: true,
            category: 'work',
          },
        ])
      );

      return { rootDoc, boardDoc };
    }

    test('generates complete markdown intelligence block with snapshot, agenda, and streaks', () => {
      const { rootDoc, boardDoc } = createTestWorkspace();
      const fixedNow = new Date('2026-11-03T10:00:00Z');

      const markdown = buildHubAIContext(rootDoc, {
        now: fixedNow,
        boardDocs: [boardDoc],
        maxUpcomingDays: 7,
      });

      // Delimiters
      expect(markdown.startsWith('[AFFINITE_WORKSPACE_INTELLIGENCE]')).toBe(true);
      expect(markdown.endsWith('[/AFFINITE_WORKSPACE_INTELLIGENCE]')).toBe(true);

      // Section 1: Resumen de la Semana en Curso
      expect(markdown).toContain('# Estado del Workspace (Semana 2026-W45');
      expect(markdown).toContain('## Resumen de la Semana en Curso');
      expect(markdown).toContain('Consistencia');
      expect(markdown).toContain('Hábitos');
      expect(markdown).toContain('Calendario');
      expect(markdown).toContain('Tableros');
      expect(markdown).toContain('Rachas');

      // Section 2: Agenda de Hoy y Próximos Días
      expect(markdown).toContain('## Agenda de Hoy y Próximos Días');
      // Format checks: [x] for done, [ ] for pending, source tags
      expect(markdown).toContain('- [x] [Hábito] 💧 Beber 2L de agua (2026-11-03 08:00)');
      expect(markdown).toContain('- [ ] [Hábito] 📚 Leer 20 páginas (2026-11-03)');
      expect(markdown).toContain('- [x] [Calendario] Daily Standup (2026-11-03 09:30)');
      expect(markdown).toContain('- [ ] [Tablero] Implementar Motor de IA (2026-11-03)');
      expect(markdown).toContain('- [ ] [Calendario] Architecture Review (2026-11-04 15:00)');
      expect(markdown).toContain('- [x] [Tablero] Diseñar Hub Nav (2026-11-04)');

      // Out of range calendar task should not be present in upcoming 7 days
      expect(markdown).not.toContain('Next Month Planning');

      // Section 3: Rachas y Metas Activas
      expect(markdown).toContain('## Rachas y Metas Activas');
      expect(markdown).toContain('🏃 Preparación Maratón');
      expect(markdown).toContain('45%');
      expect(markdown).toContain('2026-11-30');
      expect(markdown).toContain('🧘 Mindfulness continuo');
      expect(markdown).toContain('70%');
      // Completed streaks should not be in the active streaks list
      expect(markdown).not.toContain('Mini Reto 3 días (Progreso:');
    });

    test('supports document wrappers { yDoc: doc } and { doc }', () => {
      const { rootDoc, boardDoc } = createTestWorkspace();
      const fixedNow = new Date('2026-11-03T10:00:00Z');

      const resWithYDoc = buildHubAIContext({ yDoc: rootDoc }, {
        now: fixedNow,
        boardDocs: [boardDoc],
      });
      expect(resWithYDoc).toContain('[AFFINITE_WORKSPACE_INTELLIGENCE]');
      expect(resWithYDoc).toContain('Beber 2L de agua');

      const resWithDoc = buildHubAIContext({ doc: rootDoc }, {
        now: fixedNow,
        boardDocs: [boardDoc],
      });
      expect(resWithDoc).toContain('[AFFINITE_WORKSPACE_INTELLIGENCE]');
      expect(resWithDoc).toContain('Daily Standup');
    });

    test('respects maxUpcomingDays option window', () => {
      const { rootDoc } = createTestWorkspace();
      const fixedNow = new Date('2026-11-03T10:00:00Z');

      // Only today (1 day)
      const markdown1Day = buildHubAIContext(rootDoc, {
        now: fixedNow,
        maxUpcomingDays: 1,
      });

      expect(markdown1Day).toContain('2026-11-03');
      // 2026-11-04 tasks should NOT be in the 1-day upcoming agenda
      expect(markdown1Day).not.toContain('Architecture Review');
    });

    test('orders agenda items chronologically', () => {
      const { rootDoc } = createTestWorkspace();
      const fixedNow = new Date('2026-11-03T10:00:00Z');

      const markdown = buildHubAIContext(rootDoc, {
        now: fixedNow,
        maxUpcomingDays: 3,
      });

      const lines = markdown
        .split('\n')
        .filter(l => l.startsWith('- [ ]') || l.startsWith('- [x]'));

      // Verify that all 2026-11-03 items appear before 2026-11-04 items
      const nov3Indices = lines
        .map((l, i) => (l.includes('2026-11-03') ? i : -1))
        .filter(i => i !== -1);
      const nov4Indices = lines
        .map((l, i) => (l.includes('2026-11-04') ? i : -1))
        .filter(i => i !== -1);

      expect(nov3Indices.length).toBeGreaterThan(0);
      expect(nov4Indices.length).toBeGreaterThan(0);
      expect(Math.max(...nov3Indices)).toBeLessThan(Math.min(...nov4Indices));
    });
  });

  describe('barrel and type exports', () => {
    test('exports buildHubAIContext from barrel @affine/core/modules/affinite-hub', () => {
      expect(typeof barrelFromAlias.buildHubAIContext).toBe('function');
    });

    test('types can be used for typing HubAIContextOptions', () => {
      const opts: HubAIContextOptions = {
        now: new Date(),
        maxUpcomingDays: 7,
        boardDocs: [],
      };
      expect(opts.maxUpcomingDays).toBe(7);
    });
  });
});
