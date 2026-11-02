import { describe, expect, it } from 'vitest';
import {
  addBookmark,
  removeBookmark,
  addHighlight,
  removeHighlight,
  HIGHLIGHT_COLORS,
  LibraryBookmark,
  LibraryHighlight,
} from '../library-manager';
import { isBookmarkedAtCfi, cleanCfi } from '../library-reader';
import { AnxWebNote } from '../diagnostic-logger';

export function toggleBookmarkAtCfi(
  bookmarks: LibraryBookmark[],
  bookId: string,
  cfi: string,
  percentage?: number,
  label?: string
): { updatedBookmarks: LibraryBookmark[]; isNowBookmarked: boolean } {
  const existing = bookmarks.find(b => {
    if (b.cfi === cfi) return true;
    return cleanCfi(b.cfi) === cleanCfi(cfi);
  });

  if (existing) {
    return {
      updatedBookmarks: removeBookmark(bookmarks, existing.id),
      isNowBookmarked: false,
    };
  } else {
    return {
      updatedBookmarks: addBookmark(bookmarks, bookId, cfi, percentage, label),
      isNowBookmarked: true,
    };
  }
}

describe('Library Reader Integration Suite', () => {
  const mockBookId = '1';
  const cfiChapter1 = 'epubcfi(/6/14!/4/2/4)';
  const cfiChapter2 = 'epubcfi(/6/16!/4/2/8)';

  it('correctly cleans CFI strings across different formats', () => {
    expect(cleanCfi('epubcfi(/6/14!/4/2/4)')).toBe('/6/14!/4/2/4');
    expect(cleanCfi('epubcfi(/6/14!/4/2/4,/1:0,/1:10)')).toBe('/6/14!/4/2/4');
  });

  it('correctly detects when a page has an active bookmark in AnxWebNotes', () => {
    let notes: AnxWebNote[] = [];
    expect(isBookmarkedAtCfi(notes, mockBookId, cfiChapter1)).toBe(false);

    notes = [
      {
        id: 1,
        bookId: 1,
        content: 'Marcador 1',
        cfi: cfiChapter1,
        chapter: 'Capítulo 1',
        type: 'bookmark',
        color: '#F59E0B',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
      },
    ];

    expect(isBookmarkedAtCfi(notes, mockBookId, cfiChapter1)).toBe(true);
    expect(isBookmarkedAtCfi(notes, mockBookId, cfiChapter2)).toBe(false);
  });

  it('toggles bookmark on and off cleanly without duplicates', () => {
    let bookmarks: LibraryBookmark[] = [];

    // 1. Add bookmark via toggle
    const addResult = toggleBookmarkAtCfi(bookmarks, mockBookId, cfiChapter1, 0.15, 'Página 15%');
    expect(addResult.isNowBookmarked).toBe(true);
    expect(addResult.updatedBookmarks.length).toBe(1);
    expect(addResult.updatedBookmarks[0].cfi).toBe(cfiChapter1);
    expect(addResult.updatedBookmarks[0].percentage).toBe(0.15);

    // 2. Remove bookmark via toggle on the same page
    const removeResult = toggleBookmarkAtCfi(addResult.updatedBookmarks, mockBookId, cfiChapter1);
    expect(removeResult.isNowBookmarked).toBe(false);
    expect(removeResult.updatedBookmarks.length).toBe(0);
  });

  it('handles highlights additions, removals, and preserves colors from the palette', () => {
    let highlights: LibraryHighlight[] = [];
    const colorHex = HIGHLIGHT_COLORS[0].hex; // Yellow

    highlights = addHighlight(highlights, mockBookId, 'Una cita célebre.', cfiChapter1, {
      color: colorHex,
      chapter: 'Capítulo 1',
      note: 'Excelente reflexión',
    });

    expect(highlights.length).toBe(1);
    expect(highlights[0].text).toBe('Una cita célebre.');
    expect(highlights[0].color).toBe(colorHex);
    expect(highlights[0].note).toBe('Excelente reflexión');

    highlights = removeHighlight(highlights, highlights[0].id);
    expect(highlights.length).toBe(0);
  });
});
