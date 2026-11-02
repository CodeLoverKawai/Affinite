export interface TimeBlockPosition {
  top: number;
  height: number;
}

export interface DragTimeRange {
  startTime: string;
  endTime: string;
}

function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (isNaN(hours) ? 0 : hours) * 60 + (isNaN(minutes) ? 0 : minutes);
}

function formatMinutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, totalMinutes));
  const hours = Math.floor(clamped / 60) % 24;
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Computes CSS top and height offsets in pixels for a timed event on a vertical time grid.
 */
export function computeEventPosition(
  startTime?: string,
  endTime?: string,
  startHour = 6,
  pixelsPerHour = 60
): TimeBlockPosition {
  const pixelsPerMinute = pixelsPerHour / 60;
  const gridStartMinutes = startHour * 60;

  const startMin = startTime ? parseTimeToMinutes(startTime) : gridStartMinutes;
  let endMin: number;

  if (endTime) {
    endMin = parseTimeToMinutes(endTime);
    if (endMin <= startMin) {
      endMin = startMin + 60; // minimum duration if end is earlier/equal
    }
  } else {
    endMin = startMin + 60; // default 1 hour
  }

  const top = Math.max(0, (startMin - gridStartMinutes) * pixelsPerMinute);
  const height = Math.max(15, (endMin - startMin) * pixelsPerMinute);

  return {
    top: Math.round(top),
    height: Math.round(height),
  };
}

/**
 * Formats start and end times for clean human-readable UI display.
 */
export function formatEventTimeRange(startTime?: string, endTime?: string): string {
  if (startTime && endTime) {
    return `${startTime} – ${endTime}`;
  }
  if (startTime) {
    return startTime;
  }
  if (endTime) {
    return endTime;
  }
  return 'Todo el día';
}

/**
 * Checks whether an event/task should be treated as an all-day event.
 */
export function isEventAllDay(task: {
  isAllDay?: boolean;
  time?: string;
  startTime?: string;
}): boolean {
  if (task.isAllDay !== undefined) {
    return task.isAllDay;
  }
  if (task.startTime || task.time) {
    return false;
  }
  return true;
}

/**
 * Snaps vertical drag coordinates (Y in pixels) to 15-minute grid intervals,
 * returning sorted { startTime, endTime }.
 */
export function calculateDragTimeRange(
  startY: number,
  currentY: number,
  startHour = 6,
  pixelsPerHour = 60
): DragTimeRange {
  const pixelsPerMinute = pixelsPerHour / 60;
  const minY = Math.min(startY, currentY);
  const maxY = Math.max(startY, currentY);

  const startMinRaw = Math.round(minY / pixelsPerMinute);
  const endMinRaw = Math.round(maxY / pixelsPerMinute);

  // Snap to 15-minute increments
  const snap15 = (min: number) => Math.round(min / 15) * 15;

  let snappedStartMinutes = snap15(startMinRaw) + startHour * 60;
  let snappedEndMinutes = snap15(endMinRaw) + startHour * 60;

  if (snappedEndMinutes <= snappedStartMinutes) {
    snappedEndMinutes = snappedStartMinutes + 15;
  }

  return {
    startTime: formatMinutesToTime(snappedStartMinutes),
    endTime: formatMinutesToTime(snappedEndMinutes),
  };
}

export interface CategorizableBoardCard {
  category?: string;
  labels?: string[];
}

/**
 * Checks whether a board card matches the selected calendar category filter.
 * When `selectedCategory` is `'Todas'`, all cards match.
 * Otherwise, cards whose `category` or `labels` match `selectedCategory`
 * (or cards with no category/labels when `selectedCategory` is `'Trabajo'`) are kept.
 */
export function doesBoardCardMatchCategory(
  card: CategorizableBoardCard,
  selectedCategory: string
): boolean {
  const normalizedSelected = selectedCategory.trim().toLowerCase();
  if (!normalizedSelected || normalizedSelected === 'todas') {
    return true;
  }

  const cardCategory = card.category?.trim().toLowerCase() || '';
  const cardLabels = Array.isArray(card.labels)
    ? card.labels.map(label => label.trim().toLowerCase()).filter(Boolean)
    : [];

  const hasCategoryOrLabels = Boolean(cardCategory) || cardLabels.length > 0;
  if (!hasCategoryOrLabels) {
    return normalizedSelected === 'trabajo';
  }

  if (cardCategory && cardCategory === normalizedSelected) {
    return true;
  }

  return cardLabels.some(label => label === normalizedSelected);
}

export interface LayoutTimeBlockEvent<T> {
  event: T;
  top: number;
  height: number;
  columnIndex: number;
  totalColumns: number;
  leftPercent: number;
  widthPercent: number;
}

interface InternalLayoutItem<T> {
  event: T;
  startMin: number;
  endMin: number;
  top: number;
  height: number;
  columnIndex: number;
}

/**
 * Computes side-by-side column positions for overlapping timed events on a single day,
 * grouping overlapping events into connected collision clusters like Google Calendar.
 */
export function computeOverlappingEventsLayout<
  T extends { id: string; startTime?: string; time?: string; endTime?: string },
