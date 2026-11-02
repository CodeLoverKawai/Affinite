import type { AnxWebNote, LibraryBook } from './library-manager';
import { getNumericBookId } from './library-manager';

export type DiagnosticLevel = 'info' | 'warn' | 'error' | 'fatal';
export type DiagnosticSource =
  | 'Foliate'
  | 'AnxReader'
  | 'LibraryDB'
  | 'Sync'
  | 'Host'
  | 'Electron';

export interface DiagnosticEntry {
  id: string;
  timestamp: string;
  level: DiagnosticLevel;
  source: DiagnosticSource;
  message: string;
  details?: any;
}

export interface DiagnosticFilter {
  level?: DiagnosticLevel;
  source?: DiagnosticSource;
}

export interface AuditIssue {
  type: 'orphan-note' | 'corrupted-cfi' | 'invalid-color' | 'missing-book-file';
  level: 'warn' | 'error';
  message: string;
  noteId?: number;
  bookId?: number | string;
  details?: any;
}

export interface AuditResult {
  isHealthy: boolean;
  issues: AuditIssue[];
  summary: {
    totalBooks: number;
    totalNotes: number;
    orphanNotesCount: number;
    corruptedCfiCount: number;
    invalidColorCount: number;
    warningsCount: number;
    errorsCount: number;
  };
}

export class DiagnosticLogger {
  private readonly maxEntries: number;
  private entries: DiagnosticEntry[] = [];
  private listeners: Set<(entry: DiagnosticEntry) => void> = new Set();

  constructor(options: { maxEntries?: number } = {}) {
    this.maxEntries = options.maxEntries ?? 1000;
  }

  log(
    level: DiagnosticLevel,
    source: DiagnosticSource,
    message: string,
    details?: any
  ): DiagnosticEntry {
    const entry: DiagnosticEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      details,
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Mirror errors and warnings to console with a recognizable prefix
    const prefix = `[Affinite-Diagnostic][${source}][${level.toUpperCase()}]`;
    if (level === 'error' || level === 'fatal') {
      console.error(prefix, message, details ?? '');
    } else if (level === 'warn') {
      console.warn(prefix, message, details ?? '');
    }

    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {}
    }

    return entry;
  }

  getEntries(filter?: DiagnosticFilter): DiagnosticEntry[] {
    if (!filter) return [...this.entries];
    return this.entries.filter(entry => {
      if (filter.level && entry.level !== filter.level) return false;
      if (filter.source && entry.source !== filter.source) return false;
      return true;
    });
  }

  clear(): void {
    this.entries = [];
  }

  subscribe(listener: (entry: DiagnosticEntry) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  generateReportMarkdown(): string {
    const lines: string[] = [
      '# Registro de Diagnóstico de AFFiNITe',
      `Fecha de generación: ${new Date().toLocaleString()}`,
      `Total de eventos registrados: ${this.entries.length}`,
      '',
      '| Hora | Nivel | Origen | Mensaje |',
      '| :--- | :---: | :---: | :--- |',
    ];

    for (const entry of this.entries) {
      const time = entry.timestamp.split('T')[1]?.slice(0, 8) || entry.timestamp;
      const detailsStr = entry.details
        ? ` <br><pre>${JSON.stringify(entry.details).slice(0, 150)}</pre>`
        : '';
      lines.push(
        `| \`${time}\` | **${entry.level.toUpperCase()}** | \`${entry.source}\` | ${entry.message}${detailsStr} |`
      );
    }

    return lines.join('\n');
  }
}

