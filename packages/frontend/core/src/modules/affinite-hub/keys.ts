export const AFFINITE_YMAP_HABITS = 'affinite_habits_v1';
export const AFFINITE_YMAP_STREAKS = 'affinite_streaks_v1';
export const AFFINITE_YMAP_CALENDAR = 'affinite_calendar_v1';
export const AFFINITE_YMAP_BOARD = 'board_data';

export const AFFINITE_CACHE_HABITS = 'affinite_habits_cache_v1';
export const AFFINITE_CACHE_STREAKS = 'affinite_streaks_cache_v1';
export const AFFINITE_CACHE_CALENDAR_SECRETS_PREFIX =
  'affinite_calendar_secrets_v1:';

export const LEGACY_HABIT_ID_MAP: Record<string, string> = {
  'h-water': 'habit-water',
  'h-exercise': 'habit-exercise',
  'h-read': 'habit-reading',
  'h-meditate': 'habit-meditation',
  'h-code': 'habit-code',
};

export function normalizeHabitId(id: string): string {
  return LEGACY_HABIT_ID_MAP[id] ?? id;
}
