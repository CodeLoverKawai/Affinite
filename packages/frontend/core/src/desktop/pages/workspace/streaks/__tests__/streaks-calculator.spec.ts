import { describe, expect, it } from 'vitest';
import {
  calculateStreakProgress,
  formatTimeRemaining,
  type StreakItem,
} from '../streaks-calculator';

describe('Streaks Calculator & Timer Engine', () => {
  it('calculates progress accurately for a days-based streak', () => {
    // 10-day streak, 5 days elapsed -> 50%
    const now = new Date('2026-10-25T12:00:00.000Z');
    const streak: StreakItem = {
      id: 's-1',
      title: 'Reto 10 Días',
      mode: 'days',
      targetCount: 10,
      startDateTime: '2026-10-20T12:00:00.000Z',
      targetDateTime: '2026-10-30T12:00:00.000Z',
      soundEnabled: true,
      notificationEnabled: true,
      color: '#f59e0b',
      icon: '🔥',
      status: 'running',
    };

    const progress = calculateStreakProgress(streak, now);
    expect(progress.progressPercent).toBe(50);
    expect(progress.isCompleted).toBe(false);
    expect(progress.remainingDays).toBe(5);
    expect(progress.remainingHours).toBe(0);
    expect(progress.elapsedDays).toBe(5);
  });

  it('detects completion when current time passes targetDateTime', () => {
    const now = new Date('2026-10-31T12:00:00.000Z');
    const streak: StreakItem = {
      id: 's-2',
      title: 'Sprint 2 Días',
      mode: 'days',
      targetCount: 2,
      startDateTime: '2026-10-20T12:00:00.000Z',
      targetDateTime: '2026-10-22T12:00:00.000Z',
      soundEnabled: true,
      notificationEnabled: true,
      color: '#10b981',
      icon: '⚡',
      status: 'running',
    };

    const progress = calculateStreakProgress(streak, now);
    expect(progress.progressPercent).toBe(100);
    expect(progress.isCompleted).toBe(true);
    expect(progress.remainingMs).toBe(0);
  });

  it('calculates progress for an hours-based streak with exact precision', () => {
    // 24-hour streak, 18 hours elapsed -> 75%
    const now = new Date('2026-10-20T18:00:00.000Z');
    const streak: StreakItem = {
      id: 's-hours',
      title: 'Ayuno 24 Horas',
      mode: 'hours',
      targetCount: 24,
      startDateTime: '2026-10-20T00:00:00.000Z',
      targetDateTime: '2026-10-21T00:00:00.000Z',
      soundEnabled: true,
      notificationEnabled: true,
      color: '#6366f1',
      icon: '⏱️',
      status: 'running',
    };

    const progress = calculateStreakProgress(streak, now);
    expect(progress.progressPercent).toBe(75);
    expect(progress.isCompleted).toBe(false);
    expect(progress.remainingHours).toBe(6);
    expect(progress.elapsedHours).toBe(18);
  });

  it('formats time remaining string cleanly in days and hours format', () => {
    const ms1 = (3 * 24 + 14) * 3600 * 1000 + 30 * 60 * 1000; // 3d 14h 30m
    expect(formatTimeRemaining(ms1, 'days')).toBe('3d 14h 30m');

    const ms2 = 8 * 3600 * 1000 + 45 * 60 * 1000 + 10 * 1000; // 8h 45m 10s
    expect(formatTimeRemaining(ms2, 'hours')).toBe('8h 45m 10s');

    expect(formatTimeRemaining(0, 'days')).toBe('¡Meta completada! 🎉');
  });
});
