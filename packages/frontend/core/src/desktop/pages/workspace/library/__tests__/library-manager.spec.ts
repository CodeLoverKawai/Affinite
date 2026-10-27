import { describe, expect, it } from 'vitest';
import {
  addBookmark,
  addBookTag,
  addHighlight,
  AnxWebNote,
  calculateReadingStatistics,
  convertAnxNotesToHighlights,
  createLibraryBook,
  exportAnxNotesToMarkdown,
  filterBooks,
  formatBooksForAnxBridge,
  formatBookSize,
  formatReadingProgress,
  formatReadingTime,
  generateJournalQuoteMarkdown,
  getNumericBookId,
  LibraryBook,
  removeBookmark,
  removeBookTag,
  removeHighlight,
  sortBooks,
  updateBookRating,
} from '../library-manager';

describe('Library Manager & Anx Reader Helper Suite', () => {
  it('creates a validated library book model with sensible defaults', () => {
    const book = createLibraryBook({
      title: 'El Quijote',
      filePath: '/home/user/.config/affinite/library/books/el-quijote.epub',
      author: 'Miguel de Cervantes',
      size: 1548200,
    });

    expect(book.id).toBeDefined();
    expect(book.title).toBe('El Quijote');
    expect(book.author).toBe('Miguel de Cervantes');
    expect(book.format).toBe('epub');
    expect(book.readingPercentage).toBe(0);
    expect(book.createTime).toBeGreaterThan(0);
  });

  it('formats progress and size cleanly', () => {
    expect(formatReadingProgress(0.428)).toBe('43%');
    expect(formatReadingProgress(0)).toBe('0%');
    expect(formatReadingProgress(1)).toBe('100%');

    expect(formatBookSize(500)).toBe('500 B');
    expect(formatBookSize(1024 * 512)).toBe('512.0 KB');
    expect(formatBookSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });

  it('filters and sorts books collection', () => {
    const books: LibraryBook[] = [
      createLibraryBook({ title: 'Dune', author: 'Frank Herbert', size: 1000 }),
      createLibraryBook({ title: 'Foundation', author: 'Isaac Asimov', size: 2000 }),
      createLibraryBook({ title: 'Hyperion', author: 'Dan Simmons', size: 3000 }),
    ];
    books[0].readingPercentage = 0.8;
    books[1].readingPercentage = 0.2;
    books[2].readingPercentage = 0.5;

    const filtered = filterBooks(books, 'asi');
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('Foundation');

    const sortedByProgress = sortBooks(books, 'progress');
    expect(sortedByProgress[0].title).toBe('Dune');
    expect(sortedByProgress[2].title).toBe('Foundation');
  });

  it('generates clean BlockSuite markdown when quoting an excerpt into the Daily Note', () => {
    const md = generateJournalQuoteMarkdown({
      bookTitle: 'Dune',
      author: 'Frank Herbert',
      chapter: 'Capítulo 1',
      text: 'El miedo es el asesino de la mente.',
      note: 'Excelente reflexión para el diario.',
      cfi: 'epubcfi(/6/4[chap01]!/4/2/10)',
    });

    expect(md).toContain('> "El miedo es el asesino de la mente."');
    expect(md).toContain('*Dune*');
    expect(md).toContain('Frank Herbert');
    expect(md).toContain('Capítulo 1');
    expect(md).toContain('Excelente reflexión para el diario.');
  });

  it('manages bookmarks and highlights state immutably', () => {
    let bookmarks = addBookmark([], 'book-1', 'epubcfi(/6/2)', 0.15, 'Capítulo 2');
    expect(bookmarks.length).toBe(1);
    expect(bookmarks[0].cfi).toBe('epubcfi(/6/2)');

    bookmarks = removeBookmark(bookmarks, bookmarks[0].id);
    expect(bookmarks.length).toBe(0);

    let highlights = addHighlight([], 'book-1', 'Texto subrayado', 'epubcfi(/6/4)', {
      color: '#fde047',
      chapter: 'Capítulo 1',
    });
    expect(highlights.length).toBe(1);
    expect(highlights[0].color).toBe('#fde047');

    highlights = removeHighlight(highlights, highlights[0].id);
    expect(highlights.length).toBe(0);
  });

  it('calculates comprehensive reading statistics matching Anx Remix', () => {
    const books: LibraryBook[] = [
      {
        ...createLibraryBook({ title: 'Book 1', filePath: '/path/1' }),
        readingPercentage: 1.0,
        readingTimeMinutes: 120,
      },
      {
        ...createLibraryBook({ title: 'Book 2', filePath: '/path/2' }),
        readingPercentage: 0.45,
        readingTimeMinutes: 45,
      },
      {
        ...createLibraryBook({ title: 'Book 3', filePath: '/path/3' }),
        readingPercentage: 0,
        readingTimeMinutes: 0,
      },
    ];

    const highlights = [
      { id: 'h1', bookId: 'b1', cfi: 'c1', text: 'Quote 1', createdAt: Date.now() },
      { id: 'h2', bookId: 'b1', cfi: 'c2', text: 'Quote 2', createdAt: Date.now() },
    ];

    const stats = calculateReadingStatistics(books, highlights);
    expect(stats.totalBooks).toBe(3);
    expect(stats.completedBooks).toBe(1);
    expect(stats.readingBooks).toBe(1);
    expect(stats.unreadBooks).toBe(1);
    expect(stats.totalReadingMinutes).toBe(165);
    expect(stats.totalHighlights).toBe(2);
    expect(formatReadingTime(165)).toBe('2h 45m');
    expect(formatReadingTime(40)).toBe('40m');
  });

  it('updates book tags and ratings immutably', () => {
    const book = createLibraryBook({ title: 'Book A', filePath: '/path/a' });
    let books = [book];

    books = addBookTag(books, book.id, 'Sci-Fi');
    expect(books[0].tags).toContain('Sci-Fi');

    // Duplicate tag is ignored
    books = addBookTag(books, book.id, 'Sci-Fi');
    expect(books[0].tags?.length).toBe(1);

    books = addBookTag(books, book.id, 'Classic');
    expect(books[0].tags?.length).toBe(2);

    books = removeBookTag(books, book.id, 'Sci-Fi');
    expect(books[0].tags).not.toContain('Sci-Fi');
    expect(books[0].tags).toContain('Classic');

    books = updateBookRating(books, book.id, 5);
    expect(books[0].rating).toBe(5);
  });

  it('transforms books and notes across the Anx-Remix Full Bridge protocol', () => {
    const book = createLibraryBook({
      title: 'Meditaciones',
      author: 'Marco Aurelio',
      filePath: '/books/meditaciones.epub',
    });
    book.readingPercentage = 45;
    book.lastReadPosition = 'epubcfi(/6/4!/4/2)';

    const numericId = getNumericBookId(book.id || book.filePath);
    expect(numericId).toBeGreaterThan(0);

    const formatted = formatBooksForAnxBridge([book]);
    expect(formatted.length).toBe(1);
    expect(formatted[0].id).toBe(numericId);
    expect(formatted[0].readingPercentage).toBeCloseTo(0.45, 2);

    const anxNotes: AnxWebNote[] = [
      {
        id: 101,
        bookId: numericId,
        content: 'La felicidad de tu vida depende de la calidad de tus pensamientos.',
        cfi: 'epubcfi(/6/4!/4/2)',
        chapter: 'Libro IV',
        type: 'highlight',
        color: 'FFF176',
        readerNote: 'Principio estoico clave.',
        createTime: '2026-10-25T10:00:00.000Z',
        updateTime: '2026-10-25T10:00:00.000Z',
      },
      {
        id: 102,
        bookId: numericId,
        content: 'Marcador de página',
        cfi: 'epubcfi(/6/8!/4/2)',
        chapter: 'Libro V',
        type: 'bookmark',
        color: '000000',
        createTime: '2026-10-25T11:00:00.000Z',
        updateTime: '2026-10-25T11:00:00.000Z',
      },
    ];

    const highlights = convertAnxNotesToHighlights(anxNotes, [book]);
    expect(highlights.length).toBe(1);
    expect(highlights[0].bookId).toBe(book.id);
    expect(highlights[0].text).toContain('felicidad de tu vida');
    expect(highlights[0].note).toBe('Principio estoico clave.');

    const exportedMd = exportAnxNotesToMarkdown('Meditaciones', 'Marco Aurelio', anxNotes);
    expect(exportedMd).toContain('# Notas y Citas: Meditaciones');
    expect(exportedMd).toContain('Marco Aurelio');
    expect(exportedMd).toContain('La felicidad de tu vida depende de la calidad de tus pensamientos.');
    expect(exportedMd).toContain('Principio estoico clave.');
  });
});
