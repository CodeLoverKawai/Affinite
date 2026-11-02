import { describe, expect, it } from 'vitest';
import {
  calculateDragTimeRange,
  computeEventPosition,
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
});
