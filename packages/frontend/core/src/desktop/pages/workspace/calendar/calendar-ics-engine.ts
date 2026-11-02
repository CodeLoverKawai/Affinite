import type {
  CalendarTask,
  RecurrenceFrequency,
  RecurrenceRule,
} from './calendar-types';

const ICS_DAY_TO_NUM: Record<string, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7,
};

const NUM_TO_ICS_DAY: Record<number, string> = {
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
  7: 'SU',
};

const CONFERENCE_URL_REGEX =
  /(https?:\/\/(?:meet\.google\.com\/[a-zA-Z0-9-]+|(?:[a-zA-Z0-9-]+\.)?zoom\.us\/[jw]\/[^\s,;)"<>]+|teams\.microsoft\.com\/l\/meetup-join\/[^\s,;)"<>]+|meet\.jit\.si\/[^\s,;)"<>]+))/i;

export function unescapeIcsText(value: string): string {
  return value.replace(/\\(\\|[nN]|,|;)/g, (_match, char: string) => {
    if (char === 'n' || char === 'N') {
      return '\n';
    }
    return char;
  });
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, (d || 1) + days));
  const ry = dt.getUTCFullYear();
  const rm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const rd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

function formatDateCompact(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

function formatTimeCompact(timeStr: string): string {
  const [hh = '09', mm = '00'] = timeStr.split(':');
  return `${hh.padStart(2, '0')}${mm.padStart(2, '0')}`;
}

function addOneHourToTime(timeStr: string): string {
  const [hhStr = '09', mmStr = '00'] = timeStr.split(':');
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (Number.isNaN(hh) || Number.isNaN(mm)) {
    return '10:00';
  }
  const nextHour = Math.min(23, hh + 1);
  const nextMinute = hh + 1 > 23 ? 59 : mm;
  return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
}

function formatUtcTimestamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function splitIcsPropertyLine(line: string): {
  name: string;
  params: Record<string, string>;
  value: string;
} | null {
  let inQuotes = false;
  let colonIndex = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ':' && !inQuotes) {
      colonIndex = i;
      break;
    }
  }
  if (colonIndex === -1) {
    return null;
  }
  const header = line.slice(0, colonIndex);
  const value = line.slice(colonIndex + 1);
  const parts = header.split(';');
  const name = (parts[0] || '').trim().toUpperCase();
  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const eqIdx = parts[i].indexOf('=');
    if (eqIdx !== -1) {
      const k = parts[i].slice(0, eqIdx).trim().toUpperCase();
      const v = parts[i]
        .slice(eqIdx + 1)
        .trim()
        .replace(/^"|"$/g, '');
      params[k] = v;
    }
  }
  return { name, params, value };
}

function parseIcsDateTime(
  rawValue: string,
  params: Record<string, string> = {}
): { date: string; time?: string; isAllDay: boolean } | null {
  const val = rawValue.trim();
  if (!val) {
    return null;
  }

  if (params.VALUE?.toUpperCase() === 'DATE' || /^\d{8}$/.test(val)) {
    const y = val.slice(0, 4);
    const m = val.slice(4, 6);
    const d = val.slice(6, 8);
    return {
      date: `${y}-${m}-${d}`,
      isAllDay: true,
    };
  }

  const utcMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z$/i.exec(val);
  if (utcMatch) {
    const [, yStr, mStr, dStr, hhStr, mmStr, ssStr = '00'] = utcMatch;
    const utcDate = new Date(
      Date.UTC(
        Number(yStr),
        Number(mStr) - 1,
        Number(dStr),
        Number(hhStr),
        Number(mmStr),
        Number(ssStr)
      )
    );
    const y = utcDate.getUTCFullYear();
    const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(utcDate.getUTCDate()).padStart(2, '0');
    const hh = String(utcDate.getUTCHours()).padStart(2, '0');
    const mm = String(utcDate.getUTCMinutes()).padStart(2, '0');
    return {
      date: `${y}-${m}-${d}`,
      time: `${hh}:${mm}`,
      isAllDay: false,
    };
  }

  const localMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?/.exec(val);
  if (localMatch) {
    const [, y, m, d, hh, mm] = localMatch;
    return {
      date: `${y}-${m}-${d}`,
      time: `${hh}:${mm}`,
      isAllDay: false,
    };
  }

  const isoDateMatch = /^(\d{4}-\d{2}-\d{2})/.exec(val);
  if (isoDateMatch) {
    return {
      date: isoDateMatch[1],
      isAllDay: true,
    };
  }

  return null;
}

