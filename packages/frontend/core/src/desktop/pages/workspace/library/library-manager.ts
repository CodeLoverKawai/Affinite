export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  filePath: string;
  format: 'epub' | 'pdf' | 'mobi' | 'txt' | 'other';
  size: number;
  cover?: string;
  lastReadPosition?: string;
  readingPercentage: number;
  readingTimeMinutes?: number;
  tags?: string[];
  rating?: number;
  description?: string;
  createTime: number;
  updateTime: number;
}

export interface LibraryBookmark {
  id: string;
  bookId: string;
  cfi: string;
  label?: string;
  percentage?: number;
  createdAt: number;
}

export interface LibraryHighlight {
  id: string;
  bookId: string;
  cfi: string;
  text: string;
  note?: string;
  color?: string;
  chapter?: string;
  createdAt: number;
}

export function detectBookFormat(
  filePathOrName: string
): LibraryBook['format'] {
  const ext = filePathOrName.split('.').pop()?.toLowerCase();
  if (ext === 'epub') return 'epub';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'mobi' || ext === 'azw3') return 'mobi';
  if (ext === 'txt') return 'txt';
  return 'other';
}

export function createLibraryBook(params: {
  title: string;
  filePath: string;
  author?: string;
  size?: number;
  format?: string;
  cover?: string;
}): LibraryBook {
  const now = Date.now();
  const format =
    (params.format as LibraryBook['format']) ||
    detectBookFormat(params.filePath || params.title);

  return {
    id: `book-${now}-${Math.random().toString(36).slice(2, 7)}`,
    title: params.title.trim() || 'Libro sin título',
    author: params.author?.trim() || 'Autor desconocido',
    filePath: params.filePath,
    format,
    size: params.size ?? 0,
    cover: params.cover,
    readingPercentage: 0,
    readingTimeMinutes: 0,
    tags: [],
    rating: 0,
    createTime: now,
    updateTime: now,
  };
}

export function formatReadingProgress(percentage: number): string {
  const clamped = Math.max(0, Math.min(1, percentage));
  return `${Math.round(clamped * 100)}%`;
}

export function formatBookSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function filterBooks(
  books: LibraryBook[],
  query: string,
  filterTag?: string
): LibraryBook[] {
  const q = query.trim().toLowerCase();
  return books.filter(b => {
    if (filterTag && filterTag !== 'Todos') {
      if (!b.tags?.includes(filterTag)) return false;
    }
    if (!q) return true;
    return (
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.description || '').toLowerCase().includes(q)
    );
  });
}

export function sortBooks(
  books: LibraryBook[],
  sortBy: 'recent' | 'title' | 'progress' | 'rating'
): LibraryBook[] {
  const list = [...books];
  switch (sortBy) {
    case 'title':
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case 'progress':
      return list.sort((a, b) => b.readingPercentage - a.readingPercentage);
    case 'rating':
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'recent':
    default:
      return list.sort((a, b) => b.updateTime - a.updateTime);
  }
}

export function generateJournalQuoteMarkdown(quote: {
  bookTitle: string;
  author?: string;
  text: string;
  chapter?: string;
  cfi?: string;
  note?: string;
}): string {
  const lines: string[] = [];
  lines.push(`> "${quote.text.trim()}"`);
  const metaParts: string[] = [`*${quote.bookTitle}*`];
  if (quote.author) metaParts.push(quote.author);
  if (quote.chapter) metaParts.push(quote.chapter);
  lines.push(`> — ${metaParts.join(' · ')}`);
  if (quote.note?.trim()) {
    lines.push(`\n**Nota de lectura:** ${quote.note.trim()}`);
  }
  return lines.join('\n');
}

export function addBookmark(
  bookmarks: LibraryBookmark[],
  bookId: string,
  cfi: string,
  percentage?: number,
  label?: string
): LibraryBookmark[] {
  const newBookmark: LibraryBookmark = {
    id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    bookId,
    cfi,
    percentage,
    label: label?.trim() || `Marcador (${percentage !== undefined ? formatReadingProgress(percentage) : cfi})`,
    createdAt: Date.now(),
  };
  return [...bookmarks, newBookmark];
}

export function removeBookmark(
  bookmarks: LibraryBookmark[],
  bookmarkId: string
): LibraryBookmark[] {
  return bookmarks.filter(b => b.id !== bookmarkId);
}

export function addHighlight(
  highlights: LibraryHighlight[],
  bookId: string,
  text: string,
  cfi: string,
  options?: { note?: string; color?: string; chapter?: string }
): LibraryHighlight[] {
  const newHighlight: LibraryHighlight = {
    id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    bookId,
    cfi,
    text: text.trim(),
    note: options?.note?.trim(),
    color: options?.color || '#fde047',
    chapter: options?.chapter,
    createdAt: Date.now(),
  };
  return [...highlights, newHighlight];
}

export function removeHighlight(
  highlights: LibraryHighlight[],
  highlightId: string
): LibraryHighlight[] {
  return highlights.filter(h => h.id !== highlightId);
}
