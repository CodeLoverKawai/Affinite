import * as Y from 'yjs';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  isDoneColumnName,
  toggleBoardCardCompletionInYjs,
  toggleHabitCompletionInYjs,
} from '../calendar-hub-mutations';

describe('calendar-hub-mutations', () => {
  describe('isDoneColumnName', () => {
    test('recognizes standard done column names in English and Spanish', () => {
      expect(isDoneColumnName('Done')).toBe(true);
      expect(isDoneColumnName('done')).toBe(true);
      expect(isDoneColumnName('Completado')).toBe(true);
      expect(isDoneColumnName('completadas')).toBe(true);
      expect(isDoneColumnName('Hecho')).toBe(true);
      expect(isDoneColumnName('hecha')).toBe(true);
      expect(isDoneColumnName('Finalizado')).toBe(true);
      expect(isDoneColumnName('finalizada')).toBe(true);
      expect(isDoneColumnName('Terminado')).toBe(true);
      expect(isDoneColumnName('terminada')).toBe(true);
      expect(isDoneColumnName('Finished')).toBe(true);
      expect(isDoneColumnName('finish')).toBe(true);
    });

    test('rejects non-done column names and empty inputs', () => {
      expect(isDoneColumnName('To Do')).toBe(false);
      expect(isDoneColumnName('In Progress')).toBe(false);
      expect(isDoneColumnName('Backlog')).toBe(false);
      expect(isDoneColumnName('En revisión')).toBe(false);
      expect(isDoneColumnName('')).toBe(false);
      expect(isDoneColumnName(undefined)).toBe(false);
    });
  });

  describe('toggleHabitCompletionInYjs', () => {
    let rootDoc: Y.Doc;

    beforeEach(() => {
      rootDoc = new Y.Doc();
    });

    test('toggles boolean habit from uncompleted to completed and back', () => {
      const initialHabits = [
        {
          id: 'habit-reading',
          title: 'Lectura diaria',
          type: 'boolean',
          entries: {},
        },
      ];
      const yMap = rootDoc.getMap('affinite_habits_v1');
      yMap.set('habits', JSON.stringify(initialHabits));

      const dateStr = '2026-11-03';

      // 1. Toggle ON
      const firstResult = toggleHabitCompletionInYjs(rootDoc, 'habit-reading', dateStr);
      expect(firstResult).toBe(true);

      const parsedAfterOn = JSON.parse(yMap.get('habits') as string);
      expect(parsedAfterOn[0].entries[dateStr]).toBe(true);

      // 2. Toggle OFF
      const secondResult = toggleHabitCompletionInYjs(rootDoc, 'habit-reading', dateStr);
      expect(secondResult).toBe(false);

      const parsedAfterOff = JSON.parse(yMap.get('habits') as string);
      expect(parsedAfterOff[0].entries[dateStr]).toBeUndefined();
    });

    test('toggles quantitative habit using targetValue', () => {
      const initialHabits = [
        {
          id: 'habit-water',
          title: 'Beber agua',
          type: 'quantitative',
          targetValue: 8,
          unit: 'vasos',
          entries: {},
        },
      ];
      const yMap = rootDoc.getMap('affinite_habits_v1');
      yMap.set('habits', JSON.stringify(initialHabits));

      const dateStr = '2026-11-03';

      // 1. Toggle ON: sets to targetValue (8)
      const res1 = toggleHabitCompletionInYjs(rootDoc, 'habit-water', dateStr);
      expect(res1).toBe(true);

      const parsed1 = JSON.parse(yMap.get('habits') as string);
      expect(parsed1[0].entries[dateStr]).toBe(8);

      // 2. Toggle OFF: since entries[dateStr] >= 8, resets / deletes
      const res2 = toggleHabitCompletionInYjs(rootDoc, 'habit-water', dateStr);
      expect(res2).toBe(false);

      const parsed2 = JSON.parse(yMap.get('habits') as string);
      expect(parsed2[0].entries[dateStr]).toBeUndefined();

      // 3. Partial entry: entry is 4 (< 8) -> toggle sets to targetValue 8
      parsed2[0].entries[dateStr] = 4;
      yMap.set('habits', JSON.stringify(parsed2));

      const res3 = toggleHabitCompletionInYjs(rootDoc, 'habit-water', dateStr);
      expect(res3).toBe(true);
      const parsed3 = JSON.parse(yMap.get('habits') as string);
      expect(parsed3[0].entries[dateStr]).toBe(8);
    });

    test('supports legacy habit IDs and wrapper objects', () => {
      const initialHabits = [
        {
          id: 'habit-water',
          title: 'Agua',
          type: 'boolean',
          entries: {},
        },
      ];
      rootDoc.getMap('affinite_habits_v1').set('habits', JSON.stringify(initialHabits));

      // Passing wrapper { yDoc: rootDoc } and legacy ID 'h-water'
      const wrapper = { yDoc: rootDoc };
      const res = toggleHabitCompletionInYjs(wrapper, 'h-water', '2026-11-03');
      expect(res).toBe(true);

      const habits = JSON.parse(rootDoc.getMap('affinite_habits_v1').get('habits') as string);
      expect(habits[0].entries['2026-11-03']).toBe(true);
    });

    test('returns false gracefully when habit or doc is not found', () => {
      expect(toggleHabitCompletionInYjs(null, 'any', '2026-11-03')).toBe(false);
      expect(toggleHabitCompletionInYjs(rootDoc, 'non-existent', '2026-11-03')).toBe(false);
    });
  });

  describe('toggleBoardCardCompletionInYjs', () => {
    let boardDoc: Y.Doc;

    beforeEach(() => {
      boardDoc = new Y.Doc();
    });

    test('toggles checklist items when card has a checklist', () => {
      const columns = [
        { id: 'col-1', title: 'To Do' },
        { id: 'col-2', title: 'Done' },
      ];
      const cards = [
        {
          id: 'card-1',
          columnId: 'col-1',
          title: 'Task with checklist',
          checklist: [
            { id: 'check-1', title: 'Step 1', completed: false },
            { id: 'check-2', title: 'Step 2', completed: false },
          ],
        },
      ];

      const yMap = boardDoc.getMap('board_data');
      yMap.set('columns', JSON.stringify(columns));
      yMap.set('cards', JSON.stringify(cards));

      // 1. Not all completed -> marks all true
      const res1 = toggleBoardCardCompletionInYjs(boardDoc, 'card-1');
      expect(res1).toBe(true);

      const parsedCards1 = JSON.parse(yMap.get('cards') as string);
      expect(parsedCards1[0].checklist.every((i: any) => i.completed)).toBe(true);

      // 2. All completed -> marks all false
      const res2 = toggleBoardCardCompletionInYjs(boardDoc, 'card-1');
      expect(res2).toBe(false);

      const parsedCards2 = JSON.parse(yMap.get('cards') as string);
      expect(parsedCards2[0].checklist.every((i: any) => !i.completed)).toBe(true);
    });

    test('toggles card without checklist by moving between To Do and Done columns', () => {
      const columns = [
        { id: 'col-todo', title: 'To Do' },
        { id: 'col-done', title: 'Done' },
      ];
      const cards = [
        {
          id: 'card-2',
          columnId: 'col-todo',
          title: 'Simple task',
        },
      ];

      const yMap = boardDoc.getMap('board_data');
      yMap.set('columns', JSON.stringify(columns));
      yMap.set('cards', JSON.stringify(cards));

      // 1. Move from To Do to Done
      const res1 = toggleBoardCardCompletionInYjs(boardDoc, 'card-2');
      expect(res1).toBe(true);

      const parsedCards1 = JSON.parse(yMap.get('cards') as string);
      expect(parsedCards1[0].columnId).toBe('col-done');

      // 2. Move back from Done to To Do
      const res2 = toggleBoardCardCompletionInYjs(boardDoc, 'card-2');
      expect(res2).toBe(false);

      const parsedCards2 = JSON.parse(yMap.get('cards') as string);
      expect(parsedCards2[0].columnId).toBe('col-todo');
    });

    test('creates Done column if none exists when moving card to Done', () => {
      const columns = [
        { id: 'col-backlog', title: 'Backlog' },
        { id: 'col-progress', title: 'In Progress' },
      ];
      const cards = [
        {
          id: 'card-3',
          columnId: 'col-progress',
          title: 'Card without existing Done column',
        },
      ];

      const yMap = boardDoc.getMap('board_data');
      yMap.set('columns', JSON.stringify(columns));
      yMap.set('cards', JSON.stringify(cards));

      const res = toggleBoardCardCompletionInYjs(boardDoc, 'card-3');
      expect(res).toBe(true);

      const updatedColumns = JSON.parse(yMap.get('columns') as string);
      const updatedCards = JSON.parse(yMap.get('cards') as string);

      expect(updatedColumns.length).toBe(3);
      const createdDoneCol = updatedColumns.find((c: any) => isDoneColumnName(c.title));
      expect(createdDoneCol).toBeDefined();
      expect(updatedCards[0].columnId).toBe(createdDoneCol.id);
    });

    test('handles card ID with board- prefix and doc wrapper', () => {
      const columns = [
        { id: 'col-todo', title: 'To Do' },
        { id: 'col-done', title: 'Done' },
      ];
      const cards = [
        {
          id: 'card-4',
          columnId: 'col-todo',
          title: 'Prefixed card test',
        },
      ];

      const yMap = boardDoc.getMap('board_data');
      yMap.set('columns', JSON.stringify(columns));
      yMap.set('cards', JSON.stringify(cards));

      const wrapper = { doc: boardDoc };
      const res = toggleBoardCardCompletionInYjs(wrapper, 'board-card-4');
      expect(res).toBe(true);

      const updatedCards = JSON.parse(yMap.get('cards') as string);
      expect(updatedCards[0].columnId).toBe('col-done');
    });

    test('returns false gracefully when card or board doc is missing', () => {
      expect(toggleBoardCardCompletionInYjs(null, 'any')).toBe(false);
      expect(toggleBoardCardCompletionInYjs(boardDoc, 'non-existent')).toBe(false);
    });
  });
});
