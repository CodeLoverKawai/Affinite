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
  sortBy: 'recent' | 'title' | 'progress' | 'rating' | 'size'
): LibraryBook[] {
  const list = [...books];
  switch (sortBy) {
    case 'title':
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case 'progress':
      return list.sort((a, b) => b.readingPercentage - a.readingPercentage);
    case 'rating':
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'size':
      return list.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
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

export interface ReadingStatistics {
  totalBooks: number;
  completedBooks: number;
  readingBooks: number;
  unreadBooks: number;
  totalReadingMinutes: number;
  totalHighlights: number;
}

export function formatReadingTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function calculateReadingStatistics(
  books: LibraryBook[],
  highlights: LibraryHighlight[]
): ReadingStatistics {
  const totalBooks = books.length;
  const completedBooks = books.filter(b => b.readingPercentage >= 0.99).length;
  const readingBooks = books.filter(
    b => b.readingPercentage > 0 && b.readingPercentage < 0.99
  ).length;
  const unreadBooks = books.filter(b => b.readingPercentage === 0).length;
  const totalReadingMinutes = books.reduce(
    (acc, b) => acc + (b.readingTimeMinutes ?? 0),
    0
  );
  const totalHighlights = highlights.length;

  return {
    totalBooks,
    completedBooks,
    readingBooks,
    unreadBooks,
    totalReadingMinutes,
    totalHighlights,
  };
}

export function addBookTag(
  books: LibraryBook[],
  bookId: string,
  tag: string
): LibraryBook[] {
  const cleanTag = tag.trim();
  if (!cleanTag) return books;
  return books.map(b => {
    if (b.id !== bookId) return b;
    const currentTags = b.tags || [];
    if (currentTags.includes(cleanTag)) return b;
    return {
      ...b,
      tags: [...currentTags, cleanTag],
      updateTime: Date.now(),
    };
  });
}

export function removeBookTag(
  books: LibraryBook[],
  bookId: string,
  tag: string
): LibraryBook[] {
  return books.map(b => {
    if (b.id !== bookId) return b;
    return {
      ...b,
      tags: (b.tags || []).filter(t => t !== tag),
      updateTime: Date.now(),
    };
  });
}

export function updateBookRating(
  books: LibraryBook[],
  bookId: string,
  rating: number
): LibraryBook[] {
  const clampedRating = Math.max(0, Math.min(5, Math.round(rating)));
  return books.map(b => {
    if (b.id !== bookId) return b;
    return {
      ...b,
      rating: clampedRating,
      updateTime: Date.now(),
    };
  });
}

export function updateBookMetadata(
  books: LibraryBook[],
  bookId: string,
  updates: Partial<Pick<LibraryBook, 'title' | 'author' | 'description' | 'cover' | 'rating' | 'tags'>>
): LibraryBook[] {
  return books.map(b => {
    if (b.id !== bookId) return b;
    return {
      ...b,
      ...updates,
      updateTime: Date.now(),
    };
  });
}

// ---------------------------------------------------------------------------
// Anx Reader Pro Suite: Search, TTS, Highlights & Quote Cards
// ---------------------------------------------------------------------------

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Amarillo', hex: '#fef08a', bg: 'rgba(254, 240, 138, 0.45)', border: '#eab308' },
  { id: 'green', label: 'Verde', hex: '#bbf7d0', bg: 'rgba(187, 247, 208, 0.45)', border: '#22c55e' },
  { id: 'blue', label: 'Azul', hex: '#bfdbfe', bg: 'rgba(191, 219, 254, 0.45)', border: '#3b82f6' },
  { id: 'pink', label: 'Rosa', hex: '#fbcfe8', bg: 'rgba(251, 207, 232, 0.45)', border: '#ec4899' },
  { id: 'purple', label: 'Púrpura', hex: '#e9d5ff', bg: 'rgba(233, 213, 255, 0.45)', border: '#a855f7' },
] as const;

export interface InBookSearchResult {
  cfi: string;
  excerpt: string;
  chapter?: string;
}

export function formatSearchSnippet(excerpt: string, maxLength = 140): string {
  const clean = excerpt.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength) + '...';
}

export interface TtsState {
  status: 'idle' | 'playing' | 'paused' | 'stopped';
  currentSentence: string;
  currentCfi?: string;
  rate: number;
  pitch: number;
  volume: number;
}

export function createInitialTtsState(): TtsState {
  return {
    status: 'idle',
    currentSentence: '',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };
}

