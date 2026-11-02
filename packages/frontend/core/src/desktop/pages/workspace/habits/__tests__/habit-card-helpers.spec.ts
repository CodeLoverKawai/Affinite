import { describe, expect, it } from 'vitest';

import {
  getHabitWeekDaysStatus,
  parseHabitCardData,
  parseHabitsPayload,
  resolveHabitById,
  serializeHabitCardData,
  toggleHabitEntry,
  type HabitItem,
} from '../habit-card-helpers';

describe('Habit Card Helpers', () => {
  describe('parseHabitCardData & serializeHabitCardData', () => {
    it('should parse JSON habit card data and normalize legacy habitId', () => {
      const json = JSON.stringify({
        habitId: 'h-read',
        title: 'Lectura 20 Páginas',
        icon: '📚',
        category: 'Estudio',
        type: 'quantitative',
        targetValue: 20,
        unit: 'págs',
        date: '2026-10-15',
      });

      const parsed = parseHabitCardData(json, '2026-10-01');
      expect(parsed.habitId).toBe('habit-reading');
      expect(parsed.title).toBe('Lectura 20 Páginas');
      expect(parsed.type).toBe('quantitative');
      expect(parsed.targetValue).toBe(20);
      expect(parsed.date).toBe('2026-10-15');

      const serialized = serializeHabitCardData(parsed);
      expect(JSON.parse(serialized)).toEqual(parsed);
    });

    it('should parse key-value fallback format', () => {
      const raw = `habit: Meditación Matutina\nicon: 🧘\ncategory: Mente\ntype: boolean\ndate: 2026-10-16`;
      const parsed = parseHabitCardData(raw, '2026-10-01');
      expect(parsed.title).toBe('Meditación Matutina');
      expect(parsed.icon).toBe('🧘');
      expect(parsed.category).toBe('Mente');
      expect(parsed.type).toBe('boolean');
      expect(parsed.date).toBe('2026-10-16');
    });
  });

  describe('parseHabitsPayload & resolveHabitById', () => {
    it('should handle both JSON string and Array payloads and resolve legacy IDs', () => {
      const legacyHabits = [
        {
          id: 'h-water',
          title: 'Tomar 2L de Agua',
          icon: '💧',
          category: 'Salud',
          type: 'quantitative',
          targetValue: 2000,
          unit: 'ml',
          entries: { '2026-10-15': 2000 },
        },
        {
          id: 'h-meditate',
          title: 'Meditación',
          icon: '🧘',
          category: 'Mente',
          type: 'boolean',
          entries: { '2026-10-15': true },
        },
      ];

      const fromArray = parseHabitsPayload(legacyHabits);
      const fromString = parseHabitsPayload(JSON.stringify(legacyHabits));

      expect(fromArray).not.toBeNull();
      expect(fromString).toEqual(fromArray);
      expect(fromArray?.[0].id).toBe('habit-water');
      expect(fromArray?.[1].id).toBe('habit-meditation');

      if (fromArray) {
        expect(resolveHabitById(fromArray, 'h-water')?.id).toBe('habit-water');
        expect(resolveHabitById(fromArray, 'habit-water')?.id).toBe('habit-water');
        expect(resolveHabitById(fromArray, 'h-meditate')?.id).toBe('habit-meditation');
      }
    });
  });

  describe('getHabitWeekDaysStatus & toggleHabitEntry', () => {
    it('should return 7 days status for the given week and toggle entries', () => {
      const habit: HabitItem = {
        id: 'habit-exercise',
        title: 'Ejercicio',
        icon: '🏃',
        category: 'Fitness',
        type: 'boolean',
        entries: {
          '2026-10-12': true,
          '2026-10-14': true,
        },
      };

      const weekStatus = getHabitWeekDaysStatus(habit, '2026-W42', '2026-10-14');
      expect(weekStatus).toHaveLength(7);
      expect(weekStatus[0].date).toBe('2026-10-12');
      expect(weekStatus[0].isDone).toBe(true);
      expect(weekStatus[2].date).toBe('2026-10-14');
      expect(weekStatus[2].isToday).toBe(true);

      const toggledOff = toggleHabitEntry(habit.entries, '2026-10-12', 'boolean');
      expect(toggledOff['2026-10-12']).toBe(false);

      const toggledOn = toggleHabitEntry(toggledOff, '2026-10-13', 'boolean');
      expect(toggledOn['2026-10-13']).toBe(true);
    });
  });
});
