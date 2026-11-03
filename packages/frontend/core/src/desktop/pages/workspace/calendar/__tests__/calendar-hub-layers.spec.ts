import type { DatedItem } from '@affine/core/modules/affinite-hub';
import { describe, expect, it } from 'vitest';

import {
  AFFINITE_HUB_LAYERS,
  datedItemToCalendarEvent,
  mergeHubCalendarLayers,
} from '../calendar-hub-layers';
import type { CalendarLayer } from '../calendar-types';

describe('calendar-hub-layers', () => {
  describe('AFFINITE_HUB_LAYERS', () => {
    it('defines the 4 canonical hub layers with correct types and initial colors', () => {
      expect(AFFINITE_HUB_LAYERS).toHaveLength(4);

      const boards = AFFINITE_HUB_LAYERS.find(l => l.id === 'layer-boards');
      expect(boards).toEqual({
        id: 'layer-boards',
        name: 'Tableros (Kanban)',
        color: '#3b82f6',
        visible: true,
        type: 'boards',
      });

      const habits = AFFINITE_HUB_LAYERS.find(l => l.id === 'layer-habits');
      expect(habits).toEqual({
        id: 'layer-habits',
        name: 'Hábitos',
        color: '#10b981',
        visible: true,
        type: 'habits',
      });

      const streaks = AFFINITE_HUB_LAYERS.find(l => l.id === 'layer-streaks');
      expect(streaks).toEqual({
        id: 'layer-streaks',
        name: 'Streaks & Metas',
        color: '#f59e0b',
        visible: true,
        type: 'streaks',
      });

      const journals = AFFINITE_HUB_LAYERS.find(l => l.id === 'layer-journals');
      expect(journals).toEqual({
        id: 'layer-journals',
        name: 'Diarios (Journals)',
        color: '#8b5cf6',
        visible: true,
        type: 'journals',
      });
    });
  });

  describe('mergeHubCalendarLayers', () => {
    it('returns canonical hub layers when input is empty or undefined', () => {
      const undefinedResult = mergeHubCalendarLayers(undefined);
      expect(undefinedResult).toHaveLength(4);
      expect(undefinedResult.map(l => l.id)).toEqual([
        'layer-boards',
        'layer-habits',
        'layer-streaks',
        'layer-journals',
      ]);

      const emptyResult = mergeHubCalendarLayers([]);
      expect(emptyResult).toHaveLength(4);
      expect(emptyResult.map(l => l.id)).toEqual([
        'layer-boards',
        'layer-habits',
        'layer-streaks',
        'layer-journals',
      ]);
    });

    it('preserves existing non-hub user layers and appends missing hub layers', () => {
      const userLayers: CalendarLayer[] = [
        {
          id: 'cal-personal',
          name: 'Personal',
          color: '#3b82f6',
          visible: true,
          type: 'local',
        },
        {
          id: 'cal-work',
          name: 'Trabajo',
          color: '#10b981',
          visible: false,
          type: 'local',
        },
      ];

      const merged = mergeHubCalendarLayers(userLayers);
      expect(merged).toHaveLength(6);
      expect(merged[0]).toEqual(userLayers[0]);
      expect(merged[1]).toEqual(userLayers[1]);
      expect(merged.slice(2).map(l => l.id)).toEqual([
        'layer-boards',
        'layer-habits',
        'layer-streaks',
        'layer-journals',
      ]);
    });

    it('preserves user customized visible and color settings for existing hub layers', () => {
      const userLayers: CalendarLayer[] = [
        {
          id: 'layer-habits',
          name: 'Mis Hábitos Diarios',
          color: '#e11d48',
          visible: false,
          type: 'habits',
        },
        {
          id: 'cal-personal',
          name: 'Personal',
          color: '#3b82f6',
          visible: true,
          type: 'local',
        },
      ];

      const merged = mergeHubCalendarLayers(userLayers);
      expect(merged).toHaveLength(5);

      const mergedHabits = merged.find(l => l.id === 'layer-habits');
      expect(mergedHabits?.visible).toBe(false);
      expect(mergedHabits?.color).toBe('#e11d48');
      expect(mergedHabits?.type).toBe('habits');

      // The remaining hub layers were appended with default visibility
      const boards = merged.find(l => l.id === 'layer-boards');
      expect(boards?.visible).toBe(true);
      expect(boards?.color).toBe('#3b82f6');
    });

    it('is idempotent and does not create duplicate layers', () => {
      const initial = mergeHubCalendarLayers([]);
      const secondPass = mergeHubCalendarLayers(initial);

      expect(secondPass).toEqual(initial);
      expect(secondPass).toHaveLength(4);
    });
  });

  describe('datedItemToCalendarEvent', () => {
    it('correctly maps an all-day board card DatedItem', () => {
      const boardItem: DatedItem = {
        id: 'board-card-101',
        source: 'board',
        title: 'Ship Phase 2 integration',
        start: '2026-11-03',
        allDay: true,
        category: 'Trabajo',
        color: '#2563eb',
        done: false,
        href: '/boards?boardId=b1',
        metadata: {
          cardId: 'card-101',
          columnId: 'col-todo',
          boardId: 'b1',
        },
      };

      const event = datedItemToCalendarEvent(boardItem);

      expect(event.id).toBe('board-card-101');
      expect(event.masterId).toBe('board-card-101');
      expect(event.title).toBe('Ship Phase 2 integration');
      expect(event.date).toBe('2026-11-03');
      expect(event.instanceDate).toBe('2026-11-03');
      expect(event.isAllDay).toBe(true);
      expect(event.calendarId).toBe('layer-boards');
      expect(event.color).toBe('#2563eb');
      expect(event.completed).toBe(false);
      expect(event.category).toBe('Trabajo');
      expect(event.isRecurringInstance).toBe(false);
      expect(event.isMultiDay).toBe(false);
      expect(event.startTime).toBeUndefined();
      expect(event.endTime).toBeUndefined();
    });

    it('correctly maps a completed habit DatedItem', () => {
      const habitItem: DatedItem = {
        id: 'habit-water-2026-11-03',
        source: 'habit',
        title: '💧 Beber 2L de agua',
        start: '2026-11-03',
        allDay: true,
        category: 'Salud',
        color: '#10b981',
        done: true,
        href: '/habits',
        metadata: {
          habitId: 'water',
          type: 'quantitative',
        },
      };

      const event = datedItemToCalendarEvent(habitItem);

      expect(event.id).toBe('habit-water-2026-11-03');
      expect(event.calendarId).toBe('layer-habits');
      expect(event.completed).toBe(true);
      expect(event.isAllDay).toBe(true);
      expect(event.title).toBe('💧 Beber 2L de agua');
      expect(event.color).toBe('#10b981');
    });

    it('correctly maps a timed multi-day streak DatedItem with clean HH:mm extraction', () => {
      const streakItem: DatedItem = {
        id: 'streak-read-book',
        source: 'streak',
        title: '📖 Reto Lectura',
        start: '2026-11-03T09:30:00.000Z',
        end: '2026-11-07T18:45:00.000Z',
        allDay: false,
        category: 'Estudio',
        done: false,
        href: '/streaks',
        metadata: {
          streakId: 'read-book',
          mode: 'time',
          progressPercent: 40,
        },
      };

      const event = datedItemToCalendarEvent(streakItem);

      expect(event.id).toBe('streak-read-book');
      expect(event.calendarId).toBe('layer-streaks');
      expect(event.date).toBe('2026-11-03');
      expect(event.endDate).toBe('2026-11-07');
      expect(event.startTime).toBe('09:30');
      expect(event.endTime).toBe('18:45');
      expect(event.time).toBe('09:30');
      expect(event.isAllDay).toBe(false);
      expect(event.isMultiDay).toBe(true);
      expect(event.spanTotalDays).toBe(5);
    });

    it('correctly maps a journal DatedItem to layer-journals', () => {
      const journalItem: DatedItem = {
        id: 'journal-entry-1',
        source: 'journal',
        title: 'Diario de Reflexión',
        start: '2026-11-03',
        allDay: true,
        category: 'Personal',
      };

      const event = datedItemToCalendarEvent(journalItem);

      expect(event.id).toBe('journal-entry-1');
      expect(event.calendarId).toBe('layer-journals');
      expect(event.completed).toBe(false);
      expect(event.date).toBe('2026-11-03');
    });

    it('uses fallbackColor when item color is missing, or canonical layer color as last resort', () => {
      const itemWithoutColor: DatedItem = {
        id: 'board-card-no-color',
        source: 'board',
        title: 'Item without color',
        start: '2026-11-03',
        allDay: true,
        category: 'General',
      };

      const eventWithFallback = datedItemToCalendarEvent(
        itemWithoutColor,
        '#64748b'
      );
      expect(eventWithFallback.color).toBe('#64748b');

      const eventDefault = datedItemToCalendarEvent(itemWithoutColor);
      expect(eventDefault.color).toBe('#3b82f6'); // Canonical color of layer-boards
    });
  });
});