export function sanitizeTtsText(rawText: string): string {
  return rawText
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type QuoteCardThemeId = 'modern-dark' | 'editorial-sepia' | 'oled-obsidian' | 'emerald-night';

export interface QuoteCardTheme {
  id: QuoteCardThemeId;
  name: string;
  background: string;
  textColor: string;
  accentColor: string;
  subtextColor: string;
  fontFamily: string;
  quoteMarkColor: string;
}

export const QUOTE_CARD_THEMES: Record<QuoteCardThemeId, QuoteCardTheme> = {
  'modern-dark': {
    id: 'modern-dark',
    name: 'Modern Dark',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    textColor: '#f8fafc',
    accentColor: '#38bdf8',
    subtextColor: '#94a3b8',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    quoteMarkColor: 'rgba(56, 189, 248, 0.3)',
  },
  'editorial-sepia': {
    id: 'editorial-sepia',
    name: 'Editorial Sepia',
    background: '#fbf0d9',
    textColor: '#451a03',
    accentColor: '#9a3412',
    subtextColor: '#78350f',
    fontFamily: 'Georgia, Cambria, serif',
    quoteMarkColor: 'rgba(154, 52, 18, 0.25)',
  },
  'oled-obsidian': {
    id: 'oled-obsidian',
    name: 'OLED Obsidian',
    background: '#000000',
    textColor: '#ffffff',
    accentColor: '#a855f7',
    subtextColor: '#a1a1aa',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    quoteMarkColor: 'rgba(168, 85, 247, 0.4)',
  },
  'emerald-night': {
    id: 'emerald-night',
    name: 'Emerald Night',
    background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
    textColor: '#ecfdf5',
    accentColor: '#34d399',
    subtextColor: '#6ee7b7',
    fontFamily: 'Georgia, Cambria, serif',
    quoteMarkColor: 'rgba(52, 211, 153, 0.3)',
  },
};

export function computeQuoteCardFontSize(textLength: number): number {
  if (textLength < 60) return 24;
  if (textLength < 140) return 20;
  if (textLength < 280) return 16;
  return 14;
}

export type ReadingStatusFilter = 'all' | 'reading' | 'finished' | 'notStarted';

export function filterBooksByStatus(
  books: LibraryBook[],
  status: ReadingStatusFilter
): LibraryBook[] {
  switch (status) {
    case 'reading':
      return books.filter(b => b.readingPercentage > 0 && b.readingPercentage < 0.99);
    case 'finished':
      return books.filter(b => b.readingPercentage >= 0.99);
    case 'notStarted':
      return books.filter(b => b.readingPercentage === 0);
    case 'all':
    default:
      return books;
  }
}

export interface ReadingHeatmapDay {
  date: string;
  minutes: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export function computeReadingHeatmap(
  books: LibraryBook[],
  daysCount: number = 365
): ReadingHeatmapDay[] {
  const result: ReadingHeatmapDay[] = [];
  const now = new Date();

  const activityMap = new Map<string, number>();
  for (const book of books) {
    if (book.updateTime && book.readingTimeMinutes) {
      const d = new Date(book.updateTime).toISOString().slice(0, 10);
      activityMap.set(d, (activityMap.get(d) || 0) + book.readingTimeMinutes);
    }
  }

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const minutes = activityMap.get(dateStr) || 0;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (minutes > 60) level = 4;
    else if (minutes > 30) level = 3;
    else if (minutes > 15) level = 2;
    else if (minutes > 0) level = 1;

    result.push({
      date: dateStr,
      minutes,
      level,
    });
  }

  return result;
}

export function exportBookNotesToMarkdown(
  book: LibraryBook,
  highlights: LibraryHighlight[]
): string {
  const bookHighlights = highlights.filter(h => h.bookId === book.id);
  const lines: string[] = [
    `# Notas y Citas: ${book.title}`,
    `**Autor:** ${book.author}`,
    `**Progreso:** ${formatReadingProgress(book.readingPercentage)} | **Tiempo leído:** ${formatReadingTime(book.readingTimeMinutes ?? 0)}`,
    `**Exportado desde AFFiNITe Biblioteca (Anx-Remix)**`,
    `---`,
    '',
  ];

  if (bookHighlights.length === 0) {
    lines.push('*No hay notas ni citas guardadas para este libro.*');
    return lines.join('\n');
  }

  lines.push(`## Citas y Subrayados (${bookHighlights.length})`, '');

  for (const [idx, hl] of bookHighlights.entries()) {
    lines.push(`### ${idx + 1}. ${hl.chapter || 'Cita'}`);
    lines.push(`> "${hl.text}"`);
    if (hl.note) {
      lines.push('', `**Comentario:** ${hl.note}`);
    }
    lines.push('', `*Fecha: ${new Date(hl.createdAt).toLocaleDateString()}*`, '---', '');
  }

  return lines.join('\n');
}


