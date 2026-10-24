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
