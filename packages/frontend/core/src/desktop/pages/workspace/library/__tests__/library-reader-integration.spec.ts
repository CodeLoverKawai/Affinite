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
import {
  isBookmarkedAtCfi,
  cleanCfi,
  buildFoliateUrl,
  unpackFoliateMessage,
} from '../library-reader';
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

  it('builds a fully compliant foliate URL with slide paginator, columnThreshold and normalized paths', () => {
    const rawPath = '/home/rousseau/books/el-lobo-estepario.epub';
    const cfi = 'epubcfi(/6/12!/4/2/6)';

    const foliateUrl = buildFoliateUrl({
      filePath: rawPath,
      initialCfi: cfi,
      theme: 'sepia',
      fontSize: 110,
    });

    expect(foliateUrl).toContain('assets://./foliate/index.html?');
    const parsed = new URL(foliateUrl);
    expect(parsed.searchParams.get('url')).toBe(`assets://local-file/${encodeURIComponent(rawPath)}`);
    expect(parsed.searchParams.get('initialCfi')).toBe(cfi);
    expect(parsed.searchParams.get('cfi')).toBe(cfi);
    expect(parsed.searchParams.get('theme')).toBe('sepia');

    const style = JSON.parse(parsed.searchParams.get('style') || '{}');
    expect(style.pageTurnStyle).toBe('slide');
    expect(style.columnThreshold).toBe(800);
    expect(style.maxColumnCount).toBe(1);
    expect(style.backgroundColor).toBe('#f7f1e3');
    expect(style.fontColor).toBe('#2c3437');
    expect(style.fontSize).toBe(1.1);
  });

  it('correctly unpacks both anx-reader wrapped events and direct foliate messages', () => {
    // 1. Wrapped event from Foliate callFlutter
    const wrappedMsg = {
      type: 'anx-reader',
      event: 'onRelocated',
      data: { cfi: 'epubcfi(/6/14!/4/2/2)', fraction: 0.42, tocItem: { label: 'Capítulo 3' } },
    };
    const unpackedWrapped = unpackFoliateMessage(wrappedMsg);
    expect(unpackedWrapped.eventType).toBe('onRelocated');
    expect(unpackedWrapped.payload.cfi).toBe('epubcfi(/6/14!/4/2/2)');
    expect(unpackedWrapped.payload.fraction).toBe(0.42);
    expect(unpackedWrapped.payload.tocItem.label).toBe('Capítulo 3');

    // 2. Direct event
    const directMsg = {
      type: 'onLoadEnd',
    };
    const unpackedDirect = unpackFoliateMessage(directMsg);
    expect(unpackedDirect.eventType).toBe('onLoadEnd');

    // 3. Stringified JSON message
    const stringified = JSON.stringify(wrappedMsg);
    const unpackedString = unpackFoliateMessage(stringified);
    expect(unpackedString.eventType).toBe('onRelocated');

    // 4. Invalid or corrupted input does not crash
    expect(unpackFoliateMessage(null).eventType).toBe('');
    expect(unpackFoliateMessage('{invalid_json').eventType).toBe('');
  });
});