export function parseRruleString(rruleRaw: string): RecurrenceRule | null {
  const cleaned = rruleRaw.trim().replace(/^RRULE:/i, '');
  if (!cleaned) {
    return null;
  }

  const parts = cleaned.split(';');
  const map: Record<string, string> = {};
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx !== -1) {
      const k = part.slice(0, eqIdx).trim().toUpperCase();
      const v = part.slice(eqIdx + 1).trim();
      map[k] = v;
    }
  }

  const freqRaw = map.FREQ?.toUpperCase();
  if (!freqRaw) {
    return null;
  }

  let frequency: RecurrenceFrequency = 'none';
  if (freqRaw === 'DAILY') {
    frequency = 'daily';
  } else if (freqRaw === 'WEEKLY') {
    frequency = 'weekly';
  } else if (freqRaw === 'MONTHLY') {
    frequency = 'monthly';
  } else if (freqRaw === 'YEARLY') {
    frequency = 'yearly';
  } else {
    return null;
  }

  const rule: RecurrenceRule = { frequency };

  if (map.INTERVAL) {
    const interval = Number.parseInt(map.INTERVAL, 10);
    if (!Number.isNaN(interval) && interval > 0) {
      rule.interval = interval;
    }
  }

  if (map.BYDAY) {
    const dayTokens = map.BYDAY.split(',');
    const weekdays: number[] = [];
    for (const token of dayTokens) {
      const match = /(MO|TU|WE|TH|FR|SA|SU)$/i.exec(token.trim());
      if (match) {
        const dayNum = ICS_DAY_TO_NUM[match[1].toUpperCase()];
        if (dayNum && !weekdays.includes(dayNum)) {
          weekdays.push(dayNum);
        }
      }
    }
    if (weekdays.length > 0) {
      weekdays.sort((a, b) => a - b);
      rule.byWeekday = weekdays;
      if (
        frequency === 'weekly' &&
        (!rule.interval || rule.interval === 1) &&
        weekdays.length === 5 &&
        weekdays[0] === 1 &&
        weekdays[1] === 2 &&
        weekdays[2] === 3 &&
        weekdays[3] === 4 &&
        weekdays[4] === 5
      ) {
        rule.frequency = 'weekdays';
      }
    }
  }

  if (map.UNTIL) {
    const parsedUntil = parseIcsDateTime(map.UNTIL, {});
    if (parsedUntil) {
      rule.until = parsedUntil.date;
    }
  }

  if (map.COUNT) {
    const count = Number.parseInt(map.COUNT, 10);
    if (!Number.isNaN(count) && count > 0) {
      rule.count = count;
    }
  }

  return rule;
}

export function buildRruleString(rule: RecurrenceRule): string {
  const parts: string[] = [];

  if (rule.frequency === 'weekdays') {
    parts.push('FREQ=WEEKLY');
    if (rule.interval && rule.interval > 0) {
      parts.push(`INTERVAL=${rule.interval}`);
    }
    parts.push('BYDAY=MO,TU,WE,TH,FR');
  } else {
    parts.push(`FREQ=${rule.frequency.toUpperCase()}`);
    if (rule.interval && rule.interval > 0) {
      parts.push(`INTERVAL=${rule.interval}`);
    }
    if (rule.byWeekday && rule.byWeekday.length > 0) {
      const byDayStr = rule.byWeekday
        .map(d => NUM_TO_ICS_DAY[d])
        .filter(Boolean)
        .join(',');
      if (byDayStr) {
        parts.push(`BYDAY=${byDayStr}`);
      }
    }
  }

  if (rule.until) {
    parts.push(`UNTIL=${formatDateCompact(rule.until)}T235959Z`);
  }

  if (rule.count !== undefined && rule.count > 0) {
    parts.push(`COUNT=${rule.count}`);
  }

  return parts.join(';');
}

function extractConferenceUrl(text?: string): string | undefined {
  if (!text) {
    return undefined;
  }
  const match = CONFERENCE_URL_REGEX.exec(text);
  return match ? match[1] : undefined;
}

