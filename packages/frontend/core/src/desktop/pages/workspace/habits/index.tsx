import {
  CheckBoxCheckSolidIcon,
  DateTimeIcon,
  EdgelessIcon,
  JournalIcon,
  PlusIcon,
} from '@blocksuite/icons/rc';
import { useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  calculateMonthlyConsistency,
  calculateStreak,
  calculateWeeklyConsistency,
  HabitType,
  isHabitDoneOnDate,
} from './habits-calculator';

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

const PRESET_ICONS = ['💧', '🏃', '📚', '🧘', '💻', '🥗', '💊', '😴', '💰', '🎨', '🎯', '✨'];
const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444'];
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
  const journalService = useService(JournalService);
  const workbench = useService(WorkbenchService).workbench;

  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(() =>
    formatWeeklyJournalKey(dayjs())
  );
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'heatmap'>('weekly');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');

  // Habit Modal State
  const [modalOpen, setModalOpen] = useState(false);
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
      const raw = yMap.get('habits') as string | undefined;
      if (!raw) {
        // Initialize with default habits
        yMap.set('habits', JSON.stringify(DEFAULT_HABITS));
        setHabits(DEFAULT_HABITS);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHabits(parsed);
        } else {
          setHabits(DEFAULT_HABITS);
        }
      } catch {
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
      yMap.set('habits', JSON.stringify(newHabits));
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
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
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
    setModalOpen(true);
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
    setModalOpen(true);
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
              targetValue: formType === 'quantitative' ? Number(formTarget) : undefined,
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
        targetValue: formType === 'quantitative' ? Number(formTarget) : undefined,
        unit: formType === 'quantitative' ? formUnit.trim() : undefined,
        color: formColor,
        createdAt: Date.now(),
        entries: {},
      };
      saveHabitsToYjs([...habits, created]);
    }
    setModalOpen(false);
  };

  const handleDeleteHabit = (id: string) => {
    saveHabitsToYjs(habits.filter(h => h.id !== id));
    setModalOpen(false);
  };

  // Overall Global Metrics
  const globalMetrics = useMemo(() => {
    const todayStr = dayjs().format(JOURNAL_DATE_FORMAT);
    let maxBestStreak = 0;
    let totalDoneToday = 0;
    let totalWeeklyPercentages = 0;

    for (const h of habits) {
      const { currentStreak, bestStreak } = calculateStreak(h.entries, h.type, h.targetValue);
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
            borderBottom: '1px solid var(--affine-border-color, rgba(255,255,255,0.08))',
            background: 'var(--affine-background-primary-color, #0f172a)',
            gap: '12px',
          }}
        >
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
              <CheckBoxCheckSolidIcon style={{ width: 22, height: 22, color: '#10b981' }} />
              <span>Hábitos & Rutinas</span>
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
                onClick={handlePrevWeek}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ◀
              </button>
              <button
                onClick={handleThisWeek}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#e2e8f0',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {selectedWeekKey}
              </button>
              <button
                onClick={handleNextWeek}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ▶
              </button>
            </div>
          </div>

          {/* View Mode Tabs */}
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
                { id: 'weekly', label: '🗓️ Matriz Semanal' },
                { id: 'monthly', label: '📅 Mes' },
                { id: 'heatmap', label: '🔥 Heatmap 365' },
              ] as const
            ).map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'transparent',
                    color: active ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '7px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Action button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={openCreateModal}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: '#fff',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <PlusIcon style={{ width: 14, height: 14 }} />
              <span>Nuevo Hábito</span>
            </button>
          </div>
        </div>
      </ViewHeader>

      <ViewBody>
        <div
          style={{
            flex: 1,
            height: '100%',
            overflowY: 'auto',
            background: 'linear-gradient(180deg, #0b1120 0%, #0f172a 100%)',
            color: '#f8fafc',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Top KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            <div style={kpiCardStyle}>
              <span style={kpiLabelStyle}>Hábitos Activos</span>
              <span style={{ ...kpiValueStyle, color: '#60a5fa' }}>
                {globalMetrics.totalHabits}
              </span>
            </div>
            <div style={kpiCardStyle}>
              <span style={kpiLabelStyle}>Completados Hoy</span>
              <span style={{ ...kpiValueStyle, color: '#34d399' }}>
                {globalMetrics.totalDoneToday} / {globalMetrics.totalHabits}
              </span>
            </div>
            <div style={kpiCardStyle}>
              <span style={kpiLabelStyle}>Consistencia Semanal</span>
              <span style={{ ...kpiValueStyle, color: '#fde047' }}>
                {globalMetrics.avgWeeklyConsistency}%
              </span>
            </div>
            <div style={kpiCardStyle}>
              <span style={kpiLabelStyle}>Mejor Racha Global</span>
              <span style={{ ...kpiValueStyle, color: '#f87171' }}>
                🔥 {globalMetrics.maxBestStreak} días
              </span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '8px 14px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>
              Categoría:
            </span>
            {['Todas', ...CATEGORIES].map(cat => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: active ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                    background: active ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.04)',
                    color: active ? '#6ee7b7' : '#cbd5e1',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* ==================== TAB 1: WEEKLY HABIT MATRIX ==================== */}
          {activeTab === 'weekly' && (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Table Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '260px repeat(7, minmax(0, 1fr)) 120px',
                  background: 'rgba(30, 41, 59, 0.7)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#93c5fd',
                    textTransform: 'uppercase',
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  Hábito / Rutina
                </div>

                {currentWeekDays.map(d => (
                  <div
                    key={d.dateStr}
                    style={{
                      padding: '10px 4px',
                      textAlign: 'center',
                      borderRight: '1px solid rgba(255,255,255,0.05)',
                      background: d.isToday ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: d.isToday ? '#60a5fa' : '#94a3b8',
                        textTransform: 'uppercase',
                      }}
                    >
                      {d.dayShort}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: d.isToday ? '#60a5fa' : '#f8fafc',
                      }}
                    >
                      {d.dayNumber}
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    padding: '12px 10px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#f87171',
                    textTransform: 'uppercase',
                  }}
                >
                  Racha 🔥
                </div>
              </div>

              {/* Habit Rows */}
              {filteredHabits.map(h => {
                const streak = calculateStreak(h.entries, h.type, h.targetValue);
                const weekly = calculateWeeklyConsistency(
                  h.entries,
                  selectedWeekKey,
                  h.type,
                  h.targetValue
                );

                return (
                  <div
                    key={h.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '260px repeat(7, minmax(0, 1fr)) 120px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      alignItems: 'center',
                      background: 'rgba(15, 23, 42, 0.3)',
                    }}
                  >
                    {/* Left Info */}
                    <div
                      onClick={() => openEditModal(h)}
                      style={{
                        padding: '12px 16px',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{h.icon}</span>
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#f8fafc',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {h.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {h.category} {h.targetValue ? `· Meta: ${h.targetValue} ${h.unit || ''}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* 7 Weekday Columns */}
                    {currentWeekDays.map(d => {
                      const isDone = isHabitDoneOnDate(h.entries[d.dateStr], h.type, h.targetValue);
                      const currentVal = h.entries[d.dateStr];

                      return (
                        <div
                          key={d.dateStr}
                          style={{
                            padding: '8px 4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRight: '1px solid rgba(255,255,255,0.05)',
                            background: d.isToday ? 'rgba(37, 99, 235, 0.06)' : 'transparent',
                          }}
                        >
                          {h.type === 'boolean' ? (
                            <button
                              onClick={() => handleToggleHabitEntry(h.id, d.dateStr)}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: isDone
                                  ? `2px solid ${h.color}`
                                  : '1px solid rgba(255,255,255,0.15)',
                                background: isDone ? h.color : 'rgba(255,255,255,0.03)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.15s',
                              }}
                            >
                              {isDone ? '✓' : ''}
                            </button>
                          ) : (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 2,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: isDone ? '#34d399' : '#94a3b8',
                                }}
                              >
                                {typeof currentVal === 'number' ? currentVal : 0}
                              </div>
                              <div style={{ display: 'flex', gap: 2 }}>
                                <button
                                  onClick={() => handleAdjustQuantitative(h.id, d.dateStr, -1)}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: 4,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#cbd5e1',
                                    fontSize: 10,
                                    cursor: 'pointer',
                                    padding: 0,
                                  }}
                                >
                                  -
                                </button>
                                <button
                                  onClick={() => handleAdjustQuantitative(h.id, d.dateStr, 1)}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: 4,
                                    border: `1px solid ${isDone ? h.color : 'rgba(255,255,255,0.1)'}`,
                                    background: isDone ? h.color : 'rgba(255,255,255,0.05)',
                                    color: '#fff',
                                    fontSize: 10,
                                    cursor: 'pointer',
                                    padding: 0,
                                  }}
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
                    <div
                      style={{
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#f87171' }}>
                        🔥 {streak.currentStreak}d
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>
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
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 700 }}>
                Resumen del Mes ({dayjs().format('MMMM YYYY')})
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {filteredHabits.map(h => {
                  const ym = dayjs().format('YYYY-MM');
                  const monthly = calculateMonthlyConsistency(h.entries, ym, h.type, h.targetValue);
                  const streak = calculateStreak(h.entries, h.type, h.targetValue);

                  return (
                    <div
                      key={h.id}
                      style={{
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '24px' }}>{h.icon}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>{h.title}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {h.category} · Racha: 🔥 {streak.currentStreak} días
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                          <span>Consistencia mensual:</span>
                          <span style={{ fontWeight: 700, color: '#34d399' }}>
                            {monthly.count}/{monthly.daysInMonth} ({monthly.percentage}%)
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                          <div style={{ width: `${monthly.percentage}%`, height: '100%', background: h.color }} />
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
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>
                  🔥 Heatmap Anual de Consistencia ({dayjs().year()})
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Intensidad = Cantidad de hábitos cumplidos por día
                </div>
              </div>

              {/* 52-Week Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(52, minmax(0, 1fr))',
                  gap: '3px',
                  padding: '10px 0',
                  overflowX: 'auto',
                }}
              >
                {Array.from({ length: 52 }, (_, weekIdx) => {
                  const weekNum = weekIdx + 1;
                  const wKey = `${dayjs().year()}-W${String(weekNum).padStart(2, '0')}`;
                  const { start } = getWeekDateRange(wKey);

                  return (
                    <div key={wKey} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {Array.from({ length: 7 }, (_, dayIdx) => {
                        const dateStr = start.add(dayIdx, 'day').format(JOURNAL_DATE_FORMAT);
                        let doneCount = 0;
                        for (const h of habits) {
                          if (isHabitDoneOnDate(h.entries[dateStr], h.type, h.targetValue)) {
                            doneCount++;
                          }
                        }

                        const ratio = habits.length > 0 ? doneCount / habits.length : 0;
                        let bg = 'rgba(255,255,255,0.05)';
                        if (ratio > 0.75) bg = '#10b981';
                        else if (ratio > 0.5) bg = '#059669';
                        else if (ratio > 0.25) bg = '#047857';
                        else if (ratio > 0) bg = 'rgba(16, 185, 129, 0.35)';

                        return (
                          <div
                            key={dateStr}
                            title={`${dateStr}: ${doneCount} de ${habits.length} hábitos completados`}
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '2px',
                              background: bg,
                            }}
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

        {/* Modal Create / Edit Habit */}
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
                width: '420px',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>
                  {editingHabit ? 'Editar Hábito' : 'Nuevo Hábito / Rutina'}
                </span>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              {/* Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={modalLabelStyle}>Nombre del Hábito</label>
                <input
                  type="text"
                  placeholder="Ej: Tomar 2L de agua, Meditación, Ejercicio..."
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  autoFocus
                  style={modalInputStyle}
                />
              </div>

              {/* Icon Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={modalLabelStyle}>Ícono / Emoji</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PRESET_ICONS.map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setFormIcon(ic)}
                      style={{
                        fontSize: '18px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: formIcon === ic ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                        background: formIcon === ic ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={modalLabelStyle}>Categoría</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as Habit['category'])}
                  style={modalInputStyle}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Type: Boolean vs Quantitative */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={modalLabelStyle}>Tipo</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as HabitType)}
                    style={modalInputStyle}
                  >
                    <option value="boolean">Sí / No (Check)</option>
                    <option value="quantitative">Cuantitativo (Meta)</option>
                  </select>
                </div>

                {formType === 'quantitative' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={modalLabelStyle}>Meta & Unidad</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="number"
                        value={formTarget}
                        onChange={e => setFormTarget(Number(e.target.value))}
                        style={{ ...modalInputStyle, width: '70px' }}
                      />
                      <input
                        type="text"
                        placeholder="ml, págs..."
                        value={formUnit}
                        onChange={e => setFormUnit(e.target.value)}
                        style={{ ...modalInputStyle, flex: 1 }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Color */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={modalLabelStyle}>Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PRESET_COLORS.map(col => (
                    <div
                      key={col}
                      onClick={() => setFormColor(col)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: col,
                        border: formColor === col ? '2px solid #fff' : 'none',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                {editingHabit ? (
                  <button
                    onClick={() => handleDeleteHabit(editingHabit.id)}
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
                ) : <div />}

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
                    onClick={handleSaveModal}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
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

const kpiCardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.65)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '14px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const kpiLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#94a3b8',
  fontWeight: 600,
  textTransform: 'uppercase',
};

const kpiValueStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 800,
};

const modalLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#94a3b8',
};

const modalInputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '8px 12px',
  color: '#f8fafc',
  fontSize: '13px',
  outline: 'none',
};
