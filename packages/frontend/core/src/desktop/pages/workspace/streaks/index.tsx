import { Modal, useConfirmModal } from '@affine/component';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '@affine/core/modules/workbench';
import { useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { WorkspaceService } from '../../../../modules/workspace';
import * as styles from './streaks.css';
import {
  calculateStreakProgress,
  createStreakTemplates,
  formatTimeRemaining,
  getInitialStreaks,
  type StreakItem,
  type StreakMode,
  toggleStreakPause,
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

export const Component = () => {
  const workspaceService = useService(WorkspaceService);
  const { openConfirmModal } = useConfirmModal();
  const [streaks, setStreaks] = useState<StreakItem[]>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem('affinite_streaks_cache_v1');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
    }
    return getInitialStreaks();
  });

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showModal, setShowModal] = useState(false);
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
      const rootDoc = (workspaceService?.workspace as any)?.rootYDoc;
      if (rootDoc) {
        const yMap = rootDoc.getMap('affinite_streaks_v1');
        const raw = yMap.get('streaks');
        if (raw) {
          try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed)) {
              setStreaks(parsed);
            }
          } catch {}
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
        const rootDoc = (workspaceService?.workspace as any)?.rootYDoc;
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

  const handleLoadTemplates = useCallback(() => {
    persistStreaks(createStreakTemplates());
  }, [persistStreaks]);

  // Live timer tick every 1000ms & completion alarm trigger
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Check for streaks that just reached completion
      setStreaks(prev => {
        let hasChanges = false;
        const updated = prev.map(s => {
          if (s.status === 'running') {
            const p = calculateStreakProgress(s, now);
            if (p.isCompleted && !s.soundPlayed) {
              hasChanges = true;
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

        if (hasChanges) {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(
              'affinite_streaks_cache_v1',
              JSON.stringify(updated)
            );
          }
          try {
            const rootDoc = (workspaceService?.workspace as any)?.rootYDoc;
            if (rootDoc) {
              const yMap = rootDoc.getMap('affinite_streaks_v1');
              yMap.set('streaks', JSON.stringify(updated));
            }
          } catch (e) {
            console.warn('Could not persist completed streaks to Yjs', e);
          }
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [workspaceService]);

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
    setShowModal(false);
    setNewTitle('');
    setNewDesc('');
    setNewTargetCount(30);
  };

  const handleTogglePause = useCallback(
    (id: string) => {
      const now = new Date();
      const updated = streaks.map(s =>
        s.id === id ? toggleStreakPause(s, now) : s
      );
      persistStreaks(updated);
    },
    [persistStreaks, streaks]
  );

  const handleDeleteStreak = useCallback(
    (id: string) => {
      openConfirmModal({
        title: '¿Eliminar este contador de Streak?',
        description:
          'Esta acción eliminará permanentemente este contador de racha y su progreso.',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        confirmButtonOptions: {
          variant: 'error',
        },
        onConfirm: () => {
          persistStreaks(streaks.filter(s => s.id !== id));
        },
      });
    },
    [openConfirmModal, persistStreaks, streaks]
  );

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
          pausedAt: undefined,
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
    <>
      <ViewTitle title="Streaks & Countdowns" />
      <ViewIcon icon="streaks" />
      <ViewHeader>
        <div className={styles.headerToolbar}>
          <div className={styles.segmentedControl}>
            {(['all', 'days', 'hours'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                className={styles.segmentButton}
                data-active={filterMode === mode}
                onClick={() => setFilterMode(mode)}
              >
                {mode === 'all'
                  ? 'Todos'
                  : mode === 'days'
                    ? '🗓️ En Días'
                    : '⏱️ En Horas'}
              </button>
            ))}
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={playStreakCompletionSound}
              title="Probar sonido de campana armónica"
              className={styles.secondaryActionButton}
            >
              <span>🔔</span> Probar Alarma
            </button>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className={styles.primaryActionButton}
            >
              + Nuevo Streak / Contador
            </button>
          </div>
        </div>
      </ViewHeader>

      <ViewBody>
        <div className={styles.pageBody}>
          <div className={styles.pageContainer}>
            {/* Hero Header */}
            <div className={styles.heroHeader}>
              <div className={styles.heroTitleGroup}>
                <h1 className={styles.heroTitle}>
                  <span>🔥</span> Streaks & Countdowns
                </h1>
                <p className={styles.heroSubtitle}>
                  Contadores de tiempo en días y horas con metas continuas,
                  alertas sonoras y notificaciones.
                </p>
              </div>

              <div className={styles.headerActions}>
                <button
                  type="button"
                  onClick={playStreakCompletionSound}
                  title="Probar sonido de campana armónica"
                  className={styles.secondaryActionButton}
                >
                  <span>🔔</span> Probar Alarma
                </button>

                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className={styles.primaryActionButton}
                >
                  + Nuevo Streak / Contador
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel} style={{ color: '#f59e0b' }}>
                  ACTIVOS AHORA
                </div>
                <div className={styles.statValue}>{activeCount}</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statLabel} style={{ color: '#10b981' }}>
                  METAS CUMPLIDAS
                </div>
                <div className={styles.statValue}>{completedCount}</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statLabel} style={{ color: '#6366f1' }}>
                  TOTAL REGISTRADOS
                </div>
                <div className={styles.statValue}>{streaks.length}</div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className={styles.filterBar}>
              {(['all', 'days', 'hours'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  className={styles.filterPill}
                  data-active={filterMode === mode}
                  onClick={() => setFilterMode(mode)}
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
            {filteredStreaks.length === 0 ? (
              <div className={styles.emptyState}>
                <span>🔥</span>
                <div>
                  {streaks.length === 0
                    ? 'No tienes contadores de Streak activos.'
                    : 'No hay contadores de Streak en esta vista.'}
                </div>
                {streaks.length === 0 && (
                  <button
                    type="button"
                    onClick={handleLoadTemplates}
                    className={styles.secondaryActionButton}
                  >
                    Cargar plantillas de ejemplo
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.streaksGrid}>
                {filteredStreaks.map(streak => {
                  const progress = calculateStreakProgress(streak, currentTime);

                  return (
                    <div key={streak.id} className={styles.streakCard}>
                      {/* Top Accent Strip */}
                      <div
                        className={styles.topAccentStrip}
                        style={{ background: streak.color || '#f59e0b' }}
                      />

                      <div>
                        <div className={styles.cardHeader}>
                          <div className={styles.cardTitleGroup}>
                            <span className={styles.cardIcon}>
                              {streak.icon}
                            </span>
                            <div>
                              <h3 className={styles.cardTitle}>
                                {streak.title}
                              </h3>
                              {streak.category && (
                                <span className={styles.cardCategory}>
                                  {streak.category}
                                </span>
                              )}
                            </div>
                          </div>

                          <span
                            className={styles.modeBadge}
                            style={{
                              background:
                                streak.mode === 'days'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(99, 102, 241, 0.15)',
                              color:
                                streak.mode === 'days' ? '#f59e0b' : '#6366f1',
                            }}
                          >
                            {streak.mode === 'days' ? '🗓️ DÍAS' : '⏱️ HORAS'}
                          </span>
                        </div>

                        {streak.description && (
                          <p className={styles.cardDescription}>
                            {streak.description}
                          </p>
                        )}

                        {/* Big Countdown Display */}
                        <div className={styles.countdownBox}>
                          <div className={styles.countdownLabel}>
                            {progress.isCompleted
                              ? 'ESTADO'
                              : streak.status === 'paused'
                                ? 'PAUSADO — TIEMPO RESTANTE'
                                : 'TIEMPO RESTANTE PARA LA META'}
                          </div>
                          <div
                            className={styles.countdownValue}
                            style={{
                              color: progress.isCompleted
                                ? '#10b981'
                                : streak.color,
                            }}
                          >
                            {formatTimeRemaining(
                              progress.remainingMs,
                              streak.mode
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className={styles.progressSection}>
                          <div className={styles.progressMeta}>
                            <span>
                              {streak.mode === 'days'
                                ? `${progress.elapsedDays} / ${streak.targetCount} días`
                                : `${progress.elapsedHours} / ${streak.targetCount} horas`}
                            </span>
                            <span>{progress.progressPercent}%</span>
                          </div>

                          <div className={styles.progressTrack}>
                            <div
                              className={styles.progressFill}
                              style={{
                                width: `${progress.progressPercent}%`,
                                background: `linear-gradient(90deg, ${streak.color || '#f59e0b'}, #ef4444)`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className={styles.cardFooter}>
                        <div className={styles.cardActionGroup}>
                          <button
                            type="button"
                            onClick={() => handleTogglePause(streak.id)}
                            className={styles.smallSecondaryButton}
                          >
                            {streak.status === 'running'
                              ? '⏸️ Pausar'
                              : '▶️ Reanudar'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResetStreak(streak.id)}
                            title="Reiniciar contador"
                            className={styles.smallSecondaryButton}
                          >
                            🔄 Reiniciar
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteStreak(streak.id)}
                          className={styles.smallDangerButton}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ViewBody>

      {/* Creation Modal */}
      <Modal
        open={showModal}
        onOpenChange={setShowModal}
        width={540}
        contentOptions={{ style: { padding: '24px' } }}
      >
        <div className={styles.modalForm}>
          <h2 className={styles.modalHeaderTitle}>
            + Nuevo Contador de Streak
          </h2>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Título de la Meta / Reto
            </label>
            <input
              type="text"
              placeholder="Ej. 30 Días de Estudio o Ayuno 16h"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Descripción (Opcional)</label>
            <input
              type="text"
              placeholder="Ej. Construir hábito diario sin interrupciones"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className={styles.formInput}
            />
          </div>

          {/* Mode Selector */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Unidad de Medida</label>
            <div className={styles.modeSelectorGrid}>
              <button
                type="button"
                onClick={() => setNewMode('days')}
                className={styles.modeOptionButton}
                data-active={newMode === 'days'}
              >
                🗓️ En Días
              </button>
              <button
                type="button"
                onClick={() => setNewMode('hours')}
                className={styles.modeOptionButton}
                data-active={newMode === 'hours'}
              >
                ⏱️ En Horas
              </button>
            </div>
          </div>

          {/* Target Count */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Meta Total ({newMode === 'days' ? 'Días' : 'Horas'})
            </label>
            <input
              type="number"
              min={1}
              value={newTargetCount}
              onChange={e => setNewTargetCount(Number(e.target.value) || 1)}
              className={styles.formInput}
            />
          </div>

          {/* Icon & Color */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ícono y Color</label>
            <div className={styles.iconPickerGrid}>
              {PRESET_ICONS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setNewIcon(ic)}
                  className={styles.iconOptionButton}
                  data-active={newIcon === ic}
                >
                  {ic}
                </button>
              ))}
            </div>

            <div className={styles.colorPickerRow}>
              {PRESET_COLORS.map(col => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setNewColor(col)}
                  className={styles.colorSwatchButton}
                  data-active={newColor === col}
                  style={{ background: col }}
                />
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newSound}
                onChange={e => setNewSound(e.target.checked)}
              />
              <span>🔔 Reproducir sonido armónico al cumplir meta</span>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newNotification}
                onChange={e => setNewNotification(e.target.checked)}
              />
              <span>📩 Notificación de escritorio</span>
            </label>
          </div>

          {/* Action buttons */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className={styles.secondaryActionButton}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateStreak}
              className={styles.primaryActionButton}
            >
              Crear Streak
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