export function auditLibraryIntegrity(
  books: LibraryBook[],
  notes: AnxWebNote[]
): AuditResult {
  const issues: AuditIssue[] = [];
  const knownBookIds = new Set<string>();
  const knownNumericBookIds = new Set<number>();

  for (const book of books) {
    knownBookIds.add(String(book.id));
    knownNumericBookIds.add(getNumericBookId(book.id));
  }

  let orphanNotesCount = 0;
  let corruptedCfiCount = 0;
  let invalidColorCount = 0;

  for (const note of notes) {
    const numBookId = typeof note.bookId === 'number' ? note.bookId : parseInt(String(note.bookId), 10);
    const isOrphan = !knownNumericBookIds.has(numBookId) && !knownBookIds.has(String(note.bookId));

    if (isOrphan) {
      orphanNotesCount++;
      issues.push({
        type: 'orphan-note',
        level: 'warn',
        message: `Nota #${note.id} pertenece al libro desconocido ID #${note.bookId}`,
        noteId: note.id,
        bookId: note.bookId,
      });
    }

    if (!note.cfi || typeof note.cfi !== 'string' || note.cfi.includes('NaN')) {
      corruptedCfiCount++;
      issues.push({
        type: 'corrupted-cfi',
        level: 'error',
        message: `Nota #${note.id} contiene un CFI corrupto o con 'NaN': "${note.cfi}"`,
        noteId: note.id,
        bookId: note.bookId,
        details: { cfi: note.cfi },
      });
    }

    if (note.color && typeof note.color === 'string') {
      const trimmed = note.color.trim();
      const isValidHexWithHash = /^#[0-9a-fA-F]{3,8}$/.test(trimmed);
      const isMissingHash = /^[0-9a-fA-F]{3,8}$/.test(trimmed);
      if (!isValidHexWithHash) {
        invalidColorCount++;
        issues.push({
          type: 'invalid-color',
          level: isMissingHash ? 'warn' : 'error',
          message: isMissingHash
            ? `Nota #${note.id} tiene color hexadecimal sin prefijo '#' ("${note.color}")`
            : `Nota #${note.id} tiene un formato de color inválido ("${note.color}")`,
          noteId: note.id,
          bookId: note.bookId,
          details: { color: note.color },
        });
      }
    }
  }

  const errorsCount = issues.filter(i => i.level === 'error').length;
  const warningsCount = issues.filter(i => i.level === 'warn').length;

  return {
    isHealthy: errorsCount === 0 && warningsCount === 0,
    issues,
    summary: {
      totalBooks: books.length,
      totalNotes: notes.length,
      orphanNotesCount,
      corruptedCfiCount,
      invalidColorCount,
      warningsCount,
      errorsCount,
    },
  };
}

export function normalizeNoteColor(
  color?: string | null,
  fallback = '#FFD700'
): string {
  if (!color || typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  if (!trimmed) return fallback;

  // Clean any multiple leading hashes e.g. ##66CCFF -> 66CCFF
  const clean = trimmed.replace(/^#+/, '');

  if (/^[0-9a-fA-F]{3,8}$/.test(clean)) {
    return `#${clean.toUpperCase()}`;
  }

  const namedColors: Record<string, string> = {
    yellow: '#FEF08A',
    green: '#BBF7D0',
    blue: '#66CCFF',
    pink: '#FBCFE8',
    purple: '#E9D5FF',
    red: '#E11D48',
  };

  const lower = clean.toLowerCase();
  if (namedColors[lower]) {
    return namedColors[lower];
  }

  return fallback;
}

export function autoRepairLibraryNotes(notes: AnxWebNote[]): {
  repairedNotes: AnxWebNote[];
  fixedCount: number;
} {
  let fixedCount = 0;
  const repairedNotes = notes.map(note => {
    let modified = false;
    let nextColor = note.color;
    const normalized = normalizeNoteColor(note.color);

    if (normalized !== note.color) {
      nextColor = normalized;
      modified = true;
    }

    if (modified) {
      fixedCount++;
      return {
        ...note,
        color: nextColor,
      };
    }
    return note;
  });

  return { repairedNotes, fixedCount };
}

export const globalDiagnosticLogger = new DiagnosticLogger();

if (typeof window !== 'undefined') {
  (window as any).__AFFINITE_DIAGNOSTICS__ = globalDiagnosticLogger;
}
