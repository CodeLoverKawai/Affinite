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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { playStreakCompletionSound } from '../streaks/streaks-sound';
import * as styles from './calendar.css';
import {
  unwrapGoogleResult,
  unwrapIcsResult,
} from './calendar-bridge';
import {
  buildGoogleCalendarTemplateUrl,
  exportEventsToIcs,
  mapCalendarTaskToGoogleApiEvent,
  mapGoogleApiEventToCalendarTask,
  parseIcsToEvents,
} from './calendar-ics-engine';
import {
  excludeRecurringOccurrence,
  expandEventsForRange,
  formatRecurrenceSummary,
} from './calendar-recurrence-engine';
import {
  calculateDragTimeRange,
  computeEventPosition,
  computeMovedEventTimes,
  computeOverlappingEventsLayout,
  computeResizedEndTime,
  filterBoardCardsByCategory,
  formatEventTimeRange,
  isEventAllDay,
} from './calendar-timeblock-helpers';
import {
  type BoardCardCalendarItem,
  type CalendarLayer,
  type CalendarTask,
  type CalendarViewMode,
  DEFAULT_CALENDAR_LAYERS,
  type ExpandedCalendarEvent,
  type GoogleCalendarConfig,
  type RecurrenceFrequency,
} from './calendar-types';

export type {
  BoardCardCalendarItem,
  CalendarLayer,
  CalendarTask,
  CalendarViewMode,
  ExpandedCalendarEvent,
  GoogleCalendarConfig,
  RecurrenceFrequency,
};

dayjs.extend(isLeapYear);
dayjs.extend(isoWeek);
dayjs.extend(isoWeeksInYear);

interface AffiniteCalendarBridge {
  fetchIcsFeed?: (url: string) => Promise<unknown>;
  googleApiRequest?: (params: {
    method: string;
    endpoint: string;
    accessToken: string;
    body?: Record<string, unknown>;
  }) => Promise<unknown>;
}

function getCalendarBridge(): AffiniteCalendarBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window as unknown as {
      __apis?: { calendar?: AffiniteCalendarBridge };
    }
  ).__apis?.calendar;
}

interface RawBoardCard {
  id: string;
  columnId: string;
  title?: string;
  description?: string;
  dueDate?: string;
  category?: string;
  labels?: string[];
}

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

const GRID_START_HOUR = 0;
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

