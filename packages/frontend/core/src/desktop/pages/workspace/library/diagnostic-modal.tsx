import React, { useState, useEffect, useMemo } from 'react';
import {
  globalDiagnosticLogger,
  auditLibraryIntegrity,
  autoRepairLibraryNotes,
  type DiagnosticEntry,
  type DiagnosticLevel,
  type DiagnosticSource,
  type AuditResult,
} from './diagnostic-logger';
import type { AnxWebNote, LibraryBook } from './library-manager';

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: LibraryBook[];
  notes: AnxWebNote[];
  onRepairNotes?: (repaired: AnxWebNote[]) => void;
}

export const DiagnosticModal: React.FC<DiagnosticModalProps> = ({
  isOpen,
  onClose,
  books,
  notes,
  onRepairNotes,
}) => {
  const [entries, setEntries] = useState<DiagnosticEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<DiagnosticLevel | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<DiagnosticSource | 'all'>('all');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEntries(globalDiagnosticLogger.getEntries());
    const unsubscribe = globalDiagnosticLogger.subscribe(newEntry => {
      setEntries(prev => [...prev.slice(-999), newEntry]);
    });
    return unsubscribe;
  }, [isOpen]);

  const runAudit = () => {
    const result = auditLibraryIntegrity(books, notes);
    setAuditResult(result);
    if (result.isHealthy) {
      globalDiagnosticLogger.log(
        'info',
        'Host',
        `Auditoría completada con éxito: ${books.length} libros y ${notes.length} notas analizados sin anomalías.`
      );
    } else {
      globalDiagnosticLogger.log(
        result.summary.errorsCount > 0 ? 'error' : 'warn',
        'Host',
        `Auditoría detectó ${result.summary.errorsCount} error(es) y ${result.summary.warningsCount} advertencia(s).`,
        result.summary
      );
    }
  };

  const handleCopyLogs = () => {
    const markdown = globalDiagnosticLogger.generateReportMarkdown();
    const auditText = auditResult
      ? `\n\n## Resumen de Auditoría de Integridad\n- Libros: ${auditResult.summary.totalBooks}\n- Notas: ${auditResult.summary.totalNotes}\n- Notas Huérfanas: ${auditResult.summary.orphanNotesCount}\n- CFIs corruptos (NaN): ${auditResult.summary.corruptedCfiCount}\n- Colores anómalos: ${auditResult.summary.invalidColorCount}\n`
      : '';
    navigator.clipboard.writeText(markdown + auditText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const handleClearLogs = () => {
    globalDiagnosticLogger.clear();
    setEntries([]);
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (levelFilter !== 'all' && e.level !== levelFilter) return false;
      if (sourceFilter !== 'all' && e.source !== sourceFilter) return false;
      return true;
    });
  }, [entries, levelFilter, sourceFilter]);

  const errorCount = useMemo(() => entries.filter(e => e.level === 'error' || e.level === 'fatal').length, [entries]);
  const warnCount = useMemo(() => entries.filter(e => e.level === 'warn').length, [entries]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '94%',
          maxWidth: 1050,
          height: '88vh',
          backgroundColor: '#0c111c',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: 14,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e2e8f0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #111827 0%, #0c111c 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🩺</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#f8fafc' }}>
                Diagnóstico de AFFiNITe & Anx Reader
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                Monitoreo en tiempo real de eventos, excepciones y validación de integridad
              </div>
            </div>
            {errorCount > 0 && (
              <span
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {errorCount} {errorCount === 1 ? 'Error' : 'Errores'}
              </span>
            )}
            {warnCount > 0 && (
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid #f59e0b',
                  color: '#fde68a',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {warnCount} {warnCount === 1 ? 'Aviso' : 'Avisos'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 20,
              cursor: 'pointer',
              padding: 6,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Toolbar */}
        <div
          style={{
            padding: '10px 20px',
            background: '#090d16',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b', marginRight: 4 }}>Nivel:</span>
            {(['all', 'error', 'warn', 'info'] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                style={{
                  background: levelFilter === lvl ? '#1e293b' : 'transparent',
                  color: levelFilter === lvl ? '#38bdf8' : '#94a3b8',
                  border: `1px solid ${levelFilter === lvl ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: levelFilter === lvl ? 600 : 400,
                }}
              >
                {lvl === 'all' ? 'Todos' : lvl.toUpperCase()}
              </button>
            ))}

            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 12, marginRight: 4 }}>
              Origen:
            </span>
            {(['all', 'Foliate', 'AnxReader', 'LibraryDB', 'Host'] as const).map(src => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                style={{
                  background: sourceFilter === src ? '#1e293b' : 'transparent',
                  color: sourceFilter === src ? '#38bdf8' : '#94a3b8',
                  border: `1px solid ${sourceFilter === src ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {src}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={runAudit}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
              }}
            >
              🔍 Auditar Estado
            </button>
            <button
              onClick={handleCopyLogs}
              style={{
                background: copied ? '#10b981' : '#1e293b',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {copied ? '✓ ¡Copiado!' : '📋 Copiar Registro'}
            </button>
            <button
              onClick={handleClearLogs}
              style={{
                background: 'transparent',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                padding: '6px 10px',
                borderRadius: 8,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              🧹 Limpiar
            </button>
          </div>
        </div>

        {/* Audit summary card if run */}
        {auditResult && (
          <div
            style={{
              padding: '12px 20px',
              background: auditResult.isHealthy
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
              borderBottom: `1px solid ${auditResult.isHealthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <strong>
                {auditResult.isHealthy
                  ? '✅ Integridad Verificada: Sin errores estructurales detectados.'
                  : '⚠️ Anomalías Detectadas en la Base de Datos o Anotaciones:'}
              </strong>
              <span>
                Libros: {auditResult.summary.totalBooks} | Notas: {auditResult.summary.totalNotes}
              </span>
            </div>
            {auditResult.issues.length > 0 && (
              <div style={{ maxHeight: 70, overflowY: 'auto', marginTop: 4 }}>
                {auditResult.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    style={{
                      color: issue.level === 'error' ? '#fca5a5' : '#fde68a',
                      marginTop: 2,
                    }}
                  >
                    • {issue.message}
                  </div>
                ))}
              </div>
            )}
            {!auditResult.isHealthy && onRepairNotes && (
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    const { repairedNotes, fixedCount } = autoRepairLibraryNotes(notes);
                    onRepairNotes(repairedNotes);
                    globalDiagnosticLogger.log(
                      'info',
                      'Host',
                      `🛠️ Se corrigieron automáticamente ${fixedCount} notas (colores normalizados con '#' y fallbacks).`
                    );
                    const newAudit = auditLibraryIntegrity(books, repairedNotes);
                    setAuditResult(newAudit);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  🛠️ Reparar Todo Automáticamente
                </button>
              </div>
            )}
          </div>
        )}

        {/* Log Viewer Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 20px',
            backgroundColor: '#070a12',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {filteredEntries.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', marginTop: 60 }}>
              No hay eventos ni errores registrados en esta vista.
            </div>
          ) : (
            filteredEntries.map(entry => {
              const levelColor =
                entry.level === 'error' || entry.level === 'fatal'
                  ? '#ef4444'
                  : entry.level === 'warn'
                  ? '#f59e0b'
                  : '#38bdf8';
              const time = entry.timestamp.split('T')[1]?.slice(0, 8) || entry.timestamp;

              return (
                <div
                  key={entry.id}
                  style={{
                    padding: '6px 0',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <span style={{ color: '#64748b', flexShrink: 0 }}>{time}</span>
                  <span
                    style={{
                      color: levelColor,
                      fontWeight: 700,
                      width: 50,
                      flexShrink: 0,
                    }}
                  >
                    [{entry.level.toUpperCase()}]
                  </span>
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: '#cbd5e1',
                      padding: '1px 6px',
                      borderRadius: 4,
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    {entry.source}
                  </span>
                  <div style={{ flex: 1, wordBreak: 'break-word', color: '#f1f5f9' }}>
                    {entry.message}
                    {entry.details && (
                      <pre
                        style={{
                          margin: '4px 0 0 0',
                          padding: 6,
                          background: 'rgba(0, 0, 0, 0.4)',
                          borderRadius: 4,
                          color: '#94a3b8',
                          fontSize: 11,
                          overflowX: 'auto',
                        }}
                      >
                        {typeof entry.details === 'string'
                          ? entry.details
                          : JSON.stringify(entry.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
