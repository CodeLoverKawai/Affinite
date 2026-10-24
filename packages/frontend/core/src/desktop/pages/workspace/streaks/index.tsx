import { useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { WorkspaceService } from '../../../../modules/workspace';
import { ViewIcon, ViewTitle } from '../../../../modules/workbench';

import {
  calculateStreakProgress,
  formatTimeRemaining,
  type StreakItem,
  type StreakMode,
} from './streaks-calculator';
import {
  playStreakCompletionSound,
  triggerStreakNotification,
} from './streaks-sound';

const PRESET_ICONS = ['🔥', '⚡', '🎯', '📚', '💻', '🏃', '💧', '🧘', '🚭', '🥦'];
const PRESET_COLORS = [
  '#f59e0b',
  '#ef4444',
  '#10b981',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
];

const DEFAULT_STREAKS: StreakItem[] = [
  {
    id: 'streak-30-days',
    title: 'Reto 30 Días de Programación',
    description: 'Construir proyectos y aprender nuevas tecnologías diariamente',
    mode: 'days',
    targetCount: 30,
    startDateTime: dayjs().subtract(7, 'day').toISOString(),
    targetDateTime: dayjs().add(23, 'day').toISOString(),
    soundEnabled: true,
    notificationEnabled: true,
    color: '#f59e0b',
    icon: '🔥',
    category: 'Productividad',
    status: 'running',
  },
  {
    id: 'streak-fasting-16h',
    title: 'Sprint de Trabajo Continuo (8 Horas)',
    description: 'Sesión enfocada de desarrollo sin distracciones',
    mode: 'hours',
    targetCount: 8,
    startDateTime: dayjs().subtract(2, 'hour').toISOString(),
    targetDateTime: dayjs().add(6, 'hour').toISOString(),
    soundEnabled: true,
    notificationEnabled: true,
    color: '#3b82f6',
    icon: '⚡',
    category: 'Trabajo',
    status: 'running',
  },
];

export const Component = () => {
  const workspaceService = useService(WorkspaceService);
  const [streaks, setStreaks] = useState<StreakItem[]>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem('affinite_streaks_cache_v1');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
    }
    return DEFAULT_STREAKS;
  });

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'days' | 'hours'>('all');

  // Form states for new streak
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMode, setNewMode] = useState<StreakMode>('days');
  const [newTargetCount, setNewTargetCount] = useState<number>(30);
  const [newIcon, setNewIcon] = useState('🔥');
  const [newColor, setNewColor] = useState('#f59e0b');
  const [newSound, setNewSound] = useState(true);
  const [newNotification, setNewNotification] = useState(true);

  // Sync with Workspace Yjs
  useEffect(() => {
    try {
      const rootDoc = (workspaceService?.workspace as any)?.docCollection?.doc;
      if (rootDoc) {
        const yMap = rootDoc.getMap('affinite_streaks_v1');
        const raw = yMap.get('streaks');
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStreaks(parsed);
          }
        } else {
          yMap.set('streaks', JSON.stringify(DEFAULT_STREAKS));
        }

        const observer = () => {
          const updatedRaw = yMap.get('streaks');
          if (updatedRaw) {
            try {
              const list =
                typeof updatedRaw === 'string'
                  ? JSON.parse(updatedRaw)
                  : updatedRaw;
              if (Array.isArray(list)) {
                setStreaks(list);
              }
            } catch {}
          }
        };

        yMap.observe(observer);
        return () => yMap.unobserve(observer);
      }
    } catch (e) {
      console.warn('Could not connect to Yjs streaks store', e);
    }
    return undefined;
  }, [workspaceService]);

  // Persist helper
  const persistStreaks = useCallback(
    (newStreaks: StreakItem[]) => {
      setStreaks(newStreaks);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          'affinite_streaks_cache_v1',
          JSON.stringify(newStreaks)
        );
      }
      try {
        const rootDoc = (workspaceService?.workspace as any)?.docCollection
          ?.doc;
        if (rootDoc) {
          const yMap = rootDoc.getMap('affinite_streaks_v1');
          yMap.set('streaks', JSON.stringify(newStreaks));
        }
      } catch (e) {
        console.warn('Could not persist streaks to Yjs', e);
      }
    },
    [workspaceService]
  );

  // Live timer tick every 1000ms & completion alarm trigger
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Check for streaks that just reached completion
      setStreaks(prev => {
        let changed = false;
        const updated = prev.map(s => {
          if (s.status === 'running') {
            const p = calculateStreakProgress(s, now);
            if (p.isCompleted && !s.soundPlayed) {
              changed = true;
              if (s.soundEnabled || s.notificationEnabled) {
                triggerStreakNotification(
                  `¡Meta Cumplida! ${s.icon} ${s.title}`,
                  `Has completado el objetivo de ${s.targetCount} ${s.mode === 'days' ? 'días' : 'horas'}. ¡Felicitaciones!`,
                  s.soundEnabled
                );
              }
              return {
                ...s,
                status: 'completed' as const,
                completedAt: now.toISOString(),
                soundPlayed: true,
              };
            }
          }
          return s;
        });

        if (changed) {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(
              'affinite_streaks_cache_v1',
              JSON.stringify(updated)
            );
          }
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCreateStreak = () => {
    if (!newTitle.trim()) return;

    const start = dayjs();
    const target =
      newMode === 'days'
        ? start.add(newTargetCount, 'day')
        : start.add(newTargetCount, 'hour');

    const item: StreakItem = {
      id: `streak-${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      mode: newMode,
      targetCount: newTargetCount,
      startDateTime: start.toISOString(),
      targetDateTime: target.toISOString(),
      soundEnabled: newSound,
      notificationEnabled: newNotification,
      color: newColor,
      icon: newIcon,
      status: 'running',
    };

    persistStreaks([item, ...streaks]);
    setIsModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    setNewTargetCount(30);
  };

  const handleToggleStatus = (id: string) => {
    const updated = streaks.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'running' ? 'paused' : 'running';
        return { ...s, status: nextStatus as StreakItem['status'] };
      }
      return s;
    });
    persistStreaks(updated);
  };

  const handleDeleteStreak = (id: string) => {
    if (confirm('¿Eliminar este contador de Streak?')) {
      persistStreaks(streaks.filter(s => s.id !== id));
    }
  };

  const handleResetStreak = (id: string) => {
    const updated = streaks.map(s => {
      if (s.id === id) {
        const start = dayjs();
        const target =
          s.mode === 'days'
            ? start.add(s.targetCount, 'day')
            : start.add(s.targetCount, 'hour');
        return {
          ...s,
          startDateTime: start.toISOString(),
          targetDateTime: target.toISOString(),
          status: 'running' as const,
          soundPlayed: false,
          completedAt: undefined,
        };
      }
      return s;
    });
    persistStreaks(updated);
  };

  // Filtered list
  const filteredStreaks = useMemo(() => {
    if (filterMode === 'all') return streaks;
    return streaks.filter(s => s.mode === filterMode);
  }, [streaks, filterMode]);

  const activeCount = streaks.filter(s => s.status === 'running').length;
  const completedCount = streaks.filter(s => s.status === 'completed').length;

  return (
    <div
      style={{
        padding: '28px 36px',
        maxWidth: 1280,
        margin: '0 auto',
        minHeight: '100vh',
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <ViewTitle title="Streaks" />
      <ViewIcon icon="streaks" />
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              letterSpacing: '-0.5px',
            }}
          >
            <span>🔥</span> Streaks
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 14,
              opacity: 0.7,
            }}
          >
            Contadores de tiempo en días y horas con metas continuas, alertas
            sonoras y notificaciones.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={playStreakCompletionSound}
            title="Probar sonido de campana armónica"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🔔</span> Probar Alarma
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
            }}
          >
            + Nuevo Streak / Contador
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>
            ACTIVOS AHORA
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>
            {activeCount}
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>
            METAS CUMPLIDAS
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>
            {completedCount}
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1' }}>
            TOTAL REGISTRADOS
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>
            {streaks.length}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: 8,
        }}
      >
        {(['all', 'days', 'hours'] as const).map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => setFilterMode(mode)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background:
                filterMode === mode
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'transparent',
              color: filterMode === mode ? '#ffffff' : 'inherit',
              opacity: filterMode === mode ? 1 : 0.65,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {mode === 'all'
              ? 'Todos'
              : mode === 'days'
                ? '🗓️ En Días'
                : '⏱️ En Horas'}
          </button>
        ))}
      </div>

      {/* Streaks Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 20,
        }}
      >
        {filteredStreaks.map(streak => {
          const progress = calculateStreakProgress(streak, currentTime);

          return (
            <div
              key={streak.id}
              style={{
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background:
                  'linear-gradient(180deg, rgba(30, 30, 36, 0.8) 0%, rgba(20, 20, 25, 0.8) 100%)',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top Accent Strip */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: streak.color || '#f59e0b',
                }}
              />

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{streak.icon}</span>
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      >
                        {streak.title}
                      </h3>
                      {streak.category && (
                        <span
                          style={{
                            fontSize: 11,
                            opacity: 0.6,
                            marginTop: 2,
                            display: 'block',
                          }}
                        >
                          {streak.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 9999,
                      background:
                        streak.mode === 'days'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(99, 102, 241, 0.15)',
                      color: streak.mode === 'days' ? '#f59e0b' : '#6366f1',
                    }}
                  >
                    {streak.mode === 'days' ? '🗓️ DÍAS' : '⏱️ HORAS'}
                  </span>
                </div>

                {streak.description && (
                  <p
                    style={{
                      margin: '0 0 16px',
                      fontSize: 13,
                      opacity: 0.75,
                      lineHeight: 1.4,
                    }}
                  >
                    {streak.description}
                  </p>
                )}

                {/* Big Countdown Display */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      opacity: 0.6,
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    {progress.isCompleted
                      ? 'ESTADO'
                      : 'TIEMPO RESTANTE PARA LA META'}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: progress.isCompleted ? '#10b981' : streak.color,
                      fontFamily: 'monospace',
                    }}
                  >
                    {formatTimeRemaining(progress.remainingMs, streak.mode)}
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 6,
                      opacity: 0.8,
                    }}
                  >
                    <span>
                      {streak.mode === 'days'
                        ? `${progress.elapsedDays} / ${streak.targetCount} días`
                        : `${progress.elapsedHours} / ${streak.targetCount} horas`}
                    </span>
                    <span>{progress.progressPercent}%</span>
                  </div>

                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.08)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progress.progressPercent}%`,
                        background: `linear-gradient(90deg, ${streak.color || '#f59e0b'}, #ef4444)`,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(streak.id)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'transparent',
                      color: 'inherit',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {streak.status === 'running' ? '⏸️ Pausar' : '▶️ Reanudar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResetStreak(streak.id)}
                    title="Reiniciar contador"
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'transparent',
                      color: 'inherit',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    🔄 Reiniciar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteStreak(streak.id)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#ef4444',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: 480,
              borderRadius: 16,
              background: '#18181b',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>
              + Nuevo Contador de Streak
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    opacity: 0.8,
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  Título de la Meta / Reto
                </label>
                <input
                  type="text"
                  placeholder="Ej. 30 Días de Estudio o Ayuno 16h"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Mode Selector */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    opacity: 0.8,
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Unidad de Medida
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setNewMode('days')}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 8,
                      border: 'none',
                      background:
                        newMode === 'days'
                          ? '#f59e0b'
                          : 'rgba(255, 255, 255, 0.08)',
                      color: newMode === 'days' ? '#000000' : '#ffffff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🗓️ En Días
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMode('hours')}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 8,
                      border: 'none',
                      background:
                        newMode === 'hours'
                          ? '#6366f1'
                          : 'rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ⏱️ En Horas
                  </button>
                </div>
              </div>

              {/* Target Count */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    opacity: 0.8,
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  Meta Total ({newMode === 'days' ? 'Días' : 'Horas'})
                </label>
                <input
                  type="number"
                  min={1}
                  value={newTargetCount}
                  onChange={e => setNewTargetCount(Number(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Icon & Color */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    opacity: 0.8,
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Ícono y Color
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {PRESET_ICONS.map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewIcon(ic)}
                      style={{
                        fontSize: 18,
                        background:
                          newIcon === ic
                            ? 'rgba(255, 255, 255, 0.2)'
                            : 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 6,
                        padding: 6,
                        cursor: 'pointer',
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {PRESET_COLORS.map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewColor(col)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: col,
                        border:
                          newColor === col ? '2px solid #ffffff' : 'none',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newSound}
                    onChange={e => setNewSound(e.target.checked)}
                  />
                  <span>🔔 Reproducir sonido armónico al cumplir meta</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newNotification}
                    onChange={e => setNewNotification(e.target.checked)}
                  />
                  <span>📩 Notificación de escritorio</span>
                </label>
              </div>

              {/* Action buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'transparent',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateStreak}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background:
                      'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Crear Streak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
