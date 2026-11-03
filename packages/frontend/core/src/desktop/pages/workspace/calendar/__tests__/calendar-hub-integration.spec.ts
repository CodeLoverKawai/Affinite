import {
  AFFINITE_YMAP_BOARD,
  AFFINITE_YMAP_HABITS,
  AFFINITE_YMAP_STREAKS,
  extractHabitDatedItems,
  extractStreakDatedItems,
} from '@affine/core/modules/affinite-hub';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import {
  AFFINITE_HUB_LAYERS,
  datedItemToCalendarEvent,
  extractHubEventsForRange,
  mergeHubCalendarLayers,
} from '../calendar-hub-layers';
import {
  toggleBoardCardCompletionInYjs,
  toggleHabitCompletionInYjs,
} from '../calendar-hub-mutations';
import {
  type CalendarLayer,
  DEFAULT_CALENDAR_LAYERS,
} from '../calendar-types';

describe('calendar-hub-integration', () => {
  describe('Calendar Layers Hub Integration', () => {
    it('preserves default and custom layers while adding all 4 canonical hub layers', () => {
      const customLayers: CalendarLayer[] = [
        ...DEFAULT_CALENDAR_LAYERS,
        {
          id: 'cal-custom-project',
          name: 'Proyecto Secreto',
          color: '#ec4899',
          visible: true,
          type: 'custom',
        },
      ];

      const merged = mergeHubCalendarLayers(customLayers);

      // Verify default layers exist
      expect(merged.some(l => l.id === 'cal-personal')).toBe(true);
      expect(merged.some(l => l.id === 'cal-work')).toBe(true);
      expect(merged.some(l => l.id === 'cal-study')).toBe(true);
      expect(merged.some(l => l.id === 'cal-health')).toBe(true);

      // Verify custom layer exists
      expect(merged.some(l => l.id === 'cal-custom-project')).toBe(true);

      // Verify all 4 hub layers exist
      const hubLayerIds = [
        'layer-boards',
        'layer-habits',
        'layer-streaks',
        'layer-journals',
      ];
      for (const hid of hubLayerIds) {
        const found = merged.find(l => l.id === hid);
        expect(found).toBeDefined();
        const canonical = AFFINITE_HUB_LAYERS.find(h => h.id === hid);
        expect(found?.type).toBe(canonical?.type);
      }
    });

    it('preserves customized visibility and colors on hub layers', () => {
      const existingLayers: CalendarLayer[] = [
        {
          id: 'layer-habits',
          name: 'Mis Hábitos',
          color: '#00ffcc',
          visible: false,
          type: 'habits',
        },
      ];

      const merged = mergeHubCalendarLayers(existingLayers);
      const habitsLayer = merged.find(l => l.id === 'layer-habits');
      expect(habitsLayer?.visible).toBe(false);
      expect(habitsLayer?.color).toBe('#00ffcc');
      expect(habitsLayer?.name).toBe('Mis Hábitos');

      // The other 3 hub layers should also be present
      expect(merged.some(l => l.id === 'layer-boards')).toBe(true);
      expect(merged.some(l => l.id === 'layer-streaks')).toBe(true);
      expect(merged.some(l => l.id === 'layer-journals')).toBe(true);
    });
  });

  describe('Extracting hub dated items across active range', () => {
    it('extracts habits and streaks and maps them to ExpandedCalendarEvents', () => {
      const rootDoc = new Y.Doc();
      const habitsMap = rootDoc.getMap(AFFINITE_YMAP_HABITS);
      const streaksMap = rootDoc.getMap(AFFINITE_YMAP_STREAKS);

      habitsMap.set(
        'habits',
        JSON.stringify([
          {
            id: 'meditation',
            title: 'Meditación Diaria',
            category: 'Salud',
            icon: '🧘',
            color: '#10b981',
            type: 'boolean',
            entries: {
              '2026-11-02': true,
              '2026-11-03': false,
            },
          },
        ])
      );

      streaksMap.set(
        'streaks',
        JSON.stringify([
          {
            id: 'reading-challenge',
            title: 'Reto de Lectura',
            category: 'Estudio',
            icon: '📚',
            color: '#f59e0b',
            mode: 'days',
            status: 'active',
            startDateTime: '2026-11-01T00:00:00.000Z',
            targetDateTime: '2026-11-05T23:59:59.000Z',
          },
        ])
      );

      // Verify individual extraction with adapters
      const habitItemsNov2 = extractHabitDatedItems(rootDoc, '2026-11-02');
      expect(habitItemsNov2).toHaveLength(1);
      const habitEventNov2 = datedItemToCalendarEvent(habitItemsNov2[0]);
      expect(habitEventNov2.calendarId).toBe('layer-habits');
      expect(habitEventNov2.completed).toBe(true);
      expect(habitEventNov2.instanceDate).toBe('2026-11-02');
      expect(habitEventNov2.title).toContain('Meditación Diaria');

      const habitItemsNov3 = extractHabitDatedItems(rootDoc, '2026-11-03');
      expect(habitItemsNov3).toHaveLength(1);
      const habitEventNov3 = datedItemToCalendarEvent(habitItemsNov3[0]);
      expect(habitEventNov3.calendarId).toBe('layer-habits');
      expect(habitEventNov3.completed).toBe(false);
      expect(habitEventNov3.instanceDate).toBe('2026-11-03');

      const streakItems = extractStreakDatedItems(rootDoc);
      expect(streakItems).toHaveLength(1);
      const streakEvent = datedItemToCalendarEvent(streakItems[0]);
      expect(streakEvent.calendarId).toBe('layer-streaks');
      expect(streakEvent.title).toContain('Reto de Lectura');
      expect(streakEvent.completed).toBe(false);

      // Verify extractHubEventsForRange helper across range 2026-11-01 to 2026-11-03
      const rangeEvents = extractHubEventsForRange(
        rootDoc,
        '2026-11-01',
        '2026-11-03'
      );

      // Should contain streak (1) + habits for 3 days (1 each day = 3)
      expect(rangeEvents.length).toBeGreaterThanOrEqual(4);
      const habitRangeEvents = rangeEvents.filter(
        e => e.calendarId === 'layer-habits'
      );
      expect(habitRangeEvents).toHaveLength(3);
      const streakRangeEvents = rangeEvents.filter(
        e => e.calendarId === 'layer-streaks'
      );
      expect(streakRangeEvents).toHaveLength(1);
    });
  });

  describe('Bidirectional toggle dispatching', () => {
    it('dispatches habit completion toggle in Yjs for layer-habits events', () => {
      const rootDoc = new Y.Doc();
      const habitsMap = rootDoc.getMap(AFFINITE_YMAP_HABITS);

      habitsMap.set(
        'habits',
        JSON.stringify([
          {
            id: 'habit-water',
            title: 'Beber 2L Agua',
            category: 'Salud',
            type: 'boolean',
            entries: {
              '2026-11-02': false,
            },
          },
        ])
      );

      const event = {
        id: 'habit-water-2026-11-02',
        masterId: 'habit-water-2026-11-02',
        calendarId: 'layer-habits',
        instanceDate: '2026-11-02',
      };

      // Check condition as done in handleToggleTask
      const isHabit =
        event.masterId.startsWith('habit-') ||
        event.calendarId === 'layer-habits';
      expect(isHabit).toBe(true);

      const toggled = toggleHabitCompletionInYjs(
        rootDoc,
        event.masterId,
        event.instanceDate
      );
      expect(toggled).toBe(true);

      const updatedRaw = habitsMap.get('habits') as string;
      const parsed = JSON.parse(updatedRaw);
      expect(parsed[0].entries['2026-11-02']).toBe(true);

      // Toggle back to false
      const toggledBack = toggleHabitCompletionInYjs(
        rootDoc,
        event.masterId,
        event.instanceDate
      );
      expect(toggledBack).toBe(false);

      const finalParsed = JSON.parse(habitsMap.get('habits') as string);
      expect(Boolean(finalParsed[0].entries['2026-11-02'])).toBe(false);
    });

    it('dispatches board card completion toggle in Yjs for layer-boards events', () => {
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
            id: 'card-100',
            columnId: 'col-todo',
            title: 'Implementar capa unificada',
            dueDate: '2026-11-02',
          },
        ])
      );

      const event = {
        id: 'board-card-100',
        masterId: 'board-card-100',
        calendarId: 'layer-boards',
        instanceDate: '2026-11-02',
      };

      const isBoard =
        event.masterId.startsWith('board-') ||
        event.calendarId === 'layer-boards';
      expect(isBoard).toBe(true);

      const toggled = toggleBoardCardCompletionInYjs(
        boardDoc,
        event.masterId
      );
      expect(toggled).toBe(true);

      const updatedCards = JSON.parse(boardMap.get('cards') as string);
      expect(updatedCards[0].columnId).toBe('col-done');

      // Toggle back
      const toggledBack = toggleBoardCardCompletionInYjs(
        boardDoc,
        event.masterId
      );
      expect(toggledBack).toBe(false);

      const finalCards = JSON.parse(boardMap.get('cards') as string);
      expect(finalCards[0].columnId).toBe('col-todo');
    });
  });
});
