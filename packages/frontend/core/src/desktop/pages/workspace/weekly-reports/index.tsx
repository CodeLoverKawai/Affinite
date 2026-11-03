import {
  CheckBoxCheckSolidIcon,
  DateTimeIcon,
  EdgelessIcon,
  JournalIcon,
  PlusIcon,
  SearchIcon,
} from '@blocksuite/icons/rc';
import {
  AFFINITE_YMAP_CALENDAR,
  AFFINITE_YMAP_HABITS,
  AFFINITE_YMAP_STREAKS,
  buildWeeklySnapshot,
} from '@affine/core/modules/affinite-hub';
import { useLiveData, useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DocsService } from '../../../../modules/doc';
import {
  aggregateWeeklyReportOverview,
  formatWeeklyJournalKey,
  getWeekDateRange,
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
import * as styles from './weekly-reports.css';

dayjs.extend(isLeapYear);
dayjs.extend(isoWeek);
dayjs.extend(isoWeeksInYear);

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const SPANISH_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const SPANISH_MONTH_ABBRS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function formatSpanishDate(dateStr: string): string {
  const d = dayjs(dateStr);
  return `${d.date()} ${SPANISH_MONTH_ABBRS[d.month()]}`;
}

export const Component = () => {
  const docsService = useService(DocsService);
  const journalService = useService(JournalService);
  const workbenchService = useService(WorkbenchService);
  const workspaceService = useService(WorkspaceService);
  const workbench = workbenchService.workbench;

  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(() =>
    formatWeeklyJournalKey(dayjs())
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [daySnippets, setDaySnippets] = useState<Record<string, string>>({});

  const docs = useLiveData(docsService.list.docs$);

  const boardDocs = useMemo(() => {
    return docs.filter(doc => {
      const isTrash = doc.trash$.value;
      const props = doc.properties$.value;
      return !isTrash && props['custom:isBoard'] === 'true';
    });
  }, [docs]);

  const [hubVersion, setHubVersion] = useState(0);
  useEffect(() => {
    const rootYDoc = workspaceService.workspace.rootYDoc;
    if (!rootYDoc || typeof rootYDoc.getMap !== 'function') return;

    const habitsMap = rootYDoc.getMap(AFFINITE_YMAP_HABITS);
    const streaksMap = rootYDoc.getMap(AFFINITE_YMAP_STREAKS);
    const calendarMap = rootYDoc.getMap(AFFINITE_YMAP_CALENDAR);

    const handleUpdate = () => setHubVersion(v => v + 1);

    habitsMap.observeDeep(handleUpdate);
    streaksMap.observeDeep(handleUpdate);
    calendarMap.observeDeep(handleUpdate);

    return () => {
      habitsMap.unobserveDeep(handleUpdate);
      streaksMap.unobserveDeep(handleUpdate);
      calendarMap.unobserveDeep(handleUpdate);
    };
  }, [workspaceService]);

  const weeklySnapshot = useMemo(() => {
    void hubVersion;
    const rootYDoc = workspaceService.workspace.rootYDoc;
    return buildWeeklySnapshot(rootYDoc, selectedWeekKey, boardDocs);
  }, [boardDocs, hubVersion, selectedWeekKey, workspaceService]);

  // Extract docs with journal dates
  const docList = useMemo(() => {
    return docs.map(doc => ({
      id: doc.id,
      journalDate: doc.properties$.value.journal,
      title: doc.title$.value,
    }));
  }, [docs]);

  // Aggregate current selected week overview
  const overview = useMemo(() => {
    return aggregateWeeklyReportOverview(selectedWeekKey, docList);
  }, [selectedWeekKey, docList]);

  // Extract text snippets from daily note blocks safely outside render phase
  useEffect(() => {
    const nextSnippets: Record<string, string> = {};
    for (const day of overview.days) {
      if (day.exists && day.docId) {
        try {
          const { doc, release } = docsService.open(day.docId);
          try {
            const paragraphs = doc.getBlocksByFlavour('affine:paragraph');
            const lists = doc.getBlocksByFlavour('affine:list');
            const lines: string[] = [];
            for (const b of [...paragraphs, ...lists]) {
              const text = b.model?.text?.toString()?.trim();
              if (text) {
                lines.push(text);
                if (lines.length >= 2) break;
              }
            }
            if (lines.length > 0) {
              nextSnippets[day.date] = lines.join(' · ');
            }
          } finally {
            release();
          }
        } catch {
          // ignore read error
        }
      }
    }
    setDaySnippets(nextSnippets);
  }, [overview.days, docsService]);

  // All weeks of the current year
  const currentYear = useMemo(() => {
    const { year } = getWeekDateRange(selectedWeekKey);
    return year;
  }, [selectedWeekKey]);

  const allWeeksOfYear = useMemo(() => {
    const dec28 = dayjs(`${currentYear}-12-28`);
    let totalWeeks = 52;
    try {
      totalWeeks =
        typeof dec28.isoWeeksInYear === 'function'
          ? dec28.isoWeeksInYear()
          : dec28.isoWeek() === 53
            ? 53
            : 52;
    } catch {
      totalWeeks = dec28.isoWeek() === 53 ? 53 : 52;
    }
    const weeks: Array<{
      weekKey: string;
      weekNumber: number;
      overview: ReturnType<typeof aggregateWeeklyReportOverview>;
    }> = [];

    for (let w = totalWeeks; w >= 1; w--) {
      const weekStr = String(w).padStart(2, '0');
      const wKey = `${currentYear}-W${weekStr}`;
      weeks.push({
        weekKey: wKey,
        weekNumber: w,
        overview: aggregateWeeklyReportOverview(wKey, docList),
      });
    }
    return weeks;
  }, [currentYear, docList]);

  // Filtered weeks in history
  const filteredWeeks = useMemo(() => {
    if (!historySearch.trim()) return allWeeksOfYear;
    const q = historySearch.toLowerCase().trim();
    return allWeeksOfYear.filter(({ weekKey, weekNumber, overview: wOverview }) => {
      const weekLabel = `semana ${weekNumber}`.toLowerCase();
      const startMonthIndex = dayjs(wOverview.startDate).month();
      const endMonthIndex = dayjs(wOverview.endDate).month();
      const monthNames = `${SPANISH_MONTHS[startMonthIndex]} ${SPANISH_MONTHS[endMonthIndex]}`;
      return (
        weekKey.toLowerCase().includes(q) ||
        weekLabel.includes(q) ||
        monthNames.includes(q) ||
        wOverview.startDate.includes(q) ||
        wOverview.endDate.includes(q)
      );
    });
  }, [allWeeksOfYear, historySearch]);

  // Navigation handlers
  const handlePrevWeek = useCallback(() => {
    const { start } = getWeekDateRange(selectedWeekKey);
    const prevWeek = start.subtract(1, 'week');
    setSelectedWeekKey(formatWeeklyJournalKey(prevWeek));
  }, [selectedWeekKey]);

  const handleNextWeek = useCallback(() => {
    const { start } = getWeekDateRange(selectedWeekKey);
    const nextWeek = start.add(1, 'week');
    setSelectedWeekKey(formatWeeklyJournalKey(nextWeek));
  }, [selectedWeekKey]);

  const handleThisWeek = useCallback(() => {
    setSelectedWeekKey(formatWeeklyJournalKey(dayjs()));
  }, []);

  // Open or create daily note
  const handleOpenOrCreateDay = useCallback(
    (dayDate: string, existingDocId?: string) => {
      if (existingDocId) {
        workbench.openDoc(existingDocId);
      } else {
        const docRecord = journalService.ensureJournalByDate(dayDate);
        if (docRecord?.id) {
          workbench.openDoc(docRecord.id);
        }
      }
    },
    [journalService, workbench]
  );

  // Open or create weekly note
  const handleOpenOrCreateWeeklyNote = useCallback(() => {
    const weeklyDoc = journalService.ensureWeeklyJournal(selectedWeekKey);
    if (weeklyDoc?.id) {
      workbench.openDoc(weeklyDoc.id);
    }
  }, [journalService, selectedWeekKey, workbench]);

  // Copy synthesized markdown digest
  const handleCopyMarkdownDigest = useCallback(() => {
    const { start, end, weekNumber } = getWeekDateRange(selectedWeekKey);
    let md = `# 📅 Reporte Semanal · ${selectedWeekKey} (Semana ${weekNumber})\n`;
    md += `**Período:** ${start.format('DD/MM/YYYY')} – ${end.format('DD/MM/YYYY')}\n`;
    md += `**Consistencia de Notas Diarias:** ${overview.daysWithJournal} de 7 días (${overview.completionRate}%)\n\n`;
    md += `## 📝 Resumen Detallado por Día\n\n`;

    for (const day of overview.days) {
      const statusIcon = day.exists ? '✅' : '⚪';
      md += `### ${statusIcon} ${day.dayName} (${day.date})\n`;
      if (day.exists && day.docId) {
        try {
          const { doc, release } = docsService.open(day.docId);
          try {
            const paragraphs = doc.getBlocksByFlavour('affine:paragraph');
            const lists = doc.getBlocksByFlavour('affine:list');
            const lines: string[] = [];
            for (const b of [...paragraphs, ...lists]) {
              const text = b.model?.text?.toString()?.trim();
              if (text) {
                lines.push(text);
              }
            }
            if (lines.length > 0) {
              for (const line of lines) {
                md += `- ${line}\n`;
              }
            } else {
              md += `- _(Nota creada sin contenido aún)_\n`;
            }
          } finally {
            release();
          }
        } catch {
          md += `- **Nota:** ${day.title || day.date}\n`;
        }
      } else {
        md += `- _(Sin nota diaria registrada)_\n`;
      }
      md += `\n`;
    }

    navigator.clipboard
      .writeText(md)
      .then(() => {
        setCopyFeedback('¡Resumen copiado!');
        setTimeout(() => setCopyFeedback(null), 2500);
      })
      .catch(() => {
        setCopyFeedback('Error al copiar');
        setTimeout(() => setCopyFeedback(null), 2500);
      });
  }, [selectedWeekKey, overview, docsService]);

  return (
    <>
      <ViewTitle title="Reportes Semanales" />
      <ViewIcon icon="weeklyReports" />
      <ViewHeader>
        <div className={styles.headerToolbar}>
          <div className={styles.headerTitleGroup}>
            <JournalIcon className={styles.headerIcon} />
            <span>Reportes Semanales (Weekly Reports)</span>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.badge}>{selectedWeekKey}</span>
          </div>
        </div>
      </ViewHeader>

      <ViewBody>
        <div className={styles.pageBody}>
          <div className={styles.pageContainer}>
            {/* Top Control Bar */}
            <div className={styles.controlBar}>
              <div className={styles.navGroup}>
                <button
                  type="button"
                  onClick={handlePrevWeek}
                  className={styles.navButton}
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  onClick={handleThisWeek}
                  className={styles.thisWeekButton}
                >
                  Esta Semana
                </button>
                <button
                  type="button"
                  onClick={handleNextWeek}
                  className={styles.navButton}
                >
                  Siguiente →
                </button>

                <div className={styles.weekHeadingGroup}>
                  <span className={styles.weekKeyText}>{selectedWeekKey}</span>
                  <span className={styles.weekRangeText}>
                    ({formatSpanishDate(overview.startDate)} al{' '}
                    {formatSpanishDate(overview.endDate)} de {overview.year})
                  </span>
                </div>
              </div>

              {/* Quick Metrics & Actions */}
              <div className={styles.metricsActionsGroup}>
                <div
                  className={styles.consistencyPill}
                  data-high={overview.completionRate >= 70}
                >
                  <span>
                    Consistencia: {overview.daysWithJournal}/7 días (
                    {overview.completionRate}%)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyMarkdownDigest}
                  className={styles.secondaryActionButton}
                >
                  <span>
                    {copyFeedback
                      ? `✅ ${copyFeedback}`
                      : '📋 Sintetizar Semana'}
                  </span>
                </button>
              </div>
            </div>

            {/* Connected 7-Day Strip */}
            <div className={styles.sectionContainer}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  📅 Tira Conectada de 7 Días (Daily Notes)
                </h3>
                <span className={styles.sectionSubtitle}>
                  Haz clic en cualquier día para abrir o crear su nota diaria
                </span>
              </div>

              <div className={styles.daysGrid}>
                {overview.days.map(day => {
                  const snippet = daySnippets[day.date];
                  return (
                    <div
                      key={day.date}
                      className={styles.dayCard}
                      data-today={day.isToday}
                      data-exists={day.exists}
                      onClick={() => handleOpenOrCreateDay(day.date, day.docId)}
                    >
                      {/* Header */}
                      <div className={styles.dayCardHeader}>
                        <span
                          className={styles.dayNameText}
                          data-today={day.isToday}
                        >
                          {day.dayName}
                        </span>
                        {day.isToday && (
                          <span className={styles.todayBadge}>Hoy</span>
                        )}
                      </div>

                      {/* Date */}
                      <div className={styles.dayDateRow}>
                        <span className={styles.dayDateFormatted}>
                          {formatSpanishDate(day.date)}
                        </span>
                        <span className={styles.dayDateIso}>({day.date})</span>
                      </div>

                      {/* Status Badge */}
                      <div className={styles.dayStatusRow}>
                        <span
                          className={styles.dayStatusBadge}
                          data-exists={day.exists}
                        >
                          {day.exists ? '● Escrita' : '○ Sin Nota'}
                        </span>
                      </div>

                      {/* Snippet / Summary */}
                      {day.exists && snippet && (
                        <p className={styles.daySnippet}>{snippet}</p>
                      )}

                      {/* Action Button */}
                      <div className={styles.dayActionFooter}>
                        {day.exists ? (
                          <div className={styles.dayOpenLink}>
                            <span>Abrir Nota →</span>
                          </div>
                        ) : (
                          <div className={styles.dayCreateLink}>
                            <PlusIcon className={styles.smallIcon} />
                            <span>Crear Nota</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connected Weekly Report Doc Section */}
            <div className={styles.masterNoteCard}>
              <div className={styles.masterNoteInfo}>
                <span className={styles.emojiLarge}>📑</span>
                <div>
                  <div className={styles.masterNoteTitleRow}>
                    <h4 className={styles.masterNoteTitle}>
                      Nota Maestra del Reporte Semanal ({selectedWeekKey})
                    </h4>
                    <span
                      className={styles.masterNoteStatusBadge}
                      data-created={overview.hasWeeklyNote}
                    >
                      {overview.hasWeeklyNote ? '✅ Creada' : '⚪ Pendiente'}
                    </span>
                  </div>
                  <p className={styles.masterNoteDescription}>
                    {overview.hasWeeklyNote
                      ? 'La nota de esta semana ya está creada y vinculada con las 7 notas diarias del período.'
                      : 'Crea la nota semanal estructurada para consolidar metas, entregables y retrospectivas.'}
                  </p>
                </div>
              </div>

              <div className={styles.headerActions}>
                <button
                  type="button"
                  className={styles.primaryActionButton}
                  onClick={handleOpenOrCreateWeeklyNote}
                >
                  <EdgelessIcon className={styles.mediumIcon} />
                  <span>
                    {overview.hasWeeklyNote
                      ? 'Abrir Nota Semanal'
                      : 'Crear Nota Semanal'}
                  </span>
                </button>
              </div>
            </div>

            {/* Weekly Habits & Intelligence Hub Card */}
            <div className={styles.snapshotCard}>
              <div className={styles.snapshotHeader}>
                <div className={styles.masterNoteInfo}>
                  <span className={styles.emojiLarge}>🔥</span>
                  <div>
                    <h4 className={styles.streakTitle}>
                      Hábitos & Rutinas de la Semana ({selectedWeekKey})
                    </h4>
                    <p className={styles.streakDescription}>
                      Monitorea tus hábitos, rachas de consistencia y registros
                      diarios consolidados en tiempo real.
                    </p>
                  </div>
                </div>

                <div
                  className={styles.consistencyBadge}
                  data-tier={
                    weeklySnapshot.consistencyScore >= 80
                      ? 'high'
                      : weeklySnapshot.consistencyScore >= 50
                        ? 'mid'
                        : 'low'
                  }
                >
                  <span>🎯 {weeklySnapshot.consistencyScore}% Consistencia</span>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className={styles.metricsGrid}>
                <div className={styles.metricBox}>
                  <span className={styles.metricLabel}>Hábitos</span>
                  <div className={styles.metricNumber}>
                    {weeklySnapshot.habits.completionRate}%
                  </div>
                  <span className={styles.dayDotLabel}>
                    {weeklySnapshot.habits.totalCompleted}/{weeklySnapshot.habits.totalTargetCompletions} completados
                  </span>
                  <div className={styles.progressBarTrack}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${weeklySnapshot.habits.completionRate}%` }}
                    />
                  </div>
                </div>

                <div className={styles.metricBox}>
                  <span className={styles.metricLabel}>Tareas de Calendario</span>
                  <div className={styles.metricNumber}>
                    {weeklySnapshot.tasks.completed}/{weeklySnapshot.tasks.total}
                  </div>
                  <span className={styles.dayDotLabel}>
                    {weeklySnapshot.tasks.completionRate}% completadas
                  </span>
                  <div className={styles.progressBarTrack}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${weeklySnapshot.tasks.completionRate}%` }}
                    />
                  </div>
                </div>

                <div className={styles.metricBox}>
                  <span className={styles.metricLabel}>Tableros Kanban</span>
                  <div className={styles.metricNumber}>
                    {weeklySnapshot.boards.completedCards}/{weeklySnapshot.boards.totalCardsDue}
                  </div>
                  <span className={styles.dayDotLabel}>
                    {weeklySnapshot.boards.completionRate}% tarjetas entregadas
                  </span>
                  <div className={styles.progressBarTrack}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${weeklySnapshot.boards.completionRate}%` }}
                    />
                  </div>
                </div>

                <div className={styles.metricBox}>
                  <span className={styles.metricLabel}>Streaks Activos</span>
                  <div className={styles.metricNumber}>
                    {weeklySnapshot.streaks.activeCount}
                  </div>
                  <span className={styles.dayDotLabel}>
                    en progreso
                  </span>
                </div>
              </div>

              {/* 7-Day Consistency Matrix (L, M, M, J, V, S, D) */}
              <div className={styles.daysRow}>
                {weeklySnapshot.habits.days.map((day, idx) => {
                  const dayLabel = DAY_LABELS[idx] ?? `D${idx + 1}`;
                  const isCompleted = day.rate === 100 && day.targetCount > 0;
                  const isPartial = day.rate > 0 && day.rate < 100;
                  return (
                    <div key={day.date} className={styles.dayDotBox}>
                      <span className={styles.dayDotLabel}>{dayLabel}</span>
                      <div
                        className={styles.dayDotIndicator}
                        data-completed={isCompleted ? 'true' : undefined}
                        data-partial={isPartial ? 'true' : undefined}
                        title={`${day.date}: ${day.completedCount}/${day.targetCount} (${day.rate}%)`}
                      />
                      <span className={styles.dayDotLabel}>{day.rate}%</span>
                    </div>
                  );
                })}
              </div>

              {/* Sprints ending this week (if any) */}
              {weeklySnapshot.streaks.sprintsEndingThisWeek.length > 0 && (
                <div className={styles.streaksList}>
                  <span className={styles.metricLabel}>
                    🏁 Sprints que finalizan esta semana ({weeklySnapshot.streaks.sprintsEndingThisWeek.length}):
                  </span>
                  {weeklySnapshot.streaks.sprintsEndingThisWeek.map(sprint => (
                    <div key={sprint.id} className={styles.streakChip}>
                      <span>{sprint.title}</span>
                      <span
                        className={styles.consistencyBadge}
                        data-tier={sprint.isCompleted ? 'high' : 'mid'}
                      >
                        {sprint.isCompleted ? '✅ Completado' : '⏳ Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className={styles.headerActions}>
                <button
                  type="button"
                  onClick={() => workbench.open('/habits')}
                  className={styles.habitChip}
                >
                  <CheckBoxCheckSolidIcon className={styles.smallIcon} />
                  <span>Ver Matriz de Hábitos →</span>
                </button>
                <button
                  type="button"
                  onClick={() => workbench.open('/calendar')}
                  className={styles.habitChip}
                >
                  <DateTimeIcon className={styles.smallIcon} />
                  <span>Ver Calendario →</span>
                </button>
              </div>
            </div>

            {/* Yearly Weeks History Grid / List */}
            <div className={styles.sectionContainer}>
              <div className={styles.sectionHeader}>
                <div>
                  <h3 className={styles.sectionTitle}>
                    🗓️ Historial de Semanas de {currentYear}
                  </h3>
                  <span className={styles.sectionSubtitle}>
                    Navega y revisa el progreso de registro de cualquier semana
                    del año
                  </span>
                </div>

                {/* Search Bar */}
                <div className={styles.searchBox}>
                  <SearchIcon className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Filtrar por semana o mes..."
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
              </div>

              <div className={styles.historyGrid}>
                {filteredWeeks.map(
                  ({ weekKey, weekNumber, overview: wOverview }) => {
                    const isSelected = weekKey === selectedWeekKey;
                    return (
                      <div
                        key={weekKey}
                        onClick={() => setSelectedWeekKey(weekKey)}
                        className={styles.historyCard}
                        data-selected={isSelected}
                      >
                        <div className={styles.historyCardTop}>
                          <span
                            className={styles.historyWeekLabel}
                            data-selected={isSelected}
                          >
                            Semana {weekNumber}
                          </span>
                          <span
                            className={styles.historyDaysCount}
                            data-high={wOverview.daysWithJournal >= 5}
                          >
                            {wOverview.daysWithJournal}/7 días
                          </span>
                        </div>

                        <span className={styles.historyDateRange}>
                          {formatSpanishDate(wOverview.startDate)} –{' '}
                          {formatSpanishDate(wOverview.endDate)}
                        </span>

                        {/* Progress Bar */}
                        <div className={styles.historyProgressTrack}>
                          <div
                            className={styles.historyProgressFill}
                            data-high={wOverview.completionRate >= 70}
                            style={{ width: `${wOverview.completionRate}%` }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>
      </ViewBody>
    </>
  );
};
