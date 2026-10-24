export type StreakMode = 'days' | 'hours';
export type StreakStatus = 'running' | 'completed' | 'paused';

export interface StreakItem {
  id: string;
  title: string;
  description?: string;
  mode: StreakMode;
  targetCount: number;
  startDateTime: string;
  targetDateTime: string;
  soundEnabled: boolean;
  notificationEnabled: boolean;
  color: string;
  icon: string;
  category?: string;
  status: StreakStatus;
  completedAt?: string;
  soundPlayed?: boolean;
  notes?: string;
}

export interface StreakProgress {
  elapsedMs: number;
  totalMs: number;
  remainingMs: number;
  progressPercent: number;
  remainingDays: number;
  remainingHours: number;
  remainingMinutes: number;
  remainingSeconds: number;
  elapsedDays: number;
  elapsedHours: number;
  elapsedMinutes: number;
  elapsedSeconds: number;
  isCompleted: boolean;
}

export function calculateStreakProgress(
  streak: StreakItem,
  nowInput?: Date
): StreakProgress {
  const now = nowInput ? nowInput.getTime() : Date.now();
  const start = new Date(streak.startDateTime).getTime();
  const target = new Date(streak.targetDateTime).getTime();

  const totalMs = Math.max(target - start, 1000);
  const elapsedMs = Math.max(0, Math.min(now - start, totalMs));
  const remainingMs = Math.max(0, target - now);

  const rawPercent = (elapsedMs / totalMs) * 100;
  const progressPercent = Math.min(100, Math.max(0, Math.round(rawPercent)));
  const isCompleted = now >= target || streak.status === 'completed';

  const MS_PER_SEC = 1000;
  const MS_PER_MIN = 60 * MS_PER_SEC;
  const MS_PER_HOUR = 60 * MS_PER_MIN;
  const MS_PER_DAY = 24 * MS_PER_HOUR;

  // Remaining components
  const remainingDays = Math.floor(remainingMs / MS_PER_DAY);
  const remainingHours = Math.floor((remainingMs % MS_PER_DAY) / MS_PER_HOUR);
  const remainingMinutes = Math.floor((remainingMs % MS_PER_HOUR) / MS_PER_MIN);
  const remainingSeconds = Math.floor((remainingMs % MS_PER_MIN) / MS_PER_SEC);

  // Elapsed components
  const elapsedDays = Math.floor(elapsedMs / MS_PER_DAY);
  const elapsedHours = Math.floor((elapsedMs % MS_PER_DAY) / MS_PER_HOUR);
  const elapsedMinutes = Math.floor((elapsedMs % MS_PER_HOUR) / MS_PER_MIN);
  const elapsedSeconds = Math.floor((elapsedMs % MS_PER_MIN) / MS_PER_SEC);

  return {
    elapsedMs,
    totalMs,
    remainingMs,
    progressPercent: isCompleted ? 100 : progressPercent,
    remainingDays: isCompleted ? 0 : remainingDays,
    remainingHours: isCompleted ? 0 : remainingHours,
    remainingMinutes: isCompleted ? 0 : remainingMinutes,
    remainingSeconds: isCompleted ? 0 : remainingSeconds,
    elapsedDays,
    elapsedHours,
    elapsedMinutes,
    elapsedSeconds,
    isCompleted,
  };
}

export function formatTimeRemaining(
  remainingMs: number,
  mode: StreakMode
): string {
  if (remainingMs <= 0) {
    return '¡Meta completada! 🎉';
  }

  const MS_PER_SEC = 1000;
  const MS_PER_MIN = 60 * MS_PER_SEC;
  const MS_PER_HOUR = 60 * MS_PER_MIN;
  const MS_PER_DAY = 24 * MS_PER_HOUR;

  const days = Math.floor(remainingMs / MS_PER_DAY);
  const hours = Math.floor((remainingMs % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((remainingMs % MS_PER_HOUR) / MS_PER_MIN);
  const seconds = Math.floor((remainingMs % MS_PER_MIN) / MS_PER_SEC);

  if (mode === 'days') {
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  // mode === 'hours'
  const totalHours = Math.floor(remainingMs / MS_PER_HOUR);
  if (totalHours > 0) {
    return `${totalHours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}
