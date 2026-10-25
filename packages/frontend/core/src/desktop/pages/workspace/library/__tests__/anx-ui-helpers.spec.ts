import { describe, expect, it } from 'vitest';
import {
  computeReadingHeatmap,
  filterBooksByStatus,
  exportBookNotesToMarkdown,
  LibraryBook,
  LibraryHighlight,
} from '../library-manager';

describe('Anx UI & Feature Helpers', () => {
  const sampleBooks: LibraryBook[] = [
    {
      id: 'book-1',
      title: 'El Principito',
      author: 'Antoine de Saint-Exupéry',
      filePath: '/books/principito.epub',
      format: 'epub',
      size: 1024 * 100,
      readingPercentage: 0.16,
      readingTimeMinutes: 45,
      tags: ['Clásicos', 'Filosofía'],
      rating: 5,
      createTime: Date.now() - 86400000 * 5,
      updateTime: Date.now() - 86400000 * 1,
    },
    {
      id: 'book-2',
      title: 'Drácula',
      author: 'Bram Stoker',
      filePath: '/books/dracula.epub',
      format: 'epub',
      size: 1024 * 500,
      readingPercentage: 1.0,
      readingTimeMinutes: 240,
      tags: ['Terror'],
      rating: 4,
      createTime: Date.now() - 86400000 * 10,
      updateTime: Date.now() - 86400000 * 2,
    },
    {
      id: 'book-3',
      title: 'Beyond Good and Evil',
      author: 'Friedrich Nietzsche',
      filePath: '/books/nietzsche.epub',
      format: 'epub',
      size: 1024 * 300,
      readingPercentage: 0.0,
      readingTimeMinutes: 0,
      tags: ['Filosofía'],
      rating: 0,
      createTime: Date.now() - 86400000 * 2,
      updateTime: Date.now() - 86400000 * 2,
    },
  ];

  const sampleHighlights: LibraryHighlight[] = [
    {
      id: 'hl-1',
      bookId: 'book-1',
      cfi: 'epubcfi(/6/2[chapter1]!/4/2/1:0)',
      text: 'Lo esencial es invisible a los ojos.',
      note: 'Frase clave del zorro.',
      color: '#fde047',
      chapter: 'Capítulo XXI',
      createdAt: Date.now(),
    },
    {
      id: 'hl-2',
      bookId: 'book-1',
      cfi: 'epubcfi(/6/4[chapter2]!/4/2/1:10)',
      text: 'Fue el tiempo que pasaste con tu rosa lo que la hizo tan importante.',
      color: '#86efac',
      chapter: 'Capítulo XXI',
      createdAt: Date.now(),
    },
  ];

  describe('filterBooksByStatus', () => {
    it('returns all books when status is "all"', () => {
      const result = filterBooksByStatus(sampleBooks, 'all');
      expect(result).toHaveLength(3);
    });

    it('returns only books currently in progress when status is "reading"', () => {
      const result = filterBooksByStatus(sampleBooks, 'reading');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('El Principito');
    });

    it('returns completed books when status is "finished"', () => {
      const result = filterBooksByStatus(sampleBooks, 'finished');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Drácula');
    });

    it('returns unread books when status is "notStarted"', () => {
      const result = filterBooksByStatus(sampleBooks, 'notStarted');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Beyond Good and Evil');
    });
  });

  describe('computeReadingHeatmap', () => {
    it('generates a heatmap grid with the requested number of days', () => {
      const days = 90;
      const heatmap = computeReadingHeatmap(sampleBooks, days);
      expect(heatmap).toHaveLength(days);
      expect(heatmap[0]).toHaveProperty('date');
      expect(heatmap[0]).toHaveProperty('minutes');
      expect(heatmap[0]).toHaveProperty('level');
      expect([0, 1, 2, 3, 4]).toContain(heatmap[0].level);
    });
  });

  describe('exportBookNotesToMarkdown', () => {
    it('exports book notes and highlights into formatted Markdown', () => {
      const md = exportBookNotesToMarkdown(sampleBooks[0], sampleHighlights);
      expect(md).toContain('# Notas y Citas: El Principito');
      expect(md).toContain('Antoine de Saint-Exupéry');
      expect(md).toContain('Lo esencial es invisible a los ojos.');
      expect(md).toContain('Frase clave del zorro.');
      expect(md).toContain('Capítulo XXI');
    });
  });
});
