import { describe, expect, it, beforeEach } from 'vitest';
import {
  DiagnosticLogger,
  auditLibraryIntegrity,
  normalizeNoteColor,
  autoRepairLibraryNotes,
} from '../diagnostic-logger';
import type { LibraryBook, AnxWebNote } from '../library-manager';

describe('DiagnosticLogger Suite', () => {
  let logger: DiagnosticLogger;

  beforeEach(() => {
    logger = new DiagnosticLogger({ maxEntries: 100 });
  });

  it('records log entries and respects capacity limit', () => {
    logger.log('info', 'Foliate', 'Initialized viewer');
    logger.log('warn', 'AnxReader', 'Slow network detected');
    logger.log('error', 'LibraryDB', 'Failed to write note', { code: 500 });

    const entries = logger.getEntries();
    expect(entries.length).toBe(3);
    expect(entries[0].level).toBe('info');
    expect(entries[0].source).toBe('Foliate');
    expect(entries[2].level).toBe('error');
    expect(entries[2].details).toEqual({ code: 500 });

    const smallLogger = new DiagnosticLogger({ maxEntries: 3 });
    smallLogger.log('info', 'Host', '1');
    smallLogger.log('info', 'Host', '2');
    smallLogger.log('info', 'Host', '3');
    smallLogger.log('info', 'Host', '4');

    expect(smallLogger.getEntries().length).toBe(3);
    expect(smallLogger.getEntries()[0].message).toBe('2');
    expect(smallLogger.getEntries()[2].message).toBe('4');
  });

  it('filters entries by level and by source', () => {
    logger.log('info', 'Foliate', 'Page loaded');
    logger.log('warn', 'Foliate', '0 rects drawn');
    logger.log('error', 'AnxReader', 'Bridge timeout');
    logger.log('error', 'Foliate', 'DOMException in overlayer');

    const errorEntries = logger.getEntries({ level: 'error' });
    expect(errorEntries.length).toBe(2);

    const foliateEntries = logger.getEntries({ source: 'Foliate' });
    expect(foliateEntries.length).toBe(3);

    const foliateErrors = logger.getEntries({ source: 'Foliate', level: 'error' });
    expect(foliateErrors.length).toBe(1);
    expect(foliateErrors[0].message).toBe('DOMException in overlayer');
  });

  it('generates a formatted markdown diagnostic report', () => {
    logger.log('info', 'Foliate', 'Ready');
    logger.log('error', 'LibraryDB', 'Corrupt note detected', { noteId: 42 });

    const report = logger.generateReportMarkdown();
    expect(report).toContain('# Registro de Diagnóstico de AFFiNITe');
    expect(report).toContain('Ready');
    expect(report).toContain('Corrupt note detected');
    expect(report).toContain('noteId');
  });

  it('audits library integrity and flags orphan notes, NaN CFIs, and invalid colors', () => {
    const books: LibraryBook[] = [
      {
        id: '1',
        title: 'Edgar Allan Poe',
        author: 'Edgar Allan Poe',
        coverUrl: '',
        filePath: '/tmp/edgar.epub',
        fileSize: 1000,
        readingProgress: 0.2,
        lastReadPosition: 'epubcfi(/6/2[chapter1]!/4/2)',
        totalReadingTime: 120,
        isFinished: false,
        importedAt: 1000,
        lastReadAt: 2000,
      },
    ];

    const notes: AnxWebNote[] = [
      {
        id: 1,
        bookId: 1,
        content: 'Valid note',
        cfi: 'epubcfi(/6/2[chapter1]!/4/2/10)',
        chapter: 'Chapter 1',
        type: 'highlight',
        color: '#FFD700',
        updateTime: '2026-10-27T10:00:00Z',
      },
      {
        id: 2,
        bookId: 999, // Orphan
        content: 'Orphan note',
        cfi: 'epubcfi(/6/4!/4/2)',
        chapter: 'Chapter 2',
        type: 'underline',
        color: '66CCFF', // Missing #
        updateTime: '2026-10-27T10:00:00Z',
      },
      {
        id: 3,
        bookId: 1,
        content: 'Corrupted NaN CFI',
        cfi: 'epubcfi(/6/NaN!/4/2)', // Corrupted NaN
        chapter: 'Chapter 1',
        type: 'highlight',
        color: '#00FF00',
        updateTime: '2026-10-27T10:00:00Z',
      },
    ];

    const audit = auditLibraryIntegrity(books, notes);
    expect(audit.isHealthy).toBe(false);
    expect(audit.summary.totalBooks).toBe(1);
    expect(audit.summary.totalNotes).toBe(3);
    expect(audit.summary.orphanNotesCount).toBe(1);
    expect(audit.summary.corruptedCfiCount).toBe(1);
    expect(audit.summary.invalidColorCount).toBe(1);

    expect(audit.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'orphan-note', noteId: 2 }),
        expect.objectContaining({ type: 'corrupted-cfi', noteId: 3 }),
        expect.objectContaining({ type: 'invalid-color', noteId: 2 }),
      ])
    );
  });

  it('normalizes hex colors and provides safe defaults for invalid/empty colors', () => {
    // Missing '#'
    expect(normalizeNoteColor('FFD700')).toBe('#FFD700');
    expect(normalizeNoteColor('66ccff')).toBe('#66CCFF');

    // Already with '#'
    expect(normalizeNoteColor('#00FF00')).toBe('#00FF00');

    // Multiple leading hashes
    expect(normalizeNoteColor('##66CCFF')).toBe('#66CCFF');
    expect(normalizeNoteColor('###39C5BC')).toBe('#39C5BC');

    // Named colors
    expect(normalizeNoteColor('yellow')).toBe('#FEF08A');
    expect(normalizeNoteColor('blue')).toBe('#66CCFF');
    expect(normalizeNoteColor('pink')).toBe('#FBCFE8');
    expect(normalizeNoteColor('green')).toBe('#BBF7D0');
    expect(normalizeNoteColor('purple')).toBe('#E9D5FF');
    expect(normalizeNoteColor('red')).toBe('#E11D48');

    // 8-character hex (with alpha)
    expect(normalizeNoteColor('39C5BC80')).toBe('#39C5BC80');
    expect(normalizeNoteColor('#39C5BC80')).toBe('#39C5BC80');

    // Empty, undefined or invalid
    expect(normalizeNoteColor('')).toBe('#FFD700');
    expect(normalizeNoteColor(undefined)).toBe('#FFD700');
    expect(normalizeNoteColor('invalid_not_color')).toBe('#FFD700');
  });

  it('auto-repairs library notes and produces an audit with 0 errors and 0 warnings', () => {
    const books: LibraryBook[] = [
      {
        id: '1',
        title: 'Edgar Allan Poe',
        author: 'Edgar Allan Poe',
        coverUrl: '',
        filePath: '/tmp/edgar.epub',
        fileSize: 1000,
        readingProgress: 0.2,
        lastReadPosition: 'epubcfi(/6/2[chapter1]!/4/2)',
        totalReadingTime: 120,
        isFinished: false,
        importedAt: 1000,
        lastReadAt: 2000,
      },
    ];

    const dirtyNotes: AnxWebNote[] = [
      {
        id: 1,
        bookId: 1,
        content: 'Note 1',
        cfi: 'epubcfi(/6/2[chapter1]!/4/2/10)',
        chapter: 'Chapter 1',
        type: 'highlight',
        color: 'FFD700', // Missing #
        updateTime: '2026-10-27T10:00:00Z',
      },
      {
        id: 2,
        bookId: 1,
        content: 'Note 2',
        cfi: 'epubcfi(/6/2[chapter1]!/4/2/20)',
        chapter: 'Chapter 1',
        type: 'underline',
        color: '66CCFF', // Missing #
        updateTime: '2026-10-27T10:00:00Z',
      },
      {
        id: 3,
        bookId: 1,
        content: 'Note 3 with empty color',
        cfi: 'epubcfi(/6/2[chapter1]!/4/2/30)',
        chapter: 'Chapter 1',
        type: 'highlight',
        color: '', // Empty color (causing error)
        updateTime: '2026-10-27T10:00:00Z',
      },
    ];

    const { repairedNotes, fixedCount } = autoRepairLibraryNotes(dirtyNotes);
    expect(fixedCount).toBe(3);
    expect(repairedNotes[0].color).toBe('#FFD700');
    expect(repairedNotes[1].color).toBe('#66CCFF');
    expect(repairedNotes[2].color).toBe('#FFD700');

    // Run audit on repaired notes
    const audit = auditLibraryIntegrity(books, repairedNotes);
    expect(audit.isHealthy).toBe(true);
    expect(audit.summary.errorsCount).toBe(0);
    expect(audit.summary.warningsCount).toBe(0);
    expect(audit.summary.invalidColorCount).toBe(0);
  });
});
