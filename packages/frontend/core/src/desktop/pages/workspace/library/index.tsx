import {
  BookPanelIcon,
  DateTimeIcon,
  DeleteIcon,
  ImportIcon,
  JournalIcon,
  PlusIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  JOURNAL_DATE_FORMAT,
  JournalService,
} from '../../../../modules/journal';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
  WorkbenchService,
} from '../../../../modules/workbench';
import { WorkspaceService } from '../../../../modules/workspace';
import {
  addBookmark,
  addHighlight,
  createLibraryBook,
  filterBooks,
  formatBookSize,
  formatReadingProgress,
  generateJournalQuoteMarkdown,
  LibraryBook,
  LibraryBookmark,
  LibraryHighlight,
  removeBookmark,
  removeHighlight,
  sortBooks,
} from './library-manager';

export const Component = () => {
  const workspaceService = useService(WorkspaceService);
  const journalService = useService(JournalService);
  const workbench = useService(WorkbenchService).workbench;

  // Persistence State
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [bookmarks, setBookmarks] = useState<LibraryBookmark[]>([]);
  const [highlights, setHighlights] = useState<LibraryHighlight[]>([]);

  // Bookshelf Navigation & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('Todos');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress' | 'rating'>('recent');

  // Active Reader View State
  const [activeBook, setActiveBook] = useState<LibraryBook | null>(null);
  const [readerTheme, setReaderTheme] = useState<'dark' | 'light' | 'sepia' | 'oled'>('dark');
  const [readerFontSize, setReaderFontSize] = useState(18);
  const [showTocDrawer, setShowTocDrawer] = useState(false);
  const [currentChapter, setCurrentChapter] = useState('Inicio');
  const [currentCfi, setCurrentCfi] = useState<string>('');
  const [currentPercentage, setCurrentPercentage] = useState(0);

  // Quote & Highlight Modal
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedQuoteText, setSelectedQuoteText] = useState('');
  const [quoteNote, setQuoteNote] = useState('');
  const [quoteCopiedFeedback, setQuoteCopiedFeedback] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // 1. Sync Books and Reading Data with Root Workspace Yjs
  useEffect(() => {
    const rootYDoc = workspaceService.workspace.rootYDoc;
    const yMap = rootYDoc.getMap('affinite_library_v1');

    const syncFromYjs = () => {
      try {
        const rawBooks = yMap.get('books') as string | undefined;
        if (rawBooks) {
          const parsed = JSON.parse(rawBooks);
          if (Array.isArray(parsed)) setBooks(parsed);
        } else {
          setBooks([]);
        }

        const rawBookmarks = yMap.get('bookmarks') as string | undefined;
        if (rawBookmarks) {
          const parsed = JSON.parse(rawBookmarks);
          if (Array.isArray(parsed)) setBookmarks(parsed);
        }

        const rawHighlights = yMap.get('highlights') as string | undefined;
        if (rawHighlights) {
          const parsed = JSON.parse(rawHighlights);
          if (Array.isArray(parsed)) setHighlights(parsed);
        }
      } catch (err) {
        console.error('Failed to sync library from Yjs', err);
      }
    };

    syncFromYjs();
    yMap.observeDeep(syncFromYjs);
    return () => {
      yMap.unobserveDeep(syncFromYjs);
    };
  }, [workspaceService]);

  const saveBooksToYjs = useCallback(
    (nextBooks: LibraryBook[]) => {
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_library_v1');
      rootYDoc.transact(() => {
        yMap.set('books', JSON.stringify(nextBooks));
      });
      setBooks(nextBooks);
    },
    [workspaceService]
  );

  const saveBookmarksToYjs = useCallback(
    (nextBookmarks: LibraryBookmark[]) => {
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_library_v1');
      rootYDoc.transact(() => {
        yMap.set('bookmarks', JSON.stringify(nextBookmarks));
      });
      setBookmarks(nextBookmarks);
    },
    [workspaceService]
  );

  const saveHighlightsToYjs = useCallback(
    (nextHighlights: LibraryHighlight[]) => {
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_library_v1');
      rootYDoc.transact(() => {
        yMap.set('highlights', JSON.stringify(nextHighlights));
      });
      setHighlights(nextHighlights);
    },
    [workspaceService]
  );

  // Import Book Action via Native Electron IPC or Fallback File Dialog
  const handleImportBook = useCallback(async () => {
    try {
      const electronApi = (window as any).__apis?.handler?.library;
      if (electronApi?.importBook) {
        const imported = await electronApi.importBook();
        if (imported) {
          const newBook = createLibraryBook({
            title: imported.title,
            author: imported.author,
            filePath: imported.filePath,
            format: imported.format,
            size: imported.size,
          });
          saveBooksToYjs([newBook, ...books]);
        }
      } else {
        // Web fallback input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.epub,.pdf,.mobi,.azw3,.txt';
        input.onchange = e => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const objectUrl = URL.createObjectURL(file);
            const newBook = createLibraryBook({
              title: file.name.replace(/\.[^/.]+$/, ''),
              filePath: objectUrl,
              size: file.size,
            });
            saveBooksToYjs([newBook, ...books]);
          }
        };
        input.click();
      }
    } catch (err) {
      console.error('Error importing book', err);
    }
  }, [books, saveBooksToYjs]);

  const handleDeleteBook = useCallback(
    async (book: LibraryBook) => {
      if (!confirm(`¿Eliminar "${book.title}" de la biblioteca?`)) return;
      try {
        const electronApi = (window as any).__apis?.handler?.library;
        if (electronApi?.deleteBook && book.filePath) {
          await electronApi.deleteBook(book.filePath);
        }
      } catch {
        // ignore
      }
      const next = books.filter(b => b.id !== book.id);
      saveBooksToYjs(next);
      if (activeBook?.id === book.id) {
        setActiveBook(null);
      }
    },
    [activeBook?.id, books, saveBooksToYjs]
  );

  const handleUpdateRating = useCallback(
    (bookId: string, rating: number) => {
      const next = books.map(b => (b.id === bookId ? { ...b, rating } : b));
      saveBooksToYjs(next);
    },
    [books, saveBooksToYjs]
  );

  const handleOpenReader = useCallback((book: LibraryBook) => {
    setActiveBook(book);
    setCurrentPercentage(book.readingPercentage || 0);
    setCurrentCfi(book.lastReadPosition || '');
  }, []);

  const handleCloseReader = useCallback(() => {
    setActiveBook(null);
  }, []);

  // Update Reading Progress
  const handleUpdateProgress = useCallback(
    (percentage: number, cfi?: string) => {
      if (!activeBook) return;
      setCurrentPercentage(percentage);
      if (cfi) setCurrentCfi(cfi);
      const next = books.map(b =>
        b.id === activeBook.id
          ? {
              ...b,
              readingPercentage: percentage,
              lastReadPosition: cfi || b.lastReadPosition,
              updateTime: Date.now(),
            }
          : b
      );
      saveBooksToYjs(next);
    },
    [activeBook, books, saveBooksToYjs]
  );

  // Quote Excerpt into Today's Daily Note
  const handleQuoteInDailyJournal = useCallback(() => {
    if (!activeBook || !selectedQuoteText.trim()) return;
    const todayStr = dayjs().format(JOURNAL_DATE_FORMAT);
    const mdQuote = generateJournalQuoteMarkdown({
      bookTitle: activeBook.title,
      author: activeBook.author,
      chapter: currentChapter,
      cfi: currentCfi,
      text: selectedQuoteText,
      note: quoteNote,
    });

    // Copy to clipboard with user feedback
    navigator.clipboard?.writeText(mdQuote);
    setQuoteCopiedFeedback(true);
    setTimeout(() => setQuoteCopiedFeedback(false), 2500);

    // Open today's journal in active workbench
    const doc = journalService.ensureJournalByDate(todayStr);
    workbench.openDoc(doc.id, { at: 'active' });
    setQuoteModalOpen(false);
  }, [
    activeBook,
    currentCfi,
    currentChapter,
    journalService,
    quoteNote,
    selectedQuoteText,
    workbench,
  ]);

  // Handle message from Foliate iframe
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== 'anx-reader') return;

      switch (data.event) {
        case 'onRelocate': {
          const payload = data.data;
          if (payload) {
            const fraction = payload.fraction ?? payload.percentage ?? 0;
            const cfi = payload.cfi || payload.location;
            handleUpdateProgress(fraction, cfi);
            if (payload.chapter) setCurrentChapter(payload.chapter);
          }
          break;
        }
        case 'onSelectionEnd': {
          const selection = data.data;
          if (selection?.text) {
            setSelectedQuoteText(selection.text);
          }
          break;
        }
        case 'onMetadata': {
          const meta = data.data;
          if (activeBook && meta) {
            if (meta.title && meta.title !== activeBook.title) {
              const next = books.map(b =>
                b.id === activeBook.id
                  ? {
                      ...b,
                      title: meta.title || b.title,
                      author: meta.creator || meta.author || b.author,
                      cover: meta.cover || b.cover,
                    }
                  : b
              );
              saveBooksToYjs(next);
            }
          }
          break;
        }
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [activeBook, books, handleUpdateProgress, saveBooksToYjs]);

  // Reader commands sent to iframe
  const sendReaderCommand = useCallback((command: string, ...args: any[]) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'anx-command', command, args },
        '*'
      );
    }
  }, []);

  const handleNextPage = () => sendReaderCommand('nextPage');
  const handlePrevPage = () => sendReaderCommand('prevPage');

  // Bookmarks handlers
  const handleAddCurrentBookmark = () => {
    if (!activeBook) return;
    const next = addBookmark(
      bookmarks,
      activeBook.id,
      currentCfi || 'cfi-start',
      currentPercentage,
      `${currentChapter} (${formatReadingProgress(currentPercentage)})`
    );
    saveBookmarksToYjs(next);
  };

  const handleRemoveBookmark = (bmId: string) => {
    saveBookmarksToYjs(removeBookmark(bookmarks, bmId));
  };

  // Filtered & Sorted books
  const filteredAndSortedBooks = useMemo(() => {
    const filtered = filterBooks(books, searchQuery, selectedTag);
    return sortBooks(filtered, sortBy);
  }, [books, searchQuery, selectedTag, sortBy]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = books.length;
    const completed = books.filter(b => b.readingPercentage >= 0.99).length;
    const reading = books.filter(
      b => b.readingPercentage > 0 && b.readingPercentage < 0.99
    ).length;
    return { total, completed, reading };
  }, [books]);

  return (
    <>
      <ViewTitle title="Biblioteca & Lector" />
      <ViewIcon icon="library" />
      <ViewHeader>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0 20px',
            height: '56px',
            borderBottom:
              '1px solid var(--affine-border-color, rgba(255,255,255,0.08))',
            background: 'var(--affine-background-primary-color, #0f172a)',
            gap: '12px',
          }}
        >
          {/* Left: Brand & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '18px',
                fontWeight: 700,
                color: '#f8fafc',
              }}
            >
              <BookPanelIcon
                style={{ width: 22, height: 22, color: '#3b82f6' }}
              />
              <span>📚 Biblioteca Anx</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#94a3b8',
                background: 'rgba(255,255,255,0.04)',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span>{stats.total} Libros</span>
              <span>·</span>
              <span style={{ color: '#60a5fa' }}>{stats.reading} Leyendo</span>
              <span>·</span>
              <span style={{ color: '#34d399' }}>
                {stats.completed} Completados
              </span>
            </div>
          </div>

          {/* Right: Search, Sorting & Import */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="text"
              placeholder="Buscar título, autor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '6px 12px',
                color: '#f8fafc',
                fontSize: '12px',
                width: '180px',
                outline: 'none',
              }}
            />

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: '#cbd5e1',
                fontSize: '12px',
                outline: 'none',
              }}
            >
              <option value="recent">Más recientes</option>
              <option value="title">Título (A-Z)</option>
              <option value="progress">Progreso de lectura</option>
              <option value="rating">Calificación</option>
            </select>

            <button
              onClick={handleImportBook}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none',
                color: '#ffffff',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              <PlusIcon style={{ width: 14, height: 14 }} />
              <span>Importar Libro</span>
            </button>
          </div>
        </div>
      </ViewHeader>

      <ViewBody>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            background: 'linear-gradient(180deg, #0b1120 0%, #0f172a 100%)',
            color: '#f8fafc',
            overflow: 'hidden',
          }}
        >
          {/* ==================== ACTIVE IMMERSIVE READER VIEW ==================== */}
          {activeBook ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                background:
                  readerTheme === 'oled'
                    ? '#000000'
                    : readerTheme === 'sepia'
                      ? '#fbf0d9'
                      : readerTheme === 'light'
                        ? '#ffffff'
                        : '#0f172a',
                color:
                  readerTheme === 'light' || readerTheme === 'sepia'
                    ? '#1e293b'
                    : '#f8fafc',
              }}
            >
              {/* Top Reader Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 18px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  color: '#f8fafc',
                  zIndex: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={handleCloseReader}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#cbd5e1',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ◀ Estantería
                  </button>

                  <div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        maxWidth: '280px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {activeBook.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {activeBook.author} ·{' '}
                      {formatReadingProgress(currentPercentage)}
                    </div>
                  </div>
                </div>

                {/* Center: Chapter / Page controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={handlePrevPage}
                    style={{ ...readerBtnStyle, padding: '4px 10px' }}
                    title="Página anterior"
                  >
                    ◀ Anterior
                  </button>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#93c5fd',
                      padding: '0 8px',
                    }}
                  >
                    {formatReadingProgress(currentPercentage)}
                  </span>
                  <button
                    onClick={handleNextPage}
                    style={{ ...readerBtnStyle, padding: '4px 10px' }}
                    title="Página siguiente"
                  >
                    Siguiente ▶
                  </button>
                </div>

                {/* Right: Quote into Journal, Bookmarks & Themes */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => {
                      if (!selectedQuoteText) {
                        setSelectedQuoteText(
                          `Fragmento de ${activeBook.title}`
                        );
                      }
                      setQuoteModalOpen(true);
                    }}
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.45)',
                      color: '#6ee7b7',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title="Citar fragmento seleccionado en el Diario de hoy"
                  >
                    <JournalIcon style={{ width: 14, height: 14 }} />
                    <span>Citar en Diario</span>
                  </button>

                  <button
                    onClick={handleAddCurrentBookmark}
                    style={readerBtnStyle}
                    title="Añadir marcador"
                  >
                    🔖 Marcar
                  </button>

                  {/* Theme Switcher Pills */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 3,
                      background: 'rgba(255,255,255,0.06)',
                      padding: 2,
                      borderRadius: 6,
                    }}
                  >
                    {[
                      { id: 'dark', label: '🌙' },
                      { id: 'sepia', label: '📜' },
                      { id: 'light', label: '☀️' },
                      { id: 'oled', label: '⬛' },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setReaderTheme(t.id as any);
                          sendReaderCommand('changeStyle', { theme: t.id });
                        }}
                        style={{
                          background:
                            readerTheme === t.id
                              ? 'rgba(59, 130, 246, 0.4)'
                              : 'transparent',
                          border: 'none',
                          padding: '3px 6px',
                          borderRadius: 4,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Foliate-js Frame or In-memory Reader Surface */}
              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                <iframe
                  ref={iframeRef}
                  title="Foliate Reader"
                  src={`assets://./foliate/index.html?url=${encodeURIComponent(
                    activeBook.filePath
                  )}&initialCfi=${encodeURIComponent(
                    activeBook.lastReadPosition || ''
                  )}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    background: 'transparent',
                  }}
                />
              </div>
            </div>
          ) : (
            /* ==================== BOOKSHELF VIEW ==================== */
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* Category Filter Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                {[
                  'Todos',
                  'Ficción',
                  'Ciencia & Tecnología',
                  'Filosofía',
                  'Desarrollo Personal',
                  'Favoritos',
                ].map(tag => {
                  const active = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: active
                          ? '1px solid #3b82f6'
                          : '1px solid rgba(255,255,255,0.08)',
                        background: active
                          ? 'rgba(59, 130, 246, 0.25)'
                          : 'rgba(255,255,255,0.04)',
                        color: active ? '#93c5fd' : '#cbd5e1',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* Empty State */}
              {filteredAndSortedBooks.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '80px 20px',
                    border: '2px dashed rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    gap: '14px',
                  }}
                >
                  <span style={{ fontSize: '48px' }}>📚</span>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#f8fafc',
                    }}
                  >
                    Tu Biblioteca Local está vacía
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#94a3b8',
                      maxWidth: '420px',
                      textAlign: 'center',
                    }}
                  >
                    Importa tus e-books en formato EPUB, PDF o MOBI. Se
                    almacenarán localmente en AFFiNITe con sincronización
                    reactiva y sin depender de WebDAV.
                  </div>
                  <button
                    onClick={handleImportBook}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '9px 20px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <PlusIcon style={{ width: 14, height: 14 }} />
                    <span>Importar Primer Libro</span>
                  </button>
                </div>
              ) : (
                /* Bookshelf Grid */
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(210px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {filteredAndSortedBooks.map(book => {
                    const progress = formatReadingProgress(
                      book.readingPercentage
                    );

                    return (
                      <div
                        key={book.id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.65)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '14px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          transition:
                            'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        }}
                      >
                        {/* Book Cover Area */}
                        <div
                          onClick={() => handleOpenReader(book)}
                          style={{
                            height: '240px',
                            background:
                              book.cover ||
                              'linear-gradient(135deg, #1e3a8a, #0f172a)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                          }}
                        >
                          {/* Format Pill */}
                          <div
                            style={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              background: 'rgba(0,0,0,0.65)',
                              backdropFilter: 'blur(4px)',
                              color: '#93c5fd',
                              fontSize: '10px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid rgba(255,255,255,0.15)',
                            }}
                          >
                            {book.format}
                          </div>

                          {!book.cover && (
                            <div>
                              <div
                                style={{
                                  fontSize: '16px',
                                  fontWeight: 800,
                                  color: '#ffffff',
                                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                }}
                              >
                                {book.title}
                              </div>
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: '#cbd5e1',
                                  marginTop: 4,
                                }}
                              >
                                {book.author}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Metadata & Progress */}
                        <div
                          style={{
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            flex: 1,
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div
                              onClick={() => handleOpenReader(book)}
                              style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                color: '#f8fafc',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                cursor: 'pointer',
                              }}
                              title={book.title}
                            >
                              {book.title}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#94a3b8',
                                marginTop: '2px',
                              }}
                            >
                              {book.author} · {formatBookSize(book.size)}
                            </div>
                          </div>

                          {/* Reading Progress Bar */}
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '11px',
                                color: '#cbd5e1',
                                marginBottom: '4px',
                              }}
                            >
                              <span>Progreso</span>
                              <span style={{ fontWeight: 700, color: '#60a5fa' }}>
                                {progress}
                              </span>
                            </div>
                            <div
                              style={{
                                width: '100%',
                                height: '6px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: progress,
                                  height: '100%',
                                  background:
                                    book.readingPercentage >= 0.99
                                      ? '#10b981'
                                      : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                  borderRadius: '3px',
                                }}
                              />
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: '6px',
                              borderTop: '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            <button
                              onClick={() => handleOpenReader(book)}
                              style={{
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                color: '#93c5fd',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              📖 Continuar
                            </button>

                            <button
                              onClick={() => handleDeleteBook(book)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                              title="Eliminar de la biblioteca"
                            >
                              <DeleteIcon style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Quote Excerpt to Daily Note Modal */}
          {quoteModalOpen && (
            <div
              onClick={() => setQuoteModalOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(2, 6, 23, 0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: '480px',
                  maxWidth: '92vw',
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '14px',
                  padding: '22px',
                  color: '#f8fafc',
                  boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 700 }}>
                    📖 Citar Fragmento en el Diario
                  </span>
                  <button
                    onClick={() => setQuoteModalOpen(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '18px',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={modalLabelStyle}>Texto del fragmento</label>
                  <textarea
                    value={selectedQuoteText}
                    onChange={e => setSelectedQuoteText(e.target.value)}
                    rows={4}
                    style={modalInputStyle}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={modalLabelStyle}>
                    Tu reflexión o nota (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Gran cita para reflexionar sobre este tema..."
                    value={quoteNote}
                    onChange={e => setQuoteNote(e.target.value)}
                    style={modalInputStyle}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    marginTop: '8px',
                  }}
                >
                  <button
                    onClick={() => setQuoteModalOpen(false)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#cbd5e1',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleQuoteInDailyJournal}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <JournalIcon style={{ width: 14, height: 14 }} />
                    <span>Insertar en Nota Diaria</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ViewBody>
    </>
  );
};

const readerBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#cbd5e1',
  padding: '5px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

const modalLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase',
};

const modalInputStyle: React.CSSProperties = {
  background: 'rgba(30, 41, 59, 0.75)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '8px',
  padding: '8px 10px',
  color: '#f8fafc',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
