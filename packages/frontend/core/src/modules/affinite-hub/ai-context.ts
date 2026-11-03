import dayjs from 'dayjs';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear';

import {
  extractBoardDatedItems,
  extractCalendarDatedItems,
  extractHabitDatedItems,
  extractStreakDatedItems,
} from './providers';
import type { DatedItem, DatedItemSource } from './types';
import { buildWeeklySnapshot } from './weekly-snapshot';
import { resolveRootYDoc } from './yjs-root';

dayjs.extend(isLeapYear);
dayjs.extend(isoWeek);
dayjs.extend(isoWeeksInYear);

export interface HubAIContextOptions {
  now?: Date;
  boardDocs?: any[];
  maxUpcomingDays?: number; // default 7
}

const SOURCE_LABELS: Record<DatedItemSource, string> = {
  habit: 'Hábito',
  calendar: 'Calendario',
  board: 'Tablero',
  streak: 'Racha',
  journal: 'Diario',
};

const EMPTY_WORKSPACE_MESSAGE = [
  '[AFFINITE_WORKSPACE_INTELLIGENCE]',
  '# Estado del Workspace',
  'No hay datos registrados de hábitos, calendario o tableros en este workspace.',
  '[/AFFINITE_WORKSPACE_INTELLIGENCE]',
].join('\n');

export function buildHubAIContext(
  rootDocOrWrapper: any,
  options?: HubAIContextOptions
): string {
  const rawDoc =
    rootDocOrWrapper?.yDoc ?? rootDocOrWrapper?.doc ?? rootDocOrWrapper;
  const resolvedDoc =
    typeof rawDoc?.getMap === 'function'
      ? (resolveRootYDoc(rawDoc) ?? rawDoc)
      : null;

  if (!resolvedDoc || typeof resolvedDoc.getMap !== 'function') {
    return EMPTY_WORKSPACE_MESSAGE;
  }

  const refDate = options?.now ?? new Date();
  const currentDay = dayjs(refDate);
  const currentWeekKey = `${currentDay.isoWeekYear()}-W${String(currentDay.isoWeek()).padStart(2, '0')}`;

  const snapshot = buildWeeklySnapshot(
    resolvedDoc,
    currentWeekKey,
    options?.boardDocs
  );

  const maxUpcoming = Math.max(1, options?.maxUpcomingDays ?? 7);
  const startDay = currentDay.startOf('day');
  const upcomingDates: string[] = [];
  for (let i = 0; i < maxUpcoming; i++) {
    upcomingDates.push(startDay.add(i, 'day').format('YYYY-MM-DD'));
  }
  const startDate = upcomingDates[0];
  const endDate = upcomingDates[upcomingDates.length - 1];

  const upcomingItems: DatedItem[] = [];

  // 1. Habits for each day in range
  for (const dateStr of upcomingDates) {
    const habits = extractHabitDatedItems(resolvedDoc, dateStr);
    upcomingItems.push(...habits);
  }

  // 2. Calendar tasks for the range
  const calendarItems = extractCalendarDatedItems(resolvedDoc, {
    start: startDate,
    end: endDate,
  });
  upcomingItems.push(...calendarItems);

  // 3. Board cards
  const candidateBoards =
    Array.isArray(options?.boardDocs) && options.boardDocs.length > 0
      ? options.boardDocs
      : options?.boardDocs === undefined && resolvedDoc
        ? [resolvedDoc]
        : [];

  for (const bDoc of candidateBoards) {
    const cards = extractBoardDatedItems(bDoc);
    for (const card of cards) {
      if (!card.start) continue;
      const dueDay = card.start.slice(0, 10);
      if (dueDay >= startDate && dueDay <= endDate) {
        upcomingItems.push(card);
      }
    }
  }

  // 4. Active streaks
  const streakItems = extractStreakDatedItems(resolvedDoc);
  const activeStreaks = streakItems.filter(s => !s.done);

  // Check if workspace is empty
  const isEmpty =
    snapshot.habits.totalActive === 0 &&
    snapshot.tasks.total === 0 &&
    snapshot.boards.totalCardsDue === 0 &&
    snapshot.streaks.activeCount === 0 &&
    snapshot.streaks.completedCount === 0 &&
    upcomingItems.length === 0 &&
    activeStreaks.length === 0;

  if (isEmpty) {
    return EMPTY_WORKSPACE_MESSAGE;
  }

  // Sort upcoming items chronologically
  upcomingItems.sort((a, b) => {
    const startA = a.start || '';
    const startB = b.start || '';
    const cmp = startA.localeCompare(startB);
    if (cmp !== 0) return cmp;
    return a.title.localeCompare(b.title);
  });

  // Format Agenda lines
  const agendaLines: string[] = [];
  if (upcomingItems.length === 0) {
    agendaLines.push(
      `- No hay tareas programadas para los próximos ${maxUpcoming} días.`
    );
  } else {
    for (const item of upcomingItems) {
      const check = item.done ? '[x]' : '[ ]';
      const label = SOURCE_LABELS[item.source] || item.source;
      const timeStr = item.start ? item.start.replace('T', ' ') : '';
      agendaLines.push(
        `- ${check} [${label}] ${item.title}${timeStr ? ` (${timeStr})` : ''}`
      );
    }
  }

  // Format Active Streaks lines
  const streakLines: string[] = [];
  if (activeStreaks.length === 0) {
    streakLines.push('- No hay rachas ni metas activas en este momento.');
  } else {
    for (const streak of activeStreaks) {
      const details: string[] = [];
      const pct =
        typeof streak.metadata?.progressPercent === 'number'
          ? streak.metadata.progressPercent
          : undefined;
      if (pct !== undefined) {
        details.push(`Progreso: ${pct}%`);
      }
      if (streak.end) {
        details.push(`Meta: ${streak.end.slice(0, 10)}`);
      } else {
        details.push('Meta: Sin fecha límite');
      }
      streakLines.push(`- ${streak.title} (${details.join(', ')})`);
    }
  }

  const lines = [
    '[AFFINITE_WORKSPACE_INTELLIGENCE]',
    `# Estado del Workspace (Semana ${snapshot.weekKey}: ${snapshot.range.start} a ${snapshot.range.end})`,
    '',
    '## Resumen de la Semana en Curso',
    `- Consistencia Global: ${snapshot.consistencyScore}%`,
    `- Hábitos: ${snapshot.habits.totalCompleted}/${snapshot.habits.totalTargetCompletions} completados (${snapshot.habits.completionRate}%) · ${snapshot.habits.totalActive} hábitos activos`,
    `- Calendario: ${snapshot.tasks.completed}/${snapshot.tasks.total} tareas hechas (${snapshot.tasks.pending} pendientes, ${snapshot.tasks.completionRate}%)`,
    `- Tableros: ${snapshot.boards.completedCards}/${snapshot.boards.totalCardsDue} tarjetas completadas (${snapshot.boards.pendingCards} pendientes, ${snapshot.boards.completionRate}%)`,
    `- Rachas y Metas: ${snapshot.streaks.activeCount} activas (${snapshot.streaks.completedCount} completadas esta semana)`,
    '',
    '## Agenda de Hoy y Próximos Días',
    ...agendaLines,
    '',
    '## Rachas y Metas Activas',
    ...streakLines,
    '[/AFFINITE_WORKSPACE_INTELLIGENCE]',
  ];

  return lines.join('\n');
}
