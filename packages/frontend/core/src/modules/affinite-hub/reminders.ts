import { playChimeSound } from './sound';
import type { DatedItem } from './types';

/**
 * Defensively requests desktop notification permission in browser environments.
 * Returns 'denied' if window or Notification API is unsupported.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  const notificationApi = window.Notification;
  if (!notificationApi) {
    return 'denied';
  }

  try {
    if (
      notificationApi.permission === 'granted' ||
      notificationApi.permission === 'denied'
    ) {
      return notificationApi.permission;
    }

    return await notificationApi.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * Triggers a desktop notification and optionally plays a synthesized chime sound.
 */
export function triggerDesktopNotification(
  title: string,
  options?: NotificationOptions,
  playSound = true
): void {
  if (playSound) {
    try {
      playChimeSound();
    } catch {
      // Audio playback swallows errors safely
    }
  }

  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    window.Notification?.permission === 'granted'
  ) {
    try {
      new window.Notification(title, {
        icon: '/favicon.ico',
        ...options,
      });
    } catch {
      // Desktop notification creation swallows errors safely
    }
  }
}

/**
 * Evaluates whether a specific target date/time falls within the reminder window
 * and has not already been fired.
 */
export function shouldTriggerReminder(
  targetDateTimeStr: string,
  offsetMinutes: number,
  now: Date,
  firedSet: Set<string>,
  reminderKey: string = targetDateTimeStr
): boolean {
  const targetTime = new Date(targetDateTimeStr).getTime();
  if (Number.isNaN(targetTime)) {
    return false;
  }

  const diffMinutes = Math.floor((targetTime - now.getTime()) / 60000);

  // Allow a 1-minute grace margin for sub-minute polling jitter
  if (
    diffMinutes >= -1 &&
    diffMinutes <= offsetMinutes &&
    !firedSet.has(reminderKey)
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts a valid target date/time string from a DatedItem.
 * Returns null if no time component exists.
 */
function extractTargetDateTime(item: DatedItem): string | null {
  if (!item.start || typeof item.start !== 'string') {
    return null;
  }

  // If start already contains a time (e.g. YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm)
  const hasTime = /[T\s]\d{1,2}:\d{2}/.test(item.start);
  if (hasTime) {
    return item.start;
  }

  // If start is date-only, check if metadata.reminderTime is set (e.g. "09:00")
  const reminderTime = item.metadata?.reminderTime;
  if (typeof reminderTime === 'string') {
    const trimmedTime = reminderTime.trim();
    if (/^\d{1,2}:\d{2}/.test(trimmedTime)) {
      const datePart = item.start.includes('T')
        ? item.start.split('T')[0]
        : item.start.split(' ')[0];
      return `${datePart} ${trimmedTime}`;
    }
  }

  return null;
}

/**
 * Evaluates a collection of DatedItem objects against current time,
 * identifying items whose reminders are due, deduplicating via firedSet.
 */
export function evaluateDueDatedItemReminders(
  items: DatedItem[],
  now: Date = new Date(),
  firedSet: Set<string> = new Set<string>()
): DatedItem[] {
  const dueList: DatedItem[] = [];

  for (const item of items) {
    // Skip completed items
    if (item.done === true) {
      continue;
    }

    const targetDateTimeStr = extractTargetDateTime(item);
    // Skip allDay items without a time or items lacking time
    if (!targetDateTimeStr) {
      continue;
    }

    // Default offset is 10 minutes unless customized in item metadata
    const offsetMinutes =
      typeof item.metadata?.reminderMinutes === 'number'
        ? item.metadata.reminderMinutes
        : 10;

    const reminderKey = `${item.id}-${item.start}`;

    if (
      shouldTriggerReminder(
        targetDateTimeStr,
        offsetMinutes,
        now,
        firedSet,
        reminderKey
      )
    ) {
      firedSet.add(reminderKey);
      dueList.push(item);
    }
  }

  return dueList;
}
