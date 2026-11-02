import { Modal } from '@affine/component';
import {
  DateTimeIcon,
  JournalIcon,
  PlusIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DocsService } from '../../../../modules/doc';
import {
  formatWeeklyJournalKey,
  getWeekDateRange,
  JOURNAL_DATE_FORMAT,
  JournalService,
} from '../../../../modules/journal';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
  WorkbenchService,
} from '../../../../modules/workbench';
import { WorkspaceService } from '../../../../modules/workspace';
import * as styles from './calendar.css';
import {
  calculateDragTimeRange,
  computeEventPosition,
  filterBoardCardsByCategory,
  formatEventTimeRange,
  isEventAllDay,
} from './calendar-timeblock-helpers';

dayjs.extend(isLeapYear);
dayjs.extend(isoWeek);
dayjs.extend(isoWeeksInYear);

export interface CalendarTask {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm legacy / shorthand
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isAllDay?: boolean;
  color?: string; // Google Calendar color tint
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  notes?: string;
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

type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

const PRIORITY_META: Record<
  CalendarTask['priority'],
  { label: string; color: string; bg: string; border: string }
> = {
  high: {
    label: 'Alta',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.14)',
    border: 'rgba(239, 68, 68, 0.35)',
  },
  medium: {
    label: 'Media',
    color: '#d97706',
    bg: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  low: {
    label: 'Baja',
    color: '#2563eb',
    bg: 'rgba(59, 130, 246, 0.14)',
    border: 'rgba(59, 130, 246, 0.35)',
  },
};

const COLOR_PRESETS = [
  { id: '#3b82f6', label: 'Azul', name: 'Predeterminado' },
  { id: '#10b981', label: 'Verde', name: 'Esmeralda' },
  { id: '#f59e0b', label: 'Ámbar', name: 'Atención' },
  { id: '#ef4444', label: 'Rojo', name: 'Urgente' },
  { id: '#8b5cf6', label: 'Púrpura', name: 'Creativo' },
  { id: '#ec4899', label: 'Rosa', name: 'Personal' },
  { id: '#06b6d4', label: 'Cian', name: 'Estudio' },
];

const WEEKDAY_HEADERS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 23;
const PIXELS_PER_HOUR = 60;
const HOURS_ARRAY = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR + 1 },
  (_, i) => GRID_START_HOUR + i
);

function isDoneColName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    n === 'done' ||
    n === 'completado' ||
    n === 'completadas' ||
    n === 'hecho' ||
    n === 'finalizado' ||
    n.includes('done') ||
    n.includes('complet')
  );
}

