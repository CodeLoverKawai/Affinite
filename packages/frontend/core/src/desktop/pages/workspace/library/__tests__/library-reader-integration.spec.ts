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

export function isBookmarkedAtCfi(
  bookmarks: LibraryBookmark[],
  currentCfi?: string | null
): boolean {
  if (!currentCfi || !bookmarks || bookmarks.length === 0) return false;
  const cleanCurrent = currentCfi.split(',')[0].replace(/^epubcfi\(|\)$/g, '');
  return bookmarks.some(b => {
    if (b.cfi === currentCfi) return true;
    const cleanB = b.cfi.split(',')[0].replace(/^epubcfi\(|\)$/g, '');
    return cleanB === cleanCurrent;
  });
}

export function toggleBookmarkAtCfi(
  bookmarks: LibraryBookmark[],
  bookId: string,
  cfi: string,
  percentage?: number,
  label?: string
): { updatedBookmarks: LibraryBookmark[]; isNowBookmarked: boolean } {
  const existing = bookmarks.find(b => {
    if (b.cfi === cfi) return true;
    const cleanB = b.cfi.split(',')[0].replace(/^epubcfi\(|\)$/g, '');
    const cleanCfi = cfi.split(',')[0].replace(/^epubcfi\(|\)$/g, '');
    return cleanB === cleanCfi;
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
  const mockBookId = 'book-123';
  const cfiChapter1 = 'epubcfi(/6/14!/4/2/4)';
  const cfiChapter2 = 'epubcfi(/6/16!/4/2/8)';

  it('correctly detects when a page has an active bookmark', () => {
    let bookmarks: LibraryBookmark[] = [];
    expect(isBookmarkedAtCfi(bookmarks, cfiChapter1)).toBe(false);

    bookmarks = addBookmark(bookmarks, mockBookId, cfiChapter1, 0.25, 'Capítulo 1');
    expect(isBookmarkedAtCfi(bookmarks, cfiChapter1)).toBe(true);
    expect(isBookmarkedAtCfi(bookmarks, cfiChapter2)).toBe(false);
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
