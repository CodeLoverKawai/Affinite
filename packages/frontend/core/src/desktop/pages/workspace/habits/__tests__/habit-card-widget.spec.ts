import { describe, expect, it } from 'vitest';
import {
  getHabitWeekDaysStatus,
  parseHabitCardData,
  serializeHabitCardData,
  toggleHabitEntry,
  type HabitCardData,
} from '../habit-card-helpers';
import type { HabitItem } from '../habits-calculator';

describe('Habit Card Widget Helpers', () => {
  it('parses valid JSON habit card data', () => {
    const raw = JSON.stringify({
      habitId: 'h-1',
      title: 'Lectura Diaria',
      icon: '📚',
      category: 'Mente',
      type: 'boolean',
      date: '2026-10-24',
    });

    const parsed = parseHabitCardData(raw, '2026-10-24');
    expect(parsed.habitId).toBe('h-1');
    expect(parsed.title).toBe('Lectura Diaria');
    expect(parsed.icon).toBe('📚');
    expect(parsed.category).toBe('Mente');
    expect(parsed.type).toBe('boolean');
    expect(parsed.date).toBe('2026-10-24');
  });

  it('handles non-JSON or plain text raw code gracefully with fallback', () => {
    const raw = 'habit: meditacion\nicon: 🧘';
    const parsed = parseHabitCardData(raw, '2026-10-24');

    expect(parsed.habitId).toBeDefined();
    expect(parsed.title).toContain('meditacion');
    expect(parsed.date).toBe('2026-10-24');
  });

  it('serializes habit card data back to clean formatted JSON', () => {
    const data: HabitCardData = {
      habitId: 'h-water',
      title: 'Beber Agua',
      icon: '💧',
      category: 'Salud',
      type: 'quantitative',
      targetValue: 2.5,
      unit: 'L',
      date: '2026-10-24',
    };

    const serialized = serializeHabitCardData(data);
    expect(serialized).toContain('"habitId": "h-water"');
    expect(serialized).toContain('"targetValue": 2.5');
    const reparsed = JSON.parse(serialized);
    expect(reparsed.title).toBe('Beber Agua');
  });

  it('computes 7-day week status accurately for weekly strip', () => {
    const habit: HabitItem = {
      id: 'h-gym',
      title: 'Entrenar',
      icon: '💪',
      category: 'Fitness',
      type: 'boolean',
      frequency: 'daily',
      createdAt: '2026-10-01',
      entries: {
        '2026-10-19': true, // Lunes W43
        '2026-10-21': true, // Miércoles W43
        '2026-10-23': true, // Viernes W43
      },
    };

    const days = getHabitWeekDaysStatus(habit, '2026-W43');
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe('2026-10-19');
    expect(days[0].dayName).toBe('Lun');
    expect(days[0].isDone).toBe(true);

    expect(days[1].date).toBe('2026-10-20');
    expect(days[1].isDone).toBe(false);

    expect(days[2].date).toBe('2026-10-21');
    expect(days[2].isDone).toBe(true);

    expect(days[4].date).toBe('2026-10-23');
    expect(days[4].isDone).toBe(true);
  });

  it('toggles boolean habit entries correctly', () => {
    const entries: Record<string, boolean | number> = {};
    const updated1 = toggleHabitEntry(entries, '2026-10-24', 'boolean');
    expect(updated1['2026-10-24']).toBe(true);

    const updated2 = toggleHabitEntry(updated1, '2026-10-24', 'boolean');
    expect(updated2['2026-10-24']).toBe(false);
  });

  it('toggles quantitative habit entries correctly with target value', () => {
    const entries: Record<string, boolean | number> = {};
    const updated1 = toggleHabitEntry(entries, '2026-10-24', 'quantitative', 10);
    expect(updated1['2026-10-24']).toBe(10);

    const updated2 = toggleHabitEntry(updated1, '2026-10-24', 'quantitative', 10);
    expect(updated2['2026-10-24']).toBe(0);
  });
});
