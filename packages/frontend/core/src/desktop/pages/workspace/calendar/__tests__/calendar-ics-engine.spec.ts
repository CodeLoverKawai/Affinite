import { describe, expect, it } from 'vitest';

import {
  buildGoogleCalendarTemplateUrl,
  exportEventsToIcs,
  mapCalendarTaskToGoogleApiEvent,
  mapGoogleApiEventToCalendarTask,
  parseIcsToEvents,
} from '../calendar-ics-engine';
import type { CalendarTask } from '../calendar-types';

describe('calendar-ics-engine (RFC 5545 & Google Calendar API v3)', () => {
  describe('parseIcsToEvents', () => {
    it('unfolds RFC 5545 folded lines and unescapes text fields', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        'UID:event-folded-123@google.com',
        'SUMMARY:Arquitectura de Software\\, Diseño\\; Revisión ',
        ' Avanzada de Sistemas',
        'DESCRIPTION:Agenda:\\n1. Revisar C4\\n2. Validar Meet en https://meet.goo',
        ' gle.com/abc-defg-hij con el equipo.',
        'LOCATION:Sala 402\\, Edificio ',
        '\tIngeniería',
        'DTSTART:20261105T093000',
        'DTEND:20261105T110000',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const tasks = parseIcsToEvents(ics, {
        calendarId: 'cal-work',
        color: '#10b981',
        externalSource: 'ics-feed',
      });

      expect(tasks).toHaveLength(1);
      const task = tasks[0];
      expect(task.id).toBe('ics-event-folded-123_google_com');
      expect(task.externalUid).toBe('event-folded-123@google.com');
      expect(task.calendarId).toBe('cal-work');
      expect(task.color).toBe('#10b981');
      expect(task.externalSource).toBe('ics-feed');
      expect(task.title).toBe(
        'Arquitectura de Software, Diseño; Revisión Avanzada de Sistemas'
      );
      expect(task.notes).toBe(
        'Agenda:\n1. Revisar C4\n2. Validar Meet en https://meet.google.com/abc-defg-hij con el equipo.'
      );
      expect(task.location).toBe('Sala 402, Edificio Ingeniería');
      expect(task.meetingUrl).toBe('https://meet.google.com/abc-defg-hij');
      expect(task.date).toBe('2026-11-05');
      expect(task.startTime).toBe('09:30');
      expect(task.endTime).toBe('11:00');
      expect(task.isAllDay).toBe(false);
    });

    it('parses all-day single-day and multi-day events with exclusive DTEND', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        'UID:allday-single',
        'SUMMARY:Festivo Nacional',
        'DTSTART;VALUE=DATE:20261105',
        'DTEND;VALUE=DATE:20261106',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:allday-multiday',
        'SUMMARY:Congreso Internacional',
        'DTSTART;VALUE=DATE:20261105',
        'DTEND;VALUE=DATE:20261108',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\n');

      const tasks = parseIcsToEvents(ics);
      expect(tasks).toHaveLength(2);

      expect(tasks[0].title).toBe('Festivo Nacional');
      expect(tasks[0].date).toBe('2026-11-05');
      expect(tasks[0].endDate).toBeUndefined();
      expect(tasks[0].isAllDay).toBe(true);

      expect(tasks[1].title).toBe('Congreso Internacional');
      expect(tasks[1].date).toBe('2026-11-05');
      expect(tasks[1].endDate).toBe('2026-11-07');
      expect(tasks[1].isAllDay).toBe(true);
    });

    it('parses TZID local datetime and UTC datetime', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:tz-event',
        'SUMMARY:Clase Cálculo',
        'DTSTART;TZID=America/Bogota:20261105T070000',
        'DTEND;TZID=America/Bogota:20261105T090000',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:utc-event',
        'SUMMARY:Sync Global',
        'DTSTART:20261105T143000Z',
        'DTEND:20261105T153000Z',
        'X-GOOGLE-CONFERENCE:https://meet.google.com/xyz-uvwx-rst',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const tasks = parseIcsToEvents(ics);
      expect(tasks).toHaveLength(2);

      expect(tasks[0].date).toBe('2026-11-05');
      expect(tasks[0].startTime).toBe('07:00');
      expect(tasks[0].endTime).toBe('09:00');
      expect(tasks[0].isAllDay).toBe(false);

      expect(tasks[1].date).toBe('2026-11-05');
      expect(tasks[1].startTime).toBe('14:30');
      expect(tasks[1].endTime).toBe('15:30');
      expect(tasks[1].isAllDay).toBe(false);
      expect(tasks[1].meetingUrl).toBe('https://meet.google.com/xyz-uvwx-rst');
    });

    it('parses RRULE (weekly BYDAY, weekdays, daily with COUNT, UNTIL) and EXDATE lines', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:rrule-custom-days',
        'SUMMARY:Gimnasio',
        'DTSTART:20261102T060000',
        'DTEND:20261102T070000',
        'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR;UNTIL=20261231T235959Z',
        'EXDATE;VALUE=DATE:20261104,20261106',
        'EXDATE:20261109T060000Z',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:rrule-weekdays',
        'SUMMARY:Daily Standup',
        'DTSTART:20261102T090000',
        'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=20',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const tasks = parseIcsToEvents(ics);
      expect(tasks).toHaveLength(2);

      expect(tasks[0].recurrence).toEqual({
        frequency: 'weekly',
        interval: 1,
        byWeekday: [1, 3, 5],
        until: '2026-12-31',
        exdates: ['2026-11-04', '2026-11-06', '2026-11-09'],
      });

      expect(tasks[1].recurrence).toEqual({
        frequency: 'weekdays',
        byWeekday: [1, 2, 3, 4, 5],
        count: 20,
      });
    });

    it('ignores VALARM DESCRIPTION so it does not overwrite VEVENT DESCRIPTION and extracts TRIGGER minutes', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:alarm-test',
        'SUMMARY:Entrega Proyecto',
        'DESCRIPTION:Notas reales del evento',
        'DTSTART:20261110T160000',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Reminder',
        'TRIGGER:-PT15M',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const tasks = parseIcsToEvents(ics);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].notes).toBe('Notas reales del evento');
      expect(tasks[0].reminderMinutes).toBe(15);
    });
  });

  describe('exportEventsToIcs', () => {
    it('serializes timed, all-day, multi-day, recurring events with EXDATE and VALARM to valid RFC 5545 ICS and round-trips', () => {
      const tasks: CalendarTask[] = [
        {
          id: 'task-1',
          externalUid: 'uid-task-1@affinite.pro',
          title: 'Reunión de Diseño, Q4; Planificación',
          date: '2026-11-05',
          startTime: '10:00',
          endTime: '11:30',
          isAllDay: false,
          completed: false,
          priority: 'high',
          notes: 'Revisar mockups\nTraer métricas',
          location: 'Oficina Central, Piso 3',
          meetingUrl: 'https://zoom.us/j/9988776655',
          reminderMinutes: 10,
          recurrence: {
            frequency: 'weekly',
            interval: 2,
            byWeekday: [2, 4],
            until: '2026-12-20',
            exdates: ['2026-11-19'],
          },
        },
        {
          id: 'task-2',
          title: 'Hackathon Anual',
          date: '2026-11-12',
          endDate: '2026-11-14',
          isAllDay: true,
          completed: false,
          priority: 'medium',
        },
      ];

      const icsOutput = exportEventsToIcs(tasks, 'Mi Calendario Pro');

      expect(icsOutput).toContain('BEGIN:VCALENDAR');
      expect(icsOutput).toContain('VERSION:2.0');
      expect(icsOutput).toContain('PRODID:-//AFFiNITe//Calendar Pro v3//EN');
      expect(icsOutput).toContain('X-WR-CALNAME:Mi Calendario Pro');
      expect(icsOutput).toContain('UID:uid-task-1@affinite.pro');
      expect(icsOutput).toContain('DTSTART:20261105T100000');
      expect(icsOutput).toContain('DTEND:20261105T113000');
      expect(icsOutput).toContain(
        'SUMMARY:Reunión de Diseño\\, Q4\\; Planificación'
      );
      expect(icsOutput).toContain(
        'DESCRIPTION:Revisar mockups\\nTraer métricas'
      );
      expect(icsOutput).toContain('LOCATION:Oficina Central\\, Piso 3');
      expect(icsOutput).toContain('URL:https://zoom.us/j/9988776655');
      expect(icsOutput).toContain(
        'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH;UNTIL=20261220T235959Z'
      );
      expect(icsOutput).toContain('EXDATE;VALUE=DATE:20261119');
      expect(icsOutput).toContain('TRIGGER:-PT10M');
      // Multi-day all-day event exclusive DTEND = 2026-11-14 + 1 day = 20261115
      expect(icsOutput).toContain('DTSTART;VALUE=DATE:20261112');
      expect(icsOutput).toContain('DTEND;VALUE=DATE:20261115');

      // Verify round-trip parsing
      const reparsed = parseIcsToEvents(icsOutput);
      expect(reparsed).toHaveLength(2);
      expect(reparsed[0].title).toBe('Reunión de Diseño, Q4; Planificación');
      expect(reparsed[0].notes).toBe('Revisar mockups\nTraer métricas');
      expect(reparsed[0].location).toBe('Oficina Central, Piso 3');
      expect(reparsed[0].meetingUrl).toBe('https://zoom.us/j/9988776655');
      expect(reparsed[0].reminderMinutes).toBe(10);
      expect(reparsed[0].recurrence).toEqual({
        frequency: 'weekly',
        interval: 2,
        byWeekday: [2, 4],
        until: '2026-12-20',
        exdates: ['2026-11-19'],
      });
      expect(reparsed[1].date).toBe('2026-11-12');
      expect(reparsed[1].endDate).toBe('2026-11-14');
      expect(reparsed[1].isAllDay).toBe(true);
    });
  });

  describe('buildGoogleCalendarTemplateUrl', () => {
    it('builds template URL for timed recurring event and all-day multi-day event', () => {
      const timedTask: CalendarTask = {
        id: 't-1',
        title: 'Sprint Review',
        date: '2026-11-05',
        startTime: '14:00',
        endTime: '15:00',
        completed: false,
        priority: 'high',
        notes: 'Demo del producto',
        location: 'Sala Principal',
        recurrence: {
          frequency: 'weekly',
          interval: 2,
          byWeekday: [4],
        },
      };

      const url = buildGoogleCalendarTemplateUrl(timedTask);
      expect(url).toContain(
        'https://calendar.google.com/calendar/render?action=TEMPLATE'
      );
      expect(url).toContain('text=Sprint+Review');
      expect(url).toContain('dates=20261105T140000%2F20261105T150000');
      expect(url).toContain('details=Demo+del+producto');
      expect(url).toContain('location=Sala+Principal');
      expect(url).toContain('recur=RRULE%3AFREQ%3DWEEKLY%3BINTERVAL%3D2%3BBYDAY%3DTH');

      const allDayTask: CalendarTask = {
        id: 't-2',
        title: 'Vacaciones',
        date: '2026-12-20',
        endDate: '2026-12-25',
        isAllDay: true,
        completed: false,
        priority: 'low',
      };
      const allDayUrl = buildGoogleCalendarTemplateUrl(allDayTask);
      expect(allDayUrl).toContain('dates=20261220%2F20261226');
    });
  });

  describe('Google Calendar API v3 bidirectional mapping', () => {
    it('maps Google API Event resource to CalendarTask and ignores cancelled events', () => {
      expect(
        mapGoogleApiEventToCalendarTask({ id: 'cancelled-1', status: 'cancelled' })
      ).toBeNull();

      const gEvent = {
        id: 'gcal123',
        status: 'confirmed',
        summary: '1:1 Ingeniería',
        description: 'Revisión de objetivos trimestrales',
        location: 'Bogotá, Colombia',
        hangoutLink: 'https://meet.google.com/qwe-rtyu-iop',
        start: { dateTime: '2026-11-05T09:30:00-05:00' },
        end: { dateTime: '2026-11-05T10:15:00-05:00' },
        recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'],
        attendees: [{ email: 'ana@example.com' }, { email: 'luis@example.com' }],
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 10 }],
        },
        etag: '"etag-999"',
      };

      const task = mapGoogleApiEventToCalendarTask(gEvent, 'cal-work', '#10b981');
      expect(task).not.toBeNull();
      expect(task?.id).toBe('gcal-gcal123');
      expect(task?.externalUid).toBe('gcal123');
      expect(task?.externalSource).toBe('google-api');
      expect(task?.calendarId).toBe('cal-work');
      expect(task?.color).toBe('#10b981');
      expect(task?.title).toBe('1:1 Ingeniería');
      expect(task?.notes).toBe('Revisión de objetivos trimestrales');
      expect(task?.location).toBe('Bogotá, Colombia');
      expect(task?.meetingUrl).toBe('https://meet.google.com/qwe-rtyu-iop');
      expect(task?.date).toBe('2026-11-05');
      expect(task?.startTime).toBe('09:30');
      expect(task?.endTime).toBe('10:15');
      expect(task?.isAllDay).toBe(false);
      expect(task?.recurrence?.frequency).toBe('weekdays');
      expect(task?.attendees).toEqual(['ana@example.com', 'luis@example.com']);
      expect(task?.reminderMinutes).toBe(10);
      expect(task?.etag).toBe('"etag-999"');
    });

    it('maps all-day Google API Event and maps CalendarTask back to Google API payload', () => {
      const gAllDay = {
        id: 'gcal-allday',
        status: 'confirmed',
        summary: 'Retiro de Equipo',
        start: { date: '2026-11-10' },
        end: { date: '2026-11-13' },
      };

      const mappedTask = mapGoogleApiEventToCalendarTask(gAllDay);
      expect(mappedTask?.isAllDay).toBe(true);
      expect(mappedTask?.date).toBe('2026-11-10');
      expect(mappedTask?.endDate).toBe('2026-11-12');

      const backToGEvent = mapCalendarTaskToGoogleApiEvent(mappedTask!);
      expect(backToGEvent.summary).toBe('Retiro de Equipo');
      expect(backToGEvent.start).toEqual({ date: '2026-11-10' });
      expect(backToGEvent.end).toEqual({ date: '2026-11-13' });

      const timedTask: CalendarTask = {
        id: 'local-1',
        title: 'Demo Cliente',
        date: '2026-11-06',
        startTime: '16:00',
        endTime: '17:00',
        completed: false,
        priority: 'high',
        notes: 'Presentación final',
        location: 'Remoto',
        recurrence: {
          frequency: 'monthly',
          interval: 1,
          count: 6,
        },
      };

      const gTimed = mapCalendarTaskToGoogleApiEvent(
        timedTask,
        'America/Bogota'
      );
      expect(gTimed.summary).toBe('Demo Cliente');
      expect(gTimed.description).toBe('Presentación final');
      expect(gTimed.location).toBe('Remoto');
      expect(gTimed.start).toEqual({
        dateTime: '2026-11-06T16:00:00',
        timeZone: 'America/Bogota',
      });
      expect(gTimed.end).toEqual({
        dateTime: '2026-11-06T17:00:00',
        timeZone: 'America/Bogota',
      });
      expect(gTimed.recurrence).toEqual([
        'RRULE:FREQ=MONTHLY;INTERVAL=1;COUNT=6',
      ]);
    });
  });
});
