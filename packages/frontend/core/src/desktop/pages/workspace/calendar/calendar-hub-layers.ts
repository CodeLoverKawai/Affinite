import type { DatedItem } from '@affine/core/modules/affinite-hub';

import type { CalendarLayer, ExpandedCalendarEvent } from './calendar-types';

export const AFFINITE_HUB_LAYERS: CalendarLayer[] = [
  {
    id: 'layer-boards',
    name: 'Tableros (Kanban)',
    color: '#3b82f6',
    visible: true,
    type: 'boards',
  },
  {
    id: 'layer-habits',
    name: 'Hábitos',
    color: '#10b981',
    visible: true,
    type: 'habits',
  },
  {
    id: 'layer-streaks',
    name: 'Streaks & Metas',
    color: '#f59e0b',
    visible: true,
    type: 'streaks',
  },
  {
    id: 'layer-journals',
    name: 'Diarios (Journals)',
    color: '#8b5cf6',
    visible: true,
    type: 'journals',
  },
];

/**
 * Idempotently merges canonical Hub integration layers with user-configured layers.
 * Preserves user visibility and color customizations for existing layers.
 * Appends any missing canonical hub layers.
 */
export function mergeHubCalendarLayers(
  userLayers?: CalendarLayer[]
): CalendarLayer[] {
  if (!userLayers || userLayers.length === 0) {
    return AFFINITE_HUB_LAYERS.map(layer => ({ ...layer }));
  }

  const result: CalendarLayer[] = [];
  const seenIds = new Set<string>();

  for (const layer of userLayers) {
    if (!layer || !layer.id || seenIds.has(layer.id)) {
      continue;
    }
    seenIds.add(layer.id);

    const hubCanonical = AFFINITE_HUB_LAYERS.find(h => h.id === layer.id);
    if (hubCanonical) {
      result.push({
        ...hubCanonical,
        ...layer,
        color: layer.color ?? hubCanonical.color,
        visible:
          typeof layer.visible === 'boolean'
            ? layer.visible
            : hubCanonical.visible,
      });
    } else {
      result.push({ ...layer });
    }
  }

  for (const hubLayer of AFFINITE_HUB_LAYERS) {
    if (!seenIds.has(hubLayer.id)) {
      result.push({ ...hubLayer });
      seenIds.add(hubLayer.id);
    }
  }

  return result;
}

function extractDateYYYYMMDD(str?: string): string {
  if (!str) return '';
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function extractTimeHHmm(str?: string): string | undefined {
  if (!str) return undefined;
  const match = str.match(/[T ](\d{2}:\d{2})/);
  if (match) {
    return match[1];
  }
  const timeOnly = str.match(/^(\d{2}:\d{2})/);
  if (timeOnly && !str.includes('-')) {
    return timeOnly[1];
  }
  return undefined;
}

function parseDateUTC(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Maps DatedItem source to canonical calendar layer ID.
 */
export function getCalendarIdForDatedItem(datedItem: DatedItem): string {
  switch (datedItem.source) {
    case 'board':
      return 'layer-boards';
    case 'habit':
      return 'layer-habits';
    case 'streak':
      return 'layer-streaks';
    case 'journal':
      return 'layer-journals';
    case 'calendar':
      return (datedItem.metadata?.calendarId as string) || 'cal-personal';
    default:
      return (
        (datedItem.metadata?.calendarId as string) ||
        `layer-${datedItem.source}`
      );
  }
}

/**
 * Maps a DatedItem from the unified Affinite Hub to an ExpandedCalendarEvent
 * suitable for consumption by Calendar views and timeblocking grids.
 */
export function datedItemToCalendarEvent(
  datedItem: DatedItem,
  fallbackColor?: string
): ExpandedCalendarEvent {
  const startDate =
    extractDateYYYYMMDD(datedItem.start) ||
    new Date().toISOString().slice(0, 10);
  const rawEndDate = extractDateYYYYMMDD(datedItem.end);
  const isMultiDay = Boolean(rawEndDate && rawEndDate > startDate);
  const endDate = isMultiDay ? rawEndDate : undefined;

  const startTime = !datedItem.allDay
    ? extractTimeHHmm(datedItem.start)
    : undefined;
  const endTime = !datedItem.allDay ? extractTimeHHmm(datedItem.end) : undefined;

  let spanTotalDays: number | undefined;
  let spanDayIndex: number | undefined;
  if (isMultiDay && endDate) {
    const s = parseDateUTC(startDate);
    const e = parseDateUTC(endDate);
    if (s && e) {
      spanTotalDays =
        Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
      spanDayIndex = 1;
    }
  }

  const calendarId = getCalendarIdForDatedItem(datedItem);
  const layerCanonical = AFFINITE_HUB_LAYERS.find(l => l.id === calendarId);
  const color = datedItem.color || fallbackColor || layerCanonical?.color;

  const priority: 'high' | 'medium' | 'low' =
    datedItem.metadata?.priority === 'high' ||
    datedItem.metadata?.priority === 'medium' ||
    datedItem.metadata?.priority === 'low'
      ? datedItem.metadata.priority
      : 'medium';

  const notes =
    typeof datedItem.metadata?.description === 'string'
      ? datedItem.metadata.description
      : typeof datedItem.metadata?.notes === 'string'
        ? datedItem.metadata.notes
        : undefined;

  const meetingUrl =
    typeof datedItem.metadata?.meetingUrl === 'string'
      ? datedItem.metadata.meetingUrl
      : undefined;

  const location =
    typeof datedItem.metadata?.location === 'string'
      ? datedItem.metadata.location
      : undefined;

  return {
    id: datedItem.id,
    masterId: datedItem.id,
    title: datedItem.title || '',
    date: startDate,
    endDate,
    time: startTime,
    startTime,
    endTime,
    isAllDay: datedItem.allDay,
    color,
    completed: Boolean(datedItem.done),
    priority,
    category: datedItem.category,
    notes,
    calendarId,
    location,
    meetingUrl,
    instanceDate: startDate,
    isRecurringInstance: false,
    isMultiDay,
    spanDayIndex,
    spanTotalDays,
  };
}
