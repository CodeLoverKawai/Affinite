import {
  CHIME_NOTES,
  type DatedItem,
  type DatedItemSource,
  evaluateDueDatedItemReminders,
  HARMONIC_NOTES,
  playChimeSound,
  playCompletionSound,
  requestNotificationPermission,
  shouldTriggerReminder,
  triggerDesktopNotification,
} from '@affine/core/modules/affinite-hub';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('calendar-reminders-integration', () => {
  describe('Barrel exports from @affine/core/modules/affinite-hub', () => {
    it('exports all reminder engine functions', () => {
      expect(typeof evaluateDueDatedItemReminders).toBe('function');
      expect(typeof requestNotificationPermission).toBe('function');
      expect(typeof shouldTriggerReminder).toBe('function');
      expect(typeof triggerDesktopNotification).toBe('function');
    });

    it('exports all sound engine functions and notes constants', () => {
      expect(typeof playChimeSound).toBe('function');
      expect(typeof playCompletionSound).toBe('function');
      expect(Array.isArray(HARMONIC_NOTES)).toBe(true);
      expect(HARMONIC_NOTES.length).toBe(4);
      expect(Array.isArray(CHIME_NOTES)).toBe(true);
      expect(CHIME_NOTES.length).toBe(2);
    });
  });

  describe('Calendar Candidate Items Mapping & Due Reminder Evaluation', () => {
    const firedReminders = new Set<string>();

    beforeEach(() => {
      firedReminders.clear();
      vi.restoreAllMocks();
    });

    afterEach(() => {
      firedReminders.clear();
      vi.restoreAllMocks();
    });

    // Helper implementing calendar mapping logic from calendar/index.tsx
    function mapCalendarEventsToCandidateItems(
      events: Array<{
        id: string;
        calendarId?: string;
        title: string;
        startTime?: string;
        time?: string;
        completed?: boolean;
        allDay?: boolean;
        category?: string;
        reminderMinutes?: number;
        location?: string;
        metadata?: Record<string, unknown>;
      }>,
      todayKey: string
    ): DatedItem[] {
      return events.map(ev => ({
        id: ev.id,
        source: (ev.calendarId === 'layer-habits'
          ? 'habit'
          : ev.calendarId === 'layer-streaks'
            ? 'streak'
            : ev.calendarId === 'layer-boards'
              ? 'board'
              : 'calendar') as DatedItemSource,
        title: ev.title,
        start:
          ev.startTime || ev.time
            ? `${todayKey} ${ev.startTime || ev.time}`
            : todayKey,
        allDay: Boolean(ev.allDay),
        category: ev.category || 'General',
        done: ev.completed,
        metadata: {
          ...ev.metadata,
          reminderMinutes: ev.reminderMinutes,
          location: ev.location,
        },
      }));
    }

    it('correctly maps various calendar event sources to canonical DatedItem shapes', () => {
      const todayKey = '2026-11-02';
      const events = [
        {
          id: 'ev-1',
          calendarId: 'layer-habits',
          title: 'Morning Yoga',
          startTime: '08:00',
          completed: false,
          category: 'Health',
          reminderMinutes: 15,
        },
        {
          id: 'ev-2',
          calendarId: 'layer-streaks',
          title: 'Daily Coding',
          time: '14:00',
          completed: false,
          reminderMinutes: 10,
        },
        {
          id: 'ev-3',
          calendarId: 'layer-boards',
          title: 'Review PRs',
          startTime: '10:30',
          completed: true,
          location: 'Conference Room A',
        },
        {
          id: 'ev-4',
          calendarId: 'cal-personal',
          title: 'Dentist Appointment',
          startTime: '16:00',
          completed: false,
          location: 'Dental Clinic',
          reminderMinutes: 30,
        },
      ];

      const candidates = mapCalendarEventsToCandidateItems(events, todayKey);

      expect(candidates).toEqual([
        {
          id: 'ev-1',
          source: 'habit',
          title: 'Morning Yoga',
          start: '2026-11-02 08:00',
          allDay: false,
          category: 'Health',
          done: false,
          metadata: {
            reminderMinutes: 15,
            location: undefined,
          },
        },
        {
          id: 'ev-2',
          source: 'streak',
          title: 'Daily Coding',
          start: '2026-11-02 14:00',
          allDay: false,
          category: 'General',
          done: false,
          metadata: {
            reminderMinutes: 10,
            location: undefined,
          },
        },
        {
          id: 'ev-3',
          source: 'board',
          title: 'Review PRs',
          start: '2026-11-02 10:30',
          allDay: false,
          category: 'General',
          done: true,
          metadata: {
            reminderMinutes: undefined,
            location: 'Conference Room A',
          },
        },
        {
          id: 'ev-4',
          source: 'calendar',
          title: 'Dentist Appointment',
          start: '2026-11-02 16:00',
          allDay: false,
          category: 'General',
          done: false,
          metadata: {
            reminderMinutes: 30,
            location: 'Dental Clinic',
          },
        },
      ]);
    });

    it('evaluates due candidate items and notifies exactly once with deduplication', () => {
      const todayKey = '2026-11-02';
      const events = [
        {
          id: 'ev-due',
          calendarId: 'cal-work',
          title: 'Client Standup',
          startTime: '09:00',
          completed: false,
          reminderMinutes: 10,
          location: 'Zoom Room 1',
        },
        {
          id: 'ev-future',
          calendarId: 'cal-work',
          title: 'Afternoon Sync',
          startTime: '15:00',
          completed: false,
          reminderMinutes: 10,
        },
        {
          id: 'ev-done',
          calendarId: 'layer-habits',
          title: 'Hydration',
          startTime: '08:55',
          completed: true,
          reminderMinutes: 5,
        },
      ];

      const candidates = mapCalendarEventsToCandidateItems(events, todayKey);

      // Current time is 08:52 (8 minutes before 09:00, within 10 min window)
      const now = new Date('2026-11-02T08:52:00');

      const dueFirstTick = evaluateDueDatedItemReminders(
        candidates,
        now,
        firedReminders
      );

      expect(dueFirstTick.length).toBe(1);
      expect(dueFirstTick[0].id).toBe('ev-due');
      expect(dueFirstTick[0].title).toBe('Client Standup');

      // Process notifications
      const notificationsSent: Array<{ title: string; body: string }> = [];
      for (const item of dueFirstTick) {
        const timeStr = item.start.includes(' ')
          ? item.start.split(' ')[1]
          : '';
        const locationStr = item.metadata?.location
          ? ` · 📍 ${item.metadata.location}`
          : '';
        notificationsSent.push({
          title: `⏰ Recordatorio: ${item.title}`,
          body: `${timeStr}${locationStr}`.trim(),
        });
      }

      expect(notificationsSent).toEqual([
        {
          title: '⏰ Recordatorio: Client Standup',
          body: '09:00 · 📍 Zoom Room 1',
        },
      ]);

      // Second tick with same time: should deduplicate and return 0 due items
      const dueSecondTick = evaluateDueDatedItemReminders(
        candidates,
        now,
        firedReminders
      );
      expect(dueSecondTick.length).toBe(0);
    });

    it('handles events without location gracefully in notification format', () => {
      const todayKey = '2026-11-02';
      const events = [
        {
          id: 'ev-no-loc',
          calendarId: 'layer-habits',
          title: 'Drink Water',
          startTime: '09:05',
          completed: false,
          reminderMinutes: 10,
        },
      ];

      const candidates = mapCalendarEventsToCandidateItems(events, todayKey);
      const now = new Date('2026-11-02T09:00:00');

      const due = evaluateDueDatedItemReminders(
        candidates,
        now,
        firedReminders
      );
      expect(due.length).toBe(1);

      const item = due[0];
      const timeStr = item.start.includes(' ') ? item.start.split(' ')[1] : '';
      const locationStr = item.metadata?.location
        ? ` · 📍 ${item.metadata.location}`
        : '';
      const notification = {
        title: `⏰ Recordatorio: ${item.title}`,
        body: `${timeStr}${locationStr}`.trim(),
      };

      expect(notification).toEqual({
        title: '⏰ Recordatorio: Drink Water',
        body: '09:05',
      });
    });
  });
});
