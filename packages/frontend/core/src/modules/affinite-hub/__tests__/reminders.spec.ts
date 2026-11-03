import { afterEach, describe, expect, test, vi } from 'vitest';

import * as soundModule from '../sound';
import type { DatedItem } from '../types';
import {
  evaluateDueDatedItemReminders,
  requestNotificationPermission,
  shouldTriggerReminder,
  triggerDesktopNotification,
} from '../reminders';

describe('affinite-hub reminders module', () => {
  const hadWindow = 'window' in globalThis;
  const initialWindow = (globalThis as { window?: unknown }).window;

  afterEach(() => {
    vi.restoreAllMocks();
    if (hadWindow) {
      (globalThis as { window?: unknown }).window = initialWindow;
    } else {
      // @ts-expect-error cleanup window in node
      delete globalThis.window;
    }
  });

  describe('shouldTriggerReminder', () => {
    const fixedNow = new Date('2026-11-02T10:00:00Z');

    test('returns true when target time is within offset and not in firedSet', () => {
      // 5 minutes in the future, offset is 10 minutes
      const target = '2026-11-02T10:05:00Z';
      const firedSet = new Set<string>();

      expect(shouldTriggerReminder(target, 10, fixedNow, firedSet)).toBe(true);
    });

    test('returns true at exact offset boundary (e.g. 10 minutes ahead with 10 min offset)', () => {
      const target = '2026-11-02T10:10:00Z';
      const firedSet = new Set<string>();

      expect(shouldTriggerReminder(target, 10, fixedNow, firedSet)).toBe(true);
    });

    test('returns true when event is happening right now (0 minutes diff)', () => {
      const target = '2026-11-02T10:00:00Z';
      const firedSet = new Set<string>();

      expect(shouldTriggerReminder(target, 10, fixedNow, firedSet)).toBe(true);
    });

    test('returns false when target is beyond the offset window in the future', () => {
      // 15 minutes ahead, offset is only 10 minutes
      const target = '2026-11-02T10:15:00Z';
      const firedSet = new Set<string>();

      expect(shouldTriggerReminder(target, 10, fixedNow, firedSet)).toBe(false);
    });

    test('returns false when target time is already in the past', () => {
      // 5 minutes ago
      const target = '2026-11-02T09:55:00Z';
      const firedSet = new Set<string>();

      expect(shouldTriggerReminder(target, 10, fixedNow, firedSet)).toBe(false);
    });

    test('returns false when reminder key is already present in firedSet', () => {
      const target = '2026-11-02T10:05:00Z';
      const firedSet = new Set<string>();

      // With default key (target string)
      firedSet.add(target);
      expect(shouldTriggerReminder(target, 10, fixedNow, firedSet)).toBe(false);

      // With custom key
      const customKeySet = new Set<string>(['item-123']);
      expect(
        shouldTriggerReminder(target, 10, fixedNow, customKeySet, 'item-123')
      ).toBe(false);
      expect(
        shouldTriggerReminder(target, 10, fixedNow, customKeySet, 'item-456')
      ).toBe(true);
    });

    test('returns false for invalid date strings', () => {
      const firedSet = new Set<string>();
      expect(shouldTriggerReminder('not-a-date', 10, fixedNow, firedSet)).toBe(
        false
      );
    });
  });

  describe('evaluateDueDatedItemReminders', () => {
    const fixedNow = new Date('2026-11-02T10:00:00Z');

    test('returns empty list for empty items array', () => {
      const firedSet = new Set<string>();
      expect(evaluateDueDatedItemReminders([], fixedNow, firedSet)).toEqual([]);
    });

    test('skips completed items (done === true)', () => {
      const firedSet = new Set<string>();
      const items: DatedItem[] = [
        {
          id: 'item-done',
          source: 'calendar',
          title: 'Done Meeting',
          start: '2026-11-02T10:05:00Z',
          allDay: false,
          category: 'work',
          done: true,
        },
        {
          id: 'item-pending',
          source: 'calendar',
          title: 'Upcoming Meeting',
          start: '2026-11-02T10:05:00Z',
          allDay: false,
          category: 'work',
          done: false,
        },
      ];

      const due = evaluateDueDatedItemReminders(items, fixedNow, firedSet);
      expect(due).toHaveLength(1);
      expect(due[0].id).toBe('item-pending');
      expect(firedSet.has('item-pending-2026-11-02T10:05:00Z')).toBe(true);
    });

    test('skips allDay items without a time and without reminderTime', () => {
      const firedSet = new Set<string>();
      const items: DatedItem[] = [
        {
          id: 'item-allday',
          source: 'calendar',
          title: 'All Day Event',
          start: '2026-11-02',
          allDay: true,
          category: 'general',
        },
      ];

      const due = evaluateDueDatedItemReminders(items, fixedNow, firedSet);
      expect(due).toEqual([]);
      expect(firedSet.size).toBe(0);
    });

    test('evaluates items with start having full date-time', () => {
      const firedSet = new Set<string>();
      const items: DatedItem[] = [
        {
          id: 'item-1',
          source: 'calendar',
          title: 'Upcoming Sync',
          start: '2026-11-02T10:08:00Z',
          allDay: false,
          category: 'work',
        },
      ];

      const due = evaluateDueDatedItemReminders(items, fixedNow, firedSet);
      expect(due).toHaveLength(1);
      expect(due[0].id).toBe('item-1');
      expect(firedSet.has('item-1-2026-11-02T10:08:00Z')).toBe(true);
    });

    test('extracts reminderTime from metadata for date-only items', () => {
      const localNow = new Date(2026, 10, 2, 9, 55, 0); // 09:55 local time
      const firedSet = new Set<string>();

      const items: DatedItem[] = [
        {
          id: 'item-habit',
          source: 'habit',
          title: 'Morning Habit',
          start: '2026-11-02',
          allDay: false,
          category: 'habits',
          metadata: {
            reminderTime: '10:00', // 5 minutes ahead of localNow (09:55)
          },
        },
      ];

      const due = evaluateDueDatedItemReminders(items, localNow, firedSet);
      expect(due).toHaveLength(1);
      expect(due[0].id).toBe('item-habit');
      expect(firedSet.has('item-habit-2026-11-02')).toBe(true);
    });

    test('respects custom reminderMinutes offset in metadata', () => {
      const firedSet = new Set<string>();
      const items: DatedItem[] = [
        {
          id: 'item-30m-offset',
          source: 'calendar',
          title: 'Long Notice Event',
          start: '2026-11-02T10:25:00Z', // 25 minutes ahead
          allDay: false,
          category: 'work',
          metadata: {
            reminderMinutes: 30, // should trigger because 25 <= 30
          },
        },
        {
          id: 'item-default-10m',
          source: 'calendar',
          title: 'Standard Notice Event',
          start: '2026-11-02T10:25:00Z', // 25 minutes ahead
          allDay: false,
          category: 'work',
          // default 10 minutes -> should NOT trigger
        },
      ];

      const due = evaluateDueDatedItemReminders(items, fixedNow, firedSet);
      expect(due).toHaveLength(1);
      expect(due[0].id).toBe('item-30m-offset');
      expect(firedSet.has('item-30m-offset-2026-11-02T10:25:00Z')).toBe(true);
    });

    test('does not return or re-add items already in firedSet', () => {
      const firedSet = new Set<string>([
        'item-already-fired-2026-11-02T10:05:00Z',
      ]);
      const items: DatedItem[] = [
        {
          id: 'item-already-fired',
          source: 'calendar',
          title: 'Already Fired Event',
          start: '2026-11-02T10:05:00Z',
          allDay: false,
          category: 'work',
        },
      ];

      const due = evaluateDueDatedItemReminders(items, fixedNow, firedSet);
      expect(due).toEqual([]);
      expect(firedSet.size).toBe(1);
    });
  });

  describe('requestNotificationPermission', () => {
    test('returns "denied" when window is not available', async () => {
      // @ts-expect-error test SSR/node environment
      delete globalThis.window;
      const perm = await requestNotificationPermission();
      expect(perm).toBe('denied');
    });

    test('returns "denied" when Notification is not in window', async () => {
      // @ts-expect-error mock window without Notification
      globalThis.window = {} as unknown as Window & typeof globalThis;
      const perm = await requestNotificationPermission();
      expect(perm).toBe('denied');
    });

    test('returns "granted" immediately when already granted without requesting', async () => {
      const requestMock = vi.fn();
      // @ts-expect-error mock window with Notification
      globalThis.window = {
        Notification: {
          permission: 'granted',
          requestPermission: requestMock,
        },
      } as unknown as Window & typeof globalThis;

      const perm = await requestNotificationPermission();
      expect(perm).toBe('granted');
      expect(requestMock).not.toHaveBeenCalled();
    });

    test('returns "denied" immediately when already denied without requesting', async () => {
      const requestMock = vi.fn();
      // @ts-expect-error mock window with Notification
      globalThis.window = {
        Notification: {
          permission: 'denied',
          requestPermission: requestMock,
        },
      } as unknown as Window & typeof globalThis;

      const perm = await requestNotificationPermission();
      expect(perm).toBe('denied');
      expect(requestMock).not.toHaveBeenCalled();
    });

    test('requests permission when current permission is "default"', async () => {
      const requestMock = vi.fn().mockResolvedValue('granted');
      // @ts-expect-error mock window with Notification
      globalThis.window = {
        Notification: {
          permission: 'default',
          requestPermission: requestMock,
        },
      } as unknown as Window & typeof globalThis;

      const perm = await requestNotificationPermission();
      expect(perm).toBe('granted');
      expect(requestMock).toHaveBeenCalledTimes(1);
    });

    test('returns "denied" if requestPermission throws', async () => {
      const requestMock = vi
        .fn()
        .mockRejectedValue(new Error('Permission error'));
      // @ts-expect-error mock window with Notification
      globalThis.window = {
        Notification: {
          permission: 'default',
          requestPermission: requestMock,
        },
      } as unknown as Window & typeof globalThis;

      const perm = await requestNotificationPermission();
      expect(perm).toBe('denied');
    });
  });

  describe('triggerDesktopNotification', () => {
    test('plays completion sound by default and constructs Notification if permission granted', () => {
      const soundSpy = vi
        .spyOn(soundModule, 'playCompletionSound')
        .mockImplementation(() => {});
      const notificationConstructorSpy = vi.fn();

      class MockNotification {
        static permission: NotificationPermission = 'granted';
        constructor(title: string, options?: NotificationOptions) {
          notificationConstructorSpy(title, options);
        }
      }

      // @ts-expect-error mock window with Notification constructor
      globalThis.window = {
        Notification: MockNotification,
      } as unknown as Window & typeof globalThis;

      triggerDesktopNotification('Test Reminder', { body: 'In 5 minutes' });

      expect(soundSpy).toHaveBeenCalledTimes(1);
      expect(notificationConstructorSpy).toHaveBeenCalledWith('Test Reminder', {
        icon: '/favicon.ico',
        body: 'In 5 minutes',
      });
    });

    test('does not play sound when playSound is false', () => {
      const soundSpy = vi
        .spyOn(soundModule, 'playCompletionSound')
        .mockImplementation(() => {});
      const notificationConstructorSpy = vi.fn();

      class MockNotification {
        static permission: NotificationPermission = 'granted';
        constructor(title: string, options?: NotificationOptions) {
          notificationConstructorSpy(title, options);
        }
      }

      // @ts-expect-error mock window with Notification constructor
      globalThis.window = {
        Notification: MockNotification,
      } as unknown as Window & typeof globalThis;

      triggerDesktopNotification('Silent Reminder', undefined, false);

      expect(soundSpy).not.toHaveBeenCalled();
      expect(notificationConstructorSpy).toHaveBeenCalledWith(
        'Silent Reminder',
        {
          icon: '/favicon.ico',
        }
      );
    });

    test('does not create Notification if permission is denied', () => {
      const soundSpy = vi
        .spyOn(soundModule, 'playCompletionSound')
        .mockImplementation(() => {});
      const notificationConstructorSpy = vi.fn();

      class MockNotification {
        static permission: NotificationPermission = 'denied';
        constructor(title: string, options?: NotificationOptions) {
          notificationConstructorSpy(title, options);
        }
      }

      // @ts-expect-error mock window with Notification constructor
      globalThis.window = {
        Notification: MockNotification,
      } as unknown as Window & typeof globalThis;

      triggerDesktopNotification('Denied Reminder');

      expect(soundSpy).toHaveBeenCalledTimes(1);
      expect(notificationConstructorSpy).not.toHaveBeenCalled();
    });

    test('does not create Notification if window is undefined', () => {
      const soundSpy = vi
        .spyOn(soundModule, 'playCompletionSound')
        .mockImplementation(() => {});

      // @ts-expect-error test SSR/node
      delete globalThis.window;

      expect(() => {
        triggerDesktopNotification('SSR Reminder');
      }).not.toThrow();

      expect(soundSpy).toHaveBeenCalledTimes(1);
    });

    test('swallows errors if playCompletionSound throws', () => {
      vi.spyOn(soundModule, 'playCompletionSound').mockImplementation(() => {
        throw new Error('Audio hardware unavailable');
      });

      expect(() => {
        triggerDesktopNotification('Audio Error Reminder');
      }).not.toThrow();
    });

    test('swallows errors if Notification constructor throws', () => {
      vi.spyOn(soundModule, 'playCompletionSound').mockImplementation(() => {});

      class ThrowingNotification {
        static permission: NotificationPermission = 'granted';
        constructor() {
          throw new Error('Notification creation failed');
        }
      }

      // @ts-expect-error mock window with Notification constructor
      globalThis.window = {
        Notification: ThrowingNotification,
      } as unknown as Window & typeof globalThis;

      expect(() => {
        triggerDesktopNotification('Throwing Notification');
      }).not.toThrow();
    });

    test('allows custom icon to override default /favicon.ico', () => {
      vi.spyOn(soundModule, 'playCompletionSound').mockImplementation(() => {});
      const notificationConstructorSpy = vi.fn();

      class MockNotification {
        static permission: NotificationPermission = 'granted';
        constructor(title: string, options?: NotificationOptions) {
          notificationConstructorSpy(title, options);
        }
      }

      // @ts-expect-error mock window with Notification constructor
      globalThis.window = {
        Notification: MockNotification,
      } as unknown as Window & typeof globalThis;

      triggerDesktopNotification('Custom Icon Reminder', {
        icon: '/custom-app-icon.png',
      });

      expect(notificationConstructorSpy).toHaveBeenCalledWith(
        'Custom Icon Reminder',
        {
          icon: '/custom-app-icon.png',
        }
      );
    });
  });
});
