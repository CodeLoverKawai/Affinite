import { describe, expect, it } from 'vitest';
import {
  calculateStreakProgress,
  createStreakTemplates,
  formatTimeRemaining,
  getInitialStreaks,
  STREAK_TEMPLATES,
  type StreakItem,
  toggleStreakPause,
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

  it('freezes elapsedMs and remainingMs at pausedAt while streak is paused', () => {
    const baseStreak: StreakItem = {
      id: 's-pause',
      title: 'Deep Work 10h',
      mode: 'hours',
      targetCount: 10,
      startDateTime: '2026-10-20T00:00:00.000Z',
      targetDateTime: '2026-10-20T10:00:00.000Z',
      soundEnabled: true,
      notificationEnabled: true,
      color: '#f59e0b',
      icon: '🔥',
      status: 'running',
    };

    const tPause = new Date('2026-10-20T04:00:00.000Z'); // 4 hours in (40%)
    const pausedStreak = toggleStreakPause(baseStreak, tPause);

    expect(pausedStreak.status).toBe('paused');
    expect(pausedStreak.pausedAt).toBe(tPause.toISOString());

    // Check 5 hours later while still paused (even past original target or close to it)
    const tLater = new Date('2026-10-20T09:00:00.000Z');
    const progressWhilePaused = calculateStreakProgress(pausedStreak, tLater);

    expect(progressWhilePaused.elapsedHours).toBe(4);
    expect(progressWhilePaused.remainingHours).toBe(6);
    expect(progressWhilePaused.progressPercent).toBe(40);
    expect(progressWhilePaused.isCompleted).toBe(false);
  });

  it('shifts startDateTime and targetDateTime forward by paused duration when resumed', () => {
    const baseStreak: StreakItem = {
      id: 's-resume',
      title: 'Deep Work 10h',
      mode: 'hours',
      targetCount: 10,
      startDateTime: '2026-10-20T00:00:00.000Z',
      targetDateTime: '2026-10-20T10:00:00.000Z',
      soundEnabled: true,
      notificationEnabled: true,
      color: '#f59e0b',
      icon: '🔥',
      status: 'running',
    };

    const tPause = new Date('2026-10-20T04:00:00.000Z');
    const pausedStreak = toggleStreakPause(baseStreak, tPause);

    // Resume 2 hours later at 06:00
    const tResume = new Date('2026-10-20T06:00:00.000Z');
    const resumedStreak = toggleStreakPause(pausedStreak, tResume);

    expect(resumedStreak.status).toBe('running');
    expect(resumedStreak.pausedAt).toBeUndefined();
    expect(resumedStreak.startDateTime).toBe('2026-10-20T02:00:00.000Z');
    expect(resumedStreak.targetDateTime).toBe('2026-10-20T12:00:00.000Z');

    // Progress right at resume should still be 4h elapsed / 6h remaining (40%)
    const progressAtResume = calculateStreakProgress(resumedStreak, tResume);
    expect(progressAtResume.elapsedHours).toBe(4);
    expect(progressAtResume.remainingHours).toBe(6);
    expect(progressAtResume.progressPercent).toBe(40);
  });

  it('returns empty array as initial streaks for clean workspaces', () => {
    expect(getInitialStreaks()).toEqual([]);
  });

  it('provides coherent streak templates with consistent IDs and titles', () => {
    expect(STREAK_TEMPLATES.length).toBeGreaterThanOrEqual(3);

    const programming = STREAK_TEMPLATES.find(
      s => s.id === 'streak-programming-30d'
    );
    expect(programming).toBeDefined();
    expect(programming?.title).toBe('Reto 30 Días de Programación');
    expect(programming?.mode).toBe('days');
    expect(programming?.targetCount).toBe(30);

    const deepWork = STREAK_TEMPLATES.find(
      s => s.id === 'streak-deep-work-8h'
    );
    expect(deepWork).toBeDefined();
    expect(deepWork?.title).toBe('Sprint de Trabajo Continuo (8 Horas)');
    expect(deepWork?.mode).toBe('hours');
    expect(deepWork?.targetCount).toBe(8);

    const hydration = STREAK_TEMPLATES.find(
      s => s.id === 'streak-hydration-7d'
    );
    expect(hydration).toBeDefined();
    expect(hydration?.title).toBe('Hábito de Hidratación (7 Días)');
    expect(hydration?.mode).toBe('days');
    expect(hydration?.targetCount).toBe(7);

    // Verify obsolete inconsistent id is not present
    expect(STREAK_TEMPLATES.some(s => s.id === 'streak-fasting-16h')).toBe(
      false
    );
  });

  it('generates dynamic startDateTime and targetDateTime based on custom date', () => {
    const customDate = new Date('2026-11-05T10:00:00.000Z');
    const templates = createStreakTemplates(customDate);

    expect(templates).toHaveLength(3);

    const deepWork = templates.find(s => s.id === 'streak-deep-work-8h');
    expect(deepWork).toBeDefined();
    expect(deepWork?.startDateTime).toBe('2026-11-05T10:00:00.000Z');
    expect(deepWork?.targetDateTime).toBe('2026-11-05T18:00:00.000Z');

    const programming = templates.find(s => s.id === 'streak-programming-30d');
    expect(programming).toBeDefined();
    expect(programming?.startDateTime).toBe('2026-11-05T10:00:00.000Z');
    expect(programming?.targetDateTime).toBe('2026-12-05T10:00:00.000Z');

    const hydration = templates.find(s => s.id === 'streak-hydration-7d');
    expect(hydration).toBeDefined();
    expect(hydration?.startDateTime).toBe('2026-11-05T10:00:00.000Z');
    expect(hydration?.targetDateTime).toBe('2026-11-12T10:00:00.000Z');
  });
});
