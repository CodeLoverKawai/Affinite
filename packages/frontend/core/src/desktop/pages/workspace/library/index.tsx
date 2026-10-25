import {
  BookPanelIcon,
  DateTimeIcon,
  DeleteIcon,
  ImportIcon,
  JournalIcon,
  PlusIcon,
} from '@blocksuite/icons/rc';
import { useService } from '@toeverything/infra';
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
  addBookTag,
  addHighlight,
  calculateReadingStatistics,
  computeQuoteCardFontSize,
  computeReadingHeatmap,
  createInitialTtsState,
  createLibraryBook,
  exportBookNotesToMarkdown,
  filterBooks,
  filterBooksByStatus,
  formatBookSize,
  formatReadingProgress,
  formatReadingTime,
  formatSearchSnippet,
  generateJournalQuoteMarkdown,
  HIGHLIGHT_COLORS,
  InBookSearchResult,
  LibraryBook,
  LibraryBookmark,
  LibraryHighlight,
  QUOTE_CARD_THEMES,
  QuoteCardThemeId,
  ReadingHeatmapDay,
  ReadingStatistics,
  ReadingStatusFilter,
  removeBookmark,
  removeBookTag,
  removeHighlight,
  sanitizeTtsText,
  sortBooks,
  TtsState,
  updateBookMetadata,
  updateBookRating,
} from './library-manager';

// Helper to generate a distinctive procedural background cover matching Anx-Remix
function getAnxProceduralCover(title: string): string {
  const hues = [210, 225, 260, 280, 320, 340, 150, 175];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const hue = hues[Math.abs(hash) % hues.length];
  return `linear-gradient(145deg, hsl(${hue}, 45%, 22%) 0%, hsl(${hue}, 60%, 11%) 100%)`;
}

