import { describe, expect, test } from 'vitest';
import * as Y from 'yjs';

import * as barrelFromAlias from '@affine/core/modules/affinite-hub';
import {
  buildWeeklySnapshot,
  parseWeekRange,
  type WeeklyBoardSummary,
  type WeeklyHabitSummary,
  type WeeklySnapshot,
  type WeeklyStreakSummary,
  type WeeklyTaskSummary,
} from '../index';
import type {
  WeeklyBoardSummary as WeeklyBoardSummaryFromTypes,
  WeeklyHabitSummary as WeeklyHabitSummaryFromTypes,
  WeeklySnapshot as WeeklySnapshotFromTypes,
  WeeklyStreakSummary as WeeklyStreakSummaryFromTypes,
  WeeklyTaskSummary as WeeklyTaskSummaryFromTypes,
} from '../types';

describe('affinite-hub barrel exports', () => {
  describe('weekly-snapshot module exports from root index', () => {
    test('exports buildWeeklySnapshot and parseWeekRange functions', () => {
      expect(typeof buildWeeklySnapshot).toBe('function');
      expect(typeof parseWeekRange).toBe('function');
      expect(typeof barrelFromAlias.buildWeeklySnapshot).toBe('function');
      expect(typeof barrelFromAlias.parseWeekRange).toBe('function');
    });

    test('re-exports types that can correctly type weekly snapshot objects', () => {
      const habitSummary: WeeklyHabitSummary = {
        totalActive: 1,
        totalTargetCompletions: 7,
        totalCompleted: 5,
        completionRate: 71,
        days: [],
        topHabits: [],
      };
      const streakSummary: WeeklyStreakSummary = {
        activeCount: 1,
        completedCount: 0,
        sprintsEndingThisWeek: [],
      };
      const taskSummary: WeeklyTaskSummary = {
        total: 10,
        completed: 8,
        pending: 2,
        completionRate: 80,
      };
      const boardSummary: WeeklyBoardSummary = {
        totalCardsDue: 4,
        completedCards: 3,
        pendingCards: 1,
        completionRate: 75,
      };
      const snapshot: WeeklySnapshot = {
        weekKey: '2026-W45',
        range: { start: '2026-11-02', end: '2026-11-08' },
        habits: habitSummary,
        streaks: streakSummary,
        tasks: taskSummary,
        boards: boardSummary,
        consistencyScore: 76,
      };

      // Also type check against types re-exported from types.ts
      const typeCheckHabit: WeeklyHabitSummaryFromTypes = habitSummary;
      const typeCheckStreak: WeeklyStreakSummaryFromTypes = streakSummary;
      const typeCheckTask: WeeklyTaskSummaryFromTypes = taskSummary;
      const typeCheckBoard: WeeklyBoardSummaryFromTypes = boardSummary;
      const typeCheckSnapshot: WeeklySnapshotFromTypes = snapshot;

      expect(typeCheckSnapshot.weekKey).toBe('2026-W45');
      expect(typeCheckHabit.totalActive).toBe(1);
      expect(typeCheckStreak.activeCount).toBe(1);
      expect(typeCheckTask.total).toBe(10);
      expect(typeCheckBoard.totalCardsDue).toBe(4);
    });

    test('execution of buildWeeklySnapshot via barrel returns valid snapshot structure', () => {
      const doc = new Y.Doc();
      const snapshot = buildWeeklySnapshot(doc, '2026-W45');

      expect(snapshot).toBeDefined();
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

    test('execution of parseWeekRange via barrel alias returns correct ISO week structure', () => {
      const range = barrelFromAlias.parseWeekRange('2026-W45');
      expect(range.weekKey).toBe('2026-W45');
      expect(range.start).toBe('2026-11-02');
      expect(range.end).toBe('2026-11-08');
      expect(range.dates).toHaveLength(7);
    });
  });
});
