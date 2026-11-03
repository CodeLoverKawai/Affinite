export type DatedItemSource =
  | 'calendar'
  | 'board'
  | 'habit'
  | 'streak'
  | 'journal';

export interface DatedItem {
  id: string;
  source: DatedItemSource;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  category: string;
  color?: string;
  done?: boolean;
  href?: string;
  metadata?: Record<string, unknown>;
}

export interface DateRange {
  start: string;
  end: string;
}

export type {
  WeeklyBoardSummary,
  WeeklyHabitSummary,
  WeeklySnapshot,
  WeeklyStreakSummary,
  WeeklyTaskSummary,
} from './weekly-snapshot';
