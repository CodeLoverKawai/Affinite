import { describe, expect, it } from 'vitest';
import {
  addBookmark,
  addHighlight,
  createLibraryBook,
  filterBooks,
  formatBookSize,
  formatReadingProgress,
  generateJournalQuoteMarkdown,
  LibraryBook,
  removeBookmark,
  removeHighlight,
  sortBooks,
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
});