>(
  events: T[],
  startHour = 0,
  pixelsPerHour = 60
): LayoutTimeBlockEvent<T>[] {
  if (events.length === 0) {
    return [];
  }

  const gridStartMinutes = startHour * 60;

  const items: InternalLayoutItem<T>[] = events.map(event => {
    const effectiveStart = event.startTime || event.time;
    const startMin = effectiveStart
      ? parseTimeToMinutes(effectiveStart)
      : gridStartMinutes;
    let endMin = event.endTime
      ? parseTimeToMinutes(event.endTime)
      : startMin + 60;
    if (endMin <= startMin) {
      endMin = startMin + 60;
    }

    const { top, height } = computeEventPosition(
      effectiveStart,
      event.endTime,
      startHour,
      pixelsPerHour
    );

    return {
      event,
      startMin,
      endMin,
      top,
      height,
      columnIndex: 0,
    };
  });

  // Sort by start time ascending, then longer duration first on tie
  items.sort((a, b) => {
    if (a.startMin !== b.startMin) {
      return a.startMin - b.startMin;
    }
    const durationDiff = b.endMin - b.startMin - (a.endMin - a.startMin);
    if (durationDiff !== 0) {
      return durationDiff;
    }
    return a.event.id.localeCompare(b.event.id);
  });

  // Group into connected collision clusters
  const clusters: InternalLayoutItem<T>[][] = [];
  let currentCluster: InternalLayoutItem<T>[] = [];
  let clusterMaxEndMin = -1;

  for (const item of items) {
    if (currentCluster.length === 0 || item.startMin < clusterMaxEndMin) {
      currentCluster.push(item);
      clusterMaxEndMin = Math.max(clusterMaxEndMin, item.endMin);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterMaxEndMin = item.endMin;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result: LayoutTimeBlockEvent<T>[] = [];

  for (const cluster of clusters) {
    const columnsEndMin: number[] = [];

    for (const item of cluster) {
      let placedColumn = -1;
      for (let colIdx = 0; colIdx < columnsEndMin.length; colIdx++) {
        const colEnd = columnsEndMin[colIdx];
        if (colEnd !== undefined && colEnd <= item.startMin) {
          placedColumn = colIdx;
          columnsEndMin[colIdx] = item.endMin;
          break;
        }
      }

      if (placedColumn === -1) {
        placedColumn = columnsEndMin.length;
        columnsEndMin.push(item.endMin);
      }

      item.columnIndex = placedColumn;
    }

    const totalColumns = Math.max(1, columnsEndMin.length);
    const widthPercent = 100 / totalColumns;

    for (const item of cluster) {
      result.push({
        event: item.event,
        top: item.top,
        height: item.height,
        columnIndex: item.columnIndex,
        totalColumns,
        leftPercent: (item.columnIndex / totalColumns) * 100,
        widthPercent,
      });
    }
  }

  return result;
}

/**
 * Snaps `newBottomY` to 15-minute increments and ensures the resulting `endTime`
 * is at least 15 minutes after `startTime` (clamped at 23:59).
 */
export function computeResizedEndTime(
  startTime: string,
  newBottomY: number,
  startHour = 0,
  pixelsPerHour = 60
): string {
  const pixelsPerMinute = pixelsPerHour / 60;
  const startMin = parseTimeToMinutes(startTime);
  const rawOffsetMinutes = Math.round(newBottomY / pixelsPerMinute);
  const snappedEndMinutes =
    Math.round(rawOffsetMinutes / 15) * 15 + startHour * 60;

  const minEndMinutes = startMin + 15;
  const maxEndMinutes = 23 * 60 + 59;
  const clampedEndMinutes = Math.min(
    maxEndMinutes,
    Math.max(minEndMinutes, snappedEndMinutes)
  );

  return formatMinutesToTime(clampedEndMinutes);
}

/**
 * Preserves the event's original duration (`endMinutes - startMinutes`, default 60 min)
 * while snapping the new start time from `newTopY` to 15-minute increments.
 */
export function computeMovedEventTimes(
  startTime: string,
  endTime: string | undefined,
  newTopY: number,
  startHour = 0,
  pixelsPerHour = 60
): DragTimeRange {
  const origStartMin = parseTimeToMinutes(startTime);
  const origEndMin = endTime ? parseTimeToMinutes(endTime) : origStartMin + 60;
  const duration =
    origEndMin > origStartMin ? origEndMin - origStartMin : 60;

  const pixelsPerMinute = pixelsPerHour / 60;
  const rawOffsetMinutes = Math.round(newTopY / pixelsPerMinute);
  const snappedStartMinutes =
    Math.round(rawOffsetMinutes / 15) * 15 + startHour * 60;

  const maxStartMinutes = Math.max(0, 24 * 60 - duration);
  const clampedStartMinutes = Math.max(
    0,
    Math.min(maxStartMinutes, snappedStartMinutes)
  );
  const clampedEndMinutes = Math.min(
    23 * 60 + 59,
    clampedStartMinutes + duration
  );

  return {
    startTime: formatMinutesToTime(clampedStartMinutes),
    endTime: formatMinutesToTime(clampedEndMinutes),
  };
}

/**
 * Filters board cards by the selected category.
 */
export function filterBoardCardsByCategory<T extends CategorizableBoardCard>(
  cards: T[],
  selectedCategory: string
): T[] {
  if (!selectedCategory || selectedCategory.trim().toLowerCase() === 'todas') {
    return cards;
  }
  return cards.filter(card =>
    doesBoardCardMatchCategory(card, selectedCategory)
  );
}


