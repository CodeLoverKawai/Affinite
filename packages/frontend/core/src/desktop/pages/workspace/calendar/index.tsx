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
import {
  calculateDragTimeRange,
  computeEventPosition,
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
    color: '#fca5a5',
    bg: 'rgba(239, 68, 68, 0.16)',
    border: 'rgba(239, 68, 68, 0.38)',
  },
  medium: {
    label: 'Media',
    color: '#fde047',
    bg: 'rgba(234, 179, 8, 0.16)',
    border: 'rgba(234, 179, 8, 0.38)',
  },
  low: {
    label: 'Baja',
    color: '#93c5fd',
    bg: 'rgba(59, 130, 246, 0.16)',
    border: 'rgba(59, 130, 246, 0.38)',
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
  const [modalOpen, setModalOpen] = useState(false);
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

  // Quick inline task input per day in Week view
  const [inlineDayInput, setInlineDayInput] = useState<Record<string, string>>(
    {}
  );

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
      setModalOpen(true);
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
    setModalOpen(true);
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
    setModalOpen(false);
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
      setModalOpen(false);
    },
    [saveTasksToYjs, tasks]
  );

  const handleAddInlineDayTask = useCallback(
    (dateStr: string) => {
      const text = (inlineDayInput[dateStr] || '').trim();
      if (!text) return;
      const created: CalendarTask = {
        id: `cal-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: text,
        date: dateStr,
        isAllDay: true,
        completed: false,
        priority: 'medium',
        color: '#3b82f6',
      };
      saveTasksToYjs([...tasks, created]);
      setInlineDayInput(prev => ({ ...prev, [dateStr]: '' }));
    },
    [inlineDayInput, saveTasksToYjs, tasks]
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
    let list = boardCards;
    if (
      selectedCategory !== 'Todas' &&
      selectedCategory.toLowerCase() !== 'trabajo'
    ) {
      list = [];
    }
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
        date: card.dueDate!,
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
      <ViewIcon icon="journal" />
      <ViewHeader>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0 20px',
            height: '56px',
            borderBottom:
              '1px solid var(--affine-border-color, rgba(255,255,255,0.08))',
            background: 'var(--affine-background-primary-color, #0f172a)',
            gap: '12px',
          }}
        >
          {/* Left: Title & Period Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '18px',
                fontWeight: 700,
                color: '#f8fafc',
              }}
            >
              <DateTimeIcon style={{ width: 20, height: 20, color: '#3b82f6' }} />
              <span>
                {viewMode === 'day'
                  ? cursorDate.format('dddd, DD [de] MMMM YYYY')
                  : viewMode === 'week'
                    ? `${currentWeekInfo.weekKey} · Sem ${currentWeekInfo.weekNumber}`
                    : currentMonthLabel}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(255,255,255,0.05)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <button
                onClick={handlePrevPeriod}
                style={navBtnStyle}
                title="Periodo anterior"
              >
                ◀
              </button>
              <button
                onClick={handleGoToday}
                style={{
                  ...navBtnStyle,
                  padding: '4px 10px',
                  fontWeight: 600,
                  color: '#e2e8f0',
                }}
              >
                Hoy
              </button>
              <button
                onClick={handleNextPeriod}
                style={navBtnStyle}
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
              style={{
                background: allJournalDates.has(currentWeekInfo.weekKey)
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(59, 130, 246, 0.14)',
                border: allJournalDates.has(currentWeekInfo.weekKey)
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid rgba(59, 130, 246, 0.35)',
                color: allJournalDates.has(currentWeekInfo.weekKey)
                  ? '#6ee7b7'
                  : '#93c5fd',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              data-testid="calendar-open-weekly-note-btn"
            >
              <JournalIcon style={{ width: 14, height: 14 }} />
              <span>
                Nota Semanal ({currentWeekInfo.weekKey})
              </span>
            </button>
          </div>

          {/* Center: 4 View Mode Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(15, 23, 42, 0.75)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
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
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                      : 'transparent',
                    color: active ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '7px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right: Search, Unscheduled Boards Toggle & New Task */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="text"
              placeholder="Filtrar tareas o boards..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: '#f8fafc',
                fontSize: '12px',
                width: '170px',
                outline: 'none',
              }}
            />
            <button
              onClick={() => setShowUnscheduledPanel(v => !v)}
              style={{
                background: showUnscheduledPanel
                  ? 'rgba(168, 85, 247, 0.18)'
                  : 'rgba(255,255,255,0.05)',
                border: showUnscheduledPanel
                  ? '1px solid rgba(168, 85, 247, 0.4)'
                  : '1px solid rgba(255,255,255,0.1)',
                color: showUnscheduledPanel ? '#d8b4fe' : '#cbd5e1',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Mostrar/ocultar panel lateral"
            >
              📌 Lateral ({unscheduledBoardCards.length})
            </button>
            <button
              onClick={() => openCreateTaskModal(todayStr)}
              data-testid="calendar-new-task-btn"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none',
                color: '#ffffff',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              <PlusIcon style={{ width: 14, height: 14 }} />
              <span>Nueva Tarea</span>
            </button>
          </div>
        </div>
      </ViewHeader>

      <ViewBody>
        <div
          style={{
            display: 'flex',
            height: '100%',
            width: '100%',
            background: 'linear-gradient(180deg, #0b1120 0%, #0f172a 100%)',
            color: '#f8fafc',
            overflow: 'hidden',
          }}
        >
          {/* Main Calendar Viewport */}
          <div
            style={{
              flex: 1,
              height: '100%',
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Quick KPI & Filter Control Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '10px 16px',
              }}
            >
              {/* Category Pills */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    fontWeight: 600,
                    marginRight: 4,
                  }}
                >
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
                      style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: active
                          ? '1px solid #3b82f6'
                          : '1px solid rgba(255,255,255,0.08)',
                        background: active
                          ? 'rgba(59, 130, 246, 0.25)'
                          : 'rgba(255,255,255,0.04)',
                        color: active ? '#93c5fd' : '#cbd5e1',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Source Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    fontWeight: 600,
                    marginRight: 4,
                  }}
                >
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
                      style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: active
                          ? '1px solid #10b981'
                          : '1px solid rgba(255,255,255,0.08)',
                        background: active
                          ? 'rgba(16, 185, 129, 0.25)'
                          : 'rgba(255,255,255,0.04)',
                        color: active ? '#6ee7b7' : '#cbd5e1',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ==================== MODE 1: MONTHLY GRID VIEW ==================== */}
            {viewMode === 'month' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Header Row: Nota Semanal + 7 Weekdays */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '125px repeat(7, minmax(0, 1fr))',
                    background: 'rgba(30, 41, 59, 0.7)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#93c5fd',
                      textTransform: 'uppercase',
                      borderRight: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    🗓️ Semanal
                  </div>
                  {WEEKDAY_HEADERS.map(dayName => (
                    <div
                      key={dayName}
                      style={{
                        padding: '10px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        borderRight: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Week Rows */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}
                >
                  {monthWeeks.map(row => {
                    const hasWeeklyJournal = allJournalDates.has(row.weekKey);
                    const isCurrentWeek =
                      row.weekKey === formatWeeklyJournalKey(dayjs());

                    return (
                      <div
                        key={row.weekKey}
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            '125px repeat(7, minmax(0, 1fr))',
                          flex: 1,
                          minHeight: '128px',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        {/* Left Column: Nota Semanal (Wxx) */}
                        <div
                          onClick={() => handleOpenWeeklyJournal(row.weekKey)}
                          title={`Abrir o crear Nota Semanal ${row.weekKey}`}
                          style={{
                            padding: '10px',
                            borderRight: '1px solid rgba(255,255,255,0.08)',
                            background: isCurrentWeek
                              ? 'rgba(37, 99, 235, 0.12)'
                              : 'rgba(15, 23, 42, 0.45)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'background 0.15s',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                color: isCurrentWeek ? '#60a5fa' : '#e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span>W{String(row.weekNumber).padStart(2, '0')}</span>
                              {hasWeeklyJournal && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    color: '#6ee7b7',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                  }}
                                >
                                  Activa
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: '10px',
                                color: '#64748b',
                                marginTop: '2px',
                              }}
                            >
                              {row.days[0].format('DD MMM')} –{' '}
                              {row.days[6].format('DD MMM')}
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: hasWeeklyJournal ? '#6ee7b7' : '#93c5fd',
                              background: hasWeeklyJournal
                                ? 'rgba(16, 185, 129, 0.12)'
                                : 'rgba(59, 130, 246, 0.12)',
                              border: hasWeeklyJournal
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : '1px solid rgba(59, 130, 246, 0.25)',
                              borderRadius: '6px',
                              padding: '5px 6px',
                              textAlign: 'center',
                            }}
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
                              style={{
                                padding: '8px',
                                borderRight: '1px solid rgba(255,255,255,0.05)',
                                background: isToday
                                  ? 'rgba(37, 99, 235, 0.1)'
                                  : isCurrentMonth
                                    ? 'transparent'
                                    : 'rgba(2, 6, 23, 0.45)',
                                opacity: isCurrentMonth ? 1 : 0.55,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                minWidth: 0,
                              }}
                            >
                              {/* Top bar of day cell */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: isToday ? 800 : 600,
                                    color: isToday ? '#ffffff' : '#cbd5e1',
                                    background: isToday
                                      ? '#2563eb'
                                      : 'transparent',
                                    padding: isToday ? '2px 7px' : '0',
                                    borderRadius: '999px',
                                  }}
                                >
                                  {day.date()}
                                </span>

                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      handleOpenDailyJournal(dateStr)
                                    }
                                    title={
                                      hasDailyJournal
                                        ? `Abrir Nota Diaria (${dateStr})`
                                        : `Crear Nota Diaria (${dateStr})`
                                    }
                                    style={{
                                      background: hasDailyJournal
                                        ? 'rgba(16, 185, 129, 0.2)'
                                        : 'rgba(255,255,255,0.05)',
                                      border: hasDailyJournal
                                        ? '1px solid rgba(16, 185, 129, 0.45)'
                                        : '1px solid rgba(255,255,255,0.08)',
                                      color: hasDailyJournal
                                        ? '#6ee7b7'
                                        : '#94a3b8',
                                      borderRadius: '5px',
                                      padding: '2px 5px',
                                      fontSize: '10px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    📖
                                  </button>
                                  <button
                                    onClick={() => openCreateTaskModal(dateStr)}
                                    title={`Añadir tarea el ${dateStr}`}
                                    style={{
                                      background: 'rgba(255,255,255,0.05)',
                                      border:
                                        '1px solid rgba(255,255,255,0.08)',
                                      color: '#94a3b8',
                                      borderRadius: '5px',
                                      padding: '2px 6px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Items list inside day cell */}
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                  overflowY: 'auto',
                                  maxHeight: '115px',
                                }}
                              >
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
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '4px 6px',
                                        borderRadius: '6px',
                                        background: task.completed
                                          ? 'rgba(255,255,255,0.03)'
                                          : `${color}25`,
                                        border: `1px solid ${
                                          task.completed
                                            ? 'rgba(255,255,255,0.07)'
                                            : `${color}80`
                                        }`,
                                        borderLeft: `3px solid ${color}`,
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        opacity: task.completed ? 0.55 : 1,
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
                                        style={{
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          textDecoration: task.completed
                                            ? 'line-through'
                                            : 'none',
                                          color: '#f1f5f9',
                                          flex: 1,
                                        }}
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
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '4px 6px',
                                      borderRadius: '6px',
                                      background: card.isDoneColumn
                                        ? 'rgba(16, 185, 129, 0.1)'
                                        : 'rgba(168, 85, 247, 0.16)',
                                      border: card.isDoneColumn
                                        ? '1px solid rgba(16, 185, 129, 0.3)'
                                        : '1px solid rgba(168, 85, 247, 0.38)',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      opacity: card.isDoneColumn ? 0.6 : 1,
                                    }}
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
                                    <span
                                      style={{
                                        fontSize: '9px',
                                        fontWeight: 700,
                                        color: '#d8b4fe',
                                        flexShrink: 0,
                                      }}
                                    >
                                      [Board]
                                    </span>
                                    <span
                                      style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        textDecoration: card.isDoneColumn
                                          ? 'line-through'
                                          : 'none',
                                        color: '#f3e8ff',
                                        flex: 1,
                                      }}
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
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  flex: 1,
                  minHeight: '700px',
                }}
              >
                {/* Weekly Note Banner */}
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(30, 58, 138, 0.45), rgba(15, 23, 42, 0.85))',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        background: '#2563eb',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      {currentWeekInfo.weekKey}
                    </span>
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#f8fafc',
                      }}
                    >
                      Semana {currentWeekInfo.weekNumber} ({currentWeekInfo.start.format('DD MMM')} –{' '}
                      {currentWeekInfo.end.format('DD MMM YYYY')})
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      handleOpenWeeklyJournal(currentWeekInfo.weekKey)
                    }
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    {allJournalDates.has(currentWeekInfo.weekKey)
                      ? `🗓️ Abrir Nota Semanal`
                      : `✨ Crear Nota Semanal`}
                  </button>
                </div>

                {/* Google Calendar Time-Blocking Grid */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    flex: 1,
                  }}
                >
                  {/* Top Column Headers (Day names and dates) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))',
                      background: 'rgba(30, 41, 59, 0.8)',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 20,
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#94a3b8',
                        textAlign: 'center',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      GMT
                    </div>
                    {currentWeekInfo.days.map((day, idx) => {
                      const dateStr = day.format(JOURNAL_DATE_FORMAT);
                      const isToday = dateStr === todayStr;
                      const hasDailyJournal = allJournalDates.has(dateStr);

                      return (
                        <div
                          key={dateStr}
                          style={{
                            padding: '8px 6px',
                            textAlign: 'center',
                            borderRight: '1px solid rgba(255,255,255,0.06)',
                            background: isToday
                              ? 'rgba(37, 99, 235, 0.15)'
                              : 'transparent',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: isToday ? '#60a5fa' : '#94a3b8',
                              textTransform: 'uppercase',
                            }}
                          >
                            {WEEKDAY_HEADERS[idx].slice(0, 3)}
                          </div>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: isToday ? '#2563eb' : 'transparent',
                              color: '#ffffff',
                              fontSize: '14px',
                              fontWeight: 800,
                              marginTop: '2px',
                            }}
                          >
                            {day.date()}
                          </div>
                          <div>
                            <button
                              onClick={() => handleOpenDailyJournal(dateStr)}
                              title={hasDailyJournal ? 'Abrir Nota Diaria' : 'Crear Nota Diaria'}
                              style={{
                                background: hasDailyJournal
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(255,255,255,0.05)',
                                border: hasDailyJournal
                                  ? '1px solid rgba(16, 185, 129, 0.4)'
                                  : '1px solid rgba(255,255,255,0.08)',
                                color: hasDailyJournal ? '#6ee7b7' : '#94a3b8',
                                borderRadius: '4px',
                                padding: '1px 5px',
                                fontSize: '9px',
                                cursor: 'pointer',
                                marginTop: '2px',
                              }}
                            >
                              📖 {hasDailyJournal ? 'Diario' : '+ Diario'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* All-Day Events Strip */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))',
                      background: 'rgba(15, 23, 42, 0.9)',
                      borderBottom: '2px solid rgba(255,255,255,0.12)',
                      minHeight: '44px',
                    }}
                  >
                    <div
                      style={{
                        padding: '6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
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
                          style={{
                            padding: '4px',
                            borderRight: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                          }}
                        >
                          {allDayTasks.map(t => {
                            const color = t.color || '#3b82f6';
                            return (
                              <div
                                key={t.id}
                                onClick={() => openEditTaskModal(t)}
                                style={{
                                  background: t.completed ? 'rgba(255,255,255,0.04)' : `${color}30`,
                                  border: `1px solid ${t.completed ? 'rgba(255,255,255,0.08)' : `${color}80`}`,
                                  borderLeft: `3px solid ${color}`,
                                  borderRadius: '4px',
                                  padding: '2px 5px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: '#f8fafc',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  textDecoration: t.completed ? 'line-through' : 'none',
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
                              style={{
                                background: c.isDoneColumn
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(168, 85, 247, 0.25)',
                                border: '1px solid rgba(168, 85, 247, 0.4)',
                                borderRadius: '4px',
                                padding: '2px 5px',
                                fontSize: '10px',
                                fontWeight: 600,
                                color: '#f3e8ff',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
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
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))',
                      position: 'relative',
                      overflowY: 'auto',
                      height: `${HOURS_ARRAY.length * PIXELS_PER_HOUR}px`,
                    }}
                  >
                    {/* Time Column (06:00 to 23:00) */}
                    <div
                      style={{
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(15, 23, 42, 0.5)',
                      }}
                    >
                      {HOURS_ARRAY.map(hour => (
                        <div
                          key={hour}
                          style={{
                            height: `${PIXELS_PER_HOUR}px`,
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            padding: '4px 6px',
                            fontSize: '10px',
                            fontWeight: 600,
                            color: '#94a3b8',
                            textAlign: 'right',
                            boxSizing: 'border-box',
                          }}
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
                          style={{
                            position: 'relative',
                            borderRight: '1px solid rgba(255,255,255,0.06)',
                            background: isToday
                              ? 'rgba(37, 99, 235, 0.05)'
                              : 'transparent',
                            userSelect: 'none',
                          }}
                        >
                          {/* Hour lines */}
                          {HOURS_ARRAY.map(hour => (
                            <div
                              key={hour}
                              style={{
                                height: `${PIXELS_PER_HOUR}px`,
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                boxSizing: 'border-box',
                              }}
                            />
                          ))}

                          {/* Red Current Time Bar if Today */}
                          {isToday && nowTop !== null && (
                            <div
                              style={{
                                position: 'absolute',
                                top: `${nowTop}px`,
                                left: 0,
                                right: 0,
                                height: '2px',
                                background: '#ef4444',
                                zIndex: 10,
                                pointerEvents: 'none',
                                boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)',
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '-4px',
                                  top: '-4px',
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: '#ef4444',
                                }}
                              />
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
                                onClick={e => {
                                  e.stopPropagation();
                                  openEditTaskModal(t);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: `${pos.top}px`,
                                  height: `${pos.height}px`,
                                  left: '3px',
                                  right: '3px',
                                  background: t.completed
                                    ? 'rgba(255,255,255,0.05)'
                                    : `${color}25`,
                                  border: `1px solid ${
                                    t.completed ? 'rgba(255,255,255,0.1)' : `${color}80`
                                  }`,
                                  borderLeft: `4px solid ${color}`,
                                  borderRadius: '6px',
                                  padding: '4px 6px',
                                  overflow: 'hidden',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  zIndex: 2,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                                  opacity: t.completed ? 0.6 : 1,
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
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
                                      margin: 0,
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: '#f8fafc',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      textDecoration: t.completed
                                        ? 'line-through'
                                        : 'none',
                                    }}
                                  >
                                    {t.title}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: '10px',
                                    color: '#cbd5e1',
                                    opacity: 0.85,
                                  }}
                                >
                                  🕒 {timeLabel}
                                </div>
                              </div>
                            );
                          })}

                          {/* Drag-to-Create Ghost Timeblock */}
                          {timeblockDrag && timeblockDrag.date === dateStr && (
                            <div
                              style={{
                                position: 'absolute',
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
                                left: '3px',
                                right: '3px',
                                background: 'rgba(59, 130, 246, 0.35)',
                                border: '2px dashed #60a5fa',
                                borderRadius: '6px',
                                pointerEvents: 'none',
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: 700,
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
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px',
                  padding: '16px',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Day Header Banner */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: cursorDate.isSame(dayjs(), 'day')
                      ? 'rgba(37, 99, 235, 0.15)'
                      : 'rgba(30, 41, 59, 0.5)',
                    border: cursorDate.isSame(dayjs(), 'day')
                      ? '1px solid rgba(59, 130, 246, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '24px' }}>🕒</span>
                    <div>
                      <div
                        style={{
                          fontSize: '17px',
                          fontWeight: 800,
                          color: '#f8fafc',
                        }}
                      >
                        {cursorDate.format('dddd, DD [de] MMMM YYYY')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
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
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: allJournalDates.has(
                          cursorDate.format(JOURNAL_DATE_FORMAT)
                        )
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(59, 130, 246, 0.2)',
                        border: allJournalDates.has(
                          cursorDate.format(JOURNAL_DATE_FORMAT)
                        )
                          ? '1px solid rgba(16, 185, 129, 0.5)'
                          : '1px solid rgba(59, 130, 246, 0.5)',
                        color: allJournalDates.has(
                          cursorDate.format(JOURNAL_DATE_FORMAT)
                        )
                          ? '#6ee7b7'
                          : '#93c5fd',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
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
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <PlusIcon style={{ width: 14, height: 14 }} />
                      <span>Nueva Tarea en este día</span>
                    </button>
                  </div>
                </div>

                {/* Day Vertical Grid with Drag-to-Create */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 1fr',
                    position: 'relative',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Hours column */}
                  <div
                    style={{
                      borderRight: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(15, 23, 42, 0.5)',
                    }}
                  >
                    {HOURS_ARRAY.map(hour => (
                      <div
                        key={hour}
                        style={{
                          height: `${PIXELS_PER_HOUR}px`,
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          padding: '6px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#94a3b8',
                          textAlign: 'right',
                          boxSizing: 'border-box',
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
                        style={{
                          position: 'relative',
                          background: isToday
                            ? 'rgba(37, 99, 235, 0.03)'
                            : 'transparent',
                          userSelect: 'none',
                        }}
                      >
                        {HOURS_ARRAY.map(hour => (
                          <div
                            key={hour}
                            style={{
                              height: `${PIXELS_PER_HOUR}px`,
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              boxSizing: 'border-box',
                            }}
                          />
                        ))}

                        {/* Red Line if today */}
                        {isToday && nowTop !== null && (
                          <div
                            style={{
                              position: 'absolute',
                              top: `${nowTop}px`,
                              left: 0,
                              right: 0,
                              height: '2px',
                              background: '#ef4444',
                              zIndex: 10,
                              pointerEvents: 'none',
                              boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)',
                            }}
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
                              onClick={e => {
                                e.stopPropagation();
                                openEditTaskModal(t);
                              }}
                              style={{
                                position: 'absolute',
                                top: `${pos.top}px`,
                                height: `${pos.height}px`,
                                left: '10px',
                                right: '10px',
                                background: t.completed
                                  ? 'rgba(255,255,255,0.04)'
                                  : `${color}25`,
                                border: `1px solid ${
                                  t.completed ? 'rgba(255,255,255,0.08)' : `${color}80`
                                }`,
                                borderLeft: `5px solid ${color}`,
                                borderRadius: '8px',
                                padding: '6px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                zIndex: 2,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                opacity: t.completed ? 0.6 : 1,
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
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      color: '#f8fafc',
                                      textDecoration: t.completed
                                        ? 'line-through'
                                        : 'none',
                                    }}
                                  >
                                    {t.title}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: '#cbd5e1',
                                      marginTop: '2px',
                                    }}
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
                            style={{
                              position: 'absolute',
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
                              background: 'rgba(59, 130, 246, 0.35)',
                              border: '2px dashed #60a5fa',
                              borderRadius: '8px',
                              pointerEvents: 'none',
                              zIndex: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 700,
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
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                }}
              >
                {/* KPI Summary Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '14px',
                  }}
                >
                  <div style={kpiCardStyle}>
                    <span style={kpiLabelStyle}>
                      Total Tareas & Entregas ({currentMonthLabel})
                    </span>
                    <span style={{ ...kpiValueStyle, color: '#60a5fa' }}>
                      {monthStatsAndGroups.totalCount}
                    </span>
                  </div>
                  <div style={kpiCardStyle}>
                    <span style={kpiLabelStyle}>Pendientes del Mes</span>
                    <span style={{ ...kpiValueStyle, color: '#fde047' }}>
                      {monthStatsAndGroups.pendingCount}
                    </span>
                  </div>
                  <div style={kpiCardStyle}>
                    <span style={kpiLabelStyle}>Completadas</span>
                    <span style={{ ...kpiValueStyle, color: '#34d399' }}>
                      {monthStatsAndGroups.completedCount}
                    </span>
                  </div>
                  <div style={kpiCardStyle}>
                    <span style={kpiLabelStyle}>
                      Notas Diarias & Semanales Creadas
                    </span>
                    <span style={{ ...kpiValueStyle, color: '#c084fc' }}>
                      {monthStatsAndGroups.journalsCreatedCount}
                    </span>
                  </div>
                </div>

                {/* Agenda Sections */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '16px',
                  }}
                >
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
                      style={{
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderTop: `3px solid ${group.accent}`,
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#f8fafc',
                          }}
                        >
                          {group.title}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            background: 'rgba(255,255,255,0.08)',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            color: '#cbd5e1',
                          }}
                        >
                          {group.items.length}
                        </span>
                      </div>

                      {group.items.length === 0 ? (
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#64748b',
                            padding: '12px 0',
                          }}
                        >
                          Sin elementos en esta sección.
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          {group.items.map(item => {
                            if (item.kind === 'task') {
                              const t = item.task;
                              const pMeta = PRIORITY_META[t.priority];
                              return (
                                <div
                                  key={t.id}
                                  onClick={() => openEditTaskModal(t)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    background: 'rgba(30, 41, 59, 0.55)',
                                    border:
                                      '1px solid rgba(255,255,255,0.07)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                    }}
                                  >
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
                                        style={{
                                          fontSize: '13px',
                                          fontWeight: 600,
                                          color: '#f8fafc',
                                          textDecoration: t.completed
                                            ? 'line-through'
                                            : 'none',
                                        }}
                                      >
                                        {t.title}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: '11px',
                                          color: '#94a3b8',
                                        }}
                                      >
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
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px',
                                  borderRadius: '8px',
                                  background: 'rgba(88, 28, 135, 0.22)',
                                  border:
                                    '1px solid rgba(168, 85, 247, 0.35)',
                                  cursor: 'pointer',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
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
                                      style={{
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: '#f3e8ff',
                                        textDecoration: c.isDoneColumn
                                          ? 'line-through'
                                          : 'none',
                                      }}
                                    >
                                      {c.title}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '11px',
                                        color: '#d8b4fe',
                                      }}
                                    >
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
                                    color: '#e9d5ff',
                                    background: 'rgba(168, 85, 247, 0.25)',
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
            <div
              style={{
                width: '290px',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(15, 23, 42, 0.85)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                overflowY: 'auto',
              }}
            >
              {/* Mini Calendar Monthly Navigator */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.65)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#f8fafc',
                    }}
                  >
                    {MONTH_NAMES_ES[miniCalMonth.month()]} {miniCalMonth.year()}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => setMiniCalMonth(m => m.subtract(1, 'month'))}
                      style={navBtnStyle}
                      title="Mes anterior"
                    >
                      ◀
                    </button>
                    <button
                      onClick={() => setMiniCalMonth(dayjs())}
                      style={{ ...navBtnStyle, fontSize: '10px', fontWeight: 600 }}
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() => setMiniCalMonth(m => m.add(1, 'month'))}
                      style={navBtnStyle}
                      title="Mes siguiente"
                    >
                      ▶
                    </button>
                  </div>
                </div>

                {/* 7-day mini headers */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    textAlign: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#94a3b8',
                  }}
                >
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>

                {/* Mini day cells */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '2px',
                  }}
                >
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
                          style={{
                            background: isSelected
                              ? '#2563eb'
                              : isDayToday
                                ? 'rgba(59, 130, 246, 0.25)'
                                : 'transparent',
                            border: isDayToday ? '1px solid #3b82f6' : 'none',
                            color: isSelected
                              ? '#ffffff'
                              : isCurrentMonth
                                ? '#e2e8f0'
                                : '#64748b',
                            borderRadius: '50%',
                            width: '26px',
                            height: '26px',
                            fontSize: '11px',
                            fontWeight: isSelected || isDayToday ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: 'auto',
                          }}
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
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>📌 Tarjetas de Boards sin fecha</span>
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(168, 85, 247, 0.2)',
                      color: '#d8b4fe',
                      padding: '2px 7px',
                      borderRadius: '999px',
                    }}
                  >
                    {unscheduledBoardCards.length}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    marginTop: '4px',
                  }}
                >
                  Arrastra una tarjeta a cualquier día del calendario o asígnale
                  fecha límite:
                </div>
              </div>

              {unscheduledBoardCards.length === 0 ? (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    padding: '20px 10px',
                    textAlign: 'center',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                  }}
                >
                  Todas las tarjetas activas de tus Boards tienen fecha asignada
                  o no hay tarjetas pendientes.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
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
                      style={{
                        background: 'rgba(30, 41, 59, 0.7)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: '10px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        cursor: 'grab',
                      }}
                    >
                      <div
                        onClick={() => handleOpenBoard(card.boardId)}
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#f8fafc',
                          cursor: 'pointer',
                        }}
                      >
                        {card.title}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#c084fc',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{card.boardTitle}</span>
                        <span>{card.columnTitle}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
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
                          style={{
                            flex: 1,
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '6px',
                            color: '#e2e8f0',
                            padding: '4px 6px',
                            fontSize: '11px',
                            colorScheme: 'dark',
                          }}
                        />
                        <button
                          onClick={() =>
                            updateBoardCardDueDate(
                              card.boardId,
                              card.id,
                              todayStr
                            )
                          }
                          style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            color: '#93c5fd',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
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

        {/* Create / Edit Task Modal (Google Calendar Style) */}
        {modalOpen && (
          <div
            onClick={() => setModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2, 6, 23, 0.72)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '460px',
                maxWidth: '92vw',
                background: '#0f172a',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '14px',
                padding: '22px',
                color: '#f8fafc',
                boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: 700 }}>
                  {editingTask
                    ? 'Editar Tarea / Evento'
                    : 'Nueva Tarea / Evento del Calendario'}
                </span>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '18px',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>

              {/* Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={modalLabelStyle}>Título</label>
                <input
                  type="text"
                  placeholder="Ej: Entregar reporte semanal, Revisión de arquitectura..."
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  autoFocus
                  style={modalInputStyle}
                />
              </div>

              {/* Color Preset Palette */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={modalLabelStyle}>Color de Evento</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {COLOR_PRESETS.map(c => {
                    const isSelected = formColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFormColor(c.id)}
                        title={c.label}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: c.id,
                          border: isSelected
                            ? '2px solid #ffffff'
                            : '2px solid transparent',
                          boxShadow: isSelected
                            ? `0 0 10px ${c.id}`
                            : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  alignItems: 'end',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={modalLabelStyle}>Fecha</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    style={{ ...modalInputStyle, colorScheme: 'dark' }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  <input
                    type="checkbox"
                    id="allDayCheckbox"
                    checked={formIsAllDay}
                    onChange={e => setFormIsAllDay(e.target.checked)}
                    style={{ accentColor: '#3b82f6', cursor: 'pointer' }}
                  />
                  <label
                    htmlFor="allDayCheckbox"
                    style={{
                      fontSize: '13px',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Todo el día
                  </label>
                </div>
              </div>

              {/* Start & End Times (when not all-day) */}
              {!formIsAllDay && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={modalLabelStyle}>Hora Inicio</label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={e => setFormStartTime(e.target.value)}
                      style={{ ...modalInputStyle, colorScheme: 'dark' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={modalLabelStyle}>Hora Fin</label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={e => setFormEndTime(e.target.value)}
                      style={{ ...modalInputStyle, colorScheme: 'dark' }}
                    />
                  </div>
                </div>
              )}

              {/* Priority & Category */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  <label style={modalLabelStyle}>Prioridad</label>
                  <select
                    value={formPriority}
                    onChange={e =>
                      setFormPriority(
                        e.target.value as CalendarTask['priority']
                      )
                    }
                    style={modalInputStyle}
                  >
                    <option value="high">Alta (Urgente)</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  <label style={modalLabelStyle}>Categoría</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    placeholder="General, Estudio, Proyecto..."
                    style={modalInputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={modalLabelStyle}>Notas adicionales</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Detalles, enlaces o criterios de entrega..."
                  style={{
                    ...modalInputStyle,
                    minHeight: '64px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '6px',
                }}
              >
                {editingTask ? (
                  <button
                    onClick={() => handleDeleteTask(editingTask.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.16)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#fca5a5',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Eliminar
                  </button>
                ) : (
                  <div />
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setModalOpen(false)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#cbd5e1',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveTaskModal}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </ViewBody>
    </>
  );
};

const navBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#94a3b8',
  padding: '4px 8px',
  borderRadius: '6px',
  fontSize: '12px',
  cursor: 'pointer',
};

const kpiCardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.7)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const kpiLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase',
};

const kpiValueStyle: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: 800,
};

const modalLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase',
};

const modalInputStyle: React.CSSProperties = {
  background: 'rgba(30, 41, 59, 0.75)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '8px',
  padding: '8px 10px',
  color: '#f8fafc',
  fontSize: '13px',
  outline: 'none',
};
