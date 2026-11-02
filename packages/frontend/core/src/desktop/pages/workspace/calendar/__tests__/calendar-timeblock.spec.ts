import { describe, expect, it } from 'vitest';
import {
  calculateDragTimeRange,
  computeEventPosition,
  computeMovedEventTimes,
  computeOverlappingEventsLayout,
  computeResizedEndTime,
  doesBoardCardMatchCategory,
  filterBoardCardsByCategory,
  formatEventTimeRange,
  isEventAllDay,
} from '../calendar-timeblock-helpers';

describe('Calendar Time-Block Helpers (Google Calendar Style)', () => {
  it('computes top and height correctly for a timed event', () => {
    // 09:30 to 11:00 -> 3.5 hours from 6:00 -> top: 210px, height: 90px (at 60px/hr)
    const pos = computeEventPosition('09:30', '11:00', 6, 60);
    expect(pos.top).toBe(210);
    expect(pos.height).toBe(90);
  });

  it('provides a default 60-minute duration when endTime is missing', () => {
    // 14:00 with no end time -> 1 hour duration -> top: 480px, height: 60px
    const pos = computeEventPosition('14:00', undefined, 6, 60);
    expect(pos.top).toBe(480);
    expect(pos.height).toBe(60);
  });

  it('formats time range display cleanly', () => {
    expect(formatEventTimeRange('09:30', '11:00')).toBe('09:30 – 11:00');
    expect(formatEventTimeRange('14:00', undefined)).toBe('14:00');
    expect(formatEventTimeRange(undefined, undefined)).toBe('Todo el día');
  });

  it('accurately identifies all-day events', () => {
    expect(isEventAllDay({ isAllDay: true })).toBe(true);
    expect(isEventAllDay({ isAllDay: false, startTime: '10:00' })).toBe(false);
    expect(isEventAllDay({ isAllDay: false, time: '10:00' })).toBe(false);
    expect(isEventAllDay({})).toBe(true);
  });

  it('snaps drag coordinates to 15-minute increments for start and end times', () => {
    // Drag from y = 120 (08:00) to y = 210 (09:30)
    const range = calculateDragTimeRange(120, 210, 6, 60);
    expect(range.startTime).toBe('08:00');
    expect(range.endTime).toBe('09:30');

    // Drag upwards from y = 210 to y = 120 should still produce valid sorted start/end
    const reverseRange = calculateDragTimeRange(210, 120, 6, 60);
    expect(reverseRange.startTime).toBe('08:00');
    expect(reverseRange.endTime).toBe('09:30');
  });

  it('filters board cards by category or labels without wiping non-Trabajo categories', () => {
    const sampleCards = [
      { id: '1', title: 'Uncategorized work card', labels: [] },
      { id: '2', title: 'Study exam card', category: 'Estudio', labels: ['Urgente'] },
      { id: '3', title: 'Personal errand', labels: ['Personal'] },
      { id: '4', title: 'Health checkup', category: 'Salud' },
    ];

    expect(filterBoardCardsByCategory(sampleCards, 'Todas')).toHaveLength(4);
    expect(
      filterBoardCardsByCategory(sampleCards, 'Trabajo').map(c => c.id)
    ).toEqual(['1']);
    expect(
      filterBoardCardsByCategory(sampleCards, 'Estudio').map(c => c.id)
    ).toEqual(['2']);
    expect(
      filterBoardCardsByCategory(sampleCards, 'Urgente').map(c => c.id)
    ).toEqual(['2']);
    expect(
      filterBoardCardsByCategory(sampleCards, 'Personal').map(c => c.id)
    ).toEqual(['3']);
    expect(
      filterBoardCardsByCategory(sampleCards, 'Salud').map(c => c.id)
    ).toEqual(['4']);
    expect(doesBoardCardMatchCategory({ labels: [] }, 'Trabajo')).toBe(true);
    expect(doesBoardCardMatchCategory({ labels: [] }, 'Estudio')).toBe(false);
  });

  it('lays out overlapping events into side-by-side collision columns like Google Calendar', () => {
    const events = [
      { id: 'ev-a', startTime: '09:00', endTime: '10:30' },
      { id: 'ev-b', startTime: '09:30', endTime: '11:00' },
      { id: 'ev-c', startTime: '10:30', endTime: '11:30' }, // Fits back into column 0 because ev-a ended at 10:30
      { id: 'ev-d', startTime: '13:00', endTime: '14:00' }, // Separate non-overlapping cluster
    ];

    const layout = computeOverlappingEventsLayout(events, 0, 60);
    expect(layout).toHaveLength(4);

    const byId = Object.fromEntries(layout.map(item => [item.event.id, item]));
    expect(byId['ev-a']).toMatchObject({
      columnIndex: 0,
      totalColumns: 2,
      leftPercent: 0,
      widthPercent: 50,
      top: 540,
      height: 90,
    });
    expect(byId['ev-b']).toMatchObject({
      columnIndex: 1,
      totalColumns: 2,
      leftPercent: 50,
      widthPercent: 50,
      top: 570,
      height: 90,
    });
    expect(byId['ev-c']).toMatchObject({
      columnIndex: 0,
      totalColumns: 2,
      leftPercent: 0,
      widthPercent: 50,
      top: 630,
      height: 60,
    });
    expect(byId['ev-d']).toMatchObject({
      columnIndex: 0,
      totalColumns: 1,
      leftPercent: 0,
      widthPercent: 100,
      top: 780,
      height: 60,
    });
  });

  it('computes resized end time snapped to 15-minute increments with minimum 15m duration and 23:59 clamp', () => {
    // Start at 10:00 (600m), drag bottom to 11:45 (705px at 60px/h, startHour=0)
    expect(computeResizedEndTime('10:00', 704, 0, 60)).toBe('11:45');
    // Drag above or too close to startTime -> minimum +15m (10:15)
    expect(computeResizedEndTime('10:00', 550, 0, 60)).toBe('10:15');
    // Drag past midnight -> clamped at 23:59
    expect(computeResizedEndTime('22:00', 1500, 0, 60)).toBe('23:59');
  });

  it('computes moved event times preserving original duration and snapping to 15-minute increments', () => {
    // 09:00 - 10:30 (90m) moved to y=840 (14:00 at startHour=0, 60px/h) -> 14:00 - 15:30
    expect(computeMovedEventTimes('09:00', '10:30', 842, 0, 60)).toEqual({
      startTime: '14:00',
      endTime: '15:30',
    });

    // Default 60m duration when endTime is undefined
    expect(computeMovedEventTimes('09:00', undefined, 600, 0, 60)).toEqual({
      startTime: '10:00',
      endTime: '11:00',
    });
  });
});

