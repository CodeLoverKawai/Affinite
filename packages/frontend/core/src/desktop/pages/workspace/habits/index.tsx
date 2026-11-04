import { Modal } from '@affine/component';
import {
  ALL_PRESET_COLORS,
  describeSchedule,
  getReadableTextColor,
  HABIT_ICON_GROUPS,
  type HabitSchedule,
  isValidHexColor,
  nextScheduledDates,
  normalizeHexColor,
  normalizeSchedule,
  searchIcons,
} from '@affine/core/modules/affinite-hub';
import { CheckBoxCheckSolidIcon, PlusIcon } from '@blocksuite/icons/rc';
import { useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  formatWeeklyJournalKey,
  getWeekDateRange,
  JOURNAL_DATE_FORMAT,
} from '../../../../modules/journal';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '../../../../modules/workbench';
import { WorkspaceService } from '../../../../modules/workspace';
import * as styles from './habits.css';
import {
  calculateMonthlyConsistency,
  calculateStreak,
  calculateWeeklyConsistency,
  type HabitType,
  isHabitDoneOnDate,
  parseHabitsPayload,
} from './habits-calculator';
import {
  buildScheduleFromForm,
  isMatrixDayScheduled,
  sanitizeReminder,
  type ScheduleMode,
} from './habits-form';

dayjs.extend(isLeapYear);
dayjs.extend(isoWeek);
dayjs.extend(isoWeeksInYear);

export interface Habit {
  id: string;
  title: string;
  category:
    | 'Salud'
    | 'Estudio'
    | 'Fitness'
    | 'Mente'
    | 'Finanzas'
    | 'Productividad'
    | 'Otro';
  icon: string;
  type: HabitType;
  targetValue?: number;
  unit?: string;
  color: string;
  schedule?: HabitSchedule;
  reminderTime?: string;
  reminderMinutes?: number;
  createdAt: number;
  entries: Record<string, boolean | number>; // 'YYYY-MM-DD' -> true | number
}

const DEFAULT_HABITS: Habit[] = [
  {
    id: 'habit-water',
    title: 'Tomar 2L de Agua',
    category: 'Salud',
    icon: '💧',
    type: 'quantitative',
    targetValue: 2000,
    unit: 'ml',
    color: '#3b82f6',
    schedule: { mode: 'daily' },
    createdAt: Date.now() - 86400000 * 7,
    entries: {},
  },
  {
    id: 'habit-exercise',
    title: 'Ejercicio / Caminata 30 min',
    category: 'Fitness',
    icon: '🏃',
    type: 'boolean',
    color: '#10b981',
    schedule: { mode: 'daily' },
    createdAt: Date.now() - 86400000 * 7,
    entries: {},
  },
  {
    id: 'habit-reading',
    title: 'Lectura 20 Páginas',
    category: 'Estudio',
    icon: '📚',
    type: 'quantitative',
    targetValue: 20,
    unit: 'págs',
    color: '#f59e0b',
    schedule: { mode: 'daily' },
    createdAt: Date.now() - 86400000 * 7,
    entries: {},
  },
  {
    id: 'habit-meditation',
    title: 'Meditación & Respiración',
    category: 'Mente',
    icon: '🧘',
    type: 'boolean',
    color: '#8b5cf6',
    schedule: { mode: 'daily' },
    createdAt: Date.now() - 86400000 * 7,
    entries: {},
  },
  {
    id: 'habit-code',
    title: 'Progreso en Código / Proyecto',
    category: 'Productividad',
    icon: '💻',
    type: 'boolean',
    color: '#06b6d4',
    schedule: { mode: 'daily' },
    createdAt: Date.now() - 86400000 * 7,
    entries: {},
  },
];

const CATEGORIES: Habit['category'][] = [
  'Salud',
  'Fitness',
  'Estudio',
  'Mente',
  'Productividad',
  'Finanzas',
  'Otro',
];