function sanitizeUid(uid: string): string {
  return uid.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function parseIcsToEvents(
  icsContent: string,
  options?: {
    calendarId?: string;
    color?: string;
    externalSource?: CalendarTask['externalSource'];
  }
): CalendarTask[] {
  if (!icsContent || !icsContent.trim()) {
    return [];
  }

  const calendarId = options?.calendarId ?? 'cal-personal';
  const color = options?.color ?? '#3b82f6';
  const externalSource = options?.externalSource ?? 'ics-import';

  // Unfold RFC 5545 folded lines
  const unfolded = icsContent.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const events: CalendarTask[] = [];
  let inVEvent = false;
  let nestedDepth = 0; // Track VALARM or other inner blocks inside VEVENT
  let inVAlarm = false;

  let uid = '';
  let summary = '';
  let description = '';
  let location = '';
  let explicitUrl = '';
  let dtStart: { date: string; time?: string; isAllDay: boolean } | null = null;
  let dtEnd: { date: string; time?: string; isAllDay: boolean } | null = null;
  let recurrence: RecurrenceRule | undefined;
  let exdates: string[] = [];
  let attendees: string[] = [];
  let reminderMinutes: number | undefined;
  let status = '';

  const resetEventState = () => {
    uid = '';
    summary = '';
    description = '';
    location = '';
    explicitUrl = '';
    dtStart = null;
    dtEnd = null;
    recurrence = undefined;
    exdates = [];
    attendees = [];
    reminderMinutes = undefined;
    status = '';
    nestedDepth = 0;
    inVAlarm = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const upper = line.toUpperCase();
    if (upper === 'BEGIN:VEVENT') {
      inVEvent = true;
      resetEventState();
      continue;
    }

    if (!inVEvent) {
      continue;
    }

    if (upper === 'END:VEVENT') {
      inVEvent = false;
      if (status.toUpperCase() !== 'CANCELLED' && dtStart) {
        const eventIndex = events.length + 1;
        const resolvedUid = uid || `${dtStart.date}-${eventIndex}`;
        const id = `ics-${sanitizeUid(resolvedUid)}`;
        const title = summary || 'Untitled Event';

        const task: CalendarTask = {
          id,
          externalUid: uid || resolvedUid,
          externalSource,
          calendarId,
          color,
          title,
          date: dtStart.date,
          isAllDay: dtStart.isAllDay,
          completed: status.toUpperCase() === 'COMPLETED',
          priority: 'medium',
        };

        if (!dtStart.isAllDay && dtStart.time) {
          task.startTime = dtStart.time;
          task.time = dtStart.time;
        }

        if (dtEnd) {
          if (dtStart.isAllDay) {
            const inclusiveEnd = addDaysToDateStr(dtEnd.date, -1);
            if (inclusiveEnd > dtStart.date) {
              task.endDate = inclusiveEnd;
            }
          } else {
            if (dtEnd.time) {
              task.endTime = dtEnd.time;
            }
            if (dtEnd.date > dtStart.date) {
              task.endDate = dtEnd.date;
            }
          }
        }

        if (description) {
          task.notes = description;
        }
        if (location) {
          task.location = location;
        }

        const meetingUrl =
          explicitUrl ||
          extractConferenceUrl(location) ||
          extractConferenceUrl(description);
        if (meetingUrl) {
          task.meetingUrl = meetingUrl;
        }

        if (recurrence) {
          if (exdates.length > 0) {
            recurrence.exdates = exdates;
          }
          task.recurrence = recurrence;
        } else if (exdates.length > 0) {
          task.recurrence = {
            frequency: 'none',
            exdates,
          };
        }

        if (attendees.length > 0) {
          task.attendees = attendees;
        }

        if (reminderMinutes !== undefined) {
          task.reminderMinutes = reminderMinutes;
        }

        events.push(task);
      }
      continue;
    }

    if (upper.startsWith('BEGIN:')) {
      nestedDepth++;
      if (upper === 'BEGIN:VALARM') {
        inVAlarm = true;
      }
      continue;
    }

    if (upper.startsWith('END:')) {
      if (upper === 'END:VALARM') {
        inVAlarm = false;
      }
      nestedDepth = Math.max(0, nestedDepth - 1);
      continue;
    }

    const parsedProp = splitIcsPropertyLine(line);
    if (!parsedProp) {
      continue;
    }

    const { name, params, value } = parsedProp;

    if (inVAlarm) {
      if (name === 'TRIGGER') {
        const minMatch = /-PT(\d+)M/i.exec(value);
        const hourMatch = /-PT(\d+)H/i.exec(value);
        if (minMatch) {
          reminderMinutes = Number.parseInt(minMatch[1], 10);
        } else if (hourMatch) {
          reminderMinutes = Number.parseInt(hourMatch[1], 10) * 60;
        }
      }
      continue;
    }

    if (nestedDepth > 0) {
      continue;
    }

    switch (name) {
      case 'UID':
        uid = unescapeIcsText(value.trim());
        break;
      case 'SUMMARY':
        summary = unescapeIcsText(value);
        break;
      case 'DESCRIPTION':
        description = unescapeIcsText(value);
        break;
      case 'LOCATION':
        location = unescapeIcsText(value);
        break;
      case 'URL':
      case 'X-GOOGLE-CONFERENCE':
        if (!explicitUrl && value.trim()) {
          explicitUrl = value.trim();
        }
        break;
      case 'DTSTART':
        dtStart = parseIcsDateTime(value, params);
        break;
      case 'DTEND':
        dtEnd = parseIcsDateTime(value, params);
        break;
      case 'RRULE': {
        const parsedRule = parseRruleString(value);
        if (parsedRule) {
          recurrence = parsedRule;
        }
        break;
      }
      case 'EXDATE': {
        const rawDates = value.split(',');
        for (const token of rawDates) {
          const parsedEx = parseIcsDateTime(token, params);
          if (parsedEx && !exdates.includes(parsedEx.date)) {
            exdates.push(parsedEx.date);
          }
        }
        break;
      }
      case 'ATTENDEE': {
        const mailtoMatch = /mailto:([^\s;]+)/i.exec(value);
        const attendeeEmail = mailtoMatch ? mailtoMatch[1] : params.CN;
        if (attendeeEmail && !attendees.includes(attendeeEmail)) {
          attendees.push(attendeeEmail);
        }
        break;
      }
      case 'STATUS':
        status = value.trim();
        break;
      default:
        break;
    }
  }

  return events;
}

export function exportEventsToIcs(
  tasks: CalendarTask[],
  calendarName = 'AFFiNITe Calendar'
): string {
  const dtStamp = formatUtcTimestamp(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AFFiNITe//Calendar Pro v3//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ];

  for (const task of tasks) {
    const uid = task.externalUid || `${task.id}@affinite.pro`;
    const isAllDay = Boolean(
      task.isAllDay || (!task.startTime && !task.time)
    );

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtStamp}`);

    if (isAllDay) {
      const startCompact = formatDateCompact(task.date);
      const inclusiveEnd =
        task.endDate && task.endDate >= task.date ? task.endDate : task.date;
      const exclusiveEnd = addDaysToDateStr(inclusiveEnd, 1);
      const endCompact = formatDateCompact(exclusiveEnd);
      lines.push(`DTSTART;VALUE=DATE:${startCompact}`);
      lines.push(`DTEND;VALUE=DATE:${endCompact}`);
    } else {
      const startTime = task.startTime || task.time || '09:00';
      const endTime = task.endTime || addOneHourToTime(startTime);
      const endDate =
        task.endDate && task.endDate >= task.date ? task.endDate : task.date;
      lines.push(
        `DTSTART:${formatDateCompact(task.date)}T${formatTimeCompact(startTime)}00`
      );
      lines.push(
        `DTEND:${formatDateCompact(endDate)}T${formatTimeCompact(endTime)}00`
      );
    }

    lines.push(`SUMMARY:${escapeIcsText(task.title)}`);

    if (task.notes) {
      lines.push(`DESCRIPTION:${escapeIcsText(task.notes)}`);
    }

    if (task.location) {
      lines.push(`LOCATION:${escapeIcsText(task.location)}`);
    }

    if (task.meetingUrl) {
      lines.push(`URL:${task.meetingUrl}`);
    }

    if (task.recurrence && task.recurrence.frequency !== 'none') {
      const rruleStr = buildRruleString(task.recurrence);
      if (rruleStr) {
        lines.push(`RRULE:${rruleStr}`);
      }
      if (task.recurrence.exdates && task.recurrence.exdates.length > 0) {
        const exdateStr = task.recurrence.exdates
          .map(formatDateCompact)
          .join(',');
        lines.push(`EXDATE;VALUE=DATE:${exdateStr}`);
      }
    }

    if (task.reminderMinutes !== undefined && task.reminderMinutes >= 0) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:Reminder');
      lines.push(`TRIGGER:-PT${task.reminderMinutes}M`);
      lines.push('END:VALARM');
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function buildGoogleCalendarTemplateUrl(task: CalendarTask): string {
  const isAllDay = Boolean(task.isAllDay || (!task.startTime && !task.time));
  let datesParam = '';

  if (isAllDay) {
    const startCompact = formatDateCompact(task.date);
    const inclusiveEnd =
      task.endDate && task.endDate >= task.date ? task.endDate : task.date;
    const exclusiveEndCompact = formatDateCompact(
      addDaysToDateStr(inclusiveEnd, 1)
    );
    datesParam = `${startCompact}/${exclusiveEndCompact}`;
  } else {
    const startTime = task.startTime || task.time || '09:00';
    const endTime = task.endTime || addOneHourToTime(startTime);
    const endDate =
      task.endDate && task.endDate >= task.date ? task.endDate : task.date;
    datesParam = `${formatDateCompact(task.date)}T${formatTimeCompact(startTime)}00/${formatDateCompact(endDate)}T${formatTimeCompact(endTime)}00`;
  }

  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', task.title);
  params.set('dates', datesParam);

  if (task.notes) {
    params.set('details', task.notes);
  }
  if (task.location) {
    params.set('location', task.location);
  }
  if (task.recurrence && task.recurrence.frequency !== 'none') {
    const rruleStr = buildRruleString(task.recurrence);
    if (rruleStr) {
      params.set('recur', `RRULE:${rruleStr}`);
    }
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function mapGoogleApiEventToCalendarTask(
  // oxlint-disable-next-line typescript/no-explicit-any
  gEvent: Record<string, any>,
  calendarId = 'cal-google',
  color = '#3b82f6'
): CalendarTask | null {
  if (!gEvent || gEvent.status === 'cancelled' || !gEvent.start) {
    return null;
  }

  const rawId = String(gEvent.id || gEvent.iCalUID || Date.now());
  let date = '';
  let endDate: string | undefined;
  let startTime: string | undefined;
  let endTime: string | undefined;
  let isAllDay = false;

  if (typeof gEvent.start.date === 'string') {
    date = gEvent.start.date;
    isAllDay = true;
    if (typeof gEvent.end?.date === 'string') {
      const inclusiveEnd = addDaysToDateStr(gEvent.end.date, -1);
      if (inclusiveEnd > date) {
        endDate = inclusiveEnd;
      }
    }
  } else if (typeof gEvent.start.dateTime === 'string') {
    const startMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(
      gEvent.start.dateTime
    );
    if (!startMatch) {
      return null;
    }
    date = startMatch[1];
    startTime = startMatch[2];
    isAllDay = false;

    if (typeof gEvent.end?.dateTime === 'string') {
      const endMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(
        gEvent.end.dateTime
      );
      if (endMatch) {
        endTime = endMatch[2];
        if (endMatch[1] > date) {
          endDate = endMatch[1];
        }
      }
    }
  } else {
    return null;
  }

  const task: CalendarTask = {
    id: `gcal-${rawId}`,
    externalUid: rawId,
    externalSource: 'google-api',
    calendarId,
    color,
    title:
      typeof gEvent.summary === 'string' && gEvent.summary.trim()
        ? gEvent.summary.trim()
        : 'Untitled Event',
    date,
    isAllDay,
    completed: false,
    priority: 'medium',
  };

  if (endDate) {
    task.endDate = endDate;
  }
  if (startTime) {
    task.startTime = startTime;
    task.time = startTime;
  }
  if (endTime) {
    task.endTime = endTime;
  }
  if (typeof gEvent.description === 'string' && gEvent.description) {
    task.notes = gEvent.description;
  }
  if (typeof gEvent.location === 'string' && gEvent.location) {
    task.location = gEvent.location;
  }

  const entryPointUri = Array.isArray(gEvent.conferenceData?.entryPoints)
    ? gEvent.conferenceData.entryPoints.find(
        (ep: { entryPointType?: string; uri?: string }) =>
          ep?.entryPointType === 'video' && typeof ep.uri === 'string'
      )?.uri
    : undefined;

  const meetingUrl =
    (typeof gEvent.hangoutLink === 'string' && gEvent.hangoutLink) ||
    entryPointUri ||
    extractConferenceUrl(task.location) ||
    extractConferenceUrl(task.notes);

  if (meetingUrl) {
    task.meetingUrl = meetingUrl;
  }

  if (Array.isArray(gEvent.recurrence)) {
    let parsedRule: RecurrenceRule | null = null;
    const exdates: string[] = [];
    for (const line of gEvent.recurrence) {
      if (typeof line !== 'string') {
        continue;
      }
      if (line.toUpperCase().startsWith('RRULE:')) {
        parsedRule = parseRruleString(line);
      } else if (line.toUpperCase().startsWith('EXDATE')) {
        const prop = splitIcsPropertyLine(line);
        if (prop) {
          for (const token of prop.value.split(',')) {
            const parsedEx = parseIcsDateTime(token, prop.params);
            if (parsedEx && !exdates.includes(parsedEx.date)) {
              exdates.push(parsedEx.date);
            }
          }
        }
      }
    }
    if (parsedRule) {
      if (exdates.length > 0) {
        parsedRule.exdates = exdates;
      }
      task.recurrence = parsedRule;
    }
  }

  if (Array.isArray(gEvent.attendees)) {
    const emails = gEvent.attendees
      .map((a: { email?: string; displayName?: string }) =>
        typeof a?.email === 'string'
          ? a.email
          : typeof a?.displayName === 'string'
            ? a.displayName
            : ''
      )
      .filter(Boolean);
    if (emails.length > 0) {
      task.attendees = emails;
    }
  }

  if (
    Array.isArray(gEvent.reminders?.overrides) &&
    gEvent.reminders.overrides.length > 0 &&
    typeof gEvent.reminders.overrides[0]?.minutes === 'number'
  ) {
    task.reminderMinutes = gEvent.reminders.overrides[0].minutes;
  }

  if (typeof gEvent.etag === 'string') {
    task.etag = gEvent.etag;
  }
  if (typeof gEvent.updated === 'string') {
    task.updatedAt = gEvent.updated;
  }

  return task;
}

export function mapCalendarTaskToGoogleApiEvent(
  task: CalendarTask,
  timeZone?: string
  // oxlint-disable-next-line typescript/no-explicit-any
): Record<string, any> {
  const isAllDay = Boolean(task.isAllDay || (!task.startTime && !task.time));
  // oxlint-disable-next-line typescript/no-explicit-any
  const payload: Record<string, any> = {
    summary: task.title,
    status: 'confirmed',
  };

  if (task.notes) {
    payload.description = task.notes;
  }
  if (task.location) {
    payload.location = task.location;
  }

  if (isAllDay) {
    const inclusiveEnd =
      task.endDate && task.endDate >= task.date ? task.endDate : task.date;
    const exclusiveEnd = addDaysToDateStr(inclusiveEnd, 1);
    payload.start = { date: task.date };
    payload.end = { date: exclusiveEnd };
  } else {
    const startTime = task.startTime || task.time || '09:00';
    const endTime = task.endTime || addOneHourToTime(startTime);
    const endDate =
      task.endDate && task.endDate >= task.date ? task.endDate : task.date;

    payload.start = timeZone
      ? { dateTime: `${task.date}T${startTime}:00`, timeZone }
      : { dateTime: `${task.date}T${startTime}:00` };
    payload.end = timeZone
      ? { dateTime: `${endDate}T${endTime}:00`, timeZone }
      : { dateTime: `${endDate}T${endTime}:00` };
  }

  if (task.recurrence && task.recurrence.frequency !== 'none') {
    const recurrenceLines: string[] = [];
    const rruleStr = buildRruleString(task.recurrence);
    if (rruleStr) {
      recurrenceLines.push(`RRULE:${rruleStr}`);
    }
    if (task.recurrence.exdates && task.recurrence.exdates.length > 0) {
      recurrenceLines.push(
        `EXDATE;VALUE=DATE:${task.recurrence.exdates.map(formatDateCompact).join(',')}`
      );
    }
    if (recurrenceLines.length > 0) {
      payload.recurrence = recurrenceLines;
    }
  }

  if (task.attendees && task.attendees.length > 0) {
    payload.attendees = task.attendees.map(email => ({ email }));
  }

  if (task.reminderMinutes !== undefined && task.reminderMinutes >= 0) {
    payload.reminders = {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: task.reminderMinutes }],
    };
  }

  return payload;
}
