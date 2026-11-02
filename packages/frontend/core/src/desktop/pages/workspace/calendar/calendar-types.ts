export type RecurrenceFrequency =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'weekdays'
  | 'monthly'
  | 'yearly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number; // Default 1
  byWeekday?: number[]; // 1 = Monday ... 7 = Sunday (ISO weekday)
  until?: string; // YYYY-MM-DD inclusive end date
  count?: number; // Max number of occurrences
  exdates?: string[]; // Excluded occurrence dates (YYYY-MM-DD)
}

export interface CalendarTask {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (start date)
  endDate?: string; // YYYY-MM-DD (for multi-day events; >= date)
  time?: string; // HH:mm legacy / shorthand
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isAllDay?: boolean;
  color?: string; // Event color tint
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  notes?: string;
  // Google Calendar & Pro PKM fields
  calendarId?: string; // ID of CalendarLayer (e.g. 'cal-personal', 'cal-work', etc.)
  location?: string; // Physical address or room
  meetingUrl?: string; // Google Meet / Zoom / Teams / Jitsi link
  attendees?: string[]; // List of guest emails or names
  reminderMinutes?: number; // Minutes before event to trigger alert (e.g. 5, 10, 15, 30, 60)
  linkedDocId?: string; // Linked BlockSuite Meeting Note document ID
  recurrence?: RecurrenceRule;
  // External synchronization metadata
  externalUid?: string; // RFC 5545 UID or Google Calendar event ID
  externalSource?: 'local' | 'google-api' | 'ics-feed' | 'ics-import';
  etag?: string;
  updatedAt?: string;
}

export interface ExpandedCalendarEvent extends CalendarTask {
  /**
   * The original master CalendarTask ID (for recurring or multi-day instances).
   */
  masterId: string;
  /**
   * The specific date (YYYY-MM-DD) this instance appears on.
   */
  instanceDate: string;
  /**
   * True if this is a generated occurrence of a recurring rule.
   */
  isRecurringInstance: boolean;
  /**
   * True if this event spans multiple calendar days (endDate > date).
   */
  isMultiDay: boolean;
  /**
   * 1-based index of the day within a multi-day span.
   */
  spanDayIndex?: number;
  /**
   * Total days in the multi-day span.
   */
  spanTotalDays?: number;
}

export interface CalendarLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  type: 'local' | 'google-ics' | 'google-api';
  icsUrl?: string;
  googleCalendarId?: string; // e.g., 'primary' or user@gmail.com
  lastSyncedAt?: string;
  syncError?: string;
}

export interface GoogleCalendarConfig {
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  calendarId?: string; // default 'primary'
  autoSync?: boolean;
  lastSyncedAt?: string;
}

export interface BoardCardCalendarItem {
  id: string;
  boardId: string;
  boardTitle: string;
  columnId: string;
  columnTitle: string;
  title: string;
  description?: string;
  dueDate?: string; // YYYY-MM-DD
  category?: string;
  labels?: string[];
  isDoneColumn: boolean;
}

export type CalendarViewMode =
  | 'day'
  | 'week'
  | 'workweek'
  | 'month'
  | 'year'
  | 'agenda';

export const DEFAULT_CALENDAR_LAYERS: CalendarLayer[] = [
  {
    id: 'cal-personal',
    name: 'Personal',
    color: '#3b82f6',
    visible: true,
    type: 'local',
  },
  {
    id: 'cal-work',
    name: 'Trabajo',
    color: '#10b981',
    visible: true,
    type: 'local',
  },
  {
    id: 'cal-study',
    name: 'Estudio & Universidad',
    color: '#8b5cf6',
    visible: true,
    type: 'local',
  },
  {
    id: 'cal-health',
    name: 'Salud & Deporte',
    color: '#f59e0b',
    visible: true,
    type: 'local',
  },
];
