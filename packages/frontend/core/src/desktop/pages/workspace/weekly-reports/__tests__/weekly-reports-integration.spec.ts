import { describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';

import {
  AFFINITE_YMAP_BOARD,
  AFFINITE_YMAP_CALENDAR,
  AFFINITE_YMAP_HABITS,
  AFFINITE_YMAP_STREAKS,
  buildWeeklySnapshot,
  type WeeklySnapshot,
} from '@affine/core/modules/affinite-hub';

import {
  consistencyBadge,
  dayDotBox,
  dayDotIndicator,
  dayDotLabel,
  daysRow,
  metricBox,
  metricLabel,
  metricNumber,
  metricsGrid,
  progressBarFill,
  progressBarTrack,
  snapshotCard,
  snapshotHeader,
  streakChip,
  streaksList,
} from '../weekly-reports.css';

describe('weekly-reports integration', () => {
  describe('CSS module exports for Weekly Intelligence Hub card', () => {
    it('exports all required styles for the intelligence card', () => {
      expect(snapshotCard).toBeDefined();
      expect(typeof snapshotCard).toBe('string');
      expect(snapshotHeader).toBeDefined();
      expect(consistencyBadge).toBeDefined();
      expect(metricsGrid).toBeDefined();
      expect(metricBox).toBeDefined();
      expect(metricNumber).toBeDefined();
      expect(metricLabel).toBeDefined();
      expect(progressBarTrack).toBeDefined();
      expect(progressBarFill).toBeDefined();
      expect(daysRow).toBeDefined();
      expect(dayDotBox).toBeDefined();
      expect(dayDotLabel).toBeDefined();
      expect(dayDotIndicator).toBeDefined();
      expect(streaksList).toBeDefined();
      expect(streakChip).toBeDefined();
    });
  });

  describe('boardDocs filter logic', () => {
    it('filters active board documents correctly based on doc properties', () => {
      const mockDocs = [
        {
          id: 'doc-board-1',
          trash$: { value: false },
          properties$: { value: { 'custom:isBoard': 'true', title: 'Sprint Board' } },
        },
        {
          id: 'doc-board-trash',
          trash$: { value: true },
          properties$: { value: { 'custom:isBoard': 'true', title: 'Old Board' } },
        },
        {
          id: 'doc-note-1',
          trash$: { value: false },
          properties$: { value: { journal: '2026-11-02', title: 'Daily Note' } },
        },
        {
          id: 'doc-board-2',
          trash$: { value: false },
          properties$: { value: { 'custom:isBoard': 'true', title: 'Product Roadmap' } },
        },
      ];

      const boardDocs = mockDocs.filter(doc => {
        const isTrash = doc.trash$.value;
        const props = doc.properties$.value;
        return !isTrash && props['custom:isBoard'] === 'true';
      });

      expect(boardDocs).toHaveLength(2);
      expect(boardDocs.map(d => d.id)).toEqual(['doc-board-1', 'doc-board-2']);
    });
  });

  describe('buildWeeklySnapshot reactive integration pipeline', () => {
    it('computes live habit and streak metrics and updates reactively on Yjs mutations', () => {
      const rootYDoc = new Y.Doc();
      const habitsMap = rootYDoc.getMap(AFFINITE_YMAP_HABITS);
      const streaksMap = rootYDoc.getMap(AFFINITE_YMAP_STREAKS);
      const calendarMap = rootYDoc.getMap(AFFINITE_YMAP_CALENDAR);

      let hubVersion = 0;
      const handleUpdate = vi.fn(() => {
        hubVersion++;
      });

      habitsMap.observeDeep(handleUpdate);
      streaksMap.observeDeep(handleUpdate);
      calendarMap.observeDeep(handleUpdate);

      const weekKey = '2026-W45'; // 2026-11-02 to 2026-11-08

      // Mock board doc with board_data map
      const boardYDoc = new Y.Doc();
      const boardDataMap = boardYDoc.getMap(AFFINITE_YMAP_BOARD);
      boardDataMap.set(
        'cards',
        JSON.stringify([
          {
            id: 'card-1',
            title: 'Release v1.0',
            dueDate: '2026-11-04',
            done: true,
          },
          {
            id: 'card-2',
            title: 'Fix edge case',
            dueDate: '2026-11-06',
            done: false,
          },
        ])
      );

      const boardDocs = [
        {
          id: 'board-1',
          trash$: { value: false },
          properties$: { value: { 'custom:isBoard': 'true' } },
          yDoc: boardYDoc,
        },
      ];

      // Initial empty snapshot
      let snapshot: WeeklySnapshot = buildWeeklySnapshot(rootYDoc, weekKey, boardDocs);
      expect(snapshot.habits.totalActive).toBe(0);
      expect(snapshot.habits.completionRate).toBe(0);
      expect(snapshot.streaks.activeCount).toBe(0);
      expect(snapshot.tasks.total).toBe(0);
      expect(snapshot.boards.totalCardsDue).toBe(2);
      expect(snapshot.boards.completedCards).toBe(1);
      expect(snapshot.boards.completionRate).toBe(50);

      // 1. Mutate Habits
      habitsMap.set(
        'habits',
        JSON.stringify([
          {
            id: 'habit-code',
            title: 'Coding practice',
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

      expect(handleUpdate).toHaveBeenCalledTimes(1);
      expect(hubVersion).toBe(1);

      snapshot = buildWeeklySnapshot(rootYDoc, weekKey, boardDocs);
      expect(snapshot.habits.totalActive).toBe(1);
      expect(snapshot.habits.totalCompleted).toBe(7);
      expect(snapshot.habits.totalTargetCompletions).toBe(7);
      expect(snapshot.habits.completionRate).toBe(100);

      // Check daily breakdown (L M M J V S D)
      expect(snapshot.habits.days).toHaveLength(7);
      expect(snapshot.habits.days.every(d => d.rate === 100)).toBe(true);

      // 2. Mutate Streaks
      streaksMap.set(
        'streaks',
        JSON.stringify([
          {
            id: 'streak-sprint',
            title: 'Q4 Launch Sprint',
            startDateTime: '2026-11-02',
            targetDateTime: '2026-11-06',
            mode: 'days',
            status: 'running',
          },
        ])
      );

      expect(handleUpdate).toHaveBeenCalledTimes(2);
      expect(hubVersion).toBe(2);

      snapshot = buildWeeklySnapshot(rootYDoc, weekKey, boardDocs);
      expect(snapshot.streaks.activeCount).toBe(1);
      expect(snapshot.streaks.sprintsEndingThisWeek).toHaveLength(1);
      expect(snapshot.streaks.sprintsEndingThisWeek[0]).toEqual({
        id: 'streak-sprint',
        title: 'Q4 Launch Sprint',
        targetDate: '2026-11-06',
        isCompleted: false,
      });

      // 3. Mutate Calendar Tasks
      calendarMap.set(
        'tasks',
        JSON.stringify([
          {
            id: 'evt-1',
            title: 'Weekly sync presentation',
            start: '2026-11-03T10:00:00Z',
            completed: true,
          },
          {
            id: 'evt-2',
            title: 'Design review',
            start: '2026-11-05T14:00:00Z',
            completed: false,
          },
        ])
      );

      expect(handleUpdate).toHaveBeenCalledTimes(3);
      expect(hubVersion).toBe(3);

      snapshot = buildWeeklySnapshot(rootYDoc, weekKey, boardDocs);
      expect(snapshot.tasks.total).toBe(2);
      expect(snapshot.tasks.completed).toBe(1);
      expect(snapshot.tasks.pending).toBe(1);
      expect(snapshot.tasks.completionRate).toBe(50);

      // Check overall consistency score: 50% habits (100%) + 50% actionable (tasks 1/2 + boards 1/2 = 2/4 = 50%) => 75%
      expect(snapshot.consistencyScore).toBe(75);

      // Unobserve cleanup
      habitsMap.unobserveDeep(handleUpdate);
      streaksMap.unobserveDeep(handleUpdate);
      calendarMap.unobserveDeep(handleUpdate);

      habitsMap.set('habits', '[]');
      expect(handleUpdate).toHaveBeenCalledTimes(3); // No further calls after unobserve
    });
  });
});