export const Component = () => {
  const workspaceService = useService(WorkspaceService);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(() =>
    formatWeeklyJournalKey(dayjs())
  );
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'heatmap'>(
    'weekly'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');

  // Habit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<Habit['category']>('Salud');
  const [formIcon, setFormIcon] = useState('💧');
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [selectedIconGroupId, setSelectedIconGroupId] = useState(
    HABIT_ICON_GROUPS[0]?.id ?? 'salud'
  );
  const [formType, setFormType] = useState<HabitType>('boolean');
  const [formTarget, setFormTarget] = useState<number>(1);
  const [formUnit, setFormUnit] = useState('');
  const [formColor, setFormColor] = useState('#3b82f6');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('daily');
  const [scheduleWeekdays, setScheduleWeekdays] = useState<number[]>([
    1, 2, 3, 4, 5,
  ]);
  const [scheduleIntervalEvery, setScheduleIntervalEvery] = useState<number>(2);
  const [scheduleIntervalAnchor, setScheduleIntervalAnchor] = useState<string>(
    () => dayjs().format(JOURNAL_DATE_FORMAT)
  );
  const [scheduleWeeklyTimes, setScheduleWeeklyTimes] = useState<number>(3);
  const [formReminderTime, setFormReminderTime] = useState<string>('');
  const [formReminderMinutes, setFormReminderMinutes] = useState<number>(0);

  // 1. Sync Habits from Workspace Yjs Map
  useEffect(() => {
    const rootYDoc = workspaceService.workspace.rootYDoc;
    const yMap = rootYDoc.getMap('affinite_habits_v1');

    const syncFromYjs = () => {
      const raw = yMap.get('habits');
      if (!raw) {
        setHabits([]);
        return;
      }

      const parsed = parseHabitsPayload(raw);
      if (parsed && parsed.length > 0) {
        const normalizedHabits: Habit[] = parsed.map((item, idx) => ({
          id: item.id,
          title: item.title,
          category: (CATEGORIES.includes(item.category as Habit['category'])
            ? item.category
            : 'Otro') as Habit['category'],
          icon: item.icon,
          type: item.type,
          targetValue: item.targetValue,
          unit: item.unit,
          color:
            item.color || ALL_PRESET_COLORS[idx % ALL_PRESET_COLORS.length],
          schedule: item.schedule,
          reminderTime: item.reminderTime,
          reminderMinutes: item.reminderMinutes,
          createdAt:
            typeof item.createdAt === 'number'
              ? item.createdAt
              : Date.now() - 86400000 * 7,
          entries: item.entries,
        }));
        setHabits(normalizedHabits);
      } else {
        setHabits([]);
      }
    };

    syncFromYjs();
    yMap.observe(syncFromYjs);
    return () => {
      yMap.unobserve(syncFromYjs);
    };
  }, [workspaceService]);

  const saveHabitsToYjs = useCallback(
    (newHabits: Habit[]) => {
      setHabits(newHabits);
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_habits_v1');
      const serialized = JSON.stringify(newHabits);
      yMap.set('habits', serialized);
    },
    [workspaceService]
  );

  const handleLoadDefaultHabits = useCallback(() => {
    saveHabitsToYjs(DEFAULT_HABITS);
  }, [saveHabitsToYjs]);

  // Toggle or increment habit entry for a date
  const handleToggleHabitEntry = useCallback(
    (habitId: string, dateStr: string) => {
      const targetHabit = habits.find(h => h.id === habitId);
      if (!targetHabit || !isMatrixDayScheduled(targetHabit.schedule, dateStr)) {
        return;
      }

      const nextHabits = habits.map(h => {
        if (h.id !== habitId) return h;
        const currentVal = h.entries[dateStr];
        const newEntries = { ...h.entries };

        if (h.type === 'boolean') {
          newEntries[dateStr] = !currentVal;
        } else {
          // Quantitative: toggle between 0 and targetValue
          const target = h.targetValue ?? 1;
          const numVal = typeof currentVal === 'number' ? currentVal : 0;
          newEntries[dateStr] = numVal >= target ? 0 : target;
        }
        return { ...h, entries: newEntries };
      });
      saveHabitsToYjs(nextHabits);
    },
    [habits, saveHabitsToYjs]
  );

  const handleAdjustQuantitative = useCallback(
    (habitId: string, dateStr: string, delta: number) => {
      const targetHabit = habits.find(h => h.id === habitId);
      if (!targetHabit || !isMatrixDayScheduled(targetHabit.schedule, dateStr)) {
        return;
      }

      const nextHabits = habits.map(h => {
        if (h.id !== habitId) return h;
        const currentVal = h.entries[dateStr];
        const numVal = typeof currentVal === 'number' ? currentVal : 0;
        const step = h.targetValue && h.targetValue >= 100 ? 250 : 1;
        const newVal = Math.max(0, numVal + delta * step);
        return {
          ...h,
          entries: {
            ...h.entries,
            [dateStr]: newVal,
          },
        };
      });
      saveHabitsToYjs(nextHabits);
    },
    [habits, saveHabitsToYjs]
  );

  // Filtered habits
  const filteredHabits = useMemo(() => {
    if (categoryFilter === 'Todas') return habits;
    return habits.filter(h => h.category === categoryFilter);
  }, [categoryFilter, habits]);

  // Current Week Days (Monday to Sunday)
  const currentWeekDays = useMemo(() => {
    const { start } = getWeekDateRange(selectedWeekKey);
    const dayNames = [
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ];
    const dayShorts = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const todayStr = dayjs().format(JOURNAL_DATE_FORMAT);

    return Array.from({ length: 7 }, (_, i) => {
      const d = start.add(i, 'day');
      const dateStr = d.format(JOURNAL_DATE_FORMAT);
      return {
        dateStr,
        dayName: dayNames[i],
        dayShort: dayShorts[i],
        dayNumber: d.date(),
        isToday: dateStr === todayStr,
      };
    });
  }, [selectedWeekKey]);

  // Navigation handlers
  const handlePrevWeek = () => {
    const { start } = getWeekDateRange(selectedWeekKey);
    setSelectedWeekKey(formatWeeklyJournalKey(start.subtract(1, 'week')));
  };

  const handleNextWeek = () => {
    const { start } = getWeekDateRange(selectedWeekKey);
    setSelectedWeekKey(formatWeeklyJournalKey(start.add(1, 'week')));
  };

  const handleThisWeek = () => {
    setSelectedWeekKey(formatWeeklyJournalKey(dayjs()));
  };

  // Modal Handlers
  const openCreateModal = () => {
    setEditingHabit(null);
    setFormTitle('');
    setFormCategory('Salud');
    setFormIcon('💧');
    setIconSearchQuery('');
    setSelectedIconGroupId(HABIT_ICON_GROUPS[0]?.id ?? 'salud');
    setFormType('boolean');
    setFormTarget(1);
    setFormUnit('');
    setFormColor('#3b82f6');
    setScheduleMode('daily');
    setScheduleWeekdays([1, 2, 3, 4, 5]);
    setScheduleIntervalEvery(2);
    setScheduleIntervalAnchor(dayjs().format(JOURNAL_DATE_FORMAT));
    setScheduleWeeklyTimes(3);
    setFormReminderTime('');
    setFormReminderMinutes(0);
    setIsModalOpen(true);
  };

  const openEditModal = (h: Habit) => {
    setEditingHabit(h);
    setFormTitle(h.title);
    setFormCategory(h.category);
    setFormIcon(h.icon);
    setIconSearchQuery('');
    setSelectedIconGroupId(HABIT_ICON_GROUPS[0]?.id ?? 'salud');
    setFormType(h.type);
    setFormTarget(h.targetValue ?? 1);
    setFormUnit(h.unit ?? '');
    setFormColor(h.color);

    const norm = normalizeSchedule(h.schedule);
    setScheduleMode(norm.mode);
    if (norm.mode === 'weekdays') {
      setScheduleWeekdays(norm.days);
      setScheduleIntervalEvery(2);
      setScheduleIntervalAnchor(dayjs().format(JOURNAL_DATE_FORMAT));
      setScheduleWeeklyTimes(3);
    } else if (norm.mode === 'interval') {
      setScheduleWeekdays([1, 2, 3, 4, 5]);
      setScheduleIntervalEvery(norm.every);
      setScheduleIntervalAnchor(norm.anchor);
      setScheduleWeeklyTimes(3);
    } else if (norm.mode === 'weekly-count') {
      setScheduleWeekdays([1, 2, 3, 4, 5]);
      setScheduleIntervalEvery(2);
      setScheduleIntervalAnchor(dayjs().format(JOURNAL_DATE_FORMAT));
      setScheduleWeeklyTimes(norm.timesPerWeek);
    } else {
      setScheduleWeekdays([1, 2, 3, 4, 5]);
      setScheduleIntervalEvery(2);
      setScheduleIntervalAnchor(dayjs().format(JOURNAL_DATE_FORMAT));
      setScheduleWeeklyTimes(3);
    }

    setFormReminderTime(h.reminderTime ?? '');
    setFormReminderMinutes(h.reminderMinutes ?? 0);
    setIsModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!formTitle.trim()) return;

    const schedule = buildScheduleFromForm({
      scheduleMode,
      scheduleWeekdays,
      scheduleIntervalEvery,
      scheduleIntervalAnchor,
      scheduleWeeklyTimes,
    });

    const { reminderTime, reminderMinutes } = sanitizeReminder(
      formReminderTime,
      formReminderMinutes
    );

    const color = isValidHexColor(formColor)
      ? normalizeHexColor(formColor)
      : '#3b82f6';

    if (editingHabit) {
      const nextHabits = habits.map(h =>
        h.id === editingHabit.id
          ? {
              ...h,
              title: formTitle.trim(),
              category: formCategory,
              icon: formIcon,
              type: formType,
              targetValue:
                formType === 'quantitative' ? Number(formTarget) : undefined,
              unit: formType === 'quantitative' ? formUnit.trim() : undefined,
              color,
              schedule,
              reminderTime,
              reminderMinutes,
            }
          : h
      );
      saveHabitsToYjs(nextHabits);
    } else {
      const created: Habit = {
        id: `habit-${Date.now()}`,
        title: formTitle.trim(),
        category: formCategory,
        icon: formIcon,
        type: formType,
        targetValue:
          formType === 'quantitative' ? Number(formTarget) : undefined,
        unit: formType === 'quantitative' ? formUnit.trim() : undefined,
        color,
        schedule,
        reminderTime,
        reminderMinutes,
        createdAt: Date.now(),
        entries: {},
      };
      saveHabitsToYjs([...habits, created]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteHabit = (id: string) => {
    saveHabitsToYjs(habits.filter(h => h.id !== id));
    setIsModalOpen(false);
  };

  // Overall Global Metrics
  const globalMetrics = useMemo(() => {
    const todayStr = dayjs().format(JOURNAL_DATE_FORMAT);
    let maxBestStreak = 0;
    let totalDoneToday = 0;
    let totalScheduledToday = 0;
    let totalWeeklyPercentages = 0;

    for (const h of habits) {
      const streak = calculateStreak(
        h.entries,
        h.type,
        h.targetValue,
        undefined,
        h.schedule
      );
      if (streak.bestStreak > maxBestStreak) maxBestStreak = streak.bestStreak;

      if (isMatrixDayScheduled(h.schedule, todayStr)) {
        totalScheduledToday++;
        if (isHabitDoneOnDate(h.entries[todayStr], h.type, h.targetValue)) {
          totalDoneToday++;
        }
      }

      const weekly = calculateWeeklyConsistency(
        h.entries,
        selectedWeekKey,
        h.type,
        h.targetValue,
        h.schedule
      );
      totalWeeklyPercentages += weekly.percentage;
    }

    const avgWeeklyConsistency =
      habits.length > 0
        ? Math.round(totalWeeklyPercentages / habits.length)
        : 0;

    return {
      totalHabits: habits.length,
      maxBestStreak,
      totalDoneToday,
      totalScheduledToday: totalScheduledToday || habits.length,
      avgWeeklyConsistency,
    };
  }, [habits, selectedWeekKey]);

  // Dynamic schedule preview text
  const currentModalSchedule = useMemo(
    () =>
      buildScheduleFromForm({
        scheduleMode,
        scheduleWeekdays,
        scheduleIntervalEvery,
        scheduleIntervalAnchor,
        scheduleWeeklyTimes,
      }),
    [
      scheduleMode,
      scheduleWeekdays,
      scheduleIntervalEvery,
      scheduleIntervalAnchor,
      scheduleWeeklyTimes,
    ]
  );

  const schedulePreviewText = useMemo(() => {
    const desc = describeSchedule(currentModalSchedule);
    if (currentModalSchedule.mode === 'weekly-count') {
      return `🗓️ ${desc} (distribución flexible)`;
    }
    const dates = nextScheduledDates(currentModalSchedule, undefined, 4);
    if (dates.length === 0) {
      return `🗓️ ${desc}`;
    }
    const dayNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNamesShort = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const formatted = dates.map(d => {
      const dj = dayjs(d);
      return `${dayNamesShort[dj.day()]} ${dj.date()} ${monthNamesShort[dj.month()]}`;
    });
    return `🗓️ ${desc} · Próximos: ${formatted.join(', ')}`;
  }, [currentModalSchedule]);

  // Icons displayed in the modal
  const displayedIcons = useMemo(() => {
    const query = iconSearchQuery.trim();
    if (query) {
      return searchIcons(query);
    }
    const group =
      HABIT_ICON_GROUPS.find(g => g.id === selectedIconGroupId) ??
      HABIT_ICON_GROUPS[0];
    return group ? group.icons : [];
  }, [iconSearchQuery, selectedIconGroupId]);

  return (
    <>
      <ViewTitle title="Hábitos & Rutinas" />
      <ViewIcon icon="habits" />
      <ViewHeader>
        <div className={styles.headerBar}>
          <div className={styles.headerLeftGroup}>
            <div className={styles.headerTitle}>
              <CheckBoxCheckSolidIcon
                style={{ width: 22, height: 22, color: '#10b981' }}
              />
              <span>Hábitos & Rutinas</span>
            </div>

            <div className={styles.segmentedControl}>
              <button
                type="button"
                onClick={handlePrevWeek}
                className={styles.segmentButton}
              >
                ◀
              </button>
              <button
                type="button"
                onClick={handleThisWeek}
                className={styles.weekLabelBtn}
              >
                {selectedWeekKey}
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                className={styles.segmentButton}
              >
                ▶
              </button>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className={styles.segmentedControl}>
            {(
              [
                { id: 'weekly', label: '🗓️ Matriz Semanal' },
                { id: 'monthly', label: '📅 Mes' },
                { id: 'heatmap', label: '🔥 Heatmap 365' },
              ] as const
            ).map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-active={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={styles.segmentButton}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Action button */}
          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={openCreateModal}
              className={styles.primaryActionButton}
            >
              <PlusIcon style={{ width: 14, height: 14 }} />
              <span>Nuevo Hábito</span>
            </button>
          </div>
        </div>
      </ViewHeader>

      <ViewBody>
        <div className={styles.pageBody}>
          <div className={styles.pageContainer}>
            {/* Top KPI Cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Hábitos Activos</span>
                <span className={styles.kpiValueBrand}>
                  {globalMetrics.totalHabits}
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Completados Hoy</span>
                <span className={styles.kpiValueSuccess}>
                  {globalMetrics.totalDoneToday} /{' '}
                  {globalMetrics.totalScheduledToday}
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Consistencia Semanal</span>
                <span className={styles.kpiValueWarning}>
                  {globalMetrics.avgWeeklyConsistency}%
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Mejor Racha Global</span>
                <span className={styles.kpiValueStreak}>
                  🔥 {globalMetrics.maxBestStreak} días
                </span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className={styles.categoryFilterCard}>
              <span className={styles.categoryFilterLabel}>Categoría:</span>
              {['Todas', ...CATEGORIES].map(cat => {
                const active = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    data-active={active}
                    onClick={() => setCategoryFilter(cat)}
                    className={styles.filterPill}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Empty State when no habits */}
            {filteredHabits.length === 0 ? (
              <div className={styles.emptyStateContainer}>
                <div className={styles.emptyStateIcon}>🎯</div>
                <div className={styles.emptyStateTitle}>
                  {habits.length === 0
                    ? 'Empieza a construir hábitos'
                    : 'No hay hábitos en esta categoría'}
                </div>
                <div className={styles.emptyStateDesc}>
                  {habits.length === 0
                    ? 'Define rutinas diarias o con repetición personalizada, monitorea tu consistencia y alcanza tus metas.'
                    : `No se encontraron hábitos en la categoría "${categoryFilter}".`}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className={styles.primaryActionButton}
                  >
                    <PlusIcon style={{ width: 14, height: 14 }} />
                    <span>Nuevo Hábito</span>
                  </button>
                  {habits.length === 0 && (
                    <button
                      type="button"
                      onClick={handleLoadDefaultHabits}
                      className={styles.templateButton}
                    >
                      <span>✨ Cargar Plantillas Sugeridas</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* ==================== TAB 1: WEEKLY HABIT MATRIX ==================== */}
                {activeTab === 'weekly' && (
                  <div className={styles.matrixCard}>
                    {/* Table Header */}
                    <div className={styles.matrixHeaderRow}>
                      <div className={styles.matrixHeaderHabitCell}>
                        Hábito / Rutina
                      </div>

                      {currentWeekDays.map(d => (
                        <div
                          key={d.dateStr}
                          data-today={d.isToday}
                          className={styles.matrixHeaderDayCell}
                        >
                          <div
                            data-today={d.isToday}
                            className={styles.matrixDayShort}
                          >
                            {d.dayShort}
                          </div>
                          <div
                            data-today={d.isToday}
                            className={styles.matrixDayNumber}
                          >
                            {d.dayNumber}
                          </div>
                        </div>
                      ))}

                      <div className={styles.matrixHeaderStreakCell}>
                        Racha 🔥
                      </div>
                    </div>

                    {/* Habit Rows */}
                    {filteredHabits.map(h => {
                      const streak = calculateStreak(
                        h.entries,
                        h.type,
                        h.targetValue,
                        undefined,
                        h.schedule
                      );
                      const weekly = calculateWeeklyConsistency(
                        h.entries,
                        selectedWeekKey,
                        h.type,
                        h.targetValue,
                        h.schedule
                      );
                      const textColor = getReadableTextColor(h.color);

                      return (
                        <div key={h.id} className={styles.matrixRow}>
                          {/* Left Info */}
                          <div
                            onClick={() => openEditModal(h)}
                            className={styles.matrixHabitInfoCell}
                          >
                            <span className={styles.matrixHabitIcon}>
                              {h.icon}
                            </span>
                            <div style={{ overflow: 'hidden' }}>
                              <div className={styles.matrixHabitTitle}>
                                {h.title}
                              </div>
                              <div className={styles.matrixHabitMeta}>
                                {h.category} · {describeSchedule(h.schedule)}
                                {h.targetValue
                                  ? ` · Meta: ${h.targetValue} ${h.unit || ''}`
                                  : ''}
                              </div>
                            </div>
                          </div>

                          {/* 7 Weekday Columns */}
                          {currentWeekDays.map(d => {
                            const isScheduled = isMatrixDayScheduled(
                              h.schedule,
                              d.dateStr
                            );
                            const isDone = isHabitDoneOnDate(
                              h.entries[d.dateStr],
                              h.type,
                              h.targetValue
                            );
                            const currentVal = h.entries[d.dateStr];

                            return (
                              <div
                                key={d.dateStr}
                                data-today={d.isToday}
                                className={
                                  isScheduled
                                    ? styles.matrixDayCell
                                    : `${styles.matrixDayCell} ${styles.unscheduledDayCell}`
                                }
                              >
                                {h.type === 'boolean' ? (
                                  <button
                                    type="button"
                                    disabled={!isScheduled}
                                    onClick={() =>
                                      isScheduled &&
                                      handleToggleHabitEntry(h.id, d.dateStr)
                                    }
                                    className={styles.booleanCheckBtn}
                                    style={
                                      isDone
                                        ? {
                                            backgroundColor: h.color,
                                            borderColor: h.color,
                                            color: textColor,
                                          }
                                        : undefined
                                    }
                                  >
                                    {isDone ? '✓' : ''}
                                  </button>
                                ) : (
                                  <div className={styles.quantCellContainer}>
                                    <div
                                      data-done={isDone}
                                      className={styles.quantValueLabel}
                                    >
                                      {typeof currentVal === 'number'
                                        ? currentVal
                                        : 0}
                                    </div>
                                    <div className={styles.quantStepGroup}>
                                      <button
                                        type="button"
                                        disabled={!isScheduled}
                                        onClick={() =>
                                          isScheduled &&
                                          handleAdjustQuantitative(
                                            h.id,
                                            d.dateStr,
                                            -1
                                          )
                                        }
                                        className={styles.quantStepBtn}
                                      >
                                        -
                                      </button>
                                      <button
                                        type="button"
                                        disabled={!isScheduled}
                                        onClick={() =>
                                          isScheduled &&
                                          handleAdjustQuantitative(
                                            h.id,
                                            d.dateStr,
                                            1
                                          )
                                        }
                                        className={styles.quantStepBtn}
                                        style={
                                          isDone
                                            ? {
                                                backgroundColor: h.color,
                                                borderColor: h.color,
                                                color: textColor,
                                              }
                                            : undefined
                                        }
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Streak & Weekly Progress */}
                          <div className={styles.matrixStreakCell}>
                            <div className={styles.matrixStreakValue}>
                              🔥 {streak.currentStreak}
                              {streak.unit === 'weeks' ? ' sem' : 'd'}
                            </div>
                            <div className={styles.matrixWeeklyCount}>
                              {weekly.count}/{weekly.total} (
                              {weekly.percentage}%)
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ==================== TAB 2: MONTH VIEW ==================== */}
                {activeTab === 'monthly' && (
                  <div className={styles.sectionCard}>
                    <div className={styles.sectionTitle}>
                      Resumen del Mes ({dayjs().format('MMMM YYYY')})
                    </div>

                    <div className={styles.monthlyGrid}>
                      {filteredHabits.map(h => {
                        const ym = dayjs().format('YYYY-MM');
                        const monthly = calculateMonthlyConsistency(
                          h.entries,
                          ym,
                          h.type,
                          h.targetValue
                        );
                        const streak = calculateStreak(
                          h.entries,
                          h.type,
                          h.targetValue,
                          undefined,
                          h.schedule
                        );

                        return (
                          <div key={h.id} className={styles.monthlyHabitCard}>
                            <div className={styles.monthlyHabitHeader}>
                              <span className={styles.monthlyHabitIcon}>
                                {h.icon}
                              </span>
                              <div>
                                <div className={styles.monthlyHabitTitle}>
                                  {h.title}
                                </div>
                                <div className={styles.matrixHabitMeta}>
                                  {h.category} · {describeSchedule(h.schedule)}{' '}
                                  · Racha: 🔥 {streak.currentStreak}
                                  {streak.unit === 'weeks' ? ' sem' : 'd'}
                                </div>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                              }}
                            >
                              <div className={styles.monthlyProgressMeta}>
                                <span>Consistencia mensual:</span>
                                <span className={styles.monthlyProgressValue}>
                                  {monthly.count}/{monthly.daysInMonth} (
                                  {monthly.percentage}%)
                                </span>
                              </div>
                              <div className={styles.progressTrack}>
                                <div
                                  className={styles.progressFill}
                                  style={{
                                    width: `${monthly.percentage}%`,
                                    backgroundColor: h.color,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ==================== TAB 3: ANNUAL 365-DAY HEATMAP ==================== */}
                {activeTab === 'heatmap' && (
                  <div className={styles.sectionCard}>
                    <div className={styles.heatmapHeader}>
                      <div className={styles.sectionTitle}>
                        🔥 Heatmap Anual de Consistencia ({dayjs().year()})
                      </div>
                      <div className={styles.sectionSubtitle}>
                        Intensidad = Cantidad de hábitos cumplidos por día
                      </div>
                    </div>

                    {/* 52-Week Grid */}
                    <div className={styles.heatmapGrid}>
                      {Array.from({ length: 52 }, (_, weekIdx) => {
                        const weekNum = weekIdx + 1;
                        const wKey = `${dayjs().year()}-W${String(weekNum).padStart(2, '0')}`;
                        const { start } = getWeekDateRange(wKey);

                        return (
                          <div key={wKey} className={styles.heatmapWeekCol}>
                            {Array.from({ length: 7 }, (_, dayIdx) => {
                              const dateStr = start
                                .add(dayIdx, 'day')
                                .format(JOURNAL_DATE_FORMAT);
                              let doneCount = 0;
                              for (const h of habits) {
                                if (
                                  isHabitDoneOnDate(
                                    h.entries[dateStr],
                                    h.type,
                                    h.targetValue
                                  )
                                ) {
                                  doneCount++;
                                }
                              }

                              const ratio =
                                habits.length > 0
                                  ? doneCount / habits.length
                                  : 0;
                              let level = 0;
                              if (ratio > 0.75) level = 4;
                              else if (ratio > 0.5) level = 3;
                              else if (ratio > 0.25) level = 2;
                              else if (ratio > 0) level = 1;

                              return (
                                <div
                                  key={dateStr}
                                  data-level={level}
                                  title={`${dateStr}: ${doneCount} de ${habits.length} hábitos completados`}
                                  className={styles.heatmapCell}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal Create / Edit Habit */}
        <Modal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          width={540}
          contentOptions={{
            style: { padding: '24px', maxHeight: '88vh', overflowY: 'auto' },
          }}
        >
          <div className={styles.modalForm}>
            <h3 className={styles.modalHeaderTitle}>
              {editingHabit ? 'Editar Hábito' : 'Nuevo Hábito / Rutina'}
            </h3>

            {/* Title */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nombre del Hábito</label>
              <input
                type="text"
                placeholder="Ej: Tomar 2L de agua, Meditación, Ejercicio..."
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                autoFocus
                className={styles.formInput}
              />
            </div>

            {/* Icon Selector */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Ícono / Emoji: <span style={{ fontSize: '16px' }}>{formIcon}</span>
              </label>
              <div className={styles.iconPickerContainer}>
                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Buscar ícono o emoji... (ej. agua, correr, leer)"
                  value={iconSearchQuery}
                  onChange={e => setIconSearchQuery(e.target.value)}
                  className={styles.iconSearchInput}
                />

                {/* Group Tabs (hidden if searching) */}
                {!iconSearchQuery.trim() && (
                  <div className={styles.iconGroupTabs}>
                    {HABIT_ICON_GROUPS.map(grp => (
                      <button
                        key={grp.id}
                        type="button"
                        data-active={selectedIconGroupId === grp.id}
                        onClick={() => {
                          setSelectedIconGroupId(grp.id);
                          setIconSearchQuery('');
                        }}
                        className={styles.iconGroupTab}
                      >
                        <span>{grp.icon}</span>
                        <span>{grp.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Grid of Icons */}
                <div
                  className={styles.iconPickerGrid}
                  style={{ maxHeight: '140px', overflowY: 'auto' }}
                >
                  {displayedIcons.map(item => (
                    <button
                      key={`${item.group}-${item.emoji}-${item.label}`}
                      type="button"
                      title={item.label}
                      data-active={formIcon === item.emoji}
                      onClick={() => setFormIcon(item.emoji)}
                      className={styles.iconOptionBtn}
                    >
                      {item.emoji}
                    </button>
                  ))}
                  {displayedIcons.length === 0 && (
                    <div
                      style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: 'var(--affine-text-secondary-color, #888)',
                      }}
                    >
                      No se encontraron íconos para &quot;{iconSearchQuery}&quot;
                    </div>
                  )}
                </div>

                {/* Custom Freeform Emoji */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--affine-text-secondary-color, #666)',
                    }}
                  >
                    O escribe cualquier emoji:
                  </span>
                  <input
                    type="text"
                    maxLength={4}
                    value={formIcon}
                    onChange={e => setFormIcon(e.target.value)}
                    className={styles.customEmojiInput}
                    placeholder="🎯"
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Categoría</label>
              <select
                value={formCategory}
                onChange={e =>
                  setFormCategory(e.target.value as Habit['category'])
                }
                className={styles.formSelect}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Schedule / Recurrence */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Programación / Repetición
              </label>
              <div className={styles.scheduleSegmentedRow}>
                {(
                  [
                    { id: 'daily', label: 'Diario' },
                    { id: 'weekdays', label: 'Días fijos' },
                    { id: 'interval', label: 'Intervalo' },
                    { id: 'weekly-count', label: 'Meta semanal' },
                  ] as const
                ).map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    data-active={scheduleMode === mode.id}
                    onClick={() => setScheduleMode(mode.id)}
                    className={styles.scheduleSegmentBtn}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {scheduleMode === 'weekdays' && (
                <div className={styles.weekdayChipsRow}>
                  {[
                    { day: 1, label: 'L' },
                    { day: 2, label: 'M' },
                    { day: 3, label: 'X' },
                    { day: 4, label: 'J' },
                    { day: 5, label: 'V' },
                    { day: 6, label: 'S' },
                    { day: 7, label: 'D' },
                  ].map(({ day, label }) => {
                    const active = scheduleWeekdays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        data-active={active}
                        onClick={() => {
                          setScheduleWeekdays(prev =>
                            prev.includes(day)
                              ? prev.filter(d => d !== day)
                              : [...prev, day].sort((a, b) => a - b)
                          );
                        }}
                        className={styles.weekdayChip}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {scheduleMode === 'interval' && (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    marginTop: '6px',
                  }}
                >
                  <span style={{ fontSize: '12px' }}>Cada</span>
                  <input
                    type="number"
                    min={2}
                    max={99}
                    value={scheduleIntervalEvery}
                    onChange={e =>
                      setScheduleIntervalEvery(
                        Math.max(2, Number(e.target.value))
                      )
                    }
                    className={styles.formInput}
                    style={{ width: '70px' }}
                  />
                  <span style={{ fontSize: '12px' }}>días desde</span>
                  <input
                    type="date"
                    value={scheduleIntervalAnchor}
                    onChange={e => setScheduleIntervalAnchor(e.target.value)}
                    className={styles.formInput}
                    style={{ flex: 1 }}
                  />
                </div>
              )}

              {scheduleMode === 'weekly-count' && (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    marginTop: '6px',
                  }}
                >
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={scheduleWeeklyTimes}
                    onChange={e =>
                      setScheduleWeeklyTimes(
                        Math.min(6, Math.max(1, Number(e.target.value)))
                      )
                    }
                    className={styles.formInput}
                    style={{ width: '70px' }}
                  />
                  <span style={{ fontSize: '12px' }}>
                    veces por semana (meta flexible)
                  </span>
                </div>
              )}

              <div className={styles.schedulePreviewText}>
                {schedulePreviewText}
              </div>
            </div>

            {/* Reminders */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                🔔 Recordatorio (Opcional)
              </label>
              <div className={styles.reminderRow}>
                <input
                  type="time"
                  value={formReminderTime}
                  onChange={e => setFormReminderTime(e.target.value)}
                  className={styles.reminderInput}
                />
                <select
                  value={formReminderMinutes}
                  onChange={e =>
                    setFormReminderMinutes(Number(e.target.value))
                  }
                  className={styles.reminderSelect}
                  disabled={!formReminderTime}
                >
                  <option value={0}>A la hora exacta</option>
                  <option value={5}>5 minutos antes</option>
                  <option value={10}>10 minutos antes</option>
                  <option value={15}>15 minutos antes</option>
                  <option value={30}>30 minutos antes</option>
                </select>
              </div>
            </div>

            {/* Type: Boolean vs Quantitative */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tipo</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value as HabitType)}
                  className={styles.formSelect}
                >
                  <option value="boolean">Sí / No (Check)</option>
                  <option value="quantitative">Cuantitativo (Meta)</option>
                </select>
              </div>

              {formType === 'quantitative' && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Meta & Unidad</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="number"
                      value={formTarget}
                      onChange={e => setFormTarget(Number(e.target.value))}
                      className={styles.formInput}
                      style={{ width: '90px' }}
                    />
                    <input
                      type="text"
                      placeholder="ml, págs..."
                      value={formUnit}
                      onChange={e => setFormUnit(e.target.value)}
                      className={styles.formInput}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Color */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Color</label>
              <div className={styles.colorPickerRow}>
                <div
                  className={styles.colorSwatchRow}
                  style={{ maxHeight: '76px', overflowY: 'auto' }}
                >
                  {ALL_PRESET_COLORS.map(col => {
                    const active =
                      formColor.toLowerCase() === col.toLowerCase();
                    return (
                      <button
                        key={col}
                        type="button"
                        data-active={active}
                        onClick={() => setFormColor(col)}
                        className={styles.colorSwatchBtn}
                        style={{ backgroundColor: col }}
                        title={col}
                      />
                    );
                  })}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '4px',
                  }}
                >
                  <input
                    type="color"
                    value={
                      isValidHexColor(formColor)
                        ? normalizeHexColor(formColor)
                        : '#3b82f6'
                    }
                    onChange={e =>
                      setFormColor(normalizeHexColor(e.target.value))
                    }
                    className={styles.colorNativeInput}
                    title="Color personalizado"
                  />
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--affine-text-secondary-color, #666)',
                    }}
                  >
                    Personalizado ({formColor})
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.modalFooterSpread}>
              {editingHabit ? (
                <button
                  type="button"
                  onClick={() => handleDeleteHabit(editingHabit.id)}
                  className={styles.dangerActionButton}
                >
                  Eliminar
                </button>
              ) : (
                <div />
              )}

              <div className={styles.modalFooterRight}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={styles.secondaryActionButton}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
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
