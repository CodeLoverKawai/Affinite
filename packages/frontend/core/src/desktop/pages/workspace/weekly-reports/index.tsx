import {
  CheckBoxCheckSolidIcon,
  EdgelessIcon,
  JournalIcon,
  PlusIcon,
  SearchIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear';
import { useCallback, useMemo, useState } from 'react';

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

dayjs.extend(isoWeek);
dayjs.extend(isoWeeksInYear);

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
  const workbench = workbenchService.workbench;

  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(() =>
    formatWeeklyJournalKey(dayjs())
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState<string>('');

  const docs = useLiveData(docsService.list.docs$);

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

  // Extract text snippets from daily note blocks
  const daySnippets = useMemo(() => {
    const map = new Map<string, string>();
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
              map.set(day.date, lines.join(' · '));
            }
          } finally {
            release();
          }
        } catch {
          // ignore read error
        }
      }
    }
    return map;
  }, [overview.days, docsService]);

  // All weeks of the current year
  const currentYear = useMemo(() => {
    const { year } = getWeekDateRange(selectedWeekKey);
    return year;
  }, [selectedWeekKey]);

  const allWeeksOfYear = useMemo(() => {
    const dec28 = dayjs(`${currentYear}-12-28`);
    const totalWeeks = dec28.isoWeeksInYear();
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
      <style>{`
        .affinite-weekly-card {
          background: rgba(30, 41, 59, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .affinite-weekly-card:hover {
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
        }
        .affinite-day-card {
          background: rgba(30, 41, 59, 0.55);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
        }
        .affinite-day-card:hover {
          transform: translateY(-2px);
          border-color: rgba(59, 130, 246, 0.5);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }
        .affinite-btn-primary {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 8px 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .affinite-btn-primary:hover {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }
      `}</style>

      <ViewHeader>
        <ViewTitle>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600,
            }}
          >
            <ViewIcon>
              <JournalIcon style={{ color: 'var(--affine-primary-color)' }} />
            </ViewIcon>
            <span>Reportes Semanales (Weekly Reports)</span>
          </div>
        </ViewTitle>
      </ViewHeader>

      <ViewBody>
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '24px 20px 48px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            color: 'var(--affine-text-primary-color)',
            fontFamily: 'var(--affine-font-family)',
          }}
        >
          {/* Top Control Bar */}
          <div
            className="affinite-weekly-card"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={handlePrevWeek}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 13,
                }}
              >
                ← Anterior
              </button>
              <button
                onClick={handleThisWeek}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Esta Semana
              </button>
              <button
                onClick={handleNextWeek}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 13,
                }}
              >
                Siguiente →
              </button>

              <div style={{ marginLeft: 6 }}>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {selectedWeekKey}
                </span>
                <span
                  style={{
                    marginLeft: 10,
                    fontSize: 14,
                    color: 'var(--affine-text-secondary-color)',
                  }}
                >
                  ({formatSpanishDate(overview.startDate)} al {formatSpanishDate(overview.endDate)} de {overview.year})
                </span>
              </div>
            </div>

            {/* Quick Metrics & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 20,
                  background:
                    overview.completionRate >= 70
                      ? 'rgba(16, 185, 129, 0.16)'
                      : 'rgba(245, 158, 11, 0.16)',
                  border: `1px solid ${
                    overview.completionRate >= 70
                      ? 'rgba(16, 185, 129, 0.35)'
                      : 'rgba(245, 158, 11, 0.35)'
                  }`,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: overview.completionRate >= 70 ? '#10b981' : '#f59e0b',
                  }}
                >
                  Consistencia: {overview.daysWithJournal}/7 días ({overview.completionRate}%)
                </span>
              </div>

              <button
                onClick={handleCopyMarkdownDigest}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{copyFeedback ? `✅ ${copyFeedback}` : '📋 Sintetizar Semana'}</span>
              </button>
            </div>
          </div>

          {/* Connected 7-Day Strip */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                📅 Tira Conectada de 7 Días (Daily Notes)
              </h3>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--affine-text-secondary-color)',
                }}
              >
                Haz clic en cualquier día para abrir o crear su nota diaria
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12,
              }}
            >
              {overview.days.map(day => {
                const snippet = daySnippets.get(day.date);
                return (
                  <div
                    key={day.date}
                    className="affinite-day-card"
                    onClick={() => handleOpenOrCreateDay(day.date, day.docId)}
                    style={{
                      border: day.isToday
                        ? '2px solid #3b82f6'
                        : day.exists
                          ? '1px solid rgba(16, 185, 129, 0.35)'
                          : '1px dashed rgba(255, 255, 255, 0.12)',
                      background: day.isToday
                        ? 'rgba(59, 130, 246, 0.12)'
                        : day.exists
                          ? 'rgba(16, 185, 129, 0.06)'
                          : 'rgba(30, 41, 59, 0.5)',
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: day.isToday ? '#60a5fa' : 'inherit',
                        }}
                      >
                        {day.dayName}
                      </span>
                      {day.isToday && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 10,
                            background: '#3b82f6',
                            color: '#ffffff',
                          }}
                        >
                          Hoy
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {formatSpanishDate(day.date)}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--affine-text-secondary-color)',
                        }}
                      >
                        ({day.date})
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div style={{ margin: '4px 0 2px' }}>
                      {day.exists ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'rgba(16, 185, 129, 0.16)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                          }}
                        >
                          ● Escrita
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 500,
                            background: 'rgba(148, 163, 184, 0.12)',
                            color: 'rgba(255, 255, 255, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          ○ Sin Nota
                        </span>
                      )}
                    </div>

                    {/* Snippet / Summary */}
                    {day.exists && snippet && (
                      <p
                        style={{
                          fontSize: 11,
                          color: 'var(--affine-text-secondary-color)',
                          margin: '2px 0 4px',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {snippet}
                      </p>
                    )}

                    {/* Action Button */}
                    <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                      {day.exists ? (
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#60a5fa',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span>Abrir Nota →</span>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: 'var(--affine-text-secondary-color)',
                          }}
                        >
                          <PlusIcon style={{ width: 12, height: 12 }} />
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
          <div
            className="affinite-weekly-card"
            style={{
              padding: '20px 24px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>📑</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                      Nota Maestra del Reporte Semanal ({selectedWeekKey})
                    </h4>
                    {overview.hasWeeklyNote ? (
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background: 'rgba(16, 185, 129, 0.16)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                        }}
                      >
                        ✅ Creada
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background: 'rgba(245, 158, 11, 0.16)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                        }}
                      >
                        ⚪ Pendiente
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: 13,
                      color: 'var(--affine-text-secondary-color)',
                    }}
                  >
                    {overview.hasWeeklyNote
                      ? 'La nota de esta semana ya está creada y vinculada con las 7 notas diarias del período.'
                      : 'Crea la nota semanal estructurada para consolidar metas, entregables y retrospectivas.'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="affinite-btn-primary"
                onClick={handleOpenOrCreateWeeklyNote}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  fontSize: 14,
                }}
              >
                <EdgelessIcon style={{ width: 16, height: 16 }} />
                <span>
                  {overview.hasWeeklyNote
                    ? 'Abrir Nota Semanal'
                    : 'Crear Nota Semanal'}
                </span>
              </button>
            </div>
          </div>

          {/* Weekly Habits Consistency Section */}
          <div
            className="affinite-weekly-card"
            style={{
              padding: '18px 24px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 26 }}>🔥</span>
              <div>
                <h4
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#f8fafc',
                  }}
                >
                  Hábitos & Rutinas de la Semana ({selectedWeekKey})
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                  Monitorea tus hábitos, rachas de consistencia y registros
                  diarios en la suite de hábitos.
                </p>
              </div>
            </div>

            <button
              onClick={() => workbench.open('/habits')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(16, 185, 129, 0.4)',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#6ee7b7',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <CheckBoxCheckSolidIcon style={{ width: 14, height: 14 }} />
              <span>Ver Matriz de Hábitos →</span>
            </button>
          </div>

          {/* Yearly Weeks History Grid / List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  🗓️ Historial de Semanas de {currentYear}
                </h3>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--affine-text-secondary-color)',
                  }}
                >
                  Navega y revisa el progreso de registro de cualquier semana del año
                </span>
              </div>

              {/* Search Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  width: 280,
                }}
              >
                <SearchIcon style={{ width: 16, height: 16, color: 'var(--affine-text-secondary-color)' }} />
                <input
                  type="text"
                  placeholder="Filtrar por semana o mes..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'inherit',
                    fontSize: 13,
                    width: '100%',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 10,
              }}
            >
              {filteredWeeks.map(({ weekKey, weekNumber, overview: wOverview }) => {
                const isSelected = weekKey === selectedWeekKey;
                return (
                  <div
                    key={weekKey}
                    onClick={() => setSelectedWeekKey(weekKey)}
                    className="affinite-weekly-card"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      background: isSelected
                        ? 'rgba(59, 130, 246, 0.16)'
                        : 'rgba(30, 41, 59, 0.45)',
                      border: isSelected
                        ? '1px solid #3b82f6'
                        : '1px solid rgba(255, 255, 255, 0.08)',
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
                          fontWeight: 600,
                          fontSize: 13,
                          color: isSelected ? '#60a5fa' : 'inherit',
                        }}
                      >
                        Semana {weekNumber}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color:
                            wOverview.daysWithJournal >= 5
                              ? '#10b981'
                              : 'var(--affine-text-secondary-color)',
                        }}
                      >
                        {wOverview.daysWithJournal}/7 días
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--affine-text-secondary-color)',
                      }}
                    >
                      {formatSpanishDate(wOverview.startDate)} – {formatSpanishDate(wOverview.endDate)}
                    </span>

                    {/* Progress Bar */}
                    <div
                      style={{
                        width: '100%',
                        height: 5,
                        borderRadius: 3,
                        background: 'rgba(255, 255, 255, 0.08)',
                        overflow: 'hidden',
                        marginTop: 2,
                      }}
                    >
                      <div
                        style={{
                          width: `${wOverview.completionRate}%`,
                          height: '100%',
                          background:
                            wOverview.completionRate >= 70
                              ? '#10b981'
                              : '#3b82f6',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ViewBody>
    </>
  );
};