function triggerIcsDownload(icsContent: string, filename: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
  const [calendarLayers, setCalendarLayers] = useState<CalendarLayer[]>(
    () => DEFAULT_CALENDAR_LAYERS
  );
  const [googleConfig, setGoogleConfig] = useState<GoogleCalendarConfig>({
    calendarId: 'primary',
  });
  const [boardCards, setBoardCards] = useState<BoardCardCalendarItem[]>([]);
  const [showUnscheduledPanel, setShowUnscheduledPanel] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedSource, setSelectedSource] = useState<
    'all' | 'tasks' | 'boards'
  >('all');

  // Refs for auto-scrolling 24h grid to 08:00 and focusing search input
  const weekGridScrollRef = useRef<HTMLDivElement | null>(null);
  const dayGridScrollRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const firedRemindersRef = useRef<Set<string>>(new Set());

  // Mini Calendar Navigator state
  const [miniCalMonth, setMiniCalMonth] = useState<dayjs.Dayjs>(() => dayjs());

  // Vertical Drag-to-Create Timeblock State
  const [timeblockDrag, setTimeblockDrag] = useState<{
    date: string;
    startY: number;
    currentY: number;
  } | null>(null);

  // Bottom 15-min Resize State for Timed Events
  const [resizingEvent, setResizingEvent] = useState<{
    taskId: string;
    instanceDate: string;
    startTime: string;
    columnTop: number;
    currentBottomY: number;
  } | null>(null);

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CalendarTask | null>(null);
  const [editingOccurrenceDate, setEditingOccurrenceDate] = useState<
    string | null
  >(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCalendarId, setFormCalendarId] = useState('cal-personal');
  const [formDate, setFormDate] = useState(() =>
    dayjs().format(JOURNAL_DATE_FORMAT)
  );
  const [formEndDate, setFormEndDate] = useState('');
  const [formIsAllDay, setFormIsAllDay] = useState(false);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formColor, setFormColor] = useState('#3b82f6');
  const [formPriority, setFormPriority] =
    useState<CalendarTask['priority']>('medium');
  const [formCategory, setFormCategory] = useState('General');
  const [formNotes, setFormNotes] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formMeetingUrl, setFormMeetingUrl] = useState('');
  const [formReminderMinutes, setFormReminderMinutes] = useState<string>('');
  const [formRecurrenceFreq, setFormRecurrenceFreq] =
    useState<RecurrenceFrequency>('none');
  const [formRecurrenceUntil, setFormRecurrenceUntil] = useState('');
  const [formLinkedDocId, setFormLinkedDocId] = useState<string | undefined>(
    undefined
  );

  // Google Calendar & .ics Sync Modal State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncTab, setSyncTab] = useState<'ics-url' | 'google-api' | 'ics-file'>(
    'ics-url'
  );
  const [syncIcsName, setSyncIcsName] = useState('Google Calendar');
  const [syncIcsColor, setSyncIcsColor] = useState('#3b82f6');
  const [syncIcsUrl, setSyncIcsUrl] = useState('');
  const [importTargetCalId, setImportTargetCalId] = useState('cal-personal');
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Drag payload state (for cards / tasks dragged across dates or time slots)
  const [dragItem, setDragItem] = useState<
    | {
        type: 'task';
        id: string;
        instanceDate?: string;
        isRecurringInstance?: boolean;
      }
    | { type: 'board-card'; boardId: string; cardId: string }
    | null
  >(null);

  // Sync cursor month to mini calendar
  useEffect(() => {
    setMiniCalMonth(cursorDate);
  }, [cursorDate]);

  // Auto-scroll 24h vertical grid to 08:00 when mounting or switching to week/workweek/day
  useEffect(() => {
    const targetScrollTop = 8 * PIXELS_PER_HOUR;
    if (viewMode === 'week' || viewMode === 'workweek') {
      if (weekGridScrollRef.current) {
        weekGridScrollRef.current.scrollTop = targetScrollTop;
      }
    } else if (viewMode === 'day') {
      if (dayGridScrollRef.current) {
        dayGridScrollRef.current.scrollTop = targetScrollTop;
      }
    }
  }, [viewMode]);

  // 1. Sync Native Calendar Tasks, Calendar Layers, and Google Config from root workspace Yjs map
  useEffect(() => {
    const rootYDoc = workspaceService.workspace.rootYDoc;
    const yMap = rootYDoc.getMap('affinite_calendar_v1');

    const syncFromYjs = () => {
      const rawTasks = yMap.get('tasks') as string | undefined;
      if (!rawTasks) {
        setTasks([]);
      } else {
        try {
          const parsed = JSON.parse(rawTasks);
          if (Array.isArray(parsed)) {
            setTasks(parsed);
          }
        } catch {
          setTasks([]);
        }
      }

      const rawCals = yMap.get('calendars') as string | undefined;
      if (rawCals) {
        try {
          const parsedCals = JSON.parse(rawCals);
          if (Array.isArray(parsedCals) && parsedCals.length > 0) {
            setCalendarLayers(parsedCals);
          }
        } catch {
          setCalendarLayers(DEFAULT_CALENDAR_LAYERS);
        }
      } else {
        setCalendarLayers(DEFAULT_CALENDAR_LAYERS);
      }

      const rawGConfig = yMap.get('google_config') as string | undefined;
      if (rawGConfig) {
        try {
          const parsedGConfig = JSON.parse(rawGConfig);
          if (parsedGConfig && typeof parsedGConfig === 'object') {
            setGoogleConfig(parsedGConfig);
          }
        } catch {
          // ignore
        }
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

  const saveCalendarsToYjs = useCallback(
    (nextLayers: CalendarLayer[]) => {
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_calendar_v1');
      rootYDoc.transact(() => {
        yMap.set('calendars', JSON.stringify(nextLayers));
      });
      setCalendarLayers(nextLayers);
    },
    [workspaceService]
  );

  const saveGoogleConfigToYjs = useCallback(
    (nextConfig: GoogleCalendarConfig) => {
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_calendar_v1');
      rootYDoc.transact(() => {
        yMap.set('google_config', JSON.stringify(nextConfig));
      });
      setGoogleConfig(nextConfig);
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
            const cards: RawBoardCard[] = cardsRaw ? JSON.parse(cardsRaw) : [];
            const colMap = new Map(columns.map(c => [c.id, c.title]));
            const boardTitle = boardDoc.title$.value || 'Untitled Board';

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
          const cards: RawBoardCard[] = cardsRaw ? JSON.parse(cardsRaw) : [];
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
          const cards: RawBoardCard[] = cardsRaw ? JSON.parse(cardsRaw) : [];
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
    (
      defaultDate?: string,
      defaultStartTime?: string,
      defaultEndTime?: string
    ) => {
      setEditingTask(null);
      setEditingOccurrenceDate(null);
      setFormTitle('');
      const defaultLayer =
        calendarLayers.find(l => l.visible) ||
        calendarLayers[0] ||
        DEFAULT_CALENDAR_LAYERS[0];
      setFormCalendarId(defaultLayer?.id || 'cal-personal');
      setFormDate(defaultDate || dayjs().format(JOURNAL_DATE_FORMAT));
      setFormEndDate('');
      if (defaultStartTime) {
        setFormIsAllDay(false);
        setFormStartTime(defaultStartTime);
        setFormEndTime(defaultEndTime || '10:00');
      } else {
        setFormIsAllDay(true);
        setFormStartTime('09:00');
        setFormEndTime('10:00');
      }
      setFormColor(defaultLayer?.color || '#3b82f6');
      setFormPriority('medium');
      setFormCategory('General');
      setFormNotes('');
      setFormLocation('');
      setFormMeetingUrl('');
      setFormReminderMinutes('');
      setFormRecurrenceFreq('none');
      setFormRecurrenceUntil('');
      setFormLinkedDocId(undefined);
      setIsTaskModalOpen(true);
    },
    [calendarLayers]
  );

  const openEditTaskModal = useCallback(
    (taskOrExpanded: CalendarTask | ExpandedCalendarEvent) => {
      const masterId =
        'masterId' in taskOrExpanded ? taskOrExpanded.masterId : taskOrExpanded.id;
      const instanceDate =
        'instanceDate' in taskOrExpanded
          ? taskOrExpanded.instanceDate
          : taskOrExpanded.date;
      const masterTask = tasks.find(t => t.id === masterId) || taskOrExpanded;

      setEditingTask(masterTask);
      setEditingOccurrenceDate(instanceDate);
      setFormTitle(masterTask.title);
      setFormCalendarId(masterTask.calendarId || 'cal-personal');
      setFormDate(masterTask.date);
      setFormEndDate(masterTask.endDate || '');
      const allDay = isEventAllDay(masterTask);
      setFormIsAllDay(allDay);
      setFormStartTime(masterTask.startTime || masterTask.time || '09:00');
      setFormEndTime(masterTask.endTime || '10:00');
      setFormColor(masterTask.color || '#3b82f6');
      setFormPriority(masterTask.priority);
      setFormCategory(masterTask.category || 'General');
      setFormNotes(masterTask.notes || '');
      setFormLocation(masterTask.location || '');
      setFormMeetingUrl(masterTask.meetingUrl || '');
      setFormReminderMinutes(
        masterTask.reminderMinutes !== undefined
          ? String(masterTask.reminderMinutes)
          : ''
      );
      setFormRecurrenceFreq(masterTask.recurrence?.frequency || 'none');
      setFormRecurrenceUntil(masterTask.recurrence?.until || '');
      setFormLinkedDocId(masterTask.linkedDocId);
      setIsTaskModalOpen(true);
    },
    [tasks]
  );

  const handleSaveTaskModal = useCallback(() => {
    if (!formTitle.trim()) return;
    const reminderParsed =
      formReminderMinutes.trim() !== ''
        ? Number.parseInt(formReminderMinutes, 10)
        : undefined;

    const recurrenceRule =
      formRecurrenceFreq !== 'none'
        ? {
            frequency: formRecurrenceFreq,
            interval: editingTask?.recurrence?.interval || 1,
            byWeekday: editingTask?.recurrence?.byWeekday,
            until: formRecurrenceUntil.trim() || undefined,
            exdates: editingTask?.recurrence?.exdates,
          }
        : undefined;

    const taskData: Partial<CalendarTask> = {
      title: formTitle.trim(),
      calendarId: formCalendarId,
      date: formDate,
      endDate:
        formEndDate && formEndDate >= formDate ? formEndDate : undefined,
      isAllDay: formIsAllDay,
      startTime: !formIsAllDay ? formStartTime : undefined,
      endTime: !formIsAllDay ? formEndTime || undefined : undefined,
      time: !formIsAllDay ? formStartTime : undefined,
      color: formColor,
      priority: formPriority,
      category: formCategory.trim() || undefined,
      notes: formNotes.trim() || undefined,
      location: formLocation.trim() || undefined,
      meetingUrl: formMeetingUrl.trim() || undefined,
      reminderMinutes:
        reminderParsed !== undefined && !Number.isNaN(reminderParsed)
          ? reminderParsed
          : undefined,
      recurrence: recurrenceRule,
      linkedDocId: formLinkedDocId,
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
        externalSource: 'local',
        ...taskData,
      } as CalendarTask;
      saveTasksToYjs([...tasks, created]);
    }
    setIsTaskModalOpen(false);
  }, [
    editingTask,
    formCalendarId,
    formCategory,
    formColor,
    formDate,
    formEndDate,
    formEndTime,
    formIsAllDay,
    formLinkedDocId,
    formLocation,
    formMeetingUrl,
    formNotes,
    formPriority,
    formRecurrenceFreq,
    formRecurrenceUntil,
    formReminderMinutes,
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

  const handleDeleteSingleOccurrence = useCallback(
    (task: CalendarTask, occurrenceDate: string) => {
      const updated = excludeRecurringOccurrence(task, occurrenceDate);
      const next = tasks.map(t => (t.id === task.id ? updated : t));
      saveTasksToYjs(next);
      setIsTaskModalOpen(false);
    },
    [saveTasksToYjs, tasks]
  );

  // Create or Open Linked AFFiNITe Meeting Note Document
  const handleCreateOrOpenMeetingDoc = useCallback(() => {
    if (formLinkedDocId) {
      setIsTaskModalOpen(false);
      workbench.openDoc(formLinkedDocId, { at: 'active' });
      return;
    }
    const noteTitle = `📋 Reunión: ${formTitle.trim() || 'Evento'} (${formDate})`;
    const docRecord = docsService.createDoc({ title: noteTitle });
    try {
      const { release } = docsService.open(docRecord.id);
      release();
    } catch {
      // ignore
    }
    setFormLinkedDocId(docRecord.id);
    if (editingTask) {
      const next = tasks.map(t =>
        t.id === editingTask.id ? { ...t, linkedDocId: docRecord.id } : t
      );
      saveTasksToYjs(next);
    }
    setIsTaskModalOpen(false);
    workbench.openDoc(docRecord.id, { at: 'active' });
  }, [
    docsService,
    editingTask,
    formDate,
    formLinkedDocId,
    formTitle,
    saveTasksToYjs,
    tasks,
    workbench,
  ]);

  // Open Google Calendar Template URL in external browser tab
  const handleOpenGoogleTemplate = useCallback(() => {
    const draftTask: CalendarTask = {
      id: editingTask?.id || 'draft',
      title: formTitle.trim() || 'Evento AFFiNITe',
      date: formDate,
      endDate: formEndDate && formEndDate >= formDate ? formEndDate : undefined,
      isAllDay: formIsAllDay,
      startTime: !formIsAllDay ? formStartTime : undefined,
      endTime: !formIsAllDay ? formEndTime : undefined,
      location: formLocation.trim() || undefined,
      notes: formNotes.trim() || undefined,
      recurrence:
        formRecurrenceFreq !== 'none'
          ? {
              frequency: formRecurrenceFreq,
              until: formRecurrenceUntil.trim() || undefined,
            }
          : undefined,
      completed: false,
      priority: formPriority,
    };
    const url = buildGoogleCalendarTemplateUrl(draftTask);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [
    editingTask,
    formDate,
    formEndDate,
    formEndTime,
    formIsAllDay,
    formLocation,
    formNotes,
    formPriority,
    formRecurrenceFreq,
    formRecurrenceUntil,
    formStartTime,
    formTitle,
  ]);

  // Drop handler onto a date cell (month view / all-day strip)
  const handleDropOnDate = useCallback(
    (targetDateStr: string) => {
      if (!dragItem) return;
      if (dragItem.type === 'task') {
        const masterTask = tasks.find(t => t.id === dragItem.id);
        if (!masterTask) {
          setDragItem(null);
          return;
        }
        const isRecurring =
          Boolean(masterTask.recurrence) &&
          masterTask.recurrence?.frequency !== 'none';

        if (isRecurring && dragItem.instanceDate) {
          const updatedMaster = excludeRecurringOccurrence(
            masterTask,
            dragItem.instanceDate
          );
          const detachedInstance: CalendarTask = {
            ...masterTask,
            id: `cal-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: targetDateStr,
            endDate: undefined,
            recurrence: undefined,
          };
          const next = tasks
            .map(t => (t.id === masterTask.id ? updatedMaster : t))
            .concat(detachedInstance);
          saveTasksToYjs(next);
        } else {
          let nextEndDate = masterTask.endDate;
          if (masterTask.endDate && masterTask.endDate > masterTask.date) {
            const spanDays = dayjs(masterTask.endDate).diff(
              dayjs(masterTask.date),
              'day'
            );
            nextEndDate = dayjs(targetDateStr)
              .add(spanDays, 'day')
              .format(JOURNAL_DATE_FORMAT);
          }
          const next = tasks.map(t =>
            t.id === masterTask.id
              ? { ...t, date: targetDateStr, endDate: nextEndDate }
              : t
          );
          saveTasksToYjs(next);
        }
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

  // Drop handler onto a vertical 24h time column (week / workweek / day views)
  const handleDropOnTimeGrid = useCallback(
    (targetDateStr: string, e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!dragItem) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const dropY = Math.max(0, e.clientY - rect.top);

      if (dragItem.type === 'task') {
        const masterTask = tasks.find(t => t.id === dragItem.id);
        if (!masterTask) {
          setDragItem(null);
          return;
        }
        const movedTimes = computeMovedEventTimes(
          masterTask.startTime || masterTask.time || '09:00',
          masterTask.endTime,
          dropY,
          GRID_START_HOUR,
          PIXELS_PER_HOUR
        );
        const isRecurring =
          Boolean(masterTask.recurrence) &&
          masterTask.recurrence?.frequency !== 'none';

        if (isRecurring && dragItem.instanceDate) {
          const updatedMaster = excludeRecurringOccurrence(
            masterTask,
            dragItem.instanceDate
          );
          const detachedInstance: CalendarTask = {
            ...masterTask,
            id: `cal-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: targetDateStr,
            endDate: undefined,
            isAllDay: false,
            startTime: movedTimes.startTime,
            time: movedTimes.startTime,
            endTime: movedTimes.endTime,
            recurrence: undefined,
          };
          const next = tasks
            .map(t => (t.id === masterTask.id ? updatedMaster : t))
            .concat(detachedInstance);
          saveTasksToYjs(next);
        } else {
          const next = tasks.map(t =>
            t.id === masterTask.id
              ? {
                  ...t,
                  date: targetDateStr,
                  isAllDay: false,
                  startTime: movedTimes.startTime,
                  time: movedTimes.startTime,
                  endTime: movedTimes.endTime,
                }
              : t
          );
          saveTasksToYjs(next);
        }
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

  // Bottom 15-min Resize Handlers
  const handleResizeMouseDown = useCallback(
    (
      ev: ExpandedCalendarEvent,
      e: React.MouseEvent<HTMLDivElement>
    ) => {
      e.stopPropagation();
      e.preventDefault();
      const colEl = (e.currentTarget as HTMLElement).closest(
        '[data-day-column="true"]'
      );
      if (!colEl) return;
      const rect = colEl.getBoundingClientRect();
      setResizingEvent({
        taskId: ev.masterId,
        instanceDate: ev.instanceDate,
        startTime: ev.startTime || ev.time || '09:00',
        columnTop: rect.top,
        currentBottomY: Math.max(0, e.clientY - rect.top),
      });
    },
    []
  );

  useEffect(() => {
    if (!resizingEvent) return;

    const onMouseMove = (ev: MouseEvent) => {
      const nextY = Math.max(
        0,
        Math.min(
          HOURS_ARRAY.length * PIXELS_PER_HOUR,
          ev.clientY - resizingEvent.columnTop
        )
      );
      setResizingEvent(prev =>
        prev ? { ...prev, currentBottomY: nextY } : null
      );
    };

    const onMouseUp = (ev: MouseEvent) => {
      const finalY = Math.max(
        0,
        Math.min(
          HOURS_ARRAY.length * PIXELS_PER_HOUR,
          ev.clientY - resizingEvent.columnTop
        )
      );
      const newEndTime = computeResizedEndTime(
        resizingEvent.startTime,
        finalY,
        GRID_START_HOUR,
        PIXELS_PER_HOUR
      );
      const next = tasks.map(t =>
        t.id === resizingEvent.taskId
          ? {
              ...t,
              isAllDay: false,
              startTime: t.startTime || t.time || resizingEvent.startTime,
              time: t.startTime || t.time || resizingEvent.startTime,
              endTime: newEndTime,
            }
          : t
      );
      saveTasksToYjs(next);
      setResizingEvent(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingEvent, saveTasksToYjs, tasks]);

  // Visible calendar layer IDs set
  const visibleCalendarIds = useMemo(() => {
    const set = new Set<string>();
    for (const layer of calendarLayers) {
      if (layer.visible) {
        set.add(layer.id);
      }
    }
    return set;
  }, [calendarLayers]);

  // Filtered tasks & board cards
  const normalizedFilter = searchFilter.trim().toLowerCase();
  const filteredTasks = useMemo(() => {
    if (selectedSource === 'boards') return [];
    let list = tasks.filter(t => {
      const calId = t.calendarId || 'cal-personal';
      // If calId is known in calendarLayers, respect its visibility
      const knownLayer = calendarLayers.some(l => l.id === calId);
      if (knownLayer && !visibleCalendarIds.has(calId)) {
        return false;
      }
      return true;
    });

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
        (t.notes || '').toLowerCase().includes(normalizedFilter) ||
        (t.location || '').toLowerCase().includes(normalizedFilter)
    );
  }, [
    calendarLayers,
    normalizedFilter,
    selectedCategory,
    selectedSource,
    tasks,
    visibleCalendarIds,
  ]);

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

  // Expand recurring & multi-day events across a generous window around cursorDate's year
  const expandedTasks = useMemo(() => {
    const rangeStartStr = cursorDate
      .startOf('year')
      .subtract(1, 'month')
      .format(JOURNAL_DATE_FORMAT);
    const rangeEndStr = cursorDate
      .endOf('year')
      .add(1, 'month')
      .format(JOURNAL_DATE_FORMAT);
    return expandEventsForRange(filteredTasks, rangeStartStr, rangeEndStr);
  }, [cursorDate, filteredTasks]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, ExpandedCalendarEvent[]>();
    for (const ev of expandedTasks) {
      const list = map.get(ev.instanceDate) || [];
      list.push(ev);
      map.set(ev.instanceDate, list);
    }
    return map;
  }, [expandedTasks]);

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

  // Reminder Notification Check Interval (every 30s)
  useEffect(() => {
    const checkReminders = () => {
      const nowDt = dayjs();
      const todayKey = nowDt.format(JOURNAL_DATE_FORMAT);
      const nowMinutes = nowDt.hour() * 60 + nowDt.minute();
      const todaysEvents = tasksByDate.get(todayKey) || [];

      for (const ev of todaysEvents) {
        if (
          ev.completed ||
          isEventAllDay(ev) ||
          ev.reminderMinutes === undefined
        ) {
          continue;
        }
        const timeStr = ev.startTime || ev.time;
        if (!timeStr) continue;
        const [hh, mm] = timeStr.split(':').map(Number);
        if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
        const eventMinutes = hh * 60 + mm;
        const diff = eventMinutes - nowMinutes;

        if (
          diff >= 0 &&
          diff <= ev.reminderMinutes &&
          !firedRemindersRef.current.has(ev.id)
        ) {
          firedRemindersRef.current.add(ev.id);
          try {
            playStreakCompletionSound();
          } catch {
            // ignore audio autoplay restrictions
          }
          if (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            try {
              new Notification(`⏰ Recordatorio: ${ev.title}`, {
                body: `${timeStr}${ev.location ? ` · 📍 ${ev.location}` : ''}`,
              });
            } catch {
              // ignore
            }
          }
        }
      }
    };

    checkReminders();
    const timer = window.setInterval(checkReminders, 30_000);
    return () => window.clearInterval(timer);
  }, [tasksByDate]);

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

  // Current ISO Week for Weekly / Workweek View
  const currentWeekInfo = useMemo(() => {
    const weekKey = formatWeeklyJournalKey(cursorDate);
    const { start, end, weekNumber, year } = getWeekDateRange(weekKey);
    const days = Array.from({ length: 7 }, (_, idx) => start.add(idx, 'day'));
    return { weekKey, start, end, weekNumber, year, days };
  }, [cursorDate]);

  // Monthly KPIs & Agenda Groups (using expandedTasks so recurring/multi-day events appear in Agenda!)
  const monthStatsAndGroups = useMemo(() => {
    const monthPrefix = cursorDate.format('YYYY-MM');
    const todayStr = dayjs().format(JOURNAL_DATE_FORMAT);
    const currentWeekKey = formatWeeklyJournalKey(dayjs());

    const monthTasks = expandedTasks.filter(t =>
      t.instanceDate.startsWith(monthPrefix)
    );
    const monthCards = filteredBoardCards.filter(
      c => c.dueDate && c.dueDate.startsWith(monthPrefix)
    );

    type UnifiedAgendaItem =
      | {
          kind: 'task';
          date: string;
          completed: boolean;
          task: ExpandedCalendarEvent;
        }
      | {
          kind: 'board-card';
          date: string;
          completed: boolean;
          card: BoardCardCalendarItem;
        };

    const allItems: UnifiedAgendaItem[] = [
      ...monthTasks.map(task => ({
        kind: 'task' as const,
        date: task.instanceDate,
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
    expandedTasks,
    filteredBoardCards,
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

  const handlePrevPeriod = useCallback(() => {
    if (viewMode === 'day') {
      setCursorDate(d => d.subtract(1, 'day'));
    } else if (viewMode === 'week' || viewMode === 'workweek') {
      setCursorDate(d => d.subtract(1, 'week'));
    } else if (viewMode === 'year') {
      setCursorDate(d => d.subtract(1, 'year'));
    } else {
      setCursorDate(d => d.subtract(1, 'month'));
    }
  }, [viewMode]);

  const handleNextPeriod = useCallback(() => {
    if (viewMode === 'day') {
      setCursorDate(d => d.add(1, 'day'));
    } else if (viewMode === 'week' || viewMode === 'workweek') {
      setCursorDate(d => d.add(1, 'week'));
    } else if (viewMode === 'year') {
      setCursorDate(d => d.add(1, 'year'));
    } else {
      setCursorDate(d => d.add(1, 'month'));
    }
  }, [viewMode]);

  const handleGoToday = useCallback(() => {
    setCursorDate(dayjs());
  }, []);

  // Google Calendar Keyboard Shortcuts Listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTaskModalOpen || isSyncModalOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key;
      if (key === 't' || key === 'T') {
        handleGoToday();
      } else if (key === 'd' || key === 'D') {
        setViewMode('day');
      } else if (key === 'w' || key === 'W') {
        setViewMode('week');
      } else if (key === 'x' || key === 'X') {
        setViewMode('workweek');
      } else if (key === 'm' || key === 'M') {
        setViewMode('month');
      } else if (key === 'y' || key === 'Y') {
        setViewMode('year');
      } else if (key === 'a' || key === 'A') {
        setViewMode('agenda');
      } else if (key === 'c' || key === 'C') {
        openCreateTaskModal(cursorDate.format(JOURNAL_DATE_FORMAT));
      } else if (key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (key === 'ArrowLeft') {
        handlePrevPeriod();
      } else if (key === 'ArrowRight') {
        handleNextPeriod();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    cursorDate,
    handleGoToday,
    handleNextPeriod,
    handlePrevPeriod,
    isSyncModalOpen,
    isTaskModalOpen,
    openCreateTaskModal,
  ]);

  // Layer Manager Actions
  const handleToggleLayerVisible = useCallback(
    (layerId: string) => {
      const next = calendarLayers.map(l =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      );
      saveCalendarsToYjs(next);
    },
    [calendarLayers, saveCalendarsToYjs]
  );

  const handleDeleteCalendarLayer = useCallback(
    (layerId: string) => {
      const nextLayers = calendarLayers.filter(l => l.id !== layerId);
      saveCalendarsToYjs(nextLayers);
      const nextTasks = tasks.filter(t => t.calendarId !== layerId);
      saveTasksToYjs(nextTasks);
    },
    [calendarLayers, saveCalendarsToYjs, saveTasksToYjs, tasks]
  );

  // Sync a single .ics URL layer
  const syncIcsLayerFeed = useCallback(
    async (
      layerId: string,
      name: string,
      color: string,
      rawUrl: string
    ): Promise<number> => {
      const normalizedUrl = rawUrl.trim().replace(/^webcal:\/\//i, 'https://');
      const bridge = getCalendarBridge();
      let icsContent = '';
      if (bridge?.fetchIcsFeed) {
        icsContent = unwrapIcsResult(await bridge.fetchIcsFeed(normalizedUrl));
      } else {
        const resp = await fetch(normalizedUrl);
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        icsContent = await resp.text();
      }

      const parsedEvents = parseIcsToEvents(icsContent, {
        calendarId: layerId,
        color,
        externalSource: 'ics-feed',
      });

      const nowIso = new Date().toISOString();
      const exists = calendarLayers.some(l => l.id === layerId);
      const nextLayers: CalendarLayer[] = exists
        ? calendarLayers.map(l =>
            l.id === layerId
              ? {
                  ...l,
                  name,
                  color,
                  icsUrl: normalizedUrl,
                  lastSyncedAt: nowIso,
                  syncError: undefined,
                }
              : l
          )
        : [
            ...calendarLayers,
            {
              id: layerId,
              name,
              color,
              visible: true,
              type: 'google-ics',
              icsUrl: normalizedUrl,
              lastSyncedAt: nowIso,
            },
          ];

      saveCalendarsToYjs(nextLayers);
      const otherTasks = tasks.filter(t => t.calendarId !== layerId);
      saveTasksToYjs([...otherTasks, ...parsedEvents]);
      return parsedEvents.length;
    },
    [calendarLayers, saveCalendarsToYjs, saveTasksToYjs, tasks]
  );

  const handleSubscribeIcsFeed = useCallback(async () => {
    if (!syncIcsUrl.trim()) return;
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const layerId = `cal-ics-${Date.now().toString(36)}`;
      const count = await syncIcsLayerFeed(
        layerId,
        syncIcsName.trim() || 'Calendario iCal',
        syncIcsColor,
        syncIcsUrl
      );
      setSyncIcsUrl('');
      setSyncStatusMsg(
        `✅ Suscripción activa: ${count} eventos importados de "${syncIcsName.trim() || 'Calendario iCal'}".`
      );
    } catch (err) {
      setSyncStatusMsg(
        `⚠️ Error al sincronizar URL .ics: ${err instanceof Error ? err.message : 'Verifica la URL pública/secreta iCal'}`
      );
    } finally {
      setIsSyncing(false);
    }
  }, [syncIcsColor, syncIcsLayerFeed, syncIcsName, syncIcsUrl]);

  const handleRefreshAllIcsFeeds = useCallback(async () => {
    const icsLayers = calendarLayers.filter(
      l => l.type === 'google-ics' && l.icsUrl
    );
    if (icsLayers.length === 0) {
      setSyncStatusMsg('ℹ️ No hay suscripciones .ics configuradas todavía.');
      return;
    }
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      let totalImported = 0;
      for (const layer of icsLayers) {
        if (!layer.icsUrl) continue;
        const count = await syncIcsLayerFeed(
          layer.id,
          layer.name,
          layer.color,
          layer.icsUrl
        );
        totalImported += count;
      }
      setSyncStatusMsg(
        `✅ ${icsLayers.length} suscripciones actualizadas (${totalImported} eventos en total).`
      );
    } catch (err) {
      setSyncStatusMsg(
        `⚠️ Error al actualizar suscripciones: ${err instanceof Error ? err.message : 'Error de red'}`
      );
    } finally {
      setIsSyncing(false);
    }
  }, [calendarLayers, syncIcsLayerFeed]);

  // Google Calendar API Bidirectional Sync Handlers
  const handleGoogleApiPull = useCallback(async () => {
    const token = googleConfig.accessToken?.trim();
    if (!token) {
      setSyncStatusMsg('⚠️ Introduce tu Google OAuth Access Token primero.');
      return;
    }
    const calId = googleConfig.calendarId?.trim() || 'primary';
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      saveGoogleConfigToYjs(googleConfig);
      const endpoint = `/calendars/${encodeURIComponent(calId)}/events?singleEvents=false&maxResults=250`;
      const bridge = getCalendarBridge();
      let data: Record<string, unknown>;
      if (bridge?.googleApiRequest) {
        data = unwrapGoogleResult(
          await bridge.googleApiRequest({
            method: 'GET',
            endpoint,
            accessToken: token,
          })
        );
      } else {
        const resp = await fetch(
          `https://www.googleapis.com/calendar/v3${endpoint}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!resp.ok) {
          throw new Error(`Google API HTTP ${resp.status}`);
        }
        data = (await resp.json()) as Record<string, unknown>;
      }

      const layerId = 'cal-google-api';
      const layerColor = '#3b82f6';
      const rawItems = Array.isArray(data.items) ? data.items : [];
      const mappedTasks: CalendarTask[] = [];
      for (const item of rawItems) {
        if (item && typeof item === 'object') {
          const mapped = mapGoogleApiEventToCalendarTask(
            item as Record<string, unknown>,
            layerId,
            layerColor
          );
          if (mapped) {
            mappedTasks.push(mapped);
          }
        }
      }

      const nowIso = new Date().toISOString();
      const hasGoogleLayer = calendarLayers.some(l => l.id === layerId);
      const nextLayers: CalendarLayer[] = hasGoogleLayer
        ? calendarLayers.map(l =>
            l.id === layerId ? { ...l, lastSyncedAt: nowIso } : l
          )
        : [
            ...calendarLayers,
            {
              id: layerId,
              name: `Google (${calId})`,
              color: layerColor,
              visible: true,
              type: 'google-api',
              googleCalendarId: calId,
              lastSyncedAt: nowIso,
            },
          ];
      saveCalendarsToYjs(nextLayers);

      const otherTasks = tasks.filter(t => t.calendarId !== layerId);
      saveTasksToYjs([...otherTasks, ...mappedTasks]);
      setSyncStatusMsg(
        `✅ ${mappedTasks.length} eventos importados desde Google Calendar API (${calId}).`
      );
    } catch (err) {
      setSyncStatusMsg(
        `⚠️ Error al importar de Google API: ${err instanceof Error ? err.message : 'Verifica el Access Token'}`
      );
    } finally {
      setIsSyncing(false);
    }
  }, [
    calendarLayers,
    googleConfig,
    saveCalendarsToYjs,
    saveGoogleConfigToYjs,
    saveTasksToYjs,
    tasks,
  ]);

  const handleGoogleApiPush = useCallback(async () => {
    const token = googleConfig.accessToken?.trim();
    if (!token) {
      setSyncStatusMsg('⚠️ Introduce tu Google OAuth Access Token primero.');
      return;
    }
    const calId = googleConfig.calendarId?.trim() || 'primary';
    const localTasks = tasks.filter(
      t => !t.externalSource || t.externalSource === 'local'
    );
    if (localTasks.length === 0) {
      setSyncStatusMsg('ℹ️ No hay eventos locales pendientes por subir.');
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      saveGoogleConfigToYjs(googleConfig);
      const endpoint = `/calendars/${encodeURIComponent(calId)}/events`;
      const bridge = getCalendarBridge();
      let pushedCount = 0;
      let failedCount = 0;
      let lastErrorMessage = '';

      for (const localTask of localTasks) {
        try {
          const body = mapCalendarTaskToGoogleApiEvent(localTask);
          if (bridge?.googleApiRequest) {
            unwrapGoogleResult(
              await bridge.googleApiRequest({
                method: 'POST',
                endpoint,
                accessToken: token,
                body,
              })
            );
          } else {
            const resp = await fetch(
              `https://www.googleapis.com/calendar/v3${endpoint}`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
              }
            );
            if (!resp.ok) {
              throw new Error(`Google API HTTP ${resp.status}`);
            }
          }
          pushedCount++;
        } catch (pushErr) {
          failedCount++;
          lastErrorMessage =
            pushErr instanceof Error ? pushErr.message : String(pushErr);
        }
      }

      if (failedCount > 0) {
        setSyncStatusMsg(
          pushedCount > 0
            ? `⚠️ ${pushedCount} subidos, ${failedCount} fallaron al subir a Google Calendar (${calId}): ${lastErrorMessage}`
            : `⚠️ Error al subir a Google API (${failedCount} fallaron): ${lastErrorMessage || 'Error de red o permisos'}`
        );
      } else {
        setSyncStatusMsg(
          `✅ ${pushedCount} eventos locales subidos exitosamente a Google Calendar (${calId}).`
        );
      }
    } catch (err) {
      setSyncStatusMsg(
        `⚠️ Error al subir a Google API: ${err instanceof Error ? err.message : 'Error de red o permisos'}`
      );
    } finally {
      setIsSyncing(false);
    }
  }, [googleConfig, saveGoogleConfigToYjs, tasks]);

  // .ics File Import Handler
  const handleImportIcsFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const content = await file.text();
        const targetLayer =
          calendarLayers.find(l => l.id === importTargetCalId) ||
          DEFAULT_CALENDAR_LAYERS[0];
        const imported = parseIcsToEvents(content, {
          calendarId: targetLayer.id,
          color: targetLayer.color,
          externalSource: 'ics-import',
        });
        const importedIds = new Set(imported.map(ev => ev.id));
        const kept = tasks.filter(t => !importedIds.has(t.id));
        saveTasksToYjs([...kept, ...imported]);
        setSyncStatusMsg(
          `✅ Archivo "${file.name}" importado: ${imported.length} eventos añadidos a "${targetLayer.name}".`
        );
      } catch (err) {
        setSyncStatusMsg(
          `⚠️ Error al leer archivo .ics: ${err instanceof Error ? err.message : 'Formato inválido'}`
        );
      } finally {
        e.target.value = '';
      }
    },
    [calendarLayers, importTargetCalId, saveTasksToYjs, tasks]
  );

  // Timeblock Drag-to-Create Handlers
  const handleGridMouseDown = (
    dateStr: string,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (
      (e.target as HTMLElement).closest('[data-event-card]') ||
      (e.target as HTMLElement).closest('[data-resize-handle]')
    ) {
      return;
    }
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

  const activeWeekDays = useMemo(() => {
    return viewMode === 'workweek'
      ? currentWeekInfo.days.slice(0, 5)
      : currentWeekInfo.days;
  }, [currentWeekInfo.days, viewMode]);

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
                    : viewMode === 'workweek'
                      ? `${currentWeekInfo.weekKey} · Laboral (Lun–Vie)`
                      : viewMode === 'year'
                        ? `Año ${cursorDate.year()}`
                        : currentMonthLabel}
              </span>
            </div>

            <div className={styles.periodNavGroup}>
              <button
                onClick={handlePrevPeriod}
                className={styles.navBtn}
                title="Periodo anterior (←)"
              >
                ◀
              </button>
              <button
                onClick={handleGoToday}
                className={styles.todayNavBtn}
                title="Ir a Hoy (T)"
              >
                Hoy
              </button>
              <button
                onClick={handleNextPeriod}
                className={styles.navBtn}
                title="Periodo siguiente (→)"
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
              <span>Nota Semanal ({currentWeekInfo.weekKey})</span>
            </button>
          </div>

          {/* Center: 6 View Mode Switcher (Day, Week, Workweek, Month, Year, Agenda) */}
          <div className={styles.viewSwitcher}>
            {(
              [
                { id: 'day', label: '🕒 Día', shortcut: 'D' },
                { id: 'week', label: '🗓️ Semana', shortcut: 'W' },
                { id: 'workweek', label: '💼 Laboral', shortcut: 'X' },
                { id: 'month', label: '📅 Mes', shortcut: 'M' },
                { id: 'year', label: '📆 Año', shortcut: 'Y' },
                { id: 'agenda', label: '📋 Agenda', shortcut: 'A' },
              ] as const
            ).map(tab => {
              const active = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id)}
                  data-testid={`calendar-mode-${tab.id}`}
                  data-active={active}
                  title={`Cambiar a vista ${tab.label} (Atajo: ${tab.shortcut})`}
                  className={styles.viewModeTab}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right: Search, Sync Modal Button, Sidebar Toggle & New Task */}
          <div className={styles.headerRight}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar (/ para enfocar)..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className={styles.headerSearchInput}
            />
            <button
              onClick={() => {
                setSyncStatusMsg(null);
                setIsSyncModalOpen(true);
              }}
              className={styles.sidebarToggleBtn}
              data-testid="calendar-header-sync-btn"
              title="Sincronizar con Google Calendar o archivo .ics"
            >
              🔄 Google / .ics
            </button>
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
              title="Crear nuevo evento o tarea (Atajo: C)"
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
                <span className={styles.filterGroupLabel}>Categoría:</span>
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
                <span className={styles.filterGroupLabel}>Origen:</span>
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
                      <div key={row.weekKey} className={styles.monthWeekRow}>
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
                              <span>
                                W{String(row.weekNumber).padStart(2, '0')}
                              </span>
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
                                {dayTasks.map(ev => {
                                  const color = ev.color || '#3b82f6';
                                  const hasRecurrence =
                                    Boolean(
                                      ev.recurrence &&
                                        ev.recurrence.frequency !== 'none'
                                    ) || ev.isRecurringInstance;
                                  return (
                                    <div
                                      key={ev.id}
                                      draggable
                                      onDragStart={() =>
                                        setDragItem({
                                          type: 'task',
                                          id: ev.masterId,
                                          instanceDate: ev.instanceDate,
                                          isRecurringInstance:
                                            ev.isRecurringInstance,
                                        })
                                      }
                                      onClick={() => openEditTaskModal(ev)}
                                      className={styles.monthTaskPill}
                                      data-completed={ev.completed}
                                      style={{
                                        background: ev.completed
                                          ? 'var(--affine-background-primary-color)'
                                          : `${color}22`,
                                        border: `1px solid ${
                                          ev.completed
                                            ? 'var(--affine-border-color)'
                                            : `${color}80`
                                        }`,
                                        borderLeft: `3px solid ${color}`,
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={ev.completed}
                                        onClick={e => e.stopPropagation()}
                                        onChange={() =>
                                          handleToggleTask(ev.masterId)
                                        }
                                        style={{
                                          cursor: 'pointer',
                                          accentColor: color,
                                          margin: 0,
                                        }}
                                      />
                                      <span
                                        className={styles.monthTaskTitle}
                                        data-completed={ev.completed}
                                      >
                                        {!isEventAllDay(ev) &&
                                        (ev.startTime || ev.time)
                                          ? `${ev.startTime || ev.time} `
                                          : ''}
                                        {ev.title}
                                      </span>
                                      {hasRecurrence && (
                                        <span title="Evento recurrente">🔁</span>
                                      )}
                                      {ev.isMultiDay &&
                                        ev.spanDayIndex &&
                                        ev.spanTotalDays && (
                                          <span
                                            className={styles.eventMiniBadge}
                                          >
                                            {ev.spanDayIndex}/{ev.spanTotalDays}
                                          </span>
                                        )}
                                      {ev.meetingUrl && (
                                        <span title="Videollamada">🎥</span>
                                      )}
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

            {/* ==================== MODE 2 & 3: WEEK (7-DAY) & WORKWEEK (5-DAY) 24H VIEWS ==================== */}
            {(viewMode === 'week' || viewMode === 'workweek') && (
              <div className={styles.weekViewContainer}>
                {/* Weekly Note Banner */}
                <div className={styles.weeklyBanner}>
                  <div className={styles.weeklyBannerLeft}>
                    <span className={styles.weeklyKeyBadge}>
                      {currentWeekInfo.weekKey}
                    </span>
                    <span className={styles.weeklyBannerTitle}>
                      {viewMode === 'workweek'
                        ? `Semana Laboral ${currentWeekInfo.weekNumber} (${activeWeekDays[0].format('DD MMM')} – ${activeWeekDays[activeWeekDays.length - 1].format('DD MMM YYYY')})`
                        : `Semana ${currentWeekInfo.weekNumber} (${currentWeekInfo.start.format('DD MMM')} – ${currentWeekInfo.end.format('DD MMM YYYY')})`}
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

                {/* Google Calendar 24h Time-Blocking Grid */}
                <div className={styles.timeGridContainer}>
                  {/* Top Column Headers (Day names and dates) */}
                  <div
                    className={
                      viewMode === 'workweek'
                        ? styles.timeGridHeaderRow5Col
                        : styles.timeGridHeaderRow
                    }
                  >
                    <div className={styles.timeGridGmtCell}>24h</div>
                    {activeWeekDays.map((day, idx) => {
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
                              title={
                                hasDailyJournal
                                  ? 'Abrir Nota Diaria'
                                  : 'Crear Nota Diaria'
                              }
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
                  <div
                    className={
                      viewMode === 'workweek'
                        ? styles.allDayStripRow5Col
                        : styles.allDayStripRow
                    }
                  >
                    <div className={styles.allDayLabelCell}>Todo el día</div>

                    {activeWeekDays.map(day => {
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
                          {allDayTasks.map(ev => {
                            const color = ev.color || '#3b82f6';
                            return (
                              <div
                                key={ev.id}
                                draggable
                                onDragStart={() =>
                                  setDragItem({
                                    type: 'task',
                                    id: ev.masterId,
                                    instanceDate: ev.instanceDate,
                                    isRecurringInstance: ev.isRecurringInstance,
                                  })
                                }
                                onClick={() => openEditTaskModal(ev)}
                                className={styles.allDayTaskChip}
                                data-completed={ev.completed}
                                style={{
                                  background: ev.completed
                                    ? 'var(--affine-background-secondary-color)'
                                    : `${color}28`,
                                  border: `1px solid ${
                                    ev.completed
                                      ? 'var(--affine-border-color)'
                                      : `${color}80`
                                  }`,
                                  borderLeft: `3px solid ${color}`,
                                }}
                              >
                                {ev.title}{' '}
                                {ev.isMultiDay &&
                                ev.spanDayIndex &&
                                ev.spanTotalDays
                                  ? `(Día ${ev.spanDayIndex}/${ev.spanTotalDays})`
                                  : ''}
                              </div>
                            );
                          })}

                          {dayCards.map(c => (
                            <div
                              key={`${c.boardId}-${c.id}`}
                              draggable
                              onDragStart={() =>
                                setDragItem({
                                  type: 'board-card',
                                  boardId: c.boardId,
                                  cardId: c.id,
                                })
                              }
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

                  {/* 24-Hour Vertical Time-Grid Scroll Area (00:00 to 23:59) */}
                  <div
                    ref={weekGridScrollRef}
                    className={styles.verticalGridScrollArea}
                    data-cols={viewMode === 'workweek' ? '5' : '7'}
                  >
                    {/* Time Column (00:00 to 23:00) */}
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

                    {/* Day Vertical Columns */}
                    {activeWeekDays.map(day => {
                      const dateStr = day.format(JOURNAL_DATE_FORMAT);
                      const isToday = dateStr === todayStr;
                      const dayTasks = tasksByDate.get(dateStr) || [];
                      const timedTasks = dayTasks.filter(
                        t => !isEventAllDay(t)
                      );
                      const layoutItems = computeOverlappingEventsLayout(
                        timedTasks,
                        GRID_START_HOUR,
                        PIXELS_PER_HOUR
                      );

                      return (
                        <div
                          key={dateStr}
                          data-day-column="true"
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => handleDropOnTimeGrid(dateStr, e)}
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

                          {/* Timed Event Blocks with Side-by-Side Collision Layout & Bottom Resize */}
                          {layoutItems.map(item => {
                            const ev = item.event;
                            const isResizingThis =
                              resizingEvent?.taskId === ev.masterId &&
                              resizingEvent?.instanceDate === ev.instanceDate;
                            const effectiveEndTime = isResizingThis
                              ? computeResizedEndTime(
                                  resizingEvent.startTime,
                                  resizingEvent.currentBottomY,
                                  GRID_START_HOUR,
                                  PIXELS_PER_HOUR
                                )
                              : ev.endTime;
                            const resizedPos = isResizingThis
                              ? computeEventPosition(
                                  ev.startTime || ev.time,
                                  effectiveEndTime,
                                  GRID_START_HOUR,
                                  PIXELS_PER_HOUR
                                )
                              : { top: item.top, height: item.height };

                            const timeLabel = formatEventTimeRange(
                              ev.startTime || ev.time,
                              effectiveEndTime
                            );
                            const color = ev.color || '#3b82f6';
                            const hasRecurrence =
                              Boolean(
                                ev.recurrence &&
                                  ev.recurrence.frequency !== 'none'
                              ) || ev.isRecurringInstance;

                            return (
                              <div
                                key={ev.id}
                                data-event-card="true"
                                data-completed={ev.completed}
                                draggable={!resizingEvent}
                                onDragStart={e => {
                                  e.stopPropagation();
                                  setDragItem({
                                    type: 'task',
                                    id: ev.masterId,
                                    instanceDate: ev.instanceDate,
                                    isRecurringInstance: ev.isRecurringInstance,
                                  });
                                }}
                                onClick={e => {
                                  e.stopPropagation();
                                  openEditTaskModal(ev);
                                }}
                                className={styles.timedEventCard}
                                style={{
                                  top: `${resizedPos.top}px`,
                                  height: `${resizedPos.height}px`,
                                  left: `calc(${item.leftPercent}% + 2px)`,
                                  width: `calc(${item.widthPercent}% - 4px)`,
                                  right: 'auto',
                                  background: ev.completed
                                    ? 'var(--affine-background-secondary-color)'
                                    : `${color}24`,
                                  border: `1px solid ${
                                    ev.completed
                                      ? 'var(--affine-border-color)'
                                      : `${color}80`
                                  }`,
                                  borderLeft: `4px solid ${color}`,
                                }}
                              >
                                <div className={styles.timedEventHeader}>
                                  <input
                                    type="checkbox"
                                    checked={ev.completed}
                                    onClick={e => e.stopPropagation()}
                                    onChange={() =>
                                      handleToggleTask(ev.masterId)
                                    }
                                    style={{
                                      accentColor: color,
                                      cursor: 'pointer',
                                      margin: 0,
                                    }}
                                  />
                                  <span
                                    className={styles.timedEventTitle}
                                    data-completed={ev.completed}
                                  >
                                    {ev.title}
                                  </span>
                                  {hasRecurrence && (
                                    <span title="Recurrente">🔁</span>
                                  )}
                                </div>
                                <div className={styles.timedEventTimeLabel}>
                                  <span>🕒 {timeLabel}</span>
                                  {ev.meetingUrl && (
                                    <a
                                      href={ev.meetingUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className={styles.eventMeetBadge}
                                      title="Unirse a videollamada"
                                    >
                                      🎥 Meet
                                    </a>
                                  )}
                                  {ev.linkedDocId && (
                                    <span
                                      className={styles.eventMiniBadge}
                                      title="Nota de reunión vinculada"
                                    >
                                      📝
                                    </span>
                                  )}
                                </div>
                                {/* 15-min Bottom Resize Handle */}
                                <div
                                  data-resize-handle="true"
                                  onMouseDown={e =>
                                    handleResizeMouseDown(ev, e)
                                  }
                                  className={styles.eventResizeHandle}
                                  title="Arrastra para redimensionar duración (15 min)"
                                />
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
                                    timeblockDrag.currentY -
                                      timeblockDrag.startY
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

            {/* ==================== MODE 4: DAILY 24H TIME-BLOCKING VIEW ==================== */}
            {viewMode === 'day' && (
              <div className={styles.dayViewContainer}>
                {/* Day Header Banner */}
                <div
                  className={styles.dayHeaderBanner}
                  data-today={cursorDate.isSame(dayjs(), 'day')}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <span style={{ fontSize: '24px' }}>🕒</span>
                    <div>
                      <div className={styles.dayHeaderTitle}>
                        {cursorDate.format('dddd, DD [de] MMMM YYYY')}
                      </div>
                      <div className={styles.dayHeaderSubtitle}>
                        {cursorDate.isSame(dayjs(), 'day')
                          ? '🌟 Time-Blocking 24h con colisiones en paralelo y redimensionado de 15 min'
                          : 'Planificación por horas para el día seleccionado'}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
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

                {/* Day 24h Vertical Grid with Drag-to-Create, Drag-to-Move & 15m Resize */}
                <div
                  ref={dayGridScrollRef}
                  className={styles.dayVerticalGridContainer}
                >
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
                    const layoutItems = computeOverlappingEventsLayout(
                      timedTasks,
                      GRID_START_HOUR,
                      PIXELS_PER_HOUR
                    );

                    return (
                      <div
                        data-day-column="true"
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => handleDropOnTimeGrid(dayStr, e)}
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

                        {/* Timed Tasks with Collision Layout */}
                        {layoutItems.map(item => {
                          const ev = item.event;
                          const isResizingThis =
                            resizingEvent?.taskId === ev.masterId &&
                            resizingEvent?.instanceDate === ev.instanceDate;
                          const effectiveEndTime = isResizingThis
                            ? computeResizedEndTime(
                                resizingEvent.startTime,
                                resizingEvent.currentBottomY,
                                GRID_START_HOUR,
                                PIXELS_PER_HOUR
                              )
                            : ev.endTime;
                          const resizedPos = isResizingThis
                            ? computeEventPosition(
                                ev.startTime || ev.time,
                                effectiveEndTime,
                                GRID_START_HOUR,
                                PIXELS_PER_HOUR
                              )
                            : { top: item.top, height: item.height };

                          const color = ev.color || '#3b82f6';
                          const timeRange = formatEventTimeRange(
                            ev.startTime || ev.time,
                            effectiveEndTime
                          );

                          return (
                            <div
                              key={ev.id}
                              data-event-card="true"
                              data-completed={ev.completed}
                              draggable={!resizingEvent}
                              onDragStart={e => {
                                e.stopPropagation();
                                setDragItem({
                                  type: 'task',
                                  id: ev.masterId,
                                  instanceDate: ev.instanceDate,
                                  isRecurringInstance: ev.isRecurringInstance,
                                });
                              }}
                              onClick={e => {
                                e.stopPropagation();
                                openEditTaskModal(ev);
                              }}
                              className={styles.dayTimedEventCard}
                              style={{
                                top: `${resizedPos.top}px`,
                                height: `${resizedPos.height}px`,
                                left: `calc(${item.leftPercent}% + 6px)`,
                                width: `calc(${item.widthPercent}% - 12px)`,
                                right: 'auto',
                                background: ev.completed
                                  ? 'var(--affine-background-secondary-color)'
                                  : `${color}24`,
                                border: `1px solid ${
                                  ev.completed
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
                                  checked={ev.completed}
                                  onClick={e => e.stopPropagation()}
                                  onChange={() =>
                                    handleToggleTask(ev.masterId)
                                  }
                                  style={{
                                    accentColor: color,
                                    cursor: 'pointer',
                                  }}
                                />
                                <div>
                                  <div
                                    className={styles.timedEventTitle}
                                    data-completed={ev.completed}
                                    style={{ fontSize: '13px' }}
                                  >
                                    {ev.title}{' '}
                                    {ev.isRecurringInstance ||
                                    (ev.recurrence &&
                                      ev.recurrence.frequency !== 'none')
                                      ? '🔁'
                                      : ''}
                                  </div>
                                  <div
                                    className={styles.timedEventTimeLabel}
                                    style={{ fontSize: '11px', marginTop: '2px' }}
                                  >
                                    <span>
                                      🕒 {timeRange}{' '}
                                      {ev.category ? `· 🏷️ ${ev.category}` : ''}
                                      {ev.location ? ` · 📍 ${ev.location}` : ''}
                                    </span>
                                    {ev.meetingUrl && (
                                      <a
                                        href={ev.meetingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className={styles.eventMeetBadge}
                                      >
                                        🎥 Unirse
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div
                                data-resize-handle="true"
                                onMouseDown={e =>
                                  handleResizeMouseDown(ev, e)
                                }
                                className={styles.eventResizeHandle}
                              />
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

            {/* ==================== MODE 5: 12-MONTH YEAR OVERVIEW ==================== */}
            {viewMode === 'year' && (
              <div className={styles.yearGridContainer}>
                {MONTH_NAMES_ES.map((monthName, monthIdx) => {
                  const monthStart = cursorDate
                    .month(monthIdx)
                    .startOf('month');
                  const monthEnd = monthStart.endOf('month');
                  const gridStart = monthStart.startOf('isoWeek');
                  const gridEnd = monthEnd.endOf('isoWeek');
                  const days: dayjs.Dayjs[] = [];
                  let cur = gridStart;
                  while (cur.isBefore(gridEnd) || cur.isSame(gridEnd, 'day')) {
                    days.push(cur);
                    cur = cur.add(1, 'day');
                  }
                  const monthPrefix = monthStart.format('YYYY-MM');
                  const monthEventCount = expandedTasks.filter(e =>
                    e.instanceDate.startsWith(monthPrefix)
                  ).length;

                  return (
                    <div key={monthName} className={styles.yearMonthCard}>
                      <div
                        className={styles.yearMonthHeader}
                        onClick={() => {
                          setCursorDate(monthStart);
                          setViewMode('month');
                        }}
                        title={`Abrir ${monthName} ${cursorDate.year()} en vista Mes`}
                      >
                        <span>
                          {monthName} {cursorDate.year()}
                        </span>
                        {monthEventCount > 0 && (
                          <span className={styles.eventMiniBadge}>
                            {monthEventCount} ev.
                          </span>
                        )}
                      </div>

                      <div className={styles.yearMonthWeekdays}>
                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                          <span key={i}>{d}</span>
                        ))}
                      </div>

                      <div className={styles.yearMonthDaysGrid}>
                        {days.map(day => {
                          const dStr = day.format(JOURNAL_DATE_FORMAT);
                          const isCurrentMonth = day.month() === monthIdx;
                          const isDayToday = dStr === todayStr;
                          const dayEvs = tasksByDate.get(dStr) || [];
                          const dayBds = boardCardsByDate.get(dStr) || [];
                          const totalItems = dayEvs.length + dayBds.length;

                          return (
                            <button
                              key={dStr}
                              type="button"
                              onClick={() => {
                                setCursorDate(day);
                                setViewMode('day');
                              }}
                              className={styles.yearDayBtn}
                              data-outside={!isCurrentMonth}
                              data-today={isDayToday}
                              data-has-events={totalItems > 0}
                              title={
                                totalItems > 0
                                  ? `${dStr}: ${totalItems} evento(s)`
                                  : dStr
                              }
                            >
                              <span>{day.date()}</span>
                              <div className={styles.yearDayDotsRow}>
                                {dayEvs.slice(0, 3).map(ev => (
                                  <span
                                    key={ev.id}
                                    className={styles.yearDayDot}
                                    style={{
                                      backgroundColor: isDayToday
                                        ? '#ffffff'
                                        : ev.color || '#3b82f6',
                                    }}
                                  />
                                ))}
                                {dayBds.length > 0 && dayEvs.length < 3 && (
                                  <span
                                    className={styles.yearDayDot}
                                    style={{
                                      backgroundColor: isDayToday
                                        ? '#ffffff'
                                        : '#a855f7',
                                    }}
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ==================== MODE 6: MONTHLY AGENDA & KPI VIEW ==================== */}
            {viewMode === 'agenda' && (
              <div className={styles.agendaContainer}>
                {/* KPI Summary Row */}
                <div className={styles.kpiGrid}>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>
                      Total Tareas & Entregas ({currentMonthLabel})
                    </span>
                    <span
                      className={styles.kpiValue}
                      style={{ color: '#3b82f6' }}
                    >
                      {monthStatsAndGroups.totalCount}
                    </span>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>Pendientes del Mes</span>
                    <span
                      className={styles.kpiValue}
                      style={{ color: '#d97706' }}
                    >
                      {monthStatsAndGroups.pendingCount}
                    </span>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>Completadas</span>
                    <span
                      className={styles.kpiValue}
                      style={{ color: '#10b981' }}
                    >
                      {monthStatsAndGroups.completedCount}
                    </span>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>
                      Notas Diarias & Semanales Creadas
                    </span>
                    <span
                      className={styles.kpiValue}
                      style={{ color: '#9333ea' }}
                    >
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
                                      onChange={() =>
                                        handleToggleTask(t.masterId)
                                      }
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
                                        {t.title}{' '}
                                        {t.recurrence &&
                                        t.recurrence.frequency !== 'none'
                                          ? `🔁 (${formatRecurrenceSummary(t.recurrence)})`
                                          : ''}
                                      </div>
                                      <div className={styles.agendaItemMeta}>
                                        📅 {t.instanceDate}{' '}
                                        {t.startTime || t.time
                                          ? `· 🕒 ${formatEventTimeRange(t.startTime || t.time, t.endTime)}`
                                          : ''}
                                        {t.location ? ` · 📍 ${t.location}` : ''}
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

          {/* Right Collapsible Sidebar: Mini Calendar + Mis Calendarios + Unscheduled Boards */}
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
                      onClick={() =>
                        setMiniCalMonth(m => m.subtract(1, 'month'))
                      }
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
                    const start = miniCalMonth
                      .startOf('month')
                      .startOf('isoWeek');
                    const end = miniCalMonth.endOf('month').endOf('isoWeek');
                    const cells: dayjs.Dayjs[] = [];
                    let cur = start;
                    while (cur.isBefore(end) || cur.isSame(end, 'day')) {
                      cells.push(cur);
                      cur = cur.add(1, 'day');
                    }
                    return cells.map(day => {
                      const dStr = day.format(JOURNAL_DATE_FORMAT);
                      const isCurrentMonth =
                        day.month() === miniCalMonth.month();
                      const isSelected =
                        dStr === cursorDate.format(JOURNAL_DATE_FORMAT);
                      const isDayToday = dStr === todayStr;

                      return (
                        <button
                          key={dStr}
                          onClick={() => {
                            setCursorDate(day);
                            if (viewMode === 'month' || viewMode === 'year') {
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

              {/* Mis Calendarios Layer Manager & Google / .ics Sync Controls */}
              <div className={styles.myCalendarsCard}>
                <div className={styles.myCalendarsHeader}>
                  <span>📅 Mis Calendarios</span>
                  <span className={styles.calendarLayerBadge}>
                    {calendarLayers.filter(l => l.visible).length}/
                    {calendarLayers.length}
                  </span>
                </div>

                <div className={styles.calendarLayerList}>
                  {calendarLayers.map(layer => {
                    const sourceBadge =
                      layer.type === 'google-api'
                        ? 'Google'
                        : layer.type === 'google-ics'
                          ? 'iCal'
                          : 'Local';
                    const isDefaultLayer = DEFAULT_CALENDAR_LAYERS.some(
                      d => d.id === layer.id
                    );

                    return (
                      <div key={layer.id} className={styles.calendarLayerRow}>
                        <label className={styles.calendarLayerLeft}>
                          <input
                            type="checkbox"
                            checked={layer.visible}
                            onChange={() => handleToggleLayerVisible(layer.id)}
                            style={{
                              accentColor: layer.color,
                              cursor: 'pointer',
                              margin: 0,
                            }}
                          />
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: layer.color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            className={styles.calendarLayerName}
                            title={layer.name}
                          >
                            {layer.name}
                          </span>
                        </label>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span className={styles.calendarLayerBadge}>
                            {sourceBadge}
                          </span>
                          {!isDefaultLayer && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteCalendarLayer(layer.id)
                              }
                              className={styles.navBtn}
                              style={{ padding: '1px 4px', fontSize: '10px' }}
                              title="Eliminar calendario y sus eventos"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.calendarLayerActionsRow}>
                  <button
                    type="button"
                    onClick={() => {
                      setSyncStatusMsg(null);
                      setIsSyncModalOpen(true);
                    }}
                    data-testid="calendar-open-sync-modal-btn"
                    className={styles.calendarLayerActionBtn}
                  >
                    🔄 Sincronizar Google / iCal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ics = exportEventsToIcs(
                        filteredTasks,
                        'AFFiNITe Calendar'
                      );
                      triggerIcsDownload(
                        ics,
                        `affinite-calendar-${dayjs().format('YYYY-MM-DD')}.ics`
                      );
                    }}
                    data-testid="calendar-export-ics-btn"
                    className={styles.calendarLayerActionBtn}
                  >
                    📤 Exportar .ics
                  </button>
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
                  Arrastra una tarjeta a cualquier día o franja horaria del
                  calendario:
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

        {/* ==================== CREATE / EDIT EVENT MODAL (PKM PRO v3) ==================== */}
        <Modal
          open={isTaskModalOpen}
          onOpenChange={setIsTaskModalOpen}
          width={620}
          contentOptions={{
            style: { padding: '24px', maxHeight: '90vh', overflowY: 'auto' },
          }}
        >
          <div className={styles.modalForm}>
            <h2 className={styles.modalHeaderTitle}>
              {editingTask
                ? 'Editar Tarea / Evento'
                : 'Nueva Tarea / Evento del Calendario'}
            </h2>

            {/* PKM Superpower Action Bar */}
            <div className={styles.pkmSuperpowerBar}>
              <button
                type="button"
                onClick={handleCreateOrOpenMeetingDoc}
                data-testid="calendar-modal-meeting-note-btn"
                className={styles.pkmActionBtn}
              >
                📝{' '}
                {formLinkedDocId
                  ? 'Abrir Nota de Reunión vinculada'
                  : 'Crear Nota de Reunión en AFFiNITe'}
              </button>
              <button
                type="button"
                onClick={handleOpenGoogleTemplate}
                data-testid="calendar-modal-google-template-btn"
                className={styles.pkmActionBtn}
              >
                🌐 Añadir a Google Calendar
              </button>
              {formMeetingUrl.trim() && (
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      formMeetingUrl.trim(),
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  className={styles.pkmActionBtn}
                  style={{
                    borderColor: 'rgba(16, 185, 129, 0.5)',
                    color: '#10b981',
                  }}
                >
                  🎥 Unirse a Videollamada
                </button>
              )}
            </div>

            {/* Title */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Título</label>
              <input
                type="text"
                placeholder="Ej: Sprint Planning, Entregar reporte semanal, Clase de Cálculo..."
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                autoFocus
                className={styles.formInput}
              />
            </div>

            {/* Calendar Layer & Color Swatches */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Calendario</label>
                <select
                  value={formCalendarId}
                  onChange={e => {
                    const nextCalId = e.target.value;
                    setFormCalendarId(nextCalId);
                    const layer = calendarLayers.find(l => l.id === nextCalId);
                    if (layer) {
                      setFormColor(layer.color);
                    }
                  }}
                  className={styles.formSelect}
                >
                  {calendarLayers.map(layer => (
                    <option key={layer.id} value={layer.id}>
                      {layer.name}
                    </option>
                  ))}
                </select>
              </div>

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
                          <span style={{ fontSize: '11px', color: '#fff' }}>
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Start Date, End Date (Multi-Day) & All-Day Toggle */}
            <div className={styles.formRow} style={{ alignItems: 'end' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Fecha Inicio</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Fecha Fin (opcional multi-día)
                </label>
                <input
                  type="date"
                  value={formEndDate}
                  min={formDate}
                  onChange={e => setFormEndDate(e.target.value)}
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

            {/* Recurrence (RRULE) & Reminder */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Repetición (RRULE)</label>
                <select
                  value={formRecurrenceFreq}
                  onChange={e =>
                    setFormRecurrenceFreq(
                      e.target.value as RecurrenceFrequency
                    )
                  }
                  className={styles.formSelect}
                >
                  <option value="none">No se repite</option>
                  <option value="daily">Todos los días</option>
                  <option value="weekdays">Días laborales (Lun–Vie)</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>

              {formRecurrenceFreq !== 'none' && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Repetir hasta (opcional)
                  </label>
                  <input
                    type="date"
                    value={formRecurrenceUntil}
                    min={formDate}
                    onChange={e => setFormRecurrenceUntil(e.target.value)}
                    className={styles.formInput}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Recordatorio</label>
                <select
                  value={formReminderMinutes}
                  onChange={e => setFormReminderMinutes(e.target.value)}
                  className={styles.formSelect}
                >
                  <option value="">Sin recordatorio</option>
                  <option value="5">5 minutos antes</option>
                  <option value="10">10 minutos antes</option>
                  <option value="15">15 minutos antes</option>
                  <option value="30">30 minutos antes</option>
                  <option value="60">1 hora antes</option>
                </select>
              </div>
            </div>

            {/* Location & Conference Link (Meet / Zoom / Teams) */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ubicación / Aula</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  placeholder="Ej: Sala 302, Edificio Ingeniería, Remoto..."
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Videollamada (Google Meet / Zoom / Teams)
                </label>
                <input
                  type="url"
                  value={formMeetingUrl}
                  onChange={e => setFormMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className={styles.formInput}
                />
              </div>
            </div>

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
                placeholder="Detalles, agenda de la reunión o criterios de entrega..."
                className={styles.formTextarea}
              />
            </div>

            <div className={styles.modalActionsRow}>
              {editingTask ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {editingTask.recurrence &&
                  editingTask.recurrence.frequency !== 'none' &&
                  editingOccurrenceDate ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteSingleOccurrence(
                            editingTask,
                            editingOccurrenceDate
                          )
                        }
                        className={styles.dangerActionButton}
                        title="Excluir únicamente esta fecha de la serie recurrente"
                      >
                        Eliminar solo esta fecha
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(editingTask.id)}
                        className={styles.dangerActionButton}
                      >
                        Eliminar toda la serie
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(editingTask.id)}
                      className={styles.dangerActionButton}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
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

        {/* ==================== GOOGLE CALENDAR & .ICS SYNC MODAL ==================== */}
        <Modal
          open={isSyncModalOpen}
          onOpenChange={setIsSyncModalOpen}
          width={640}
          contentOptions={{
            style: { padding: '24px', maxHeight: '88vh', overflowY: 'auto' },
          }}
        >
          <div className={styles.modalForm}>
            <h2 className={styles.modalHeaderTitle}>
              🔄 Sincronización con Google Calendar & iCalendar (.ics)
            </h2>

            {/* 3 Sync Tabs */}
            <div className={styles.syncModalTabs}>
              <button
                type="button"
                onClick={() => {
                  setSyncTab('ics-url');
                  setSyncStatusMsg(null);
                }}
                data-active={syncTab === 'ics-url'}
                className={styles.syncModalTabBtn}
              >
                🔗 Suscripción URL .ics
              </button>
              <button
                type="button"
                onClick={() => {
                  setSyncTab('google-api');
                  setSyncStatusMsg(null);
                }}
                data-active={syncTab === 'google-api'}
                className={styles.syncModalTabBtn}
              >
                ☁️ Google Calendar API
              </button>
              <button
                type="button"
                onClick={() => {
                  setSyncTab('ics-file');
                  setSyncStatusMsg(null);
                }}
                data-active={syncTab === 'ics-file'}
                className={styles.syncModalTabBtn}
              >
                📁 Archivo .ics (RFC 5545)
              </button>
            </div>

            {syncStatusMsg && (
              <div className={styles.syncStatusBanner}>{syncStatusMsg}</div>
            )}

            {/* TAB 1: URL .ics Subscription */}
            {syncTab === 'ics-url' && (
              <>
                <div className={styles.syncHelpBox}>
                  💡 <strong>Cómo conectar tu Google Calendar en 10 segundos:</strong>{' '}
                  En Google Calendar web ve a{' '}
                  <em>Configuración → Tu calendario → Integrar el calendario</em>{' '}
                  y copia la{' '}
                  <strong>
                    &ldquo;Dirección pública o secreta en formato iCal (.ics)&rdquo;
                  </strong>
                  . También funciona con Outlook, Apple iCloud y calendarios
                  universitarios Moodle/Canvas.
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Nombre del Calendario
                    </label>
                    <input
                      type="text"
                      value={syncIcsName}
                      onChange={e => setSyncIcsName(e.target.value)}
                      placeholder="Ej: Google Personal, Universidad..."
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Color</label>
                    <div className={styles.colorSwatchesRow}>
                      {COLOR_PRESETS.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSyncIcsColor(c.id)}
                          className={styles.colorSwatchBtn}
                          data-selected={syncIcsColor === c.id}
                          style={{ background: c.id }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    URL del Feed iCal (https://...basic.ics o webcal://...)
                  </label>
                  <input
                    type="url"
                    value={syncIcsUrl}
                    onChange={e => setSyncIcsUrl(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                    className={styles.formInput}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={isSyncing || !syncIcsUrl.trim()}
                    onClick={handleSubscribeIcsFeed}
                    className={styles.primaryActionButton}
                  >
                    {isSyncing
                      ? 'Sincronizando...'
                      : '🔗 Suscribir y Sincronizar ahora'}
                  </button>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleRefreshAllIcsFeeds}
                    className={styles.secondaryActionButton}
                  >
                    🔄 Actualizar todas las suscripciones .ics
                  </button>
                </div>
              </>
            )}

            {/* TAB 2: Google Calendar REST API (Bidirectional) */}
            {syncTab === 'google-api' && (
              <>
                <div className={styles.syncHelpBox}>
                  ☁️ <strong>Sincronización Bidireccional con Google Calendar API v3:</strong>{' '}
                  Importa eventos (incluyendo Google Meet, asistentes y reglas{' '}
                  <code>RRULE</code>) o sube tus eventos locales de AFFiNITe a tu
                  cuenta de Google.
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Google OAuth 2.0 Access Token (Bearer)
                  </label>
                  <input
                    type="password"
                    value={googleConfig.accessToken || ''}
                    onChange={e =>
                      setGoogleConfig(prev => ({
                        ...prev,
                        accessToken: e.target.value,
                      }))
                    }
                    placeholder="ya29.a0AfH6SM..."
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Calendar ID (por defecto: primary)
                    </label>
                    <input
                      type="text"
                      value={googleConfig.calendarId || 'primary'}
                      onChange={e =>
                        setGoogleConfig(prev => ({
                          ...prev,
                          calendarId: e.target.value,
                        }))
                      }
                      placeholder="primary o tu-correo@gmail.com"
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Client ID (opcional OAuth Desktop)
                    </label>
                    <input
                      type="text"
                      value={googleConfig.clientId || ''}
                      onChange={e =>
                        setGoogleConfig(prev => ({
                          ...prev,
                          clientId: e.target.value,
                        }))
                      }
                      placeholder="123456-abc.apps.googleusercontent.com"
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleGoogleApiPull}
                    className={styles.primaryActionButton}
                  >
                    📥 Importar de Google Calendar API
                  </button>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleGoogleApiPush}
                    className={styles.secondaryActionButton}
                  >
                    📤 Subir eventos locales a Google Calendar
                  </button>
                </div>
              </>
            )}

            {/* TAB 3: Local .ics File Import / Export */}
            {syncTab === 'ics-file' && (
              <>
                <div className={styles.syncHelpBox}>
                  📁 <strong>Importar o Exportar archivo estándar RFC 5545 (.ics):</strong>{' '}
                  Compatible con Google Calendar, Apple Calendar, Microsoft
                  Outlook, Proton Calendar y Thunderbird.
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Calendario destino para importación
                    </label>
                    <select
                      value={importTargetCalId}
                      onChange={e => setImportTargetCalId(e.target.value)}
                      className={styles.formSelect}
                    >
                      {calendarLayers.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Seleccionar archivo .ics desde tu equipo
                    </label>
                    <input
                      type="file"
                      accept=".ics,text/calendar"
                      onChange={handleImportIcsFile}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      const ics = exportEventsToIcs(
                        tasks,
                        'AFFiNITe Calendar Completo'
                      );
                      triggerIcsDownload(
                        ics,
                        `affinite-full-backup-${dayjs().format('YYYY-MM-DD')}.ics`
                      );
                      setSyncStatusMsg(
                        `✅ Archivo .ics exportado con ${tasks.length} eventos.`
                      );
                    }}
                    className={styles.primaryActionButton}
                  >
                    📤 Descargar Calendario Completo (.ics)
                  </button>
                </div>
              </>
            )}

            <div className={styles.modalActionsRow}>
              <div />
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className={styles.secondaryActionButton}
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      </ViewBody>
    </>
  );
};
