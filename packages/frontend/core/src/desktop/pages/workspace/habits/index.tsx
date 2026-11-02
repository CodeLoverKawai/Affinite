import { Modal } from '@affine/component';
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
    createdAt: Date.now() - 86400000 * 7,
    entries: {},
  },
];

const PRESET_ICONS = [
  '💧',
  '🏃',
  '📚',
  '🧘',
  '💻',
  '🥗',
  '💊',
  '😴',
  '💰',
  '🎨',
  '🎯',
  '✨',
];
const PRESET_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#ef4444',
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
  const [formType, setFormType] = useState<HabitType>('boolean');
  const [formTarget, setFormTarget] = useState<number>(1);
  const [formUnit, setFormUnit] = useState('');
  const [formColor, setFormColor] = useState('#3b82f6');

  // 1. Sync Habits from Workspace Yjs Map
  useEffect(() => {
    const rootYDoc = workspaceService.workspace.rootYDoc;
    const yMap = rootYDoc.getMap('affinite_habits_v1');

    const syncFromYjs = () => {
      const raw = yMap.get('habits');
      if (!raw) {
        const serialized = JSON.stringify(DEFAULT_HABITS);
        yMap.set('habits', serialized);
        setHabits(DEFAULT_HABITS);
        try {
          localStorage.setItem('affinite_habits_cache_v1', serialized);
        } catch {}
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
          color: item.color || PRESET_COLORS[idx % PRESET_COLORS.length],
          createdAt:
            typeof item.createdAt === 'number'
              ? item.createdAt
              : Date.now() - 86400000 * 7,
          entries: item.entries,
        }));
        setHabits(normalizedHabits);
        try {
          localStorage.setItem(
            'affinite_habits_cache_v1',
            JSON.stringify(normalizedHabits)
          );
        } catch {}
      } else {
        setHabits(DEFAULT_HABITS);
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
      try {
        localStorage.setItem('affinite_habits_cache_v1', serialized);
      } catch {}
    },
    [workspaceService]
  );

  // Toggle or increment habit entry for a date
  const handleToggleHabitEntry = useCallback(
    (habitId: string, dateStr: string) => {
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
    setFormType('boolean');
    setFormTarget(1);
    setFormUnit('');
    setFormColor('#3b82f6');
    setIsModalOpen(true);
  };

  const openEditModal = (h: Habit) => {
    setEditingHabit(h);
    setFormTitle(h.title);
    setFormCategory(h.category);
    setFormIcon(h.icon);
    setFormType(h.type);
    setFormTarget(h.targetValue ?? 1);
    setFormUnit(h.unit ?? '');
    setFormColor(h.color);
    setIsModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!formTitle.trim()) return;
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
              color: formColor,
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
        color: formColor,
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
    let totalWeeklyPercentages = 0;

    for (const h of habits) {
      const { bestStreak } = calculateStreak(h.entries, h.type, h.targetValue);
      if (bestStreak > maxBestStreak) maxBestStreak = bestStreak;
      if (isHabitDoneOnDate(h.entries[todayStr], h.type, h.targetValue)) {
        totalDoneToday++;
      }
      const { percentage } = calculateWeeklyConsistency(
        h.entries,
        selectedWeekKey,
        h.type,
        h.targetValue
      );
      totalWeeklyPercentages += percentage;
    }

    const avgWeeklyConsistency =
      habits.length > 0 ? Math.round(totalWeeklyPercentages / habits.length) : 0;

    return {
      totalHabits: habits.length,
      maxBestStreak,
      totalDoneToday,
      avgWeeklyConsistency,
    };
  }, [habits, selectedWeekKey]);

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
                  {globalMetrics.totalDoneToday} / {globalMetrics.totalHabits}
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

                  <div className={styles.matrixHeaderStreakCell}>Racha 🔥</div>
                </div>

                {/* Habit Rows */}
                {filteredHabits.map(h => {
                  const streak = calculateStreak(
                    h.entries,
                    h.type,
                    h.targetValue
                  );
                  const weekly = calculateWeeklyConsistency(
                    h.entries,
                    selectedWeekKey,
                    h.type,
                    h.targetValue
                  );

                  return (
                    <div key={h.id} className={styles.matrixRow}>
                      {/* Left Info */}
                      <div
                        onClick={() => openEditModal(h)}
                        className={styles.matrixHabitInfoCell}
                      >
                        <span className={styles.matrixHabitIcon}>{h.icon}</span>
                        <div style={{ overflow: 'hidden' }}>
                          <div className={styles.matrixHabitTitle}>
                            {h.title}
                          </div>
                          <div className={styles.matrixHabitMeta}>
                            {h.category}{' '}
                            {h.targetValue
                              ? `· Meta: ${h.targetValue} ${h.unit || ''}`
                              : ''}
                          </div>
                        </div>
                      </div>

                      {/* 7 Weekday Columns */}
                      {currentWeekDays.map(d => {
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
                            className={styles.matrixDayCell}
                          >
                            {h.type === 'boolean' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleHabitEntry(h.id, d.dateStr)
                                }
                                className={styles.booleanCheckBtn}
                                style={
                                  isDone
                                    ? {
                                        backgroundColor: h.color,
                                        borderColor: h.color,
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
                                    onClick={() =>
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
                                    onClick={() =>
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
                                            color: '#ffffff',
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
                          🔥 {streak.currentStreak}d
                        </div>
                        <div className={styles.matrixWeeklyCount}>
                          {weekly.count}/7 ({weekly.percentage}%)
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
                      h.targetValue
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
                              {h.category} · Racha: 🔥 {streak.currentStreak}{' '}
                              días
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
                            habits.length > 0 ? doneCount / habits.length : 0;
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
          </div>
        </div>

        {/* Modal Create / Edit Habit */}
        <Modal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          width={520}
          contentOptions={{ style: { padding: '24px' } }}
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
              <label className={styles.formLabel}>Ícono / Emoji</label>
              <div className={styles.iconPickerGrid}>
                {PRESET_ICONS.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    data-active={formIcon === ic}
                    onClick={() => setFormIcon(ic)}
                    className={styles.iconOptionBtn}
                  >
                    {ic}
                  </button>
                ))}
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
              <div className={styles.colorSwatchRow}>
                {PRESET_COLORS.map(col => (
                  <button
                    key={col}
                    type="button"
                    data-active={formColor === col}
                    onClick={() => setFormColor(col)}
                    className={styles.colorSwatchBtn}
                    style={{ backgroundColor: col }}
                  />
                ))}
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