export const Component = () => {
  const workspaceService = useService(WorkspaceService);
  const journalService = useService(JournalService);
  const workbench = useService(WorkbenchService).workbench;

  // Main Navigation Tab: 'bookshelf' | 'statistics' | 'ai' | 'notes' | 'settings'
  const [activeTab, setActiveTab] = useState<
    'bookshelf' | 'statistics' | 'ai' | 'notes' | 'settings'
  >('bookshelf');

  // Display Mode: 'anx' (Authentic Anx-Remix embedded app) or 'integrated' (AFFiNITe view)
  const [displayMode, setDisplayMode] = useState<'anx' | 'integrated'>('anx');

  // Persistence State
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [bookmarks, setBookmarks] = useState<LibraryBookmark[]>([]);
  const [highlights, setHighlights] = useState<LibraryHighlight[]>([]);

  // Bookshelf Navigation, Status & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReadingStatusFilter>('all');
  const [selectedTag, setSelectedTag] = useState('Todos');
  const [sortBy, setSortBy] = useState<
    'recent' | 'title' | 'progress' | 'rating' | 'size'
  >('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);

  // Active Reader View State
  const [activeBook, setActiveBook] = useState<LibraryBook | null>(null);
  const [readerTheme, setReaderTheme] = useState<
    'dark' | 'light' | 'sepia' | 'oled'
  >('dark');
  const [readerFontSize, setReaderFontSize] = useState(16);
  const [readerFontFamily, setReaderFontFamily] = useState<
    'sans' | 'serif' | 'mono'
  >('sans');
  const [readerPageTurn, setReaderPageTurn] = useState<'scroll' | 'paginated'>(
    'scroll'
  );
  const [writingDirection, setWritingDirection] = useState<
    'auto' | 'vertical' | 'horizontal'
  >('auto');
  const [translationMode, setTranslationMode] = useState<
    'original' | 'translation' | 'bilingual'
  >('original');
  const [columnCount, setColumnCount] = useState<'auto' | 'single' | 'double'>(
    'auto'
  );

  const [showTocDrawer, setShowTocDrawer] = useState(false);
  const [showBookmarksDrawer, setShowBookmarksDrawer] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [loadedBookId, setLoadedBookId] = useState<string | null>(null);
  const [initialReaderSrc, setInitialReaderSrc] = useState<string>('');
  const [tocItems, setTocItems] = useState<any[]>([]);
  const [currentChapter, setCurrentChapter] = useState('Inicio');
  const [currentCfi, setCurrentCfi] = useState<string>('');
  const [currentPercentage, setCurrentPercentage] = useState(0);

  // 1. In-Book Search State
  const [showSearchDrawer, setShowSearchDrawer] = useState(false);
  const [inBookSearchQuery, setInBookSearchQuery] = useState('');
  const [inBookSearchResults, setInBookSearchResults] = useState<
    InBookSearchResult[]
  >([]);
  const [isSearchingInBook, setIsSearchingInBook] = useState(false);

  // 2. Synchronized TTS Floating Bar State
  const [showTtsBar, setShowTtsBar] = useState(false);
  const [ttsState, setTtsState] = useState<TtsState>(createInitialTtsState());
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const ttsStateRef = useRef(ttsState);
  useEffect(() => {
    ttsStateRef.current = ttsState;
  }, [ttsState]);

  // 3. Floating Selection Context Toolbar State
  const [selectionRangeData, setSelectionRangeData] = useState<{
    text: string;
    cfi: string;
    pos?: { left: number; top: number; right: number; bottom: number };
  } | null>(null);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState('yellow');
  const [showSelectionNoteInput, setShowSelectionNoteInput] = useState(false);
  const [selectionNoteText, setSelectionNoteText] = useState('');

  // 4. AI Reading Assistant State (Antigravity Zero-Key CLI)
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [aiMessages, setAiMessages] = useState<
    Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: number;
    }>
  >([]);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedBookForAiChat, setSelectedBookForAiChat] = useState<
    string | 'all'
  >('all');

  // 5. Excerpt Share Card Modal State
  const [showQuoteCardModal, setShowQuoteCardModal] = useState(false);
  const [selectedQuoteTheme, setSelectedQuoteTheme] =
    useState<QuoteCardThemeId>('modern-dark');
  const [quoteCardCopiedFeedback, setQuoteCardCopiedFeedback] = useState(false);

  // Book Detail Modal State
  const [selectedBookForDetail, setSelectedBookForDetail] =
    useState<LibraryBook | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Quote & Highlight Modal
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedQuoteText, setSelectedQuoteText] = useState('');
  const [quoteNote, setQuoteNote] = useState('');
  const [quoteCopiedFeedback, setQuoteCopiedFeedback] = useState(false);

  // Notes View State
  const [selectedBookForNotes, setSelectedBookForNotes] = useState<
    string | 'all'
  >('all');
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
  const [notesColorFilter, setNotesColorFilter] = useState<string | 'all'>('all');

  // Statistics Chart Mode
  const [statsChartMode, setStatsChartMode] = useState<
    'week' | 'month' | 'year' | 'all'
  >('all');

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
        console.error('Failed to parse library data from Yjs', err);
      }
    };

    syncFromYjs();
    yMap.observe(syncFromYjs);

    return () => {
      yMap.unobserve(syncFromYjs);
    };
  }, [workspaceService.workspace.rootYDoc]);

  // Save Books to Yjs
  const saveBooksToYjs = useCallback(
    (newBooks: LibraryBook[]) => {
      setBooks(newBooks);
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_library_v1');
      yMap.set('books', JSON.stringify(newBooks));
    },
    [workspaceService.workspace.rootYDoc]
  );

  // Save Bookmarks to Yjs
  const saveBookmarksToYjs = useCallback(
    (newBookmarks: LibraryBookmark[]) => {
      setBookmarks(newBookmarks);
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_library_v1');
      yMap.set('bookmarks', JSON.stringify(newBookmarks));
    },
    [workspaceService.workspace.rootYDoc]
  );

  // Save Highlights to Yjs
  const saveHighlightsToYjs = useCallback(
    (newHighlights: LibraryHighlight[]) => {
      setHighlights(newHighlights);
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_library_v1');
      yMap.set('highlights', JSON.stringify(newHighlights));
    },
    [workspaceService.workspace.rootYDoc]
  );

  // Sync books with local electron storage on initial load
  const syncFromDisk = useCallback(async () => {
    try {
      const electronApi = (window as any).__apis?.handler?.library;
      if (electronApi?.listBooks) {
        const diskBooks = await electronApi.listBooks();
        if (diskBooks && Array.isArray(diskBooks) && diskBooks.length > 0) {
          setBooks(prev => {
            const merged = [...prev];
            for (const dBook of diskBooks) {
              const existingIdx = merged.findIndex(
                b => b.filePath === dBook.filePath
              );
              if (existingIdx === -1) {
                merged.push(createLibraryBook(dBook));
              } else {
                merged[existingIdx] = {
                  ...merged[existingIdx],
                  size: dBook.size || merged[existingIdx].size,
                  cover: dBook.cover || merged[existingIdx].cover,
                };
              }
            }
            saveBooksToYjs(merged);
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('Could not list books from Electron disk', err);
    }
  }, [saveBooksToYjs]);

  useEffect(() => {
    syncFromDisk();
  }, [syncFromDisk]);

  // Import Book Action
  const handlePickAndImportBook = useCallback(async () => {
    try {
      const electronApi = (window as any).__apis?.handler?.library;
      if (!electronApi?.importBook) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.epub,.pdf,.mobi,.azw3,.txt';
        input.onchange = e => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const newBook = createLibraryBook({
              title: file.name.replace(/\.[^/.]+$/, ''),
              filePath: file.name,
              size: file.size,
            });
            saveBooksToYjs([...books, newBook]);
          }
        };
        input.click();
        return;
      }

      const imported = await electronApi.importBook();
      if (imported && imported.filePath) {
        const newBook = createLibraryBook(imported);
        saveBooksToYjs([...books, newBook]);
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
      if (selectedBookForDetail?.id === book.id) {
        setSelectedBookForDetail(null);
      }
    },
    [activeBook?.id, books, saveBooksToYjs, selectedBookForDetail?.id]
  );

  const handleOpenReader = useCallback((book: LibraryBook) => {
    setActiveBook(book);
    setSelectedBookForDetail(null);
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
              readingTimeMinutes: (b.readingTimeMinutes || 0) + 1,
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
    const targetBook = activeBook || selectedBookForDetail;
    if (!targetBook || !selectedQuoteText.trim()) return;
    const todayStr = dayjs().format(JOURNAL_DATE_FORMAT);
    const mdQuote = generateJournalQuoteMarkdown({
      bookTitle: targetBook.title,
      author: targetBook.author,
      chapter: currentChapter,
      cfi: currentCfi,
      text: selectedQuoteText,
      note: quoteNote,
    });

    navigator.clipboard?.writeText(mdQuote);
    setQuoteCopiedFeedback(true);
    setTimeout(() => setQuoteCopiedFeedback(false), 2500);

    const doc = journalService.ensureJournalByDate(todayStr);
    workbench.openDoc(doc.id, { at: 'active' });
    setQuoteModalOpen(false);
  }, [
    activeBook,
    currentCfi,
    currentChapter,
    journalService,
    quoteNote,
    selectedBookForDetail,
    selectedQuoteText,
    workbench,
  ]);

  // Export Book Notes to Native AFFiNITe BlockSuite Document
  const handleExportNotesToDoc = useCallback(
    (book: LibraryBook) => {
      const md = exportBookNotesToMarkdown(book, highlights);
      const doc = workspaceService.workspace.createDoc({
        title: `Notas: ${book.title}`,
      });
      doc.load();
      const noteId = doc.addBlock('affine:note', {}, doc.root?.id);
      doc.addBlock(
        'affine:paragraph',
        {
          text: new doc.Text(md),
        },
        noteId
      );
      workbench.openDoc(doc.id, { at: 'active' });
    },
    [highlights, workbench, workspaceService.workspace]
  );

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

  const handleUpdateReaderFontSize = useCallback(
    (newSize: number) => {
      const clamped = Math.max(12, Math.min(32, newSize));
      setReaderFontSize(clamped);
      sendReaderCommand('changeStyle', {
        fontSize: Number((clamped / 16).toFixed(2)),
      });
    },
    [sendReaderCommand]
  );

  const handleUpdateReaderTheme = useCallback(
    (theme: 'dark' | 'light' | 'sepia' | 'oled') => {
      setReaderTheme(theme);
      sendReaderCommand('changeStyle', { theme });
    },
    [sendReaderCommand]
  );

  const handleUpdatePageTurn = useCallback(
    (mode: 'scroll' | 'paginated') => {
      setReaderPageTurn(mode);
      sendReaderCommand('changeStyle', { pageTurnStyle: mode });
    },
    [sendReaderCommand]
  );

  const handleUpdateFontFamily = useCallback(
    (family: 'sans' | 'serif' | 'mono') => {
      setReaderFontFamily(family);
      sendReaderCommand('changeStyle', {
        fontName:
          family === 'mono'
            ? 'monospace'
            : family === 'serif'
              ? 'serif'
              : 'system',
      });
    },
    [sendReaderCommand]
  );

  const handleUpdateColumnCount = useCallback(
    (cols: 'auto' | 'single' | 'double') => {
      setColumnCount(cols);
      sendReaderCommand('changeStyle', {
        maxColumnCount: cols === 'single' ? 1 : cols === 'double' ? 2 : 0,
      });
    },
    [sendReaderCommand]
  );

  useEffect(() => {
    if (activeBook && activeBook.id !== loadedBookId) {
      setLoadedBookId(activeBook.id);
      const bgMap: Record<string, string> = {
        dark: '#0f172a',
        oled: '#000000',
        sepia: '#fbf0d9',
        light: '#ffffff',
      };
      const fgMap: Record<string, string> = {
        dark: '#f8fafc',
        oled: '#ffffff',
        sepia: '#5f4b32',
        light: '#0f172a',
      };
      const styleObj = {
        fontSize: Number((readerFontSize / 16).toFixed(2)),
        backgroundColor: bgMap[readerTheme] || '#0f172a',
        fontColor: fgMap[readerTheme] || '#f8fafc',
        pageTurnStyle: readerPageTurn,
        fontName:
          readerFontFamily === 'mono'
            ? 'monospace'
            : readerFontFamily === 'serif'
              ? 'serif'
              : 'system',
        sideMargin: 20,
        topMargin: 40,
        bottomMargin: 40,
        spacing: 1.6,
        paragraphSpacing: 0.8,
        maxColumnCount:
          columnCount === 'single' ? 1 : columnCount === 'double' ? 2 : 0,
        writingMode:
          writingDirection === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
      };

      const params = new URLSearchParams();
      params.set('url', JSON.stringify(activeBook.filePath));
      params.set('book', activeBook.filePath);
      if (activeBook.lastCfi) {
        params.set('initialCfi', JSON.stringify(activeBook.lastCfi));
      }
      params.set('style', JSON.stringify(styleObj));
      params.set('theme', readerTheme);
      params.set('size', String(readerFontSize));
      params.set('font', readerFontFamily);
      params.set('mode', readerPageTurn);

      setInitialReaderSrc(`assets://./foliate/index.html?${params.toString()}`);
    } else if (!activeBook) {
      setLoadedBookId(null);
      setInitialReaderSrc('');
    }
  }, [
    activeBook,
    loadedBookId,
    readerFontSize,
    readerTheme,
    readerPageTurn,
    readerFontFamily,
    columnCount,
    writingDirection,
  ]);

  // Load speech synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
        const esVoice = v.find(item => item.lang.startsWith('es')) || v[0];
        setSelectedVoice(esVoice || null);
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // TTS playback handlers
  const handlePlayTtsSentence = useCallback(
    (rawSentence: string, cfi?: string) => {
      const clean = sanitizeTtsText(rawSentence);
      if (!clean) {
        if (ttsStateRef.current.status === 'playing') {
          sendReaderCommand('ttsNext');
        }
        return;
      }
      setTtsState(s => ({ ...s, currentSentence: clean, currentCfi: cfi }));
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = ttsStateRef.current.rate;
        utterance.pitch = ttsStateRef.current.pitch;
        utterance.volume = ttsStateRef.current.volume;
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        utterance.onend = () => {
          if (ttsStateRef.current.status === 'playing') {
            sendReaderCommand('ttsNext');
          }
        };
        utterance.onerror = () => {
          if (ttsStateRef.current.status === 'playing') {
            sendReaderCommand('ttsNext');
          }
        };
        window.speechSynthesis.speak(utterance);
      }
    },
    [selectedVoice, sendReaderCommand]
  );

  const handleStartTts = useCallback(() => {
    if (ttsState.status === 'paused') {
      window.speechSynthesis?.resume();
      setTtsState(s => ({ ...s, status: 'playing' }));
    } else {
      setTtsState(s => ({ ...s, status: 'playing' }));
      sendReaderCommand('ttsHere');
      sendReaderCommand('ttsNext');
    }
  }, [sendReaderCommand, ttsState.status]);

  const handlePauseTts = useCallback(() => {
    window.speechSynthesis?.pause();
    setTtsState(s => ({ ...s, status: 'paused' }));
  }, []);

  const handleStopTts = useCallback(() => {
    window.speechSynthesis?.cancel();
    sendReaderCommand('ttsStop');
    setTtsState(s => ({ ...s, status: 'stopped', currentSentence: '' }));
  }, [sendReaderCommand]);

  const handleNextSentence = useCallback(() => {
    window.speechSynthesis?.cancel();
    sendReaderCommand('ttsNext');
  }, [sendReaderCommand]);

  const handlePrevSentence = useCallback(() => {
    window.speechSynthesis?.cancel();
    sendReaderCommand('ttsPrev');
  }, [sendReaderCommand]);

  // In-Book search handler
  const handleExecuteInBookSearch = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) {
        setInBookSearchResults([]);
        sendReaderCommand('clearSearch');
        return;
      }
      setIsSearchingInBook(true);
      setInBookSearchResults([]);
      sendReaderCommand('search', q);
    },
    [sendReaderCommand]
  );

  // Send AI Chat Message (Antigravity Zero-Key CLI)
  const handleSendAiMessage = useCallback(
    async (customPrompt?: string) => {
      const promptText = (customPrompt || aiPromptInput).trim();
      if (!promptText || isAiLoading) return;

      const userMsg = {
        id: `msg-${Date.now()}`,
        role: 'user' as const,
        content: promptText,
        createdAt: Date.now(),
      };
      setAiMessages(prev => [...prev, userMsg]);
      if (!customPrompt) setAiPromptInput('');
      setIsAiLoading(true);

      try {
        const aiApi = (window as any).__apis?.handler?.ai;
        let reply = '';
        const targetBook =
          activeBook ||
          books.find(b => b.id === selectedBookForAiChat) ||
          null;
        const bookContext = targetBook
          ? `Estás leyendo el libro "${targetBook.title}" de ${targetBook.author}. Capítulo actual: "${currentChapter}".`
          : `Biblioteca AFFiNITe (Anx-Remix). Tienes acceso a ${books.length} libros en la colección.`;
        const fullPrompt = `${bookContext}\n\nPregunta o instrucción del lector:\n${promptText}`;

        if (aiApi?.chat) {
          const res = await aiApi.chat({
            provider: 'antigravity',
            modelId: 'gemini-4-argon-high',
            prompt: fullPrompt,
            messages: aiMessages
              .concat(userMsg)
              .map(m => ({ role: m.role, content: m.content })),
          });
          reply = res?.content || 'No se recibió respuesta del modelo local.';
        } else {
          reply =
            'El puente de IA local (Antigravity agy CLI) no está disponible en este entorno.';
        }

        const assistantMsg = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant' as const,
          content: reply,
          createdAt: Date.now(),
        };
        setAiMessages(prev => [...prev, assistantMsg]);
      } catch (err: any) {
        const errorMsg = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant' as const,
          content: `Error al consultar Antigravity: ${err?.message || String(err)}`,
          createdAt: Date.now(),
        };
        setAiMessages(prev => [...prev, errorMsg]);
      } finally {
        setIsAiLoading(false);
      }
    },
    [
      activeBook,
      aiMessages,
      aiPromptInput,
      books,
      currentChapter,
      isAiLoading,
      selectedBookForAiChat,
    ]
  );

  // Generate Quote Card Image on Canvas
  const generateQuoteCardImage = useCallback(
    async (themeId: QuoteCardThemeId): Promise<Blob | null> => {
      const targetBook = activeBook || selectedBookForDetail;
      if (!targetBook) return null;
      const theme = QUOTE_CARD_THEMES[themeId];
      const quoteText =
        selectedQuoteText.trim() || `Fragmento de ${targetBook.title}`;

      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Draw background
      if (themeId === 'oled-obsidian') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (themeId === 'editorial-sepia') {
        ctx.fillStyle = '#fbf0d9';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (themeId === 'emerald-night') {
        const grad = ctx.createLinearGradient(
          0,
          0,
          canvas.width,
          canvas.height
        );
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(1, '#022c22');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        const grad = ctx.createLinearGradient(
          0,
          0,
          canvas.width,
          canvas.height
        );
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Decorative Quotation Mark
      ctx.fillStyle = theme.quoteMarkColor;
      ctx.font = 'bold 160px serif';
      ctx.fillText('“', 80, 180);

      // Main Quote Text Wrapping
      ctx.fillStyle = theme.textColor;
      const fontSize = computeQuoteCardFontSize(quoteText.length) * 1.8;
      ctx.font = `italic ${fontSize}px ${theme.fontFamily}`;

      const maxWidth = 1040;
      const words = quoteText.split(' ');
      let line = '';
      let y = 240;
      const lineHeight = fontSize * 1.4;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, 80, y);
          line = words[n] + ' ';
          y += lineHeight;
          if (y > 540) {
            line = '...';
            break;
          }
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 80, y);

      // Book & Author attribution
      ctx.strokeStyle = theme.accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, 580);
      ctx.lineTo(180, 580);
      ctx.stroke();

      ctx.fillStyle = theme.accentColor;
      ctx.font = `bold 26px ${theme.fontFamily}`;
      ctx.fillText(targetBook.title, 80, 620);

      ctx.fillStyle = theme.subtextColor;
      ctx.font = `20px ${theme.fontFamily}`;
      ctx.fillText(
        `${targetBook.author || 'Autor desconocido'} · ${currentChapter}`,
        80,
        650
      );

      // AFFiNITe Watermark / Badge
      ctx.fillStyle = theme.subtextColor;
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('AFFiNITe · Biblioteca Anx', 950, 650);

      return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    },
    [activeBook, currentChapter, selectedBookForDetail, selectedQuoteText]
  );

  // Message listener from Foliate iframe
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== 'anx-reader') return;

      switch (data.event) {
        case 'onRelocate': {
          if (data.data) {
            const pct = data.data.percentage ?? 0;
            const cfi = data.data.cfi ?? '';
            const chapter = data.data.chapter ?? '';
            if (chapter) setCurrentChapter(chapter);
            handleUpdateProgress(pct, cfi);
          }
          break;
        }
        case 'onToc': {
          if (Array.isArray(data.data)) {
            setTocItems(data.data);
          }
          break;
        }
        case 'onSelection': {
          if (data.data && data.data.text) {
            setSelectionRangeData({
              text: data.data.text,
              cfi: data.data.cfi || '',
              pos: data.data.pos,
            });
            setSelectedQuoteText(data.data.text);
          } else {
            setSelectionRangeData(null);
          }
          break;
        }
        case 'onTtsSentence': {
          if (data.data && data.data.text) {
            handlePlayTtsSentence(data.data.text, data.data.cfi);
          }
          break;
        }
        case 'onSearch': {
          if (data.data) {
            setIsSearchingInBook(false);
            if (Array.isArray(data.data.results)) {
              setInBookSearchResults(data.data.results);
            }
          }
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [handlePlayTtsSentence, handleUpdateProgress]);

  // Dynamic tags list
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tagSet.add('Todos');
    for (const b of books) {
      if (b.tags) {
        for (const t of b.tags) tagSet.add(t);
      }
    }
    return Array.from(tagSet);
  }, [books]);

  // Filtered & Sorted books matching Anx
  const filteredAndSortedBooks = useMemo(() => {
    let list = filterBooks(books, searchQuery, selectedTag);
    list = filterBooksByStatus(list, statusFilter);
    return sortBooks(list, sortBy);
  }, [books, searchQuery, selectedTag, sortBy, statusFilter]);

  // Overall Statistics calculated using helper
  const stats: ReadingStatistics = useMemo(() => {
    return calculateReadingStatistics(books, highlights);
  }, [books, highlights]);

  // Reading Heatmap Data (15 weeks x 7 days = 105 days for grid)
  const heatmapDays = useMemo(() => {
    return computeReadingHeatmap(books, 105);
  }, [books]);

  // Total reading time display (hours & remaining minutes)
  const totalHours = Math.floor(stats.totalReadingMinutes / 60);
  const totalRemMinutes = Math.round(stats.totalReadingMinutes % 60);

  // Books with highlights
  const booksWithHighlights = useMemo(() => {
    return books.filter(b => highlights.some(h => h.bookId === b.id));
  }, [books, highlights]);

  // Filtered highlights for Notes tab
  const displayedHighlights = useMemo(() => {
    let list =
      selectedBookForNotes === 'all'
        ? highlights
        : highlights.filter(h => h.bookId === selectedBookForNotes);

    if (notesColorFilter !== 'all') {
      list = list.filter(h => h.color === notesColorFilter);
    }

    if (notesSearchQuery.trim()) {
      const q = notesSearchQuery.toLowerCase();
      list = list.filter(
        h =>
          h.text.toLowerCase().includes(q) ||
          (h.note && h.note.toLowerCase().includes(q)) ||
          (h.chapter && h.chapter.toLowerCase().includes(q))
      );
    }

    return list;
  }, [highlights, notesColorFilter, notesSearchQuery, selectedBookForNotes]);

  return (
    <>
      <ViewTitle title="Biblioteca" />
      <ViewIcon icon="allDocs" />
      <ViewHeader>
        <div style={{ display: 'none' }} />
      </ViewHeader>

      <ViewBody>
        <div
          style={{
            display: 'flex',
            height: '100%',
            width: '100%',
            background: '#090d16',
            color: '#f8fafc',
            overflow: 'hidden',
          }}
        >
          {/* ==================== ANX REMIX AUTHENTIC EMBEDDED APP ==================== */}
          {!activeBook && displayMode === 'anx' ? (
            <div
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                background: '#090d16',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 16px',
                  background: 'rgba(15, 23, 42, 0.95)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: 12,
                  zIndex: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: '#38bdf8' }}>📖 Anx Remix</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>· App Oficial Embebida</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setDisplayMode('integrated')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 6,
                      color: '#cbd5e1',
                      padding: '4px 10px',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>📚 Cambiar a Vista Integrada AFFiNITe</span>
                  </button>
                </div>
              </div>
              <iframe
                src="assets://./anx/index.html"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  flex: 1,
                  display: 'block',
                  background: '#090d16',
                }}
                title="Anx Remix"
                allow="fullscreen; autoplay; clipboard-read; clipboard-write"
              />
            </div>
          ) : activeBook ? (
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
              {/* Top Reader Toolbar matching Anx Remix */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 18px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(15, 23, 42, 0.92)',
                  backdropFilter: 'blur(10px)',
                  color: '#f8fafc',
                  zIndex: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={handleCloseReader}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#cbd5e1',
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ◀ Estantería
                  </button>

                  <button
                    onClick={() => setShowTocDrawer(s => !s)}
                    style={readerBtnStyle}
                    title="Índice de Capítulos"
                  >
                    📑 Capítulos
                  </button>

                  <button
                    onClick={() => setShowBookmarksDrawer(s => !s)}
                    style={readerBtnStyle}
                    title="Marcadores guardados"
                  >
                    🔖 Marcadores
                  </button>

                  <button
                    onClick={() => setShowStyleModal(s => !s)}
                    style={readerBtnStyle}
                    title="Estilos y Tema de lectura"
                  >
                    🎨 Estilo
                  </button>

                  <button
                    onClick={() => setShowSearchDrawer(s => !s)}
                    style={{
                      ...readerBtnStyle,
                      background: showSearchDrawer
                        ? 'rgba(56, 189, 248, 0.35)'
                        : readerBtnStyle.background,
                      color: showSearchDrawer
                        ? '#38bdf8'
                        : readerBtnStyle.color,
                    }}
                    title="Buscar texto en todo el libro (In-Book Search)"
                  >
                    🔍 Buscar
                  </button>

                  <button
                    onClick={() => {
                      setShowTtsBar(s => !s);
                      if (!showTtsBar && ttsState.status === 'idle') {
                        handleStartTts();
                      }
                    }}
                    style={{
                      ...readerBtnStyle,
                      background: showTtsBar
                        ? 'rgba(16, 185, 129, 0.35)'
                        : readerBtnStyle.background,
                      color: showTtsBar ? '#34d399' : readerBtnStyle.color,
                    }}
                    title="Narrador de voz sincronizado (Text-to-Speech)"
                  >
                    🔊 Voz (TTS)
                  </button>

                  <button
                    onClick={() => setShowAiDrawer(s => !s)}
                    style={{
                      ...readerBtnStyle,
                      background: showAiDrawer
                        ? 'rgba(168, 85, 247, 0.35)'
                        : readerBtnStyle.background,
                      color: showAiDrawer ? '#c084fc' : readerBtnStyle.color,
                    }}
                    title="Asistente IA de lectura (Antigravity Zero-Key)"
                  >
                    🤖 Asistente IA
                  </button>

                  <button
                    onClick={() => {
                      setSelectedQuoteText(activeBook.title);
                      setShowQuoteCardModal(true);
                    }}
                    style={readerBtnStyle}
                    title="Generar Tarjeta de Cita"
                  >
                    🖼️ Tarjeta
                  </button>
                </div>

                {/* Right: Book Title & Chapter */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    maxWidth: '40%',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#f8fafc',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {activeBook.title}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {currentChapter}
                  </div>
                </div>
              </div>

              {/* Foliate IFrame Surface */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <iframe
                  ref={iframeRef}
                  src={initialReaderSrc}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                  }}
                  title={activeBook.title}
                />

                {/* Floating Selection Toolbar */}
                {selectionRangeData && (
                  <div
                    style={{
                      position: 'absolute',
                      top: Math.max(
                        10,
                        (selectionRangeData.pos?.top || 100) - 52
                      ),
                      left: Math.max(
                        20,
                        (selectionRangeData.pos?.left || 200) - 100
                      ),
                      background: 'rgba(15, 23, 42, 0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '4px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      zIndex: 100,
                    }}
                  >
                    {/* 5-Color Palette */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {HIGHLIGHT_COLORS.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedHighlightColor(c.id);
                            const updated = addHighlight(
                              highlights,
                              activeBook.id,
                              selectionRangeData.text,
                              selectionRangeData.cfi,
                              {
                                color: c.hex,
                                chapter: currentChapter,
                              }
                            );
                            saveHighlightsToYjs(updated);
                            sendReaderCommand(
                              'renderAnnotations',
                              updated.filter(h => h.bookId === activeBook.id)
                            );
                            setSelectionRangeData(null);
                          }}
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: c.hex,
                            cursor: 'pointer',
                            border:
                              selectedHighlightColor === c.id
                                ? '2px solid #ffffff'
                                : '1px solid rgba(0,0,0,0.3)',
                          }}
                          title={c.name}
                        />
                      ))}
                    </div>

                    <div
                      style={{
                        width: '1px',
                        height: '16px',
                        background: 'rgba(255,255,255,0.15)',
                      }}
                    />

                    {/* Note Action */}
                    <button
                      onClick={() => setShowSelectionNoteInput(s => !s)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#cbd5e1',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '2px 6px',
                      }}
                    >
                      📝 Nota
                    </button>

                    {/* Speak Action */}
                    <button
                      onClick={() => {
                        handlePlayTtsSentence(
                          selectionRangeData.text,
                          selectionRangeData.cfi
                        );
                        setShowTtsBar(true);
                        setSelectionRangeData(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#cbd5e1',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '2px 6px',
                      }}
                    >
                      🔊 Escuchar
                    </button>

                    {/* Card Action */}
                    <button
                      onClick={() => {
                        setSelectedQuoteText(selectionRangeData.text);
                        setShowQuoteCardModal(true);
                        setSelectionRangeData(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#cbd5e1',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '2px 6px',
                      }}
                    >
                      🖼️ Tarjeta
                    </button>

                    {/* Daily Journal Quote */}
                    <button
                      onClick={() => {
                        setSelectedQuoteText(selectionRangeData.text);
                        handleQuoteInDailyJournal();
                        setSelectionRangeData(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#cbd5e1',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '2px 6px',
                      }}
                    >
                      📅 Citar en Diario
                    </button>

                    {/* AI Explain */}
                    <button
                      onClick={() => {
                        setShowAiDrawer(true);
                        handleSendAiMessage(
                          `Explica este fragmento del libro "${activeBook.title}": "${selectionRangeData.text}"`
                        );
                        setSelectionRangeData(null);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '3px 8px',
                      }}
                    >
                      🤖 Explicar
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Reader Navigation Slider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 24px',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(15, 23, 42, 0.92)',
                  backdropFilter: 'blur(10px)',
                  color: '#f8fafc',
                  zIndex: 20,
                  gap: 16,
                }}
              >
                <button
                  onClick={handlePrevPage}
                  style={readerBtnStyle}
                  title="Página Anterior"
                >
                  ◀ Anterior
                </button>

                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(currentPercentage * 100)}
                    onChange={e => {
                      const pct = Number(e.target.value) / 100;
                      setCurrentPercentage(pct);
                      sendReaderCommand('goToPercentage', pct);
                    }}
                    style={{ flex: 1, accentColor: '#38bdf8', cursor: 'pointer' }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#38bdf8',
                      minWidth: '45px',
                    }}
                  >
                    {formatReadingProgress(currentPercentage)}
                  </span>
                </div>

                <button
                  onClick={handleNextPage}
                  style={readerBtnStyle}
                  title="Página Siguiente"
                >
                  Siguiente ▶
                </button>
              </div>

              {/* Floating Synchronized TTS Bar */}
              {showTtsBar && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 60,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '90%',
                    maxWidth: '640px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    borderRadius: '16px',
                    padding: '12px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                    zIndex: 90,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#38bdf8',
                      }}
                    >
                      <span>🔊 Narrador de Voz (TTS)</span>
                      {selectedVoice && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            fontWeight: 400,
                          }}
                        >
                          ({selectedVoice.name})
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <select
                        value={ttsState.rate}
                        onChange={e => {
                          const r = Number(e.target.value);
                          setTtsState(s => ({ ...s, rate: r }));
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#f8fafc',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          fontSize: '11px',
                        }}
                      >
                        <option value="0.75">0.75x</option>
                        <option value="1.0">1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2.0">2.0x</option>
                      </select>
                      <button
                        onClick={() => setShowTtsBar(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {ttsState.currentSentence && (
                    <div
                      style={{
                        fontSize: '12px',
                        fontStyle: 'italic',
                        color: '#f8fafc',
                        lineHeight: 1.4,
                        maxHeight: '42px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      "{ttsState.currentSentence}"
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                    }}
                  >
                    <button
                      onClick={handlePrevSentence}
                      style={readerBtnStyle}
                      title="Oración anterior"
                    >
                      ⏮ Anterior
                    </button>
                    {ttsState.status === 'playing' ? (
                      <button
                        onClick={handlePauseTts}
                        style={{
                          ...readerBtnStyle,
                          background: '#eab308',
                          color: '#000000',
                          fontWeight: 700,
                        }}
                      >
                        ⏸ Pausar
                      </button>
                    ) : (
                      <button
                        onClick={handleStartTts}
                        style={{
                          ...readerBtnStyle,
                          background: '#10b981',
                          color: '#ffffff',
                          fontWeight: 700,
                        }}
                      >
                        ▶ Reanudar
                      </button>
                    )}
                    <button
                      onClick={handleStopTts}
                      style={{
                        ...readerBtnStyle,
                        background: 'rgba(239, 68, 68, 0.25)',
                        color: '#f87171',
                      }}
                    >
                      ⏹ Detener
                    </button>
                    <button
                      onClick={handleNextSentence}
                      style={readerBtnStyle}
                      title="Oración siguiente"
                    >
                      Siguiente ⏭
                    </button>
                  </div>
                </div>
              )}

              {/* Chapters TOC Drawer */}
              {showTocDrawer && (
                <div
                  style={{
                    position: 'absolute',
                    top: 50,
                    left: 0,
                    bottom: 50,
                    width: '320px',
                    background: 'rgba(15, 23, 42, 0.98)',
                    backdropFilter: 'blur(20px)',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '8px 0 24px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 80,
                  }}
                >
                  <div
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#f8fafc',
                      }}
                    >
                      📑 Índice de Capítulos
                    </div>
                    <button
                      onClick={() => setShowTocDrawer(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '16px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    {tocItems.length === 0 ? (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          padding: '16px 8px',
                          textAlign: 'center',
                        }}
                      >
                        No se detectaron capítulos en este libro
                      </div>
                    ) : (
                      tocItems.map((item: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (item.href) {
                              sendReaderCommand('goToCfi', item.href);
                            }
                            setShowTocDrawer(false);
                          }}
                          style={{
                            background:
                              currentChapter === item.label
                                ? 'rgba(56, 189, 248, 0.15)'
                                : 'transparent',
                            border:
                              currentChapter === item.label
                                ? '1px solid rgba(56, 189, 248, 0.3)'
                                : '1px solid transparent',
                            color:
                              currentChapter === item.label
                                ? '#38bdf8'
                                : '#cbd5e1',
                            textAlign: 'left',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight:
                              currentChapter === item.label ? 700 : 500,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={item.label}
                        >
                          {item.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Bookmarks Drawer */}
              {showBookmarksDrawer && (
                <div
                  style={{
                    position: 'absolute',
                    top: 50,
                    left: 0,
                    bottom: 50,
                    width: '320px',
                    background: 'rgba(15, 23, 42, 0.98)',
                    backdropFilter: 'blur(20px)',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '8px 0 24px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 80,
                  }}
                >
                  <div
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#f8fafc',
                      }}
                    >
                      🔖 Marcadores (
                      {
                        bookmarks.filter(b => b.bookId === activeBook.id)
                          .length
                      }
                      )
                    </div>
                    <button
                      onClick={() => setShowBookmarksDrawer(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '16px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <button
                      onClick={() => {
                        if (currentCfi) {
                          const updated = addBookmark(
                            bookmarks,
                            activeBook.id,
                            currentCfi,
                            currentPercentage,
                            currentChapter
                          );
                          saveBookmarksToYjs(updated);
                        }
                      }}
                      style={{
                        ...readerBtnStyle,
                        width: '100%',
                        justifyContent: 'center',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        borderColor: 'rgba(56, 189, 248, 0.3)',
                      }}
                    >
                      + Guardar Marcador Aquí
                    </button>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {bookmarks.filter(b => b.bookId === activeBook.id).length ===
                    0 ? (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          padding: '16px 8px',
                          textAlign: 'center',
                        }}
                      >
                        No tienes marcadores guardados en este libro
                      </div>
                    ) : (
                      bookmarks
                        .filter(b => b.bookId === activeBook.id)
                        .map(bm => (
                          <div
                            key={bm.id}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                            }}
                          >
                            <div
                              onClick={() => {
                                sendReaderCommand('goToCfi', bm.cfi);
                                setShowBookmarksDrawer(false);
                              }}
                              style={{
                                cursor: 'pointer',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#f8fafc',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {bm.chapter || 'Página marcada'}
                              </div>
                              <div
                                style={{
                                  fontSize: '11px',
                                  color: '#38bdf8',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  marginTop: 2,
                                }}
                              >
                                <span>
                                  {formatReadingProgress(bm.percentage)}
                                </span>
                                <span style={{ color: '#64748b' }}>
                                  {dayjs(bm.createdAt).format('DD MMM, HH:mm')}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const updated = removeBookmark(
                                  bookmarks,
                                  bm.id
                                );
                                saveBookmarksToYjs(updated);
                              }}
                              style={{
                                alignSelf: 'flex-end',
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '11px',
                                cursor: 'pointer',
                                padding: '2px 4px',
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {/* Reading Settings / Style Modal (Matching Anx-Remix StyleWidget) */}
              {showStyleModal && (
                <div
                  style={{
                    position: 'absolute',
                    top: 52,
                    right: 20,
                    width: '320px',
                    background: 'rgba(15, 23, 42, 0.98)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    zIndex: 90,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      paddingBottom: '10px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#f8fafc',
                      }}
                    >
                      🎨 Ajustes de Lectura Anx
                    </div>
                    <button
                      onClick={() => setShowStyleModal(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '16px',
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Font Size Slider with A- / A+ buttons */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        color: '#cbd5e1',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Tamaño de Fuente</span>
                      <span
                        style={{
                          color: '#38bdf8',
                          fontWeight: 700,
                          fontSize: '13px',
                        }}
                      >
                        {readerFontSize}px
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <button
                        onClick={() =>
                          handleUpdateReaderFontSize(readerFontSize - 1)
                        }
                        style={{
                          ...readerBtnStyle,
                          padding: '4px 10px',
                          fontWeight: 700,
                        }}
                        title="Reducir fuente"
                      >
                        A-
                      </button>
                      <input
                        type="range"
                        min="12"
                        max="28"
                        value={readerFontSize}
                        onChange={e =>
                          handleUpdateReaderFontSize(Number(e.target.value))
                        }
                        style={{
                          flex: 1,
                          accentColor: '#38bdf8',
                          cursor: 'pointer',
                        }}
                      />
                      <button
                        onClick={() =>
                          handleUpdateReaderFontSize(readerFontSize + 1)
                        }
                        style={{
                          ...readerBtnStyle,
                          padding: '4px 10px',
                          fontWeight: 700,
                        }}
                        title="Aumentar fuente"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Reading Themes */}
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#cbd5e1',
                        marginBottom: '8px',
                      }}
                    >
                      Tema de Fondo
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '8px',
                      }}
                    >
                      {(
                        [
                          {
                            id: 'dark',
                            name: 'Noche',
                            bg: '#0f172a',
                            text: '#f8fafc',
                          },
                          {
                            id: 'oled',
                            name: 'OLED',
                            bg: '#000000',
                            text: '#ffffff',
                          },
                          {
                            id: 'sepia',
                            name: 'Sepia',
                            bg: '#fbf0d9',
                            text: '#5f4b32',
                          },
                          {
                            id: 'light',
                            name: 'Claro',
                            bg: '#ffffff',
                            text: '#0f172a',
                          },
                        ] as const
                      ).map(t => (
                        <div
                          key={t.id}
                          onClick={() => handleUpdateReaderTheme(t.id)}
                          style={{
                            background: t.bg,
                            color: t.text,
                            border:
                              readerTheme === t.id
                                ? '2px solid #38bdf8'
                                : '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '8px',
                            padding: '8px 4px',
                            textAlign: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow:
                              readerTheme === t.id
                                ? '0 0 10px rgba(56, 189, 248, 0.4)'
                                : 'none',
                          }}
                        >
                          {t.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Page Turn Mode */}
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#cbd5e1',
                        marginBottom: '8px',
                      }}
                    >
                      Modo de Lectura
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleUpdatePageTurn('scroll')}
                        style={{
                          ...readerBtnStyle,
                          flex: 1,
                          justifyContent: 'center',
                          background:
                            readerPageTurn === 'scroll'
                              ? 'rgba(56, 189, 248, 0.25)'
                              : readerBtnStyle.background,
                          color:
                            readerPageTurn === 'scroll'
                              ? '#38bdf8'
                              : readerBtnStyle.color,
                          borderColor:
                            readerPageTurn === 'scroll'
                              ? 'rgba(56, 189, 248, 0.4)'
                              : undefined,
                        }}
                      >
                        📜 Scroll continuo
                      </button>
                      <button
                        onClick={() => handleUpdatePageTurn('paginated')}
                        style={{
                          ...readerBtnStyle,
                          flex: 1,
                          justifyContent: 'center',
                          background:
                            readerPageTurn === 'paginated'
                              ? 'rgba(56, 189, 248, 0.25)'
                              : readerBtnStyle.background,
                          color:
                            readerPageTurn === 'paginated'
                              ? '#38bdf8'
                              : readerBtnStyle.color,
                          borderColor:
                            readerPageTurn === 'paginated'
                              ? 'rgba(56, 189, 248, 0.4)'
                              : undefined,
                        }}
                      >
                        📖 Paginado
                      </button>
                    </div>
                  </div>

                  {/* Typography & Columns */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        Tipografía
                      </div>
                      <select
                        value={readerFontFamily}
                        onChange={e =>
                          handleUpdateFontFamily(
                            e.target.value as 'sans' | 'serif' | 'mono'
                          )
                        }
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '6px',
                          color: '#f8fafc',
                          padding: '6px 8px',
                          fontSize: '11px',
                        }}
                      >
                        <option value="sans" style={{ background: '#0f172a' }}>
                          Sans (Sistema)
                        </option>
                        <option value="serif" style={{ background: '#0f172a' }}>
                          Serif (Libro)
                        </option>
                        <option value="mono" style={{ background: '#0f172a' }}>
                          Monospace
                        </option>
                      </select>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        Columnas
                      </div>
                      <select
                        value={columnCount}
                        onChange={e =>
                          handleUpdateColumnCount(
                            e.target.value as 'auto' | 'single' | 'double'
                          )
                        }
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '6px',
                          color: '#f8fafc',
                          padding: '6px 8px',
                          fontSize: '11px',
                        }}
                      >
                        <option value="auto" style={{ background: '#0f172a' }}>
                          Auto
                        </option>
                        <option
                          value="single"
                          style={{ background: '#0f172a' }}
                        >
                          1 Columna
                        </option>
                        <option
                          value="double"
                          style={{ background: '#0f172a' }}
                        >
                          2 Columnas
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* In-Book Full-Text Search Drawer */}
              {showSearchDrawer && (
                <div
                  style={{
                    position: 'absolute',
                    top: 50,
                    right: 0,
                    bottom: 50,
                    width: '360px',
                    background: 'rgba(15, 23, 42, 0.98)',
                    backdropFilter: 'blur(20px)',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 80,
                  }}
                >
                  <div
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#f8fafc',
                      }}
                    >
                      🔍 Buscar en el Libro
                    </div>
                    <button
                      onClick={() => setShowSearchDrawer(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    <input
                      type="text"
                      placeholder="Buscar palabra o frase..."
                      value={inBookSearchQuery}
                      onChange={e => {
                        setInBookSearchQuery(e.target.value);
                        handleExecuteInBookSearch(e.target.value);
                      }}
                      style={modalInputStyle}
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '0 16px 16px',
                    }}
                  >
                    {isSearchingInBook ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '30px',
                          color: '#94a3b8',
                          fontSize: '12px',
                        }}
                      >
                        Buscando coincidencias...
                      </div>
                    ) : inBookSearchResults.length === 0 ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '30px',
                          color: '#64748b',
                          fontSize: '12px',
                        }}
                      >
                        {inBookSearchQuery
                          ? 'No se encontraron resultados.'
                          : 'Escribe para buscar en todos los capítulos.'}
                      </div>
                    ) : (
                      inBookSearchResults.map((res, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            sendReaderCommand('goToCfi', res.cfi);
                          }}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.04)',
                            marginBottom: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              color: '#38bdf8',
                              fontSize: '11px',
                              marginBottom: '4px',
                            }}
                          >
                            {res.chapter || 'Capítulo'}
                          </div>
                          <div
                            style={{
                              color: '#cbd5e1',
                              lineHeight: 1.4,
                            }}
                          >
                            {formatSearchSnippet(res.snippet, inBookSearchQuery)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* In-Reader AI Drawer */}
              {showAiDrawer && (
                <div
                  style={{
                    position: 'absolute',
                    top: 50,
                    right: 0,
                    bottom: 50,
                    width: '380px',
                    background: 'rgba(15, 23, 42, 0.98)',
                    backdropFilter: 'blur(20px)',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 80,
                  }}
                >
                  <div
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#f8fafc',
                      }}
                    >
                      <span>🤖 Asistente IA</span>
                      <span
                        style={{
                          fontSize: '10px',
                          background: 'rgba(168, 85, 247, 0.25)',
                          color: '#c084fc',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        Zero-Key
                      </span>
                    </div>
                    <button
                      onClick={() => setShowAiDrawer(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {aiMessages.length === 0 ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '20px 0',
                          color: '#94a3b8',
                          fontSize: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div>¿En qué puedo ayudarte con esta lectura?</div>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            marginTop: '10px',
                          }}
                        >
                          {[
                            'Resumir este capítulo',
                            'Explicar ideas principales',
                            'Crear Mapa Mental Mermaid',
                            'Preguntas de reflexión',
                          ].map(chip => (
                            <button
                              key={chip}
                              onClick={() => handleSendAiMessage(chip)}
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                color: '#f8fafc',
                                fontSize: '11px',
                                textAlign: 'left',
                                cursor: 'pointer',
                              }}
                            >
                              💡 {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      aiMessages.map(m => (
                        <div
                          key={m.id}
                          style={{
                            alignSelf:
                              m.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            background:
                              m.role === 'user'
                                ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                                : 'rgba(255,255,255,0.06)',
                            border:
                              m.role === 'user'
                                ? 'none'
                                : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            fontSize: '12px',
                            lineHeight: 1.45,
                            color: '#f8fafc',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {m.content}
                        </div>
                      ))
                    )}
                  </div>

                  <div
                    style={{
                      padding: '12px',
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      gap: '8px',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Pregunta a la IA sobre el libro..."
                      value={aiPromptInput}
                      onChange={e => setAiPromptInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSendAiMessage();
                      }}
                      style={{ ...modalInputStyle, fontSize: '12px' }}
                    />
                    <button
                      onClick={() => handleSendAiMessage()}
                      disabled={isAiLoading}
                      style={{
                        background: '#38bdf8',
                        border: 'none',
                        color: '#000000',
                        fontWeight: 700,
                        borderRadius: '8px',
                        padding: '0 14px',
                        cursor: 'pointer',
                      }}
                    >
                      {isAiLoading ? '...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ==================== ANX DESKTOP MAIN WINDOW LAYOUT ==================== */
            <div
              style={{
                display: 'flex',
                height: '100%',
                width: '100%',
                overflow: 'hidden',
              }}
            >
              {/* 1. Left Navigation Rail (Matching Anx-Remix main.jpg) */}
              <div
                style={{
                  width: '74px',
                  minWidth: '74px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px 0',
                  background: 'rgba(15, 23, 42, 0.95)',
                  borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                  gap: '14px',
                  zIndex: 10,
                }}
              >
                {/* Anx Logo */}
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
                    marginBottom: '10px',
                    color: '#ffffff',
                    fontSize: '20px',
                    fontWeight: 900,
                  }}
                  title="Anx Reader · AFFiNITe"
                >
                  N
                </div>

                {/* Rail Navigation Items */}
                {[
                  { id: 'bookshelf', label: 'Books', icon: '📚' },
                  { id: 'statistics', label: 'Statistics', icon: '📊' },
                  { id: 'ai', label: 'AI', icon: '🤖' },
                  { id: 'notes', label: 'Notes', icon: '📝' },
                  { id: 'settings', label: 'Settings', icon: '⚙️' },
                ].map(item => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        width: '58px',
                        height: '52px',
                        borderRadius: '16px',
                        background: active
                          ? 'rgba(56, 189, 248, 0.2)'
                          : 'transparent',
                        border: active
                          ? '1px solid rgba(56, 189, 248, 0.4)'
                          : '1px solid transparent',
                        color: active ? '#38bdf8' : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                        outline: 'none',
                      }}
                      title={item.label}
                    >
                      <span style={{ fontSize: '18px' }}>{item.icon}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: active ? 700 : 500,
                          letterSpacing: '-0.2px',
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 2. Main Content Area */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  overflow: 'hidden',
                  background: '#0d1322',
                }}
              >
                {/* Top App Bar for Bookshelf */}
                {activeTab === 'bookshelf' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 24px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      background: 'rgba(15, 23, 42, 0.85)',
                      gap: '16px',
                    }}
                  >
                    {/* Centered Search Pill matching Anx-Remix */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '24px',
                        padding: '0 16px',
                        height: '38px',
                        width: '100%',
                        maxWidth: '440px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}
                    >
                      <span
                        style={{
                          color: '#94a3b8',
                          marginRight: '10px',
                          fontSize: '15px',
                        }}
                      >
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Search books or notes..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#f8fafc',
                          fontSize: '13px',
                          width: '100%',
                        }}
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Right Actions: Sync, Add, Filter/Sort */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <button
                        onClick={() => setDisplayMode('anx')}
                        title="Cambiar a Anx Remix App Oficial"
                        style={{
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          borderRadius: '18px',
                          color: '#38bdf8',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>📖 Anx Remix App</span>
                      </button>
                      <button
                        onClick={syncFromDisk}
                        title="Sincronizar biblioteca local"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#f8fafc',
                          cursor: 'pointer',
                        }}
                      >
                        🔄
                      </button>

                      <button
                        onClick={handlePickAndImportBook}
                        title="Añadir libro (EPUB, PDF, MOBI, TXT)"
                        style={{
                          background:
                            'linear-gradient(135deg, #0284c7, #0369a1)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
                          fontSize: '20px',
                          fontWeight: 500,
                        }}
                      >
                        +
                      </button>

                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setShowSortMenu(s => !s)}
                          title="Ordenar y vistas"
                          style={{
                            background: showSortMenu
                              ? 'rgba(56, 189, 248, 0.25)'
                              : 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: showSortMenu ? '#38bdf8' : '#f8fafc',
                            cursor: 'pointer',
                          }}
                        >
                          ☰
                        </button>

                        {showSortMenu && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '46px',
                              right: 0,
                              background: 'rgba(15, 23, 42, 0.98)',
                              backdropFilter: 'blur(16px)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '12px',
                              padding: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                              minWidth: '180px',
                              zIndex: 60,
                            }}
                          >
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#94a3b8',
                                padding: '4px 8px',
                                fontWeight: 700,
                              }}
                            >
                              ORDENAR POR
                            </div>
                            {[
                              { id: 'recent', label: 'Más reciente' },
                              { id: 'title', label: 'Título (A-Z)' },
                              { id: 'progress', label: 'Progreso (%)' },
                              { id: 'rating', label: 'Calificación (⭐)' },
                              { id: 'size', label: 'Tamaño de archivo' },
                            ].map(s => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setSortBy(s.id as any);
                                  setShowSortMenu(false);
                                }}
                                style={{
                                  background:
                                    sortBy === s.id
                                      ? 'rgba(56, 189, 248, 0.2)'
                                      : 'transparent',
                                  border: 'none',
                                  color: sortBy === s.id ? '#38bdf8' : '#f8fafc',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontWeight: sortBy === s.id ? 700 : 400,
                                }}
                              >
                                {s.label}
                              </button>
                            ))}
                            <div
                              style={{
                                height: 1,
                                background: 'rgba(255,255,255,0.08)',
                                margin: '4px 0',
                              }}
                            />
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '4px 8px',
                              }}
                            >
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                Vista
                              </span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => setViewMode('grid')}
                                  style={{
                                    background:
                                      viewMode === 'grid'
                                        ? '#0284c7'
                                        : 'rgba(255,255,255,0.06)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    color: '#ffffff',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  ▦
                                </button>
                                <button
                                  onClick={() => setViewMode('list')}
                                  style={{
                                    background:
                                      viewMode === 'list'
                                        ? '#0284c7'
                                        : 'rgba(255,255,255,0.06)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    color: '#ffffff',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  ☰
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Filter Bar (Status chips + Tags) */}
                {activeTab === 'bookshelf' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 24px',
                      background: 'rgba(15, 23, 42, 0.4)',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        overflowX: 'auto',
                      }}
                    >
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'reading', label: 'Leyendo' },
                        { id: 'finished', label: 'Terminados' },
                        { id: 'notStarted', label: 'Por empezar' },
                      ].map(st => {
                        const active = statusFilter === st.id;
                        return (
                          <button
                            key={st.id}
                            onClick={() => setStatusFilter(st.id as any)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: '16px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: active
                                ? 'rgba(56, 189, 248, 0.25)'
                                : 'rgba(255, 255, 255, 0.05)',
                              border: active
                                ? '1px solid #38bdf8'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                              color: active ? '#38bdf8' : '#cbd5e1',
                              cursor: 'pointer',
                            }}
                          >
                            {st.label}
                          </button>
                        );
                      })}

                      {selectedTag !== 'Todos' && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(168, 85, 247, 0.25)',
                            border: '1px solid #a855f7',
                            padding: '3px 10px',
                            borderRadius: '16px',
                            fontSize: '11px',
                            color: '#e9d5ff',
                          }}
                        >
                          <span>🏷️ {selectedTag}</span>
                          <span
                            onClick={() => setSelectedTag('Todos')}
                            style={{ cursor: 'pointer', fontWeight: 700 }}
                          >
                            ×
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Tag Filter Button */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowTagMenu(s => !s)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        🏷️ Etiquetas ({allTags.length - 1})
                      </button>

                      {showTagMenu && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '28px',
                            right: 0,
                            background: 'rgba(15, 23, 42, 0.98)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '12px',
                            padding: '10px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                            maxWidth: '280px',
                            zIndex: 60,
                          }}
                        >
                          {allTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => {
                                setSelectedTag(tag);
                                setShowTagMenu(false);
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                background:
                                  selectedTag === tag
                                    ? '#0284c7'
                                    : 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#ffffff',
                                cursor: 'pointer',
                              }}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ==================== 1. TAB: BOOKSHELF ==================== */}
                {activeTab === 'bookshelf' && (
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '20px 24px 80px',
                    }}
                  >
                    {filteredAndSortedBooks.length === 0 ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '60%',
                          gap: '12px',
                          color: '#94a3b8',
                        }}
                      >
                        <span style={{ fontSize: '48px' }}>📚</span>
                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#f8fafc',
                          }}
                        >
                          {books.length === 0
                            ? 'Tu estantería está vacía'
                            : 'No hay libros que coincidan con los filtros'}
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          Importa libros en formato EPUB, PDF o TXT para
                          comenzar a leer.
                        </div>
                        <button
                          onClick={handlePickAndImportBook}
                          style={{
                            marginTop: '10px',
                            background:
                              'linear-gradient(135deg, #0284c7, #0369a1)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 18px',
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          Importar Primer Libro
                        </button>
                      </div>
                    ) : viewMode === 'grid' ? (
                      /* Bookshelf Grid (Authentic Anx-Remix physical covers) */
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fill, minmax(130px, 1fr))',
                          gap: '24px 20px',
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
                                display: 'flex',
                                flexDirection: 'column',
                                width: '100%',
                                cursor: 'pointer',
                                position: 'relative',
                              }}
                              onClick={() => handleOpenReader(book)}
                            >
                              {/* Physical Book Cover */}
                              <div
                                style={{
                                  width: '100%',
                                  aspectRatio: '2/3',
                                  borderRadius: '10px',
                                  overflow: 'hidden',
                                  boxShadow:
                                    '0 8px 24px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.2)',
                                  background:
                                    book.cover ||
                                    getAnxProceduralCover(book.title),
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  position: 'relative',
                                  transition:
                                    'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.transform =
                                    'translateY(-4px) scale(1.02)';
                                  e.currentTarget.style.boxShadow =
                                    '0 14px 32px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.3)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.transform = 'none';
                                  e.currentTarget.style.boxShadow =
                                    '0 8px 24px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.2)';
                                }}
                              >
                                {!book.cover && (
                                  <div
                                    style={{
                                      height: '100%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between',
                                      padding: '12px',
                                      background:
                                        'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%)',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        color: '#ffffff',
                                        lineHeight: 1.25,
                                        textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                                        fontFamily: 'serif',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 4,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      {book.title}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 400,
                                        color: 'rgba(255,255,255,0.85)',
                                        fontFamily: 'serif',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {book.author}
                                    </div>
                                  </div>
                                )}

                                {/* Context Menu 3-dot Button */}
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedBookForDetail(book);
                                  }}
                                  title="Detalles y Opciones"
                                  style={{
                                    position: 'absolute',
                                    top: '6px',
                                    right: '6px',
                                    background: 'rgba(0,0,0,0.65)',
                                    backdropFilter: 'blur(4px)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    color: '#ffffff',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.85,
                                  }}
                                >
                                  ⋮
                                </button>
                              </div>

                              {/* Title, Cloud Icon, Author, and Percentage */}
                              <div style={{ marginTop: '8px', padding: '0 2px' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: '4px',
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      color: '#f8fafc',
                                      lineHeight: 1.3,
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {book.title}
                                  </div>
                                  <span
                                    style={{
                                      color: '#38bdf8',
                                      fontSize: '11px',
                                      flexShrink: 0,
                                    }}
                                    title="Sincronizado / Local"
                                  >
                                    ☁️
                                  </span>
                                </div>

                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginTop: '4px',
                                    fontSize: '10px',
                                    color: '#94a3b8',
                                  }}
                                >
                                  <span
                                    style={{
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      maxWidth: '70%',
                                    }}
                                  >
                                    {book.author}
                                  </span>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: '#38bdf8',
                                    }}
                                  >
                                    {progress}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Bookshelf List View */
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {filteredAndSortedBooks.map(book => (
                          <div
                            key={book.id}
                            onClick={() => handleOpenReader(book)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 16px',
                              background: 'rgba(15, 23, 42, 0.65)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '10px',
                              cursor: 'pointer',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                              }}
                            >
                              <div
                                style={{
                                  width: '36px',
                                  height: '50px',
                                  borderRadius: '4px',
                                  background:
                                    book.cover ||
                                    getAnxProceduralCover(book.title),
                                  backgroundSize: 'cover',
                                }}
                              />
                              <div>
                                <div
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#f8fafc',
                                  }}
                                >
                                  {book.title}
                                </div>
                                <div
                                  style={{ fontSize: '11px', color: '#94a3b8' }}
                                >
                                  {book.author} · {formatBookSize(book.size)}
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '12px',
                                  color: '#38bdf8',
                                  fontWeight: 600,
                                }}
                              >
                                {formatReadingProgress(book.readingPercentage)}
                              </span>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedBookForDetail(book);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#94a3b8',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                }}
                              >
                                ℹ️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== 2. TAB: STATISTICS ==================== */}
                {activeTab === 'statistics' && (
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '28px 36px 80px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '24px',
                    }}
                  >
                    {/* Hero Title Matching mobile3.png */}
                    <div>
                      <div
                        style={{
                          fontSize: '36px',
                          fontWeight: 800,
                          color: '#f8fafc',
                          letterSpacing: '-0.5px',
                        }}
                      >
                        {totalHours} h {totalRemMinutes} m
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginTop: '4px',
                        }}
                      >
                        Lectura acumulada · Desde el inicio hasta hoy
                      </div>
                    </div>

                    {/* 3 Summary Counters Matching mobile3.png */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '24px',
                        padding: '16px 20px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                        maxWidth: '560px',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: '18px',
                            fontWeight: 800,
                            color: '#38bdf8',
                          }}
                        >
                          {stats.totalBooks}
                        </span>{' '}
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                          libros leídos
                        </span>
                      </div>
                      <div
                        style={{
                          width: '1px',
                          height: '20px',
                          background: 'rgba(255,255,255,0.1)',
                        }}
                      />
                      <div>
                        <span
                          style={{
                            fontSize: '18px',
                            fontWeight: 800,
                            color: '#38bdf8',
                          }}
                        >
                          {Math.max(1, stats.completedBooks + stats.readingBooks)}
                        </span>{' '}
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                          días activos
                        </span>
                      </div>
                      <div
                        style={{
                          width: '1px',
                          height: '20px',
                          background: 'rgba(255,255,255,0.1)',
                        }}
                      />
                      <div>
                        <span
                          style={{
                            fontSize: '18px',
                            fontWeight: 800,
                            color: '#38bdf8',
                          }}
                        >
                          {highlights.length}
                        </span>{' '}
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                          notas y citas
                        </span>
                      </div>
                    </div>

                    {/* Segmented Control Filter */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '10px',
                        padding: '3px',
                        width: 'fit-content',
                      }}
                    >
                      {[
                        { id: 'week', label: '▦ Semana' },
                        { id: 'month', label: '▦ Mes' },
                        { id: 'year', label: '▦ Año' },
                        { id: 'all', label: '✓ Todo' },
                      ].map(seg => (
                        <button
                          key={seg.id}
                          onClick={() => setStatsChartMode(seg.id as any)}
                          style={{
                            background:
                              statsChartMode === seg.id
                                ? '#0284c7'
                                : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 14px',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {seg.label}
                        </button>
                      ))}
                    </div>

                    {/* GitHub-style Reading Activity Heatmap Calendar */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        maxWidth: '680px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#f8fafc',
                        }}
                      >
                        Mapa de Calor de Lectura (Heatmap)
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(15, 14px)',
                          gridTemplateRows: 'repeat(7, 14px)',
                          gap: '4px',
                        }}
                      >
                        {heatmapDays.map((d, idx) => {
                          const colors = [
                            '#1e293b',
                            '#065f46',
                            '#047857',
                            '#10b981',
                            '#34d399',
                          ];
                          return (
                            <div
                              key={idx}
                              title={`${d.date}: ${d.minutes} min leídos`}
                              style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '3px',
                                background: colors[d.level],
                                cursor: 'pointer',
                              }}
                            />
                          );
                        })}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          color: '#94a3b8',
                          marginTop: '4px',
                        }}
                      >
                        <span>Menos</span>
                        {['#1e293b', '#065f46', '#047857', '#10b981', '#34d399'].map(
                          (c, i) => (
                            <div
                              key={i}
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '2px',
                                background: c,
                              }}
                            />
                          )
                        )}
                        <span>Más</span>
                      </div>
                    </div>

                    {/* Section: Reading History matching mobile3.png */}
                    <div style={{ marginTop: '10px' }}>
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: 800,
                          color: '#f8fafc',
                          marginBottom: '14px',
                        }}
                      >
                        Historial de Lectura
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          maxWidth: '680px',
                        }}
                      >
                        {books.map(b => (
                          <div
                            key={b.id}
                            onClick={() => handleOpenReader(b)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 18px',
                              background: 'rgba(15, 23, 42, 0.75)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                              }}
                            >
                              <div
                                style={{
                                  width: '40px',
                                  height: '56px',
                                  borderRadius: '6px',
                                  background:
                                    b.cover || getAnxProceduralCover(b.title),
                                  backgroundSize: 'cover',
                                }}
                              />
                              <div>
                                <div
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#f8fafc',
                                  }}
                                >
                                  {b.title}
                                </div>
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: '#94a3b8',
                                  }}
                                >
                                  {b.author}
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: '4px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#38bdf8',
                                }}
                              >
                                {formatReadingTime(b.readingTimeMinutes || 0)}
                              </span>
                              <div
                                style={{
                                  width: '80px',
                                  height: '4px',
                                  background: 'rgba(255,255,255,0.1)',
                                  borderRadius: '2px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Math.round(
                                      b.readingPercentage * 100
                                    )}%`,
                                    height: '100%',
                                    background: '#38bdf8',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ==================== 3. TAB: AI PARTNER ==================== */}
                {activeTab === 'ai' && (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      background: '#0a0f1d',
                    }}
                  >
                    {/* AI Top Header matching mobile5.png */}
                    <div
                      style={{
                        padding: '14px 24px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(15, 23, 42, 0.85)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>🤖</span>
                        <div>
                          <div
                            style={{
                              fontSize: '14px',
                              fontWeight: 800,
                              color: '#f8fafc',
                            }}
                          >
                            AI Partner · Asistente de Lectura
                          </div>
                          <div style={{ fontSize: '11px', color: '#38bdf8' }}>
                            ⚡ Google Antigravity Zero-Key · gemini-4-argon-high
                          </div>
                        </div>
                      </div>

                      {/* Context Selector */}
                      <select
                        value={selectedBookForAiChat}
                        onChange={e => setSelectedBookForAiChat(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          padding: '6px 12px',
                          fontSize: '12px',
                          outline: 'none',
                        }}
                      >
                        <option value="all">
                          📚 Toda la Biblioteca ({books.length} libros)
                        </option>
                        {books.map(b => (
                          <option key={b.id} value={b.id}>
                            📖 {b.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick Prompt Chips matching mobile5.png */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        padding: '10px 24px',
                        background: 'rgba(15, 23, 42, 0.4)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        overflowX: 'auto',
                      }}
                    >
                      {[
                        { label: '💡 Nuestra opinión', prompt: 'Dame tu opinión profunda sobre los temas centrales de esta obra.' },
                        { label: '📋 Resumir', prompt: 'Genera un resumen ejecutivo de las ideas principales.' },
                        { label: '🔍 Analizar', prompt: 'Realiza un análisis crítico de personajes, argumentos y estilo.' },
                        { label: '💡 Sugerencias', prompt: 'Recomiéndame cómo aplicar los aprendizajes de esta lectura.' },
                        { label: '🗺️ Mapa Mental (Mermaid)', prompt: 'Crea un mapa mental completo en formato Mermaid (mindmap) de esta obra.' },
                      ].map(chip => (
                        <button
                          key={chip.label}
                          onClick={() => handleSendAiMessage(chip.prompt)}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            padding: '5px 12px',
                            color: '#e2e8f0',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    {/* Chat Messages Feed */}
                    <div
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '20px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                      }}
                    >
                      {aiMessages.length === 0 ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '70%',
                            color: '#94a3b8',
                            gap: '10px',
                          }}
                        >
                          <span style={{ fontSize: '40px' }}>✨</span>
                          <div
                            style={{
                              fontSize: '15px',
                              fontWeight: 700,
                              color: '#f8fafc',
                            }}
                          >
                            Tu compañero de lectura con IA
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              maxWidth: '400px',
                              textAlign: 'center',
                              lineHeight: 1.5,
                            }}
                          >
                            Pregunta sobre cualquier libro, pide síntesis de
                            capítulos, genera mapas mentales Mermaid o analiza
                            conceptos clave.
                          </div>
                        </div>
                      ) : (
                        aiMessages.map(m => (
                          <div
                            key={m.id}
                            style={{
                              alignSelf:
                                m.role === 'user' ? 'flex-end' : 'flex-start',
                              maxWidth: '75%',
                              background:
                                m.role === 'user'
                                  ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                                  : 'rgba(15, 23, 42, 0.85)',
                              border:
                                m.role === 'user'
                                  ? 'none'
                                  : '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '14px',
                              padding: '12px 18px',
                              fontSize: '13px',
                              lineHeight: 1.5,
                              color: '#f8fafc',
                              whiteSpace: 'pre-wrap',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            }}
                          >
                            {m.content}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Bottom Prompt Input */}
                    <div
                      style={{
                        padding: '16px 24px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(15, 23, 42, 0.95)',
                        display: 'flex',
                        gap: '12px',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Escribe tu mensaje o comando (/explain, /summarize, /mindmap)..."
                        value={aiPromptInput}
                        onChange={e => setAiPromptInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSendAiMessage();
                        }}
                        style={{ ...modalInputStyle, fontSize: '13px' }}
                      />
                      <button
                        onClick={() => handleSendAiMessage()}
                        disabled={isAiLoading}
                        style={{
                          background: '#0284c7',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontWeight: 700,
                          padding: '0 20px',
                          cursor: 'pointer',
                        }}
                      >
                        {isAiLoading ? '...' : 'Enviar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ==================== 4. TAB: NOTES & QUOTES ==================== */}
                {activeTab === 'notes' && (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                    }}
                  >
                    {/* Header matching mobile4.png */}
                    <div
                      style={{
                        padding: '14px 24px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(15, 23, 42, 0.85)',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: 800,
                            color: '#f8fafc',
                          }}
                        >
                          {highlights.length} notas en{' '}
                          {booksWithHighlights.length} libros
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Citas, subrayados y reflexiones guardadas
                        </div>
                      </div>

                      {/* Export to AFFiNITe Document */}
                      <button
                        onClick={() => {
                          const targetBook =
                            books.find(b => b.id === selectedBookForNotes) ||
                            booksWithHighlights[0];
                          if (targetBook) {
                            handleExportNotesToDoc(targetBook);
                          }
                        }}
                        style={{
                          background:
                            'linear-gradient(135deg, #0284c7, #0369a1)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        📤 Exportar a Documento de AFFiNITe
                      </button>
                    </div>

                    {/* Master-Detail Split View matching mobile4.png */}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Left: Book List */}
                      <div
                        style={{
                          width: '320px',
                          borderRight: '1px solid rgba(255,255,255,0.08)',
                          overflowY: 'auto',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          background: 'rgba(15, 23, 42, 0.5)',
                        }}
                      >
                        <button
                          onClick={() => setSelectedBookForNotes('all')}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background:
                              selectedBookForNotes === 'all'
                                ? 'rgba(56, 189, 248, 0.2)'
                                : 'transparent',
                            border:
                              selectedBookForNotes === 'all'
                                ? '1px solid #38bdf8'
                                : '1px solid transparent',
                            color:
                              selectedBookForNotes === 'all'
                                ? '#38bdf8'
                                : '#f8fafc',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          🌟 Todas las Citas ({highlights.length})
                        </button>

                        {booksWithHighlights.map(b => {
                          const count = highlights.filter(
                            h => h.bookId === b.id
                          ).length;
                          const active = selectedBookForNotes === b.id;
                          return (
                            <div
                              key={b.id}
                              onClick={() => setSelectedBookForNotes(b.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                background: active
                                  ? 'rgba(56, 189, 248, 0.2)'
                                  : 'rgba(255,255,255,0.03)',
                                border: active
                                  ? '1px solid #38bdf8'
                                  : '1px solid rgba(255,255,255,0.06)',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ flex: 1, paddingRight: '8px' }}>
                                <div
                                  style={{
                                    fontSize: '16px',
                                    fontWeight: 800,
                                    color: active ? '#38bdf8' : '#f8fafc',
                                  }}
                                >
                                  {count} {count === 1 ? 'nota' : 'notas'}
                                </div>
                                <div
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#f8fafc',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    marginTop: '2px',
                                  }}
                                >
                                  {b.title}
                                </div>
                                <div
                                  style={{
                                    fontSize: '10px',
                                    color: '#94a3b8',
                                    marginTop: '2px',
                                  }}
                                >
                                  ⏱️ {formatReadingTime(b.readingTimeMinutes || 0)} ·{' '}
                                  {formatReadingProgress(b.readingPercentage)}
                                </div>
                              </div>

                              <div
                                style={{
                                  width: '36px',
                                  height: '52px',
                                  borderRadius: '6px',
                                  background:
                                    b.cover || getAnxProceduralCover(b.title),
                                  backgroundSize: 'cover',
                                  flexShrink: 0,
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Right: Notes List */}
                      <div
                        style={{
                          flex: 1,
                          overflowY: 'auto',
                          padding: '16px 24px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        {displayedHighlights.length === 0 ? (
                          <div
                            style={{
                              textAlign: 'center',
                              padding: '60px 0',
                              color: '#94a3b8',
                              fontSize: '13px',
                            }}
                          >
                            No hay notas que coincidan con la búsqueda.
                          </div>
                        ) : (
                          displayedHighlights.map(hl => {
                            const b = books.find(x => x.id === hl.bookId);
                            return (
                              <div
                                key={hl.id}
                                style={{
                                  background: 'rgba(15, 23, 42, 0.75)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderLeft: `4px solid ${hl.color || '#fde047'}`,
                                  borderRadius: '10px',
                                  padding: '14px 18px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '13px',
                                    fontStyle: 'italic',
                                    color: '#f8fafc',
                                    lineHeight: 1.5,
                                    fontFamily: 'serif',
                                  }}
                                >
                                  "{hl.text}"
                                </div>

                                {hl.note && (
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      color: '#93c5fd',
                                      background: 'rgba(59, 130, 246, 0.1)',
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    💭 {hl.note}
                                  </div>
                                )}

                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '11px',
                                    color: '#94a3b8',
                                    marginTop: '4px',
                                  }}
                                >
                                  <div>
                                    {b?.title} · {hl.chapter || 'Cita'}
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={() => {
                                        setSelectedQuoteText(hl.text);
                                        setShowQuoteCardModal(true);
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#38bdf8',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      🖼️ Tarjeta
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedQuoteText(hl.text);
                                        handleQuoteInDailyJournal();
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#38bdf8',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      📅 Diario
                                    </button>
                                    <button
                                      onClick={() => {
                                        const next = removeHighlight(
                                          highlights,
                                          hl.id
                                        );
                                        saveHighlightsToYjs(next);
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#f87171',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ==================== 5. TAB: SETTINGS ==================== */}
                {activeTab === 'settings' && (
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '28px 36px 80px',
                      maxWidth: '720px',
                      margin: '0 auto',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '24px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color: '#f8fafc',
                      }}
                    >
                      ⚙️ Ajustes del Lector & Biblioteca Anx
                    </div>

                    {/* Reading Style Card Matching mobile2.png */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#38bdf8',
                        }}
                      >
                        Estilo de Lectura (Reading Style)
                      </div>

                      {/* Writing Direction */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          Dirección de Escritura
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[
                            { id: 'auto', label: '✓ Auto' },
                            { id: 'vertical', label: '↕ Vertical' },
                            { id: 'horizontal', label: '↔ Horizontal' },
                          ].map(d => (
                            <button
                              key={d.id}
                              onClick={() => setWritingDirection(d.id as any)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                background:
                                  writingDirection === d.id
                                    ? '#0284c7'
                                    : 'rgba(255,255,255,0.06)',
                                border: 'none',
                                color: '#ffffff',
                                cursor: 'pointer',
                              }}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Translation Mode */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          Modo de Traducción
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[
                            { id: 'original', label: '✓ Original' },
                            { id: 'translation', label: '🌐 Traducción' },
                            { id: 'bilingual', label: '📖 Bilingüe' },
                          ].map(m => (
                            <button
                              key={m.id}
                              onClick={() => setTranslationMode(m.id as any)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                background:
                                  translationMode === m.id
                                    ? '#0284c7'
                                    : 'rgba(255,255,255,0.06)',
                                border: 'none',
                                color: '#ffffff',
                                cursor: 'pointer',
                              }}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Column Count */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          Columnas de Texto
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[
                            { id: 'auto', label: '✨ Auto' },
                            { id: 'single', label: '✓ Una' },
                            { id: 'double', label: '📖 Doble' },
                          ].map(c => (
                            <button
                              key={c.id}
                              onClick={() => setColumnCount(c.id as any)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                background:
                                  columnCount === c.id
                                    ? '#0284c7'
                                    : 'rgba(255,255,255,0.06)',
                                border: 'none',
                                color: '#ffffff',
                                cursor: 'pointer',
                              }}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Theme Selector */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          Tema Predeterminado
                        </div>
                        <select
                          value={readerTheme}
                          onChange={e => setReaderTheme(e.target.value as any)}
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#f8fafc',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        >
                          <option value="dark">🌙 Oscuro (Slate #0f172a)</option>
                          <option value="sepia">📜 Sepia (Editorial #fbf0d9)</option>
                          <option value="light">☀️ Claro (#ffffff)</option>
                          <option value="oled">⬛ OLED (Negro absoluto)</option>
                        </select>
                      </div>

                      {/* Font Size Slider */}
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                          }}
                        >
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>
                            Tamaño de Fuente Base
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#38bdf8',
                            }}
                          >
                            {readerFontSize}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="12"
                          max="32"
                          value={readerFontSize}
                          onChange={e =>
                            setReaderFontSize(Number(e.target.value))
                          }
                          style={{
                            width: '100%',
                            accentColor: '#38bdf8',
                            cursor: 'pointer',
                          }}
                        />
                      </div>
                    </div>

                    {/* Audio & Storage Info */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#38bdf8',
                        }}
                      >
                        Almacenamiento Local Encapsulado
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#cbd5e1',
                          lineHeight: 1.5,
                        }}
                      >
                        Todos tus libros y anotaciones se almacenan localmente y de
                        forma encapsulada dentro del sandbox de AFFiNITe. No
                        dependes de servidores externos ni de WebDAV para
                        lectura.
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          background: 'rgba(0,0,0,0.3)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                        }}
                      >
                        ~/.var/app/app.affinite.Affinite/config/@affine/electron/library/books/
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Book Detail Modal (Anx BookBottomSheet) */}
          {selectedBookForDetail && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px',
              }}
              onClick={() => setSelectedBookForDetail(null)}
            >
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px',
                  maxWidth: '520px',
                  width: '100%',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 20px 48px rgba(0,0,0,0.6)',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div
                    style={{
                      width: '90px',
                      height: '130px',
                      borderRadius: '8px',
                      background:
                        selectedBookForDetail.cover ||
                        getAnxProceduralCover(selectedBookForDetail.title),
                      backgroundSize: 'cover',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#f8fafc',
                      }}
                    >
                      {selectedBookForDetail.title}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        marginTop: '4px',
                      }}
                    >
                      {selectedBookForDetail.author}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#38bdf8',
                        marginTop: '6px',
                      }}
                    >
                      Progreso:{' '}
                      {formatReadingProgress(
                        selectedBookForDetail.readingPercentage
                      )}{' '}
                      · Tamaño: {formatBookSize(selectedBookForDetail.size)}
                    </div>

                    {/* Rating Stars */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        marginTop: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      {[1, 2, 3, 4, 5].map(star => (
                        <span
                          key={star}
                          onClick={() => {
                            const updated = updateBookRating(
                              books,
                              selectedBookForDetail.id,
                              star
                            );
                            saveBooksToYjs(updated);
                            setSelectedBookForDetail(s =>
                              s ? { ...s, rating: star } : null
                            );
                          }}
                          style={{
                            fontSize: '18px',
                            color:
                              star <= (selectedBookForDetail.rating || 0)
                                ? '#facc15'
                                : 'rgba(255,255,255,0.2)',
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tag Management */}
                <div>
                  <div style={modalLabelStyle}>Etiquetas / Tags</div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginTop: '6px',
                    }}
                  >
                    {selectedBookForDetail.tags?.map(t => (
                      <span
                        key={t}
                        style={{
                          background: 'rgba(56, 189, 248, 0.2)',
                          border: '1px solid #38bdf8',
                          color: '#38bdf8',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {t}
                        <span
                          style={{ cursor: 'pointer', fontWeight: 700 }}
                          onClick={() => {
                            const updated = removeBookTag(
                              books,
                              selectedBookForDetail.id,
                              t
                            );
                            saveBooksToYjs(updated);
                            setSelectedBookForDetail(s =>
                              s
                                ? {
                                    ...s,
                                    tags: s.tags?.filter(x => x !== t),
                                  }
                                : null
                            );
                          }}
                        >
                          ×
                        </span>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder="+ Nueva etiqueta..."
                      value={newTagInput}
                      onChange={e => setNewTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newTagInput.trim()) {
                          const updated = addBookTag(
                            books,
                            selectedBookForDetail.id,
                            newTagInput.trim()
                          );
                          saveBooksToYjs(updated);
                          setSelectedBookForDetail(s =>
                            s
                              ? {
                                  ...s,
                                  tags: [...(s.tags || []), newTagInput.trim()],
                                }
                              : null
                          );
                          setNewTagInput('');
                        }
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        padding: '2px 8px',
                        fontSize: '11px',
                        outline: 'none',
                        width: '120px',
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '10px',
                  }}
                >
                  <button
                    onClick={() => handleDeleteBook(selectedBookForDetail)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid #ef4444',
                      color: '#f87171',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Eliminar
                  </button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setSelectedBookForNotes(selectedBookForDetail.id);
                        setActiveTab('notes');
                        setSelectedBookForDetail(null);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#cbd5e1',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      📝 Ver Notas
                    </button>

                    <button
                      onClick={() => handleOpenReader(selectedBookForDetail)}
                      style={{
                        background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ▶ Leer Ahora
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Excerpt Share Card Modal */}
          {showQuoteCardModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px',
              }}
              onClick={() => setShowQuoteCardModal(false)}
            >
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.98)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '16px',
                  maxWidth: '640px',
                  width: '100%',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#f8fafc',
                    }}
                  >
                    🖼️ Generador de Tarjeta de Cita
                  </div>
                  <button
                    onClick={() => setShowQuoteCardModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Theme Selector */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(
                    Object.keys(QUOTE_CARD_THEMES) as QuoteCardThemeId[]
                  ).map(tId => {
                    const t = QUOTE_CARD_THEMES[tId];
                    return (
                      <button
                        key={tId}
                        onClick={() => setSelectedQuoteTheme(tId)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '8px',
                          background:
                            selectedQuoteTheme === tId
                              ? 'rgba(56, 189, 248, 0.25)'
                              : 'rgba(255,255,255,0.06)',
                          border:
                            selectedQuoteTheme === tId
                              ? '1px solid #38bdf8'
                              : '1px solid rgba(255,255,255,0.1)',
                          color: '#f8fafc',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>

                {/* Visual Preview */}
                <div
                  style={{
                    background:
                      QUOTE_CARD_THEMES[selectedQuoteTheme].background,
                    color: QUOTE_CARD_THEMES[selectedQuoteTheme].textColor,
                    fontFamily:
                      QUOTE_CARD_THEMES[selectedQuoteTheme].fontFamily,
                    borderRadius: '12px',
                    padding: '28px',
                    border: `1px solid ${QUOTE_CARD_THEMES[selectedQuoteTheme].accentColor}33`,
                    position: 'relative',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      fontSize: 48,
                      lineHeight: 1,
                      color:
                        QUOTE_CARD_THEMES[selectedQuoteTheme].quoteMarkColor,
                    }}
                  >
                    “
                  </div>
                  <div
                    style={{
                      fontSize: `${computeQuoteCardFontSize(
                        (selectedQuoteText || activeBook?.title || '').length
                      )}px`,
                      fontStyle: 'italic',
                      lineHeight: 1.5,
                      margin: '12px 0 20px',
                    }}
                  >
                    {selectedQuoteText || `Fragmento de ${activeBook?.title}`}
                  </div>
                  <div>
                    <div
                      style={{
                        height: 1,
                        width: 60,
                        background:
                          QUOTE_CARD_THEMES[selectedQuoteTheme].accentColor,
                        marginBottom: 10,
                      }}
                    />
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color:
                          QUOTE_CARD_THEMES[selectedQuoteTheme].accentColor,
                      }}
                    >
                      {activeBook?.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color:
                          QUOTE_CARD_THEMES[selectedQuoteTheme].subtextColor,
                      }}
                    >
                      {activeBook?.author} · {currentChapter}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 10,
                  }}
                >
                  <button
                    onClick={async () => {
                      const blob = await generateQuoteCardImage(
                        selectedQuoteTheme
                      );
                      if (blob && navigator.clipboard) {
                        try {
                          await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob }),
                          ]);
                          setQuoteCardCopiedFeedback(true);
                          setTimeout(
                            () => setQuoteCardCopiedFeedback(false),
                            2500
                          );
                        } catch {
                          // fallback
                        }
                      }
                    }}
                    style={{
                      background: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38bdf8',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {quoteCardCopiedFeedback
                      ? '✓ ¡Imagen copiada!'
                      : '📋 Copiar Imagen'}
                  </button>

                  <button
                    onClick={async () => {
                      const blob = await generateQuoteCardImage(
                        selectedQuoteTheme
                      );
                      if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `cita-${activeBook?.title.slice(0, 20)}.png`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }
                    }}
                    style={{
                      background: '#10b981',
                      border: 'none',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    💾 Descargar PNG
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