export const Component = () => {
  const workspaceService = useService(WorkspaceService);
  const docsService = useService(DocsService);
  const journalService = useService(JournalService);
  const workbench = useService(WorkbenchService).workbench;

  const allDocs = useLiveData(docsService.list.docs$);
  const allJournalDates = useLiveData(journalService.allJournalDates$);

  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [cursorDate, setCursorDate] = useState<dayjs.Dayjs>(() => dayjs());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [boardCards, setBoardCards] = useState<BoardCardCalendarItem[]>([]);
  const [showUnscheduledPanel, setShowUnscheduledPanel] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedSource, setSelectedSource] = useState<'all' | 'tasks' | 'boards'>('all');

  // Mini Calendar Navigator state
  const [miniCalMonth, setMiniCalMonth] = useState<dayjs.Dayjs>(() => dayjs());

  // Vertical Drag-to-Create Timeblock State
  const [timeblockDrag, setTimeblockDrag] = useState<{
    date: string;
    startY: number;
    currentY: number;
  } | null>(null);

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CalendarTask | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(() =>
    dayjs().format(JOURNAL_DATE_FORMAT)
  );
  const [formIsAllDay, setFormIsAllDay] = useState(false);
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formColor, setFormColor] = useState('#3b82f6');
  const [formPriority, setFormPriority] =
    useState<CalendarTask['priority']>('medium');
  const [formCategory, setFormCategory] = useState('General');
  const [formNotes, setFormNotes] = useState('');

  // Drag payload state (for cards / tasks dragged to date headers)
  const [dragItem, setDragItem] = useState<
    | { type: 'task'; id: string }
    | { type: 'board-card'; boardId: string; cardId: string }
    | null
  >(null);

  // Sync cursor month to mini calendar
  useEffect(() => {
    setMiniCalMonth(cursorDate);
  }, [cursorDate]);

  // 1. Sync Native Calendar Tasks from root workspace Yjs map
  useEffect(() => {
    const rootYDoc = workspaceService.workspace.rootYDoc;
    const yMap = rootYDoc.getMap('affinite_calendar_v1');

    const syncFromYjs = () => {
      const raw = yMap.get('tasks') as string | undefined;
      if (!raw) {
        setTasks([]);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setTasks(parsed);
        }
      } catch {
        setTasks([]);
      }
    };

    syncFromYjs();
    yMap.observeDeep(syncFromYjs);
    return () => {
      yMap.unobserveDeep(syncFromYjs);
    };
  }, [workspaceService]);

  const saveTasksToYjs = useCallback(
    (nextTasks: CalendarTask[]) => {
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_calendar_v1');
      rootYDoc.transact(() => {
        yMap.set('tasks', JSON.stringify(nextTasks));
      });
      setTasks(nextTasks);
    },
    [workspaceService]
  );

  // 2. Sync Board Cards from all active Board documents
  const boardDocs = useMemo(() => {
    return allDocs.filter(doc => {
      const isTrash = doc.trash$.value;
      const props = doc.properties$.value;
      return !isTrash && props['custom:isBoard'] === 'true';
    });
  }, [allDocs]);

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    const rebuildAllBoardCards = () => {
      const collected: BoardCardCalendarItem[] = [];
      for (const boardDoc of boardDocs) {
        try {
          const { doc, release } = docsService.open(boardDoc.id);
          try {
            const yMap = doc.yDoc.getMap('board_data');
            const colsRaw = yMap.get('columns') as string | undefined;
            const cardsRaw = yMap.get('cards') as string | undefined;
            const columns: Array<{ id: string; title: string }> = colsRaw
              ? JSON.parse(colsRaw)
              : [];
            const cards: Array<any> = cardsRaw ? JSON.parse(cardsRaw) : [];
            const colMap = new Map(columns.map(c => [c.id, c.title]));
            const boardTitle =
              boardDoc.title$.value || 'Untitled Board';

            for (const c of cards) {
              const colTitle = colMap.get(c.columnId) || 'Lista';
              collected.push({
                id: c.id,
                boardId: boardDoc.id,
                boardTitle,
                columnId: c.columnId,
                columnTitle: colTitle,
                title: c.title || 'Untitled Card',
                description: c.description || '',
                dueDate: c.dueDate || undefined,
                category: c.category || undefined,
                labels: Array.isArray(c.labels) ? c.labels : [],
                isDoneColumn: isDoneColName(colTitle),
              });
            }
          } finally {
            release();
          }
        } catch {
          // ignore if doc failed to open
        }
      }
      setBoardCards(collected);
    };

    rebuildAllBoardCards();

    for (const boardDoc of boardDocs) {
      try {
        const { doc, release } = docsService.open(boardDoc.id);
        const yMap = doc.yDoc.getMap('board_data');
        const observer = () => rebuildAllBoardCards();
        yMap.observeDeep(observer);
        cleanups.push(() => {
          yMap.unobserveDeep(observer);
          release();
        });
      } catch {
        // ignore
      }
    }

    return () => {
      for (const fn of cleanups) fn();
    };
  }, [boardDocs, docsService]);

  const updateBoardCardDueDate = useCallback(
    (boardId: string, cardId: string, dueDate: string | undefined) => {
      try {
        const { doc, release } = docsService.open(boardId);
        try {
          const yMap = doc.yDoc.getMap('board_data');
          const cardsRaw = yMap.get('cards') as string | undefined;
          const cards: Array<any> = cardsRaw ? JSON.parse(cardsRaw) : [];
          const nextCards = cards.map(c =>
            c.id === cardId ? { ...c, dueDate } : c
          );
          doc.yDoc.transact(() => {
            yMap.set('cards', JSON.stringify(nextCards));
          });
        } finally {
          release();
        }
      } catch (err) {
        console.error('Failed to update board card dueDate', err);
      }
    },
    [docsService]
  );

  const toggleBoardCardDone = useCallback(
    (boardId: string, cardId: string) => {
      try {
        const { doc, release } = docsService.open(boardId);
        try {
          const yMap = doc.yDoc.getMap('board_data');
          const colsRaw = yMap.get('columns') as string | undefined;
          const cardsRaw = yMap.get('cards') as string | undefined;
          const columns: Array<{ id: string; title: string }> = colsRaw
            ? JSON.parse(colsRaw)
            : [];
          const cards: Array<any> = cardsRaw ? JSON.parse(cardsRaw) : [];
          const targetCard = cards.find(c => c.id === cardId);
          if (!targetCard || columns.length === 0) return;

          const currentCol = columns.find(c => c.id === targetCard.columnId);
          const currentlyDone = currentCol
            ? isDoneColName(currentCol.title)
            : false;

          let nextColumns = [...columns];
          let targetColId = targetCard.columnId;

          if (currentlyDone) {
            const firstTodoCol =
              nextColumns.find(c => !isDoneColName(c.title)) || nextColumns[0];
            targetColId = firstTodoCol.id;
          } else {
            let doneCol = nextColumns.find(c => isDoneColName(c.title));
            if (!doneCol) {
              doneCol = { id: `col-${Date.now()}`, title: 'Done' };
              nextColumns = [...nextColumns, doneCol];
            }
            targetColId = doneCol.id;
          }

          const nextCards = cards.map(c =>
            c.id === cardId ? { ...c, columnId: targetColId } : c
          );
          doc.yDoc.transact(() => {
            yMap.set('columns', JSON.stringify(nextColumns));
            yMap.set('cards', JSON.stringify(nextCards));
          });
        } finally {
          release();
        }
      } catch (err) {
        console.error('Failed to toggle board card done status', err);
      }
    },
    [docsService]
  );

  // Navigation & Journal Actions
  const handleOpenDailyJournal = useCallback(
    (dateStr: string) => {
      const doc = journalService.ensureJournalByDate(dateStr);
      workbench.openDoc(doc.id, { at: 'active' });
    },
    [journalService, workbench]
  );

  const handleOpenWeeklyJournal = useCallback(
    (weekKey: string) => {
      const doc = journalService.ensureWeeklyJournal(weekKey);
      workbench.openDoc(doc.id, { at: 'active' });
    },
    [journalService, workbench]
  );

  const handleOpenBoard = useCallback(
    (boardId: string) => {
      workbench.open(`/boards?boardId=${boardId}`, { at: 'active' });
    },
    [workbench]
  );

  // Task CRUD Handlers
  const openCreateTaskModal = useCallback(
    (defaultDate?: string, defaultStartTime?: string, defaultEndTime?: string) => {
      setEditingTask(null);
      setFormTitle('');
      setFormDate(defaultDate || dayjs().format(JOURNAL_DATE_FORMAT));
      if (defaultStartTime) {
        setFormIsAllDay(false);
        setFormStartTime(defaultStartTime);
        setFormEndTime(defaultEndTime || '');
      } else {
        setFormIsAllDay(true);
        setFormStartTime('09:00');
        setFormEndTime('10:00');
      }
      setFormColor('#3b82f6');
      setFormPriority('medium');
      setFormCategory('General');
      setFormNotes('');
      setIsTaskModalOpen(true);
    },
    []
  );

  const openEditTaskModal = useCallback((task: CalendarTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDate(task.date);
    const allDay = isEventAllDay(task);
    setFormIsAllDay(allDay);
    setFormStartTime(task.startTime || task.time || '09:00');
    setFormEndTime(task.endTime || '');
    setFormColor(task.color || '#3b82f6');
    setFormPriority(task.priority);
    setFormCategory(task.category || 'General');
    setFormNotes(task.notes || '');
    setIsTaskModalOpen(true);
  }, []);

  const handleSaveTaskModal = useCallback(() => {
    if (!formTitle.trim()) return;
    const taskData: Partial<CalendarTask> = {
      title: formTitle.trim(),
      date: formDate,
      isAllDay: formIsAllDay,
      startTime: !formIsAllDay ? formStartTime : undefined,
      endTime: !formIsAllDay ? formEndTime || undefined : undefined,
      time: !formIsAllDay ? formStartTime : undefined,
      color: formColor,
      priority: formPriority,
      category: formCategory.trim() || undefined,
      notes: formNotes.trim() || undefined,
    };

    if (editingTask) {
      const next = tasks.map(t =>
        t.id === editingTask.id ? { ...t, ...taskData } : t
      );
      saveTasksToYjs(next);
    } else {
      const created: CalendarTask = {
        id: `cal-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        completed: false,
        priority: 'medium',
        ...taskData,
      } as CalendarTask;
      saveTasksToYjs([...tasks, created]);
    }
    setIsTaskModalOpen(false);
  }, [
    editingTask,
    formCategory,
    formColor,
    formDate,
    formEndTime,
    formIsAllDay,
    formNotes,
    formPriority,
    formStartTime,
    formTitle,
    saveTasksToYjs,
    tasks,
  ]);

  const handleToggleTask = useCallback(
    (taskId: string) => {
      const next = tasks.map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      saveTasksToYjs(next);
    },
    [saveTasksToYjs, tasks]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      const next = tasks.filter(t => t.id !== taskId);
      saveTasksToYjs(next);
      setIsTaskModalOpen(false);
    },
    [saveTasksToYjs, tasks]
  );

  // Drop handler onto a date cell
  const handleDropOnDate = useCallback(
    (targetDateStr: string) => {
      if (!dragItem) return;
      if (dragItem.type === 'task') {
        const next = tasks.map(t =>
          t.id === dragItem.id ? { ...t, date: targetDateStr } : t
        );
        saveTasksToYjs(next);
      } else if (dragItem.type === 'board-card') {
        updateBoardCardDueDate(
          dragItem.boardId,
          dragItem.cardId,
          targetDateStr
        );
      }
      setDragItem(null);
    },
    [dragItem, saveTasksToYjs, tasks, updateBoardCardDueDate]
  );

  // Filtered tasks & board cards
  const normalizedFilter = searchFilter.trim().toLowerCase();
  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (selectedSource === 'boards') return [];
    if (selectedCategory !== 'Todas') {
      list = list.filter(
        t =>
          (t.category || 'General').toLowerCase() ===
          selectedCategory.toLowerCase()
      );
    }
    if (!normalizedFilter) return list;
    return list.filter(
      t =>
        t.title.toLowerCase().includes(normalizedFilter) ||
        (t.category || '').toLowerCase().includes(normalizedFilter) ||
        (t.notes || '').toLowerCase().includes(normalizedFilter)
    );
  }, [normalizedFilter, selectedCategory, selectedSource, tasks]);

  const filteredBoardCards = useMemo(() => {
    if (selectedSource === 'tasks') return [];
    const list = filterBoardCardsByCategory(boardCards, selectedCategory);
    if (!normalizedFilter) return list;
    return list.filter(
      c =>
        c.title.toLowerCase().includes(normalizedFilter) ||
        c.boardTitle.toLowerCase().includes(normalizedFilter)
    );
  }, [boardCards, normalizedFilter, selectedCategory, selectedSource]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const t of filteredTasks) {
      const list = map.get(t.date) || [];
      list.push(t);
      map.set(t.date, list);
    }
    return map;
  }, [filteredTasks]);

  const boardCardsByDate = useMemo(() => {
    const map = new Map<string, BoardCardCalendarItem[]>();
    for (const c of filteredBoardCards) {
      if (!c.dueDate) continue;
      const list = map.get(c.dueDate) || [];
      list.push(c);
      map.set(c.dueDate, list);
    }
    return map;
  }, [filteredBoardCards]);

  const unscheduledBoardCards = useMemo(() => {
    return filteredBoardCards.filter(c => !c.dueDate && !c.isDoneColumn);
  }, [filteredBoardCards]);

  // Calendar Grid Computation for Monthly View
  const monthWeeks = useMemo(() => {
    const startOfMonth = cursorDate.startOf('month');
    const endOfMonth = cursorDate.endOf('month');
    const gridStart = startOfMonth.startOf('isoWeek');
    const gridEnd = endOfMonth.endOf('isoWeek');

    const rows: Array<{
      weekKey: string;
      weekNumber: number;
      days: dayjs.Dayjs[];
    }> = [];

    let cur = gridStart;
    while (cur.isBefore(gridEnd) || cur.isSame(gridEnd, 'day')) {
      const days: dayjs.Dayjs[] = [];
      const weekKey = formatWeeklyJournalKey(cur);
      const weekNumber = cur.isoWeek();
      for (let i = 0; i < 7; i++) {
        days.push(cur.add(i, 'day'));
      }
      rows.push({ weekKey, weekNumber, days });
      cur = cur.add(7, 'day');
    }
    return rows;
  }, [cursorDate]);

  // Current ISO Week for Weekly View
  const currentWeekInfo = useMemo(() => {
    const weekKey = formatWeeklyJournalKey(cursorDate);
    const { start, end, weekNumber, year } = getWeekDateRange(weekKey);
    const days = Array.from({ length: 7 }, (_, idx) => start.add(idx, 'day'));
    return { weekKey, start, end, weekNumber, year, days };
  }, [cursorDate]);

  // Monthly KPIs & Agenda Groups
  const monthStatsAndGroups = useMemo(() => {
    const monthPrefix = cursorDate.format('YYYY-MM');
    const todayStr = dayjs().format(JOURNAL_DATE_FORMAT);
    const currentWeekKey = formatWeeklyJournalKey(dayjs());

    const monthTasks = filteredTasks.filter(t => t.date.startsWith(monthPrefix));
    const monthCards = filteredBoardCards.filter(
      c => c.dueDate && c.dueDate.startsWith(monthPrefix)
    );

    type UnifiedAgendaItem =
      | { kind: 'task'; date: string; completed: boolean; task: CalendarTask }
      | {
          kind: 'board-card';
          date: string;
          completed: boolean;
          card: BoardCardCalendarItem;
        };

    const allItems: UnifiedAgendaItem[] = [
      ...monthTasks.map(task => ({
        kind: 'task' as const,
        date: task.date,
        completed: task.completed,
        task,
      })),
      ...monthCards.map(card => ({
        kind: 'board-card' as const,
        date: card.dueDate ?? '',
        completed: card.isDoneColumn,
        card,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    const overdueOrUrgent: UnifiedAgendaItem[] = [];
    const thisWeekItems: UnifiedAgendaItem[] = [];
    const upcomingMonthItems: UnifiedAgendaItem[] = [];
    const completedItems: UnifiedAgendaItem[] = [];

    for (const item of allItems) {
      if (item.completed) {
        completedItems.push(item);
        continue;
      }
      const isUrgentTask =
        item.kind === 'task' && item.task.priority === 'high';
      if (item.date < todayStr || isUrgentTask) {
        overdueOrUrgent.push(item);
      } else if (formatWeeklyJournalKey(item.date) === currentWeekKey) {
        thisWeekItems.push(item);
      } else {
        upcomingMonthItems.push(item);
      }
    }

    let journalsCreatedCount = 0;
    allJournalDates.forEach(j => {
      if (j && j.startsWith(monthPrefix)) {
        journalsCreatedCount++;
      }
    });
    for (const row of monthWeeks) {
      if (allJournalDates.has(row.weekKey)) {
        journalsCreatedCount++;
      }
    }

    return {
      totalCount: allItems.length,
      pendingCount: allItems.length - completedItems.length,
      completedCount: completedItems.length,
      journalsCreatedCount,
      overdueOrUrgent,
      thisWeekItems,
      upcomingMonthItems,
      completedItems,
    };
  }, [
    allJournalDates,
    cursorDate,
    filteredBoardCards,
    filteredTasks,
    monthWeeks,
  ]);

  const todayStr = dayjs().format(JOURNAL_DATE_FORMAT);
  const currentMonthLabel = `${MONTH_NAMES_ES[cursorDate.month()]} ${cursorDate.year()}`;

  // Real-time red indicator line position
  const now = dayjs();
  const nowHour = now.hour();
  const nowMinute = now.minute();
  const isNowInGrid = nowHour >= GRID_START_HOUR && nowHour <= GRID_END_HOUR;
  const nowTop = isNowInGrid
    ? (nowHour - GRID_START_HOUR) * PIXELS_PER_HOUR +
      nowMinute * (PIXELS_PER_HOUR / 60)
    : null;

  const handlePrevPeriod = () => {
    if (viewMode === 'day') {
      setCursorDate(d => d.subtract(1, 'day'));
    } else if (viewMode === 'week') {
      setCursorDate(d => d.subtract(1, 'week'));
    } else {
      setCursorDate(d => d.subtract(1, 'month'));
    }
  };

  const handleNextPeriod = () => {
    if (viewMode === 'day') {
      setCursorDate(d => d.add(1, 'day'));
    } else if (viewMode === 'week') {
      setCursorDate(d => d.add(1, 'week'));
    } else {
      setCursorDate(d => d.add(1, 'month'));
    }
  };

  const handleGoToday = () => {
    setCursorDate(dayjs());
  };

  // Timeblock Drag Handlers
  const handleGridMouseDown = (
    dateStr: string,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if ((e.target as HTMLElement).closest('[data-event-card]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setTimeblockDrag({ date: dateStr, startY: y, currentY: y });
  };

  const handleGridMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timeblockDrag) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setTimeblockDrag(prev => (prev ? { ...prev, currentY: y } : null));
  };

  const handleGridMouseUp = (dateStr: string) => {
    if (!timeblockDrag || timeblockDrag.date !== dateStr) {
      setTimeblockDrag(null);
      return;
    }
    const range = calculateDragTimeRange(
      timeblockDrag.startY,
      timeblockDrag.currentY,
      GRID_START_HOUR,
      PIXELS_PER_HOUR
    );
    const date = timeblockDrag.date;
    setTimeblockDrag(null);
    openCreateTaskModal(date, range.startTime, range.endTime);
  };

  return (
    <>
      <ViewTitle title="Calendario & Tareas" />
      <ViewIcon icon="calendar" />
      <ViewHeader>
        <div className={styles.headerBar}>
          {/* Left: Title & Period Navigation */}
          <div className={styles.headerLeft}>
            <div className={styles.headerTitleGroup}>
              <DateTimeIcon className={styles.headerTitleIcon} />
              <span>
                {viewMode === 'day'
                  ? cursorDate.format('dddd, DD [de] MMMM YYYY')
                  : viewMode === 'week'
                    ? `${currentWeekInfo.weekKey} · Sem ${currentWeekInfo.weekNumber}`
                    : currentMonthLabel}
              </span>
            </div>

            <div className={styles.periodNavGroup}>
              <button
                onClick={handlePrevPeriod}
                className={styles.navBtn}
                title="Periodo anterior"
              >
                ◀
              </button>
              <button
                onClick={handleGoToday}
                className={styles.todayNavBtn}
              >
                Hoy
              </button>
              <button
                onClick={handleNextPeriod}
                className={styles.navBtn}
                title="Periodo siguiente"
              >
                ▶
              </button>
            </div>

            {/* Quick Current Weekly Note Button */}
            <button
              onClick={() =>
                handleOpenWeeklyJournal(currentWeekInfo.weekKey)
              }
              className={styles.weeklyNoteHeaderBtn}
              data-exists={allJournalDates.has(currentWeekInfo.weekKey)}
              data-testid="calendar-open-weekly-note-btn"
            >
              <JournalIcon style={{ width: 14, height: 14 }} />
              <span>
                Nota Semanal ({currentWeekInfo.weekKey})
              </span>
            </button>
          </div>

          {/* Center: 4 View Mode Switcher */}
          <div className={styles.viewSwitcher}>
            {(
              [
                { id: 'month', label: '📅 Mes' },
                { id: 'week', label: '🗓️ Semana' },
                { id: 'day', label: '🕒 Día' },
                { id: 'agenda', label: '📋 Agenda' },
              ] as const
            ).map(tab => {
              const active = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id)}
                  data-testid={`calendar-mode-${tab.id}`}
                  data-active={active}
                  className={styles.viewModeTab}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right: Search, Unscheduled Boards Toggle & New Task */}
          <div className={styles.headerRight}>
            <input
              type="text"
              placeholder="Filtrar tareas o boards..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className={styles.headerSearchInput}
            />
            <button
              onClick={() => setShowUnscheduledPanel(v => !v)}
              className={styles.sidebarToggleBtn}
              data-active={showUnscheduledPanel}
              title="Mostrar/ocultar panel lateral"
            >
              📌 Lateral ({unscheduledBoardCards.length})
            </button>
            <button
              onClick={() => openCreateTaskModal(todayStr)}
              data-testid="calendar-new-task-btn"
              className={styles.newTaskBtn}
            >
              <PlusIcon style={{ width: 14, height: 14 }} />
              <span>Nueva Tarea</span>
            </button>
          </div>
        </div>
      </ViewHeader>

      <ViewBody>
        <div className={styles.calendarRoot}>
          {/* Main Calendar Viewport */}
          <div className={styles.mainViewport}>
            {/* Quick KPI & Filter Control Bar */}
            <div className={styles.filterControlBar}>
              {/* Category Pills */}
              <div className={styles.filterGroup}>
                <span className={styles.filterGroupLabel}>
                  Categoría:
                </span>
                {[
                  'Todas',
                  'General',
                  'Trabajo',
                  'Personal',
                  'Estudio',
                  'Salud',
                  'Urgente',
                ].map(cat => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={styles.categoryChip}
                      data-active={active}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Source Filter Pills */}
              <div className={styles.filterGroup}>
                <span className={styles.filterGroupLabel}>
                  Origen:
                </span>
                {(
                  [
                    { id: 'all', label: 'Todo' },
                    { id: 'tasks', label: 'Tareas' },
                    { id: 'boards', label: 'Boards' },
                  ] as const
                ).map(s => {
                  const active = selectedSource === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSource(s.id)}
                      className={styles.sourceChip}
                      data-active={active}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ==================== MODE 1: MONTHLY GRID VIEW ==================== */}
            {viewMode === 'month' && (
              <div className={styles.monthGridContainer}>
                {/* Header Row: Nota Semanal + 7 Weekdays */}
                <div className={styles.monthHeaderRow}>
                  <div className={styles.monthWeeklyHeaderCell}>
                    🗓️ Semanal
                  </div>
                  {WEEKDAY_HEADERS.map(dayName => (
                    <div
                      key={dayName}
                      className={styles.monthWeekdayHeaderCell}
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Week Rows */}
                <div className={styles.monthWeeksBody}>
                  {monthWeeks.map(row => {
                    const hasWeeklyJournal = allJournalDates.has(row.weekKey);
                    const isCurrentWeek =
                      row.weekKey === formatWeeklyJournalKey(dayjs());

                    return (
                      <div
                        key={row.weekKey}
                        className={styles.monthWeekRow}
                      >
                        {/* Left Column: Nota Semanal (Wxx) */}
                        <div
                          onClick={() => handleOpenWeeklyJournal(row.weekKey)}
                          title={`Abrir o crear Nota Semanal ${row.weekKey}`}
                          className={styles.monthWeeklyNoteCell}
                          data-current-week={isCurrentWeek}
                        >
                          <div>
                            <div
                              className={styles.monthWeekNumRow}
                              data-current-week={isCurrentWeek}
                            >
                              <span>W{String(row.weekNumber).padStart(2, '0')}</span>
                              {hasWeeklyJournal && (
                                <span className={styles.monthWeekActiveBadge}>
                                  Activa
                                </span>
                              )}
                            </div>
                            <div className={styles.monthWeekDateRange}>
                              {row.days[0].format('DD MMM')} –{' '}
                              {row.days[6].format('DD MMM')}
                            </div>
                          </div>

                          <div
                            className={styles.monthWeeklyActionPill}
                            data-exists={hasWeeklyJournal}
                          >
                            {hasWeeklyJournal
                              ? '🗓️ Ver Semanal'
                              : '+ Nota Semanal'}
                          </div>
                        </div>

                        {/* 7 Day Cells */}
                        {row.days.map(day => {
                          const dateStr = day.format(JOURNAL_DATE_FORMAT);
                          const isCurrentMonth =
                            day.month() === cursorDate.month();
                          const isToday = dateStr === todayStr;
                          const hasDailyJournal = allJournalDates.has(dateStr);
                          const dayTasks = tasksByDate.get(dateStr) || [];
                          const dayCards = boardCardsByDate.get(dateStr) || [];

                          return (
                            <div
                              key={dateStr}
                              onDragOver={e => e.preventDefault()}
                              onDrop={() => handleDropOnDate(dateStr)}
                              className={styles.monthDayCell}
                              data-today={isToday}
                              data-outside-month={!isCurrentMonth}
                            >
                              {/* Top bar of day cell */}
                              <div className={styles.monthDayTopBar}>
                                <span
                                  className={styles.monthDayNumber}
                                  data-today={isToday}
                                >
                                  {day.date()}
                                </span>

                                <div className={styles.monthDayActions}>
                                  <button
                                    onClick={() =>
                                      handleOpenDailyJournal(dateStr)
                                    }
                                    title={
                                      hasDailyJournal
                                        ? `Abrir Nota Diaria (${dateStr})`
                                        : `Crear Nota Diaria (${dateStr})`
                                    }
                                    className={styles.monthDayIconBtn}
                                    data-exists={hasDailyJournal}
                                  >
                                    📖
                                  </button>
                                  <button
                                    onClick={() => openCreateTaskModal(dateStr)}
                                    title={`Añadir tarea el ${dateStr}`}
                                    className={styles.monthDayIconBtn}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Items list inside day cell */}
                              <div className={styles.monthDayItemsList}>
                                {dayTasks.map(task => {
                                  const color = task.color || '#3b82f6';
                                  return (
                                    <div
                                      key={task.id}
                                      draggable
                                      onDragStart={() =>
                                        setDragItem({
                                          type: 'task',
                                          id: task.id,
                                        })
                                      }
                                      onClick={() => openEditTaskModal(task)}
                                      className={styles.monthTaskPill}
                                      data-completed={task.completed}
                                      style={{
                                        background: task.completed
                                          ? 'var(--affine-background-primary-color)'
                                          : `${color}22`,
                                        border: `1px solid ${
                                          task.completed
                                            ? 'var(--affine-border-color)'
                                            : `${color}80`
                                        }`,
                                        borderLeft: `3px solid ${color}`,
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onClick={e => e.stopPropagation()}
                                        onChange={() =>
                                          handleToggleTask(task.id)
                                        }
                                        style={{
                                          cursor: 'pointer',
                                          accentColor: color,
                                          margin: 0,
                                        }}
                                      />
                                      <span
                                        className={styles.monthTaskTitle}
                                        data-completed={task.completed}
                                      >
                                        {!isEventAllDay(task) && (task.startTime || task.time)
                                          ? `${task.startTime || task.time} `
                                          : ''}
                                        {task.title}
                                      </span>
                                    </div>
                                  );
                                })}

                                {dayCards.map(card => (
                                  <div
                                    key={`${card.boardId}-${card.id}`}
                                    draggable
                                    onDragStart={() =>
                                      setDragItem({
                                        type: 'board-card',
                                        boardId: card.boardId,
                                        cardId: card.id,
                                      })
                                    }
                                    onClick={() =>
                                      handleOpenBoard(card.boardId)
                                    }
                                    className={styles.monthBoardPill}
                                    data-done={card.isDoneColumn}
                                    title={`Board: ${card.boardTitle} (${card.columnTitle})`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={card.isDoneColumn}
                                      onClick={e => e.stopPropagation()}
                                      onChange={() =>
                                        toggleBoardCardDone(
                                          card.boardId,
                                          card.id
                                        )
                                      }
                                      style={{
                                        cursor: 'pointer',
                                        accentColor: '#a855f7',
                                        margin: 0,
                                      }}
                                    />
                                    <span className={styles.monthBoardTag}>
                                      [Board]
                                    </span>
                                    <span
                                      className={styles.monthBoardTitle}
                                      data-done={card.isDoneColumn}
                                    >
                                      {card.title}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==================== MODE 2: 7-DAY WEEKLY PLANNER VIEW (GOOGLE CALENDAR STYLE) ==================== */}
            {viewMode === 'week' && (
              <div className={styles.weekViewContainer}>
                {/* Weekly Note Banner */}
                <div className={styles.weeklyBanner}>
                  <div className={styles.weeklyBannerLeft}>
                    <span className={styles.weeklyKeyBadge}>
                      {currentWeekInfo.weekKey}
                    </span>
                    <span className={styles.weeklyBannerTitle}>
                      Semana {currentWeekInfo.weekNumber} ({currentWeekInfo.start.format('DD MMM')} –{' '}
                      {currentWeekInfo.end.format('DD MMM YYYY')})
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      handleOpenWeeklyJournal(currentWeekInfo.weekKey)
                    }
                    className={styles.weeklyNoteCreateBtn}
                  >
                    {allJournalDates.has(currentWeekInfo.weekKey)
                      ? `🗓️ Abrir Nota Semanal`
                      : `✨ Crear Nota Semanal`}
                  </button>
                </div>

                {/* Google Calendar Time-Blocking Grid */}
                <div className={styles.timeGridContainer}>
                  {/* Top Column Headers (Day names and dates) */}
                  <div className={styles.timeGridHeaderRow}>
                    <div className={styles.timeGridGmtCell}>
                      GMT
                    </div>
                    {currentWeekInfo.days.map((day, idx) => {
                      const dateStr = day.format(JOURNAL_DATE_FORMAT);
                      const isToday = dateStr === todayStr;
                      const hasDailyJournal = allJournalDates.has(dateStr);

                      return (
                        <div
                          key={dateStr}
                          className={styles.timeGridDayHeaderCell}
                          data-today={isToday}
                        >
                          <div
                            className={styles.timeGridDayName}
                            data-today={isToday}
                          >
                            {WEEKDAY_HEADERS[idx].slice(0, 3)}
                          </div>
                          <div
                            className={styles.timeGridDayNumber}
                            data-today={isToday}
                          >
                            {day.date()}
                          </div>
                          <div>
                            <button
                              onClick={() => handleOpenDailyJournal(dateStr)}
                              title={hasDailyJournal ? 'Abrir Nota Diaria' : 'Crear Nota Diaria'}
                              className={styles.timeGridJournalBtn}
                              data-exists={hasDailyJournal}
                            >
                              📖 {hasDailyJournal ? 'Diario' : '+ Diario'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* All-Day Events Strip */}
                  <div className={styles.allDayStripRow}>
                    <div className={styles.allDayLabelCell}>
                      Todo el día
                    </div>

                    {currentWeekInfo.days.map(day => {
                      const dateStr = day.format(JOURNAL_DATE_FORMAT);
                      const dayTasks = tasksByDate.get(dateStr) || [];
                      const dayCards = boardCardsByDate.get(dateStr) || [];
                      const allDayTasks = dayTasks.filter(t => isEventAllDay(t));

                      return (
                        <div
                          key={dateStr}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => handleDropOnDate(dateStr)}
                          className={styles.allDayDayCell}
                        >
                          {allDayTasks.map(t => {
                            const color = t.color || '#3b82f6';
                            return (
                              <div
                                key={t.id}
                                onClick={() => openEditTaskModal(t)}
                                className={styles.allDayTaskChip}
                                data-completed={t.completed}
                                style={{
                                  background: t.completed
                                    ? 'var(--affine-background-secondary-color)'
                                    : `${color}28`,
                                  border: `1px solid ${
                                    t.completed
                                      ? 'var(--affine-border-color)'
                                      : `${color}80`
                                  }`,
                                  borderLeft: `3px solid ${color}`,
                                }}
                              >
                                {t.title}
                              </div>
                            );
                          })}

                          {dayCards.map(c => (
                            <div
                              key={`${c.boardId}-${c.id}`}
                              onClick={() => handleOpenBoard(c.boardId)}
                              className={styles.allDayBoardChip}
                              data-done={c.isDoneColumn}
                            >
                              📌 {c.title}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {/* 18-Hour Vertical Time-Grid Area */}
                  <div
                    className={styles.verticalGridScrollArea}
                    style={{
                      height: `${HOURS_ARRAY.length * PIXELS_PER_HOUR}px`,
                    }}
                  >
                    {/* Time Column (06:00 to 23:00) */}
                    <div className={styles.timeAxisColumn}>
                      {HOURS_ARRAY.map(hour => (
                        <div
                          key={hour}
                          className={styles.timeAxisSlot}
                          style={{ height: `${PIXELS_PER_HOUR}px` }}
                        >
                          {String(hour).padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>

                    {/* 7 Day Vertical Columns */}
                    {currentWeekInfo.days.map(day => {
                      const dateStr = day.format(JOURNAL_DATE_FORMAT);
                      const isToday = dateStr === todayStr;
                      const dayTasks = tasksByDate.get(dateStr) || [];
                      const timedTasks = dayTasks.filter(t => !isEventAllDay(t));

                      return (
                        <div
                          key={dateStr}
                          onMouseDown={e => handleGridMouseDown(dateStr, e)}
                          onMouseMove={handleGridMouseMove}
                          onMouseUp={() => handleGridMouseUp(dateStr)}
                          className={styles.dayGridColumn}
                          data-today={isToday}
                        >
                          {/* Hour lines */}
                          {HOURS_ARRAY.map(hour => (
                            <div
                              key={hour}
                              className={styles.hourGridSlot}
                              style={{ height: `${PIXELS_PER_HOUR}px` }}
                            />
                          ))}

                          {/* Red Current Time Bar if Today */}
                          {isToday && nowTop !== null && (
                            <div
                              className={styles.currentTimeLine}
                              style={{ top: `${nowTop}px` }}
                            >
                              <div className={styles.currentTimeDot} />
                            </div>
                          )}

                          {/* Timed Event Blocks */}
                          {timedTasks.map(t => {
                            const pos = computeEventPosition(
                              t.startTime || t.time,
                              t.endTime,
                              GRID_START_HOUR,
                              PIXELS_PER_HOUR
                            );
                            const timeLabel = formatEventTimeRange(
                              t.startTime || t.time,
                              t.endTime
                            );
                            const color = t.color || '#3b82f6';

                            return (
                              <div
                                key={t.id}
                                data-event-card="true"
                                data-completed={t.completed}
                                onClick={e => {
                                  e.stopPropagation();
                                  openEditTaskModal(t);
                                }}
                                className={styles.timedEventCard}
                                style={{
                                  top: `${pos.top}px`,
                                  height: `${pos.height}px`,
                                  background: t.completed
                                    ? 'var(--affine-background-secondary-color)'
                                    : `${color}24`,
                                  border: `1px solid ${
                                    t.completed
                                      ? 'var(--affine-border-color)'
                                      : `${color}80`
                                  }`,
                                  borderLeft: `4px solid ${color}`,
                                }}
                              >
                                <div className={styles.timedEventHeader}>
                                  <input
                                    type="checkbox"
                                    checked={t.completed}
                                    onClick={e => e.stopPropagation()}
                                    onChange={() => handleToggleTask(t.id)}
                                    style={{
                                      accentColor: color,
                                      cursor: 'pointer',
                                      margin: 0,
                                    }}
                                  />
                                  <span
                                    className={styles.timedEventTitle}
                                    data-completed={t.completed}
                                  >
                                    {t.title}
                                  </span>
                                </div>
                                <div className={styles.timedEventTimeLabel}>
                                  🕒 {timeLabel}
                                </div>
                              </div>
                            );
                          })}

                          {/* Drag-to-Create Ghost Timeblock */}
                          {timeblockDrag && timeblockDrag.date === dateStr && (
                            <div
                              className={styles.dragGhostBlock}
                              style={{
                                top: `${Math.min(
                                  timeblockDrag.startY,
                                  timeblockDrag.currentY
                                )}px`,
                                height: `${Math.max(
                                  15,
                                  Math.abs(
                                    timeblockDrag.currentY - timeblockDrag.startY
                                  )
                                )}px`,
                              }}
                            >
                              {(() => {
                                const range = calculateDragTimeRange(
                                  timeblockDrag.startY,
                                  timeblockDrag.currentY,
                                  GRID_START_HOUR,
                                  PIXELS_PER_HOUR
                                );
                                return `${range.startTime} – ${range.endTime}`;
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== MODE 4: DAILY TIME-BLOCKING VIEW ==================== */}
            {viewMode === 'day' && (
              <div className={styles.dayViewContainer}>
                {/* Day Header Banner */}
                <div
                  className={styles.dayHeaderBanner}
                  data-today={cursorDate.isSame(dayjs(), 'day')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '24px' }}>🕒</span>
                    <div>
                      <div className={styles.dayHeaderTitle}>
                        {cursorDate.format('dddd, DD [de] MMMM YYYY')}
                      </div>
                      <div className={styles.dayHeaderSubtitle}>
                        {cursorDate.isSame(dayjs(), 'day')
                          ? '🌟 Time-Blocking diario interactivo con arrastre'
                          : 'Planificación por horas para el día seleccionado'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() =>
                        handleOpenDailyJournal(
                          cursorDate.format(JOURNAL_DATE_FORMAT)
                        )
                      }
                      className={styles.weeklyNoteHeaderBtn}
                      data-exists={allJournalDates.has(
                        cursorDate.format(JOURNAL_DATE_FORMAT)
                      )}
                    >
                      <JournalIcon style={{ width: 14, height: 14 }} />
                      <span>
                        {allJournalDates.has(
                          cursorDate.format(JOURNAL_DATE_FORMAT)
                        )
                          ? 'Abrir Nota Diaria'
                          : 'Crear Nota Diaria'}
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        openCreateTaskModal(
                          cursorDate.format(JOURNAL_DATE_FORMAT)
                        )
                      }
                      className={styles.newTaskBtn}
                    >
                      <PlusIcon style={{ width: 14, height: 14 }} />
                      <span>Nueva Tarea en este día</span>
                    </button>
                  </div>
                </div>

                {/* Day Vertical Grid with Drag-to-Create */}
                <div className={styles.dayVerticalGridContainer}>
                  {/* Hours column */}
                  <div className={styles.timeAxisColumn}>
                    {HOURS_ARRAY.map(hour => (
                      <div
                        key={hour}
                        className={styles.timeAxisSlot}
                        style={{
                          height: `${PIXELS_PER_HOUR}px`,
                          padding: '6px 8px',
                          fontSize: '11px',
                        }}
                      >
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {/* Day grid track */}
                  {(() => {
                    const dayStr = cursorDate.format(JOURNAL_DATE_FORMAT);
                    const isToday = dayStr === todayStr;
                    const dayTasks = tasksByDate.get(dayStr) || [];
                    const timedTasks = dayTasks.filter(t => !isEventAllDay(t));

                    return (
                      <div
                        onMouseDown={e => handleGridMouseDown(dayStr, e)}
                        onMouseMove={handleGridMouseMove}
                        onMouseUp={() => handleGridMouseUp(dayStr)}
                        className={styles.dayGridColumn}
                        data-today={isToday}
                      >
                        {HOURS_ARRAY.map(hour => (
                          <div
                            key={hour}
                            className={styles.hourGridSlot}
                            style={{ height: `${PIXELS_PER_HOUR}px` }}
                          />
                        ))}

                        {/* Red Line if today */}
                        {isToday && nowTop !== null && (
                          <div
                            className={styles.currentTimeLine}
                            style={{ top: `${nowTop}px` }}
                          />
                        )}

                        {/* Timed Tasks */}
                        {timedTasks.map(t => {
                          const pos = computeEventPosition(
                            t.startTime || t.time,
                            t.endTime,
                            GRID_START_HOUR,
                            PIXELS_PER_HOUR
                          );
                          const color = t.color || '#3b82f6';
                          const timeRange = formatEventTimeRange(
                            t.startTime || t.time,
                            t.endTime
                          );

                          return (
                            <div
                              key={t.id}
                              data-event-card="true"
                              data-completed={t.completed}
                              onClick={e => {
                                e.stopPropagation();
                                openEditTaskModal(t);
                              }}
                              className={styles.dayTimedEventCard}
                              style={{
                                top: `${pos.top}px`,
                                height: `${pos.height}px`,
                                background: t.completed
                                  ? 'var(--affine-background-secondary-color)'
                                  : `${color}24`,
                                border: `1px solid ${
                                  t.completed
                                    ? 'var(--affine-border-color)'
                                    : `${color}80`
                                }`,
                                borderLeft: `5px solid ${color}`,
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={t.completed}
                                  onClick={e => e.stopPropagation()}
                                  onChange={() => handleToggleTask(t.id)}
                                  style={{
                                    accentColor: color,
                                    cursor: 'pointer',
                                  }}
                                />
                                <div>
                                  <div
                                    className={styles.timedEventTitle}
                                    data-completed={t.completed}
                                    style={{ fontSize: '13px' }}
                                  >
                                    {t.title}
                                  </div>
                                  <div
                                    className={styles.timedEventTimeLabel}
                                    style={{ fontSize: '11px', marginTop: '2px' }}
                                  >
                                    🕒 {timeRange} {t.category ? `· 🏷️ ${t.category}` : ''}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Drag Ghost */}
                        {timeblockDrag && timeblockDrag.date === dayStr && (
                          <div
                            className={styles.dragGhostBlock}
                            style={{
                              top: `${Math.min(
                                timeblockDrag.startY,
                                timeblockDrag.currentY
                              )}px`,
                              height: `${Math.max(
                                15,
                                Math.abs(
                                  timeblockDrag.currentY - timeblockDrag.startY
                                )
                              )}px`,
                              left: '10px',
                              right: '10px',
                            }}
                          >
                            {(() => {
                              const range = calculateDragTimeRange(
                                timeblockDrag.startY,
                                timeblockDrag.currentY,
                                GRID_START_HOUR,
                                PIXELS_PER_HOUR
                              );
                              return `${range.startTime} – ${range.endTime}`;
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ==================== MODE 3: MONTHLY AGENDA & KPI VIEW ==================== */}
            {viewMode === 'agenda' && (
              <div className={styles.agendaContainer}>
                {/* KPI Summary Row */}
                <div className={styles.kpiGrid}>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>
                      Total Tareas & Entregas ({currentMonthLabel})
                    </span>
                    <span className={styles.kpiValue} style={{ color: '#3b82f6' }}>
                      {monthStatsAndGroups.totalCount}
                    </span>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>Pendientes del Mes</span>
                    <span className={styles.kpiValue} style={{ color: '#d97706' }}>
                      {monthStatsAndGroups.pendingCount}
                    </span>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>Completadas</span>
                    <span className={styles.kpiValue} style={{ color: '#10b981' }}>
                      {monthStatsAndGroups.completedCount}
                    </span>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>
                      Notas Diarias & Semanales Creadas
                    </span>
                    <span className={styles.kpiValue} style={{ color: '#9333ea' }}>
                      {monthStatsAndGroups.journalsCreatedCount}
                    </span>
                  </div>
                </div>

                {/* Agenda Sections */}
                <div className={styles.agendaGroupsGrid}>
                  {[
                    {
                      title: '🚨 Vencidas o Prioridad Alta',
                      items: monthStatsAndGroups.overdueOrUrgent,
                      accent: '#ef4444',
                    },
                    {
                      title: '🔥 Esta Semana',
                      items: monthStatsAndGroups.thisWeekItems,
                      accent: '#3b82f6',
                    },
                    {
                      title: '📅 Próximas del Mes',
                      items: monthStatsAndGroups.upcomingMonthItems,
                      accent: '#a855f7',
                    },
                    {
                      title: '✅ Completadas',
                      items: monthStatsAndGroups.completedItems,
                      accent: '#10b981',
                    },
                  ].map(group => (
                    <div
                      key={group.title}
                      className={styles.agendaGroupCard}
                      style={{ borderTop: `3px solid ${group.accent}` }}
                    >
                      <div className={styles.agendaGroupHeader}>
                        <span className={styles.agendaGroupTitle}>
                          {group.title}
                        </span>
                        <span className={styles.agendaGroupCount}>
                          {group.items.length}
                        </span>
                      </div>

                      {group.items.length === 0 ? (
                        <div className={styles.agendaEmptyText}>
                          Sin elementos en esta sección.
                        </div>
                      ) : (
                        <div className={styles.agendaItemsList}>
                          {group.items.map(item => {
                            if (item.kind === 'task') {
                              const t = item.task;
                              const pMeta = PRIORITY_META[t.priority];
                              return (
                                <div
                                  key={t.id}
                                  onClick={() => openEditTaskModal(t)}
                                  className={styles.agendaTaskCard}
                                >
                                  <div className={styles.agendaItemLeft}>
                                    <input
                                      type="checkbox"
                                      checked={t.completed}
                                      onClick={e => e.stopPropagation()}
                                      onChange={() => handleToggleTask(t.id)}
                                      style={{
                                        cursor: 'pointer',
                                        accentColor: '#10b981',
                                      }}
                                    />
                                    <div>
                                      <div
                                        className={styles.agendaItemTitle}
                                        data-completed={t.completed}
                                      >
                                        {t.title}
                                      </div>
                                      <div className={styles.agendaItemMeta}>
                                        📅 {t.date}{' '}
                                        {t.startTime || t.time
                                          ? `· 🕒 ${formatEventTimeRange(t.startTime || t.time, t.endTime)}`
                                          : ''}
                                      </div>
                                    </div>
                                  </div>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '2px 7px',
                                      borderRadius: '6px',
                                      color: pMeta.color,
                                      background: pMeta.bg,
                                      border: `1px solid ${pMeta.border}`,
                                    }}
                                  >
                                    {pMeta.label}
                                  </span>
                                </div>
                              );
                            }

                            const c = item.card;
                            return (
                              <div
                                key={`${c.boardId}-${c.id}`}
                                onClick={() => handleOpenBoard(c.boardId)}
                                className={styles.agendaBoardCard}
                              >
                                <div className={styles.agendaItemLeft}>
                                  <input
                                    type="checkbox"
                                    checked={c.isDoneColumn}
                                    onClick={e => e.stopPropagation()}
                                    onChange={() =>
                                      toggleBoardCardDone(c.boardId, c.id)
                                    }
                                    style={{
                                      cursor: 'pointer',
                                      accentColor: '#a855f7',
                                    }}
                                  />
                                  <div>
                                    <div
                                      className={styles.agendaItemTitle}
                                      data-completed={c.isDoneColumn}
                                    >
                                      {c.title}
                                    </div>
                                    <div className={styles.agendaItemMeta}>
                                      📅 {c.dueDate} · 📌 {c.boardTitle} (
                                      {c.columnTitle})
                                    </div>
                                  </div>
                                </div>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    color: '#9333ea',
                                    background: 'rgba(168, 85, 247, 0.16)',
                                  }}
                                >
                                  Board
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Collapsible Sidebar: Mini Calendar Navigator + Unscheduled Boards */}
          {showUnscheduledPanel && (
            <div className={styles.rightSidebar}>
              {/* Mini Calendar Monthly Navigator */}
              <div className={styles.miniCalendarCard}>
                <div className={styles.miniCalendarHeader}>
                  <span className={styles.miniCalendarTitle}>
                    {MONTH_NAMES_ES[miniCalMonth.month()]} {miniCalMonth.year()}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => setMiniCalMonth(m => m.subtract(1, 'month'))}
                      className={styles.navBtn}
                      title="Mes anterior"
                    >
                      ◀
                    </button>
                    <button
                      onClick={() => setMiniCalMonth(dayjs())}
                      className={styles.todayNavBtn}
                      style={{ fontSize: '10px' }}
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() => setMiniCalMonth(m => m.add(1, 'month'))}
                      className={styles.navBtn}
                      title="Mes siguiente"
                    >
                      ▶
                    </button>
                  </div>
                </div>

                {/* 7-day mini headers */}
                <div className={styles.miniCalendarWeekdays}>
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>

                {/* Mini day cells */}
                <div className={styles.miniCalendarGrid}>
                  {(() => {
                    const start = miniCalMonth.startOf('month').startOf('isoWeek');
                    const end = miniCalMonth.endOf('month').endOf('isoWeek');
                    const cells: dayjs.Dayjs[] = [];
                    let cur = start;
                    while (cur.isBefore(end) || cur.isSame(end, 'day')) {
                      cells.push(cur);
                      cur = cur.add(1, 'day');
                    }
                    return cells.map(day => {
                      const dStr = day.format(JOURNAL_DATE_FORMAT);
                      const isCurrentMonth = day.month() === miniCalMonth.month();
                      const isSelected = dStr === cursorDate.format(JOURNAL_DATE_FORMAT);
                      const isDayToday = dStr === todayStr;

                      return (
                        <button
                          key={dStr}
                          onClick={() => {
                            setCursorDate(day);
                            if (viewMode === 'month') {
                              setViewMode('week');
                            }
                          }}
                          className={styles.miniDayButton}
                          data-outside={!isCurrentMonth}
                          data-today={isDayToday}
                          data-selected={isSelected}
                        >
                          {day.date()}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Unscheduled Board Cards section */}
              <div>
                <div className={styles.unscheduledTitleRow}>
                  <span>📌 Tarjetas de Boards sin fecha</span>
                  <span className={styles.unscheduledCountBadge}>
                    {unscheduledBoardCards.length}
                  </span>
                </div>
                <div className={styles.unscheduledSubtext}>
                  Arrastra una tarjeta a cualquier día del calendario o asígnale
                  fecha límite:
                </div>
              </div>

              {unscheduledBoardCards.length === 0 ? (
                <div className={styles.unscheduledEmptyBox}>
                  Todas las tarjetas activas de tus Boards tienen fecha asignada
                  o no hay tarjetas pendientes.
                </div>
              ) : (
                <div className={styles.unscheduledList}>
                  {unscheduledBoardCards.map(card => (
                    <div
                      key={`${card.boardId}-${card.id}`}
                      draggable
                      onDragStart={() =>
                        setDragItem({
                          type: 'board-card',
                          boardId: card.boardId,
                          cardId: card.id,
                        })
                      }
                      className={styles.unscheduledCard}
                    >
                      <div
                        onClick={() => handleOpenBoard(card.boardId)}
                        className={styles.unscheduledCardTitle}
                      >
                        {card.title}
                      </div>
                      <div className={styles.unscheduledCardMeta}>
                        <span>{card.boardTitle}</span>
                        <span>{card.columnTitle}</span>
                      </div>
                      <div className={styles.unscheduledDateRow}>
                        <input
                          type="date"
                          onChange={e => {
                            if (e.target.value) {
                              updateBoardCardDueDate(
                                card.boardId,
                                card.id,
                                e.target.value
                              );
                            }
                          }}
                          className={styles.unscheduledDateInput}
                        />
                        <button
                          onClick={() =>
                            updateBoardCardDueDate(
                              card.boardId,
                              card.id,
                              todayStr
                            )
                          }
                          className={styles.unscheduledTodayBtn}
                        >
                          Hoy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create / Edit Task Modal */}
        <Modal
          open={isTaskModalOpen}
          onOpenChange={setIsTaskModalOpen}
          width={560}
          contentOptions={{
            style: { padding: '24px', maxHeight: '88vh', overflowY: 'auto' },
          }}
        >
          <div className={styles.modalForm}>
            <h2 className={styles.modalHeaderTitle}>
              {editingTask
                ? 'Editar Tarea / Evento'
                : 'Nueva Tarea / Evento del Calendario'}
            </h2>

            {/* Title */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Título</label>
              <input
                type="text"
                placeholder="Ej: Entregar reporte semanal, Revisión de arquitectura..."
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                autoFocus
                className={styles.formInput}
              />
            </div>

            {/* Color Preset Palette */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Color de Evento</label>
              <div className={styles.colorSwatchesRow}>
                {COLOR_PRESETS.map(c => {
                  const isSelected = formColor === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormColor(c.id)}
                      title={c.label}
                      className={styles.colorSwatchBtn}
                      data-selected={isSelected}
                      style={{
                        background: c.id,
                        boxShadow: isSelected ? `0 0 10px ${c.id}` : 'none',
                      }}
                    >
                      {isSelected && (
                        <span style={{ fontSize: '11px', color: '#fff' }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & All-Day Toggle */}
            <div className={styles.formRow} style={{ alignItems: 'end' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Fecha</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.allDayCheckboxRow}>
                <input
                  type="checkbox"
                  id="allDayCheckbox"
                  checked={formIsAllDay}
                  onChange={e => setFormIsAllDay(e.target.checked)}
                  style={{ accentColor: '#3b82f6', cursor: 'pointer' }}
                />
                <label
                  htmlFor="allDayCheckbox"
                  className={styles.allDayCheckboxLabel}
                >
                  Todo el día
                </label>
              </div>
            </div>

            {/* Start & End Times (when not all-day) */}
            {!formIsAllDay && (
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Hora Inicio</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={e => setFormStartTime(e.target.value)}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Hora Fin</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={e => setFormEndTime(e.target.value)}
                    className={styles.formInput}
                  />
                </div>
              </div>
            )}

            {/* Priority & Category */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Prioridad</label>
                <select
                  value={formPriority}
                  onChange={e =>
                    setFormPriority(
                      e.target.value as CalendarTask['priority']
                    )
                  }
                  className={styles.formSelect}
                >
                  <option value="high">Alta (Urgente)</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Categoría</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  placeholder="General, Estudio, Proyecto..."
                  className={styles.formInput}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Notas adicionales</label>
              <textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Detalles, enlaces o criterios de entrega..."
                className={styles.formTextarea}
              />
            </div>

            <div className={styles.modalActionsRow}>
              {editingTask ? (
                <button
                  type="button"
                  onClick={() => handleDeleteTask(editingTask.id)}
                  className={styles.dangerActionButton}
                >
                  Eliminar
                </button>
              ) : (
                <div />
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className={styles.secondaryActionButton}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveTaskModal}
                  className={styles.primaryActionButton}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </Modal>
      </ViewBody>
    </>
  );
};
