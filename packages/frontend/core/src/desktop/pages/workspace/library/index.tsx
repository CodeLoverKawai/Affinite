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
  createInitialTtsState,
  createLibraryBook,
  filterBooks,
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
  ReadingStatistics,
  removeBookmark,
  removeBookTag,
  removeHighlight,
  sanitizeTtsText,
  sortBooks,
  TtsState,
  updateBookMetadata,
  updateBookRating,
} from './library-manager';

export const Component = () => {
  const workspaceService = useService(WorkspaceService);
  const journalService = useService(JournalService);
  const workbench = useService(WorkbenchService).workbench;

  // Main Navigation Tab: 'bookshelf' | 'statistics' | 'notes' | 'settings'
  const [activeTab, setActiveTab] = useState<'bookshelf' | 'statistics' | 'notes' | 'settings'>('bookshelf');

  // Persistence State
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [bookmarks, setBookmarks] = useState<LibraryBookmark[]>([]);
  const [highlights, setHighlights] = useState<LibraryHighlight[]>([]);

  // Bookshelf Navigation & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('Todos');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress' | 'rating'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Active Reader View State
  const [activeBook, setActiveBook] = useState<LibraryBook | null>(null);
  const [readerTheme, setReaderTheme] = useState<'dark' | 'light' | 'sepia' | 'oled'>('dark');
  const [readerFontSize, setReaderFontSize] = useState(16);
  const [readerFontFamily, setReaderFontFamily] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [readerPageTurn, setReaderPageTurn] = useState<'scroll' | 'paginated'>('scroll');
  const [showTocDrawer, setShowTocDrawer] = useState(false);
  const [showBookmarksDrawer, setShowBookmarksDrawer] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [tocItems, setTocItems] = useState<any[]>([]);
  const [currentChapter, setCurrentChapter] = useState('Inicio');
  const [currentCfi, setCurrentCfi] = useState<string>('');
  const [currentPercentage, setCurrentPercentage] = useState(0);

  // 1. In-Book Search State
  const [showSearchDrawer, setShowSearchDrawer] = useState(false);
  const [inBookSearchQuery, setInBookSearchQuery] = useState('');
  const [inBookSearchResults, setInBookSearchResults] = useState<InBookSearchResult[]>([]);
  const [isSearchingInBook, setIsSearchingInBook] = useState(false);

  // 2. Synchronized TTS Floating Bar State
  const [showTtsBar, setShowTtsBar] = useState(false);
  const [ttsState, setTtsState] = useState<TtsState>(createInitialTtsState());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
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
  const [aiMessages, setAiMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: number }>>([]);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 5. Excerpt Share Card Modal State
  const [showQuoteCardModal, setShowQuoteCardModal] = useState(false);
  const [selectedQuoteTheme, setSelectedQuoteTheme] = useState<QuoteCardThemeId>('modern-dark');
  const [quoteCardCopiedFeedback, setQuoteCardCopiedFeedback] = useState(false);

  // Book Detail Modal State
  const [selectedBookForDetail, setSelectedBookForDetail] = useState<LibraryBook | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Quote & Highlight Modal
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedQuoteText, setSelectedQuoteText] = useState('');
  const [quoteNote, setQuoteNote] = useState('');
  const [quoteCopiedFeedback, setQuoteCopiedFeedback] = useState(false);

  // Notes View State
  const [selectedBookForNotes, setSelectedBookForNotes] = useState<string | 'all'>('all');
  const [notesSearchQuery, setNotesSearchQuery] = useState('');

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

  // AI Reading Assistant prompt handler
  const handleSendAiPrompt = useCallback(
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
        const bookContext = `Estás leyendo el libro "${activeBook?.title}" de ${activeBook?.author}. Capítulo actual: "${currentChapter}".`;
        const fullPrompt = `${bookContext}\n\nPregunta o instrucción del lector:\n${promptText}`;

        if (aiApi?.chat) {
          const res = await aiApi.chat({
            provider: 'antigravity',
            modelId: 'gemini-4-argon-high',
            prompt: fullPrompt,
            messages: aiMessages.concat(userMsg).map(m => ({ role: m.role, content: m.content })),
          });
          reply = res?.content || 'No se recibió respuesta del modelo local.';
        } else {
          reply = 'El puente de IA local (Antigravity agy CLI) no está disponible en este entorno.';
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
    [activeBook?.author, activeBook?.title, aiMessages, aiPromptInput, currentChapter, isAiLoading]
  );

  // Quote Card generator using HTML5 Canvas
  const generateQuoteCardImage = useCallback(
    async (themeId: QuoteCardThemeId): Promise<Blob | null> => {
      const theme = QUOTE_CARD_THEMES[themeId];
      const quote = selectedQuoteText || (activeBook ? activeBook.title : 'Cita');
      const author = activeBook?.author || 'Autor desconocido';
      const bookTitle = activeBook?.title || 'Libro';

      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Background
      if (themeId === 'modern-dark') {
        const grad = ctx.createLinearGradient(0, 0, 1200, 700);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
      } else if (themeId === 'emerald-night') {
        const grad = ctx.createLinearGradient(0, 0, 1200, 700);
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(1, '#022c22');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = theme.background;
      }
      ctx.fillRect(0, 0, 1200, 700);

      // Decorative border
      ctx.strokeStyle = theme.accentColor + '33';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, 1120, 620);

      // Quotation mark
      ctx.fillStyle = theme.quoteMarkColor;
      ctx.font = 'bold 120px Georgia, serif';
      ctx.fillText('“', 80, 150);

      // Quote text wrapped
      ctx.fillStyle = theme.textColor;
      const fontSize = computeQuoteCardFontSize(quote.length) * 1.6;
      ctx.font = `italic ${Math.round(fontSize)}px ${theme.fontFamily}`;

      const words = quote.split(' ');
      let line = '';
      let y = 190;
      const maxWidth = 1000;
      const lineHeight = fontSize * 1.45;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line.trim(), 90, y);
          line = words[n] + ' ';
          y += lineHeight;
          if (y > 510) {
            ctx.fillText(line.trim() + '...', 90, y);
            break;
          }
        } else {
          line = testLine;
        }
      }
      if (y <= 510 && line) {
        ctx.fillText(line.trim(), 90, y);
      }

      // Divider line
      ctx.strokeStyle = theme.accentColor + '66';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(90, 560);
      ctx.lineTo(350, 560);
      ctx.stroke();

      // Book title and author
      ctx.fillStyle = theme.accentColor;
      ctx.font = `bold 22px system-ui, sans-serif`;
      ctx.fillText(bookTitle, 90, 595);

      ctx.fillStyle = theme.subtextColor;
      ctx.font = `18px system-ui, sans-serif`;
      ctx.fillText(`${author} · ${currentChapter}`, 90, 625);

      // Watermark
      ctx.fillStyle = theme.subtextColor + '88';
      ctx.font = `14px system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText('AFFiNITe · Anx Reader', 1100, 625);

      return new Promise<Blob | null>(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/png');
      });
    },
    [activeBook, currentChapter, selectedQuoteText]
  );

  // Handle message from Foliate iframe
  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.type !== 'anx-reader') return;

      switch (data.event) {
        case 'onRelocate':
        case 'onRelocated': {
          const payload = data.data;
          if (payload) {
            const fraction = payload.fraction ?? payload.percentage ?? 0;
            const cfi = payload.cfi ?? payload.location;
            handleUpdateProgress(fraction, cfi);
            if (payload.tocItem?.label) setCurrentChapter(payload.tocItem.label);
          }
          break;
        }
        case 'onSetToc': {
          if (Array.isArray(data.data)) {
            setTocItems(data.data);
          }
          break;
        }
        case 'onSelectionEnd': {
          const selection = data.data;
          if (selection?.text) {
            setSelectedQuoteText(selection.text);
            setSelectionRangeData({
              text: selection.text,
              cfi: selection.cfi || currentCfi,
              pos: selection.pos,
            });
            setShowSelectionNoteInput(false);
            setSelectionNoteText('');
            if (activeBook) {
              const nextHighlights = addHighlight(
                highlights,
                activeBook.id,
                selection.text,
                selection.cfi || currentCfi,
                { chapter: currentChapter, color: selectedHighlightColor }
              );
              saveHighlightsToYjs(nextHighlights);
            }
          }
          break;
        }
        case 'onSelectionCleared': {
          setSelectionRangeData(null);
          setShowSelectionNoteInput(false);
          break;
        }
        case 'onSearch': {
          const payload = data.data;
          if (payload === 'done' || payload?.process === 1.0) {
            setIsSearchingInBook(false);
          } else if (payload?.cfi && payload?.excerpt) {
            setInBookSearchResults(prev => [
              ...prev,
              { cfi: payload.cfi, excerpt: payload.excerpt, chapter: currentChapter },
            ]);
          }
          break;
        }
        case 'onTtsSentence': {
          const payload = data.data;
          if (payload?.text) {
            handlePlayTtsSentence(payload.text, payload.cfi);
          }
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [
    activeBook,
    currentCfi,
    currentChapter,
    handlePlayTtsSentence,
    handleUpdateProgress,
    highlights,
    saveHighlightsToYjs,
    selectedHighlightColor,
  ]);

  // Compute safe iframe reader URL with JSON-encoded parameters
  const readerIframeSrc = useMemo(() => {
    if (!activeBook) return '';
    const bookUrl = activeBook.filePath.startsWith('assets://')
      ? activeBook.filePath
      : `assets://local-file/${encodeURIComponent(activeBook.filePath)}`;

    const params = new URLSearchParams({
      url: JSON.stringify(bookUrl),
      initialCfi: JSON.stringify(activeBook.lastReadPosition || null),
      style: JSON.stringify({
        backgroundColor:
          readerTheme === 'dark'
            ? '#0f172a'
            : readerTheme === 'oled'
              ? '#000000'
              : readerTheme === 'sepia'
                ? '#fbf0d9'
                : '#ffffff',
        fontColor:
          readerTheme === 'dark'
            ? '#f8fafc'
            : readerTheme === 'oled'
              ? '#ffffff'
              : readerTheme === 'sepia'
                ? '#5f4b32'
                : '#0f172a',
        fontSize: Number((readerFontSize / 16).toFixed(2)),
        paragraphSpacing: 0.5,
        headingFontSize: 1.0,
        topMargin: 40,
        bottomMargin: 40,
        sideMargin: 12,
        pageTurnStyle: readerPageTurn,
        justify: true,
      }),
    });
    return `assets://./foliate/index.html?${params.toString()}`;
  }, [activeBook?.id, activeBook?.filePath, readerFontSize, readerPageTurn, readerTheme]);

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

  // Dynamic tags from all books
  const allTags = useMemo(() => {
    const set = new Set<string>();
    books.forEach(b => (b.tags || []).forEach(t => set.add(t)));
    return ['Todos', ...Array.from(set)];
  }, [books]);

  // Filtered & Sorted books
  const filteredAndSortedBooks = useMemo(() => {
    const filtered = filterBooks(books, searchQuery, selectedTag);
    return sortBooks(filtered, sortBy);
  }, [books, searchQuery, selectedTag, sortBy]);

  // Overall Statistics calculated using helper
  const stats: ReadingStatistics = useMemo(() => {
    return calculateReadingStatistics(books, highlights);
  }, [books, highlights]);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '18px',
                fontWeight: 800,
                color: '#f8fafc',
                letterSpacing: '-0.3px',
              }}
            >
              <BookPanelIcon
                style={{ width: 22, height: 22, color: '#3b82f6' }}
              />
              <span>📚 Biblioteca Anx</span>
            </div>

            {/* Sub-navbar tabs matching Anx-Remix */}
            {!activeBook && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '3px',
                  gap: '2px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {[
                  { id: 'bookshelf', label: '📚 Estantería' },
                  { id: 'statistics', label: '📊 Estadísticas' },
                  { id: 'notes', label: '📝 Notas & Citas' },
                  { id: 'settings', label: '⚙️ Ajustes' },
                ].map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      style={{
                        background: active
                          ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                          : 'transparent',
                        border: 'none',
                        color: active ? '#ffffff' : '#94a3b8',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Search, Sorting & Import */}
          {!activeBook && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeTab === 'bookshelf' && (
                <>
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

                  {/* View mode toggle (Grid vs List) */}
                  <div
                    style={{
                      display: 'flex',
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '2px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <button
                      onClick={() => setViewMode('grid')}
                      style={{
                        background: viewMode === 'grid' ? '#3b82f6' : 'transparent',
                        border: 'none',
                        color: viewMode === 'grid' ? '#ffffff' : '#94a3b8',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                      title="Vista en Cuadrícula"
                    >
                      ▦
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      style={{
                        background: viewMode === 'list' ? '#3b82f6' : 'transparent',
                        border: 'none',
                        color: viewMode === 'list' ? '#ffffff' : '#94a3b8',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                      title="Vista en Lista"
                    >
                      ☰
                    </button>
                  </div>
                </>
              )}

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
          )}
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
              {/* Top Reader Toolbar matching Anx Remix */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 18px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(15, 23, 42, 0.90)',
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
                      borderRadius: '6px',
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
                      background: showSearchDrawer ? 'rgba(59, 130, 246, 0.45)' : readerBtnStyle.background,
                      color: showSearchDrawer ? '#ffffff' : readerBtnStyle.color,
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
                      background: showTtsBar ? 'rgba(16, 185, 129, 0.45)' : readerBtnStyle.background,
                      color: showTtsBar ? '#ffffff' : readerBtnStyle.color,
                    }}
                    title="Narrador de voz sincronizado (Text-to-Speech)"
                  >
                    🔊 Voz (TTS)
                  </button>

                  <button
                    onClick={() => setShowAiDrawer(s => !s)}
                    style={{
                      ...readerBtnStyle,
                      background: showAiDrawer ? 'rgba(168, 85, 247, 0.45)' : readerBtnStyle.background,
                      color: showAiDrawer ? '#ffffff' : readerBtnStyle.color,
                    }}
                    title="Asistente IA de lectura (Antigravity Zero-Key)"
                  >
                    🤖 IA
                  </button>

                  <button
                    onClick={() => {
                      if (!selectedQuoteText) {
                        setSelectedQuoteText(`Fragmento de ${activeBook.title}`);
                      }
                      setShowQuoteCardModal(true);
                    }}
                    style={readerBtnStyle}
                    title="Crear tarjeta visual de cita (Quote Card)"
                  >
                    🖼️ Tarjeta
                  </button>

                  <div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        maxWidth: '240px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {activeBook.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {currentChapter} · {formatReadingProgress(currentPercentage)}
                    </div>
                  </div>
                </div>

                {/* Center: Previous / Next controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                      fontWeight: 700,
                      color: '#60a5fa',
                      minWidth: '42px',
                      textAlign: 'center',
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

                {/* Right: Quote into Journal & Quick Theme switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => {
                      if (!selectedQuoteText) {
                        setSelectedQuoteText(`Fragmento de ${activeBook.title}`);
                      }
                      setQuoteModalOpen(true);
                    }}
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.45)',
                      color: '#6ee7b7',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title="Citar fragmento en el Diario de hoy"
                  >
                    <JournalIcon style={{ width: 14, height: 14 }} />
                    <span>Citar en Diario</span>
                  </button>

                  <button
                    onClick={handleAddCurrentBookmark}
                    style={readerBtnStyle}
                    title="Guardar marcador en la página actual"
                  >
                    + 🔖
                  </button>

                  {/* Theme Switcher */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 2,
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
                              ? 'rgba(59, 130, 246, 0.45)'
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

              {/* Foliate-js Frame Surface with Drawers */}
              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                {/* TOC Drawer */}
                {showTocDrawer && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: 300,
                      background: 'rgba(15, 23, 42, 0.96)',
                      backdropFilter: 'blur(16px)',
                      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                      zIndex: 50,
                      overflowY: 'auto',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                        paddingBottom: 8,
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                        📑 Índice de Capítulos
                      </span>
                      <button
                        onClick={() => setShowTocDrawer(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          fontSize: 16,
                        }}
                      >
                        ×
                      </button>
                    </div>
                    {tocItems.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#64748b', padding: '12px 0' }}>
                        No hay capítulos detectados
                      </div>
                    ) : (
                      tocItems.map((item: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (item.href) sendReaderCommand('goToCfi', item.href);
                            setShowTocDrawer(false);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            textAlign: 'left',
                            padding: '7px 10px',
                            borderRadius: 6,
                            fontSize: 12,
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
                )}

                {/* Bookmarks Drawer */}
                {showBookmarksDrawer && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: 280,
                      background: 'rgba(15, 23, 42, 0.96)',
                      backdropFilter: 'blur(16px)',
                      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                      zIndex: 50,
                      overflowY: 'auto',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                        🔖 Marcadores
                      </span>
                      <button
                        onClick={() => setShowBookmarksDrawer(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          fontSize: 16,
                        }}
                      >
                        ×
                      </button>
                    </div>

                    {bookmarks.filter(b => b.bookId === activeBook.id).length === 0 ? (
                      <div style={{ fontSize: 12, color: '#64748b', padding: '10px 0' }}>
                        No hay marcadores aún en este libro.
                      </div>
                    ) : (
                      bookmarks
                        .filter(b => b.bookId === activeBook.id)
                        .map(bm => (
                          <div
                            key={bm.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'rgba(255,255,255,0.04)',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                          >
                            <div
                              onClick={() => {
                                sendReaderCommand('goToCfi', bm.cfi);
                                setShowBookmarksDrawer(false);
                              }}
                              style={{ cursor: 'pointer', flex: 1 }}
                            >
                              <div style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 600 }}>
                                {bm.label}
                              </div>
                              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                {dayjs(bm.createdAt).format('DD MMM YYYY')}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveBookmark(bm.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '2px',
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                )}

                {/* Style & Preferences Modal */}
                {showStyleModal && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 18,
                      width: 260,
                      background: 'rgba(15, 23, 42, 0.95)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 12,
                      padding: 16,
                      zIndex: 60,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      boxShadow: '0 16px 32px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                        🎨 Ajustes de Lectura
                      </span>
                      <button
                        onClick={() => setShowStyleModal(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          fontSize: 16,
                        }}
                      >
                        ×
                      </button>
                    </div>

                    {/* Font Size */}
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#94a3b8',
                          marginBottom: 4,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Tamaño de fuente</span>
                        <span style={{ color: '#60a5fa', fontWeight: 700 }}>
                          {readerFontSize}px
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => {
                            const newSize = Math.max(12, readerFontSize - 1);
                            setReaderFontSize(newSize);
                            sendReaderCommand('changeStyle', {
                              fontSize: Number((newSize / 16).toFixed(2)),
                            });
                          }}
                          style={readerBtnStyle}
                        >
                          A-
                        </button>
                        <input
                          type="range"
                          min={12}
                          max={26}
                          value={readerFontSize}
                          onChange={e => {
                            const newSize = Number(e.target.value);
                            setReaderFontSize(newSize);
                            sendReaderCommand('changeStyle', {
                              fontSize: Number((newSize / 16).toFixed(2)),
                            });
                          }}
                          style={{ flex: 1 }}
                        />
                        <button
                          onClick={() => {
                            const newSize = Math.min(26, readerFontSize + 1);
                            setReaderFontSize(newSize);
                            sendReaderCommand('changeStyle', {
                              fontSize: Number((newSize / 16).toFixed(2)),
                            });
                          }}
                          style={readerBtnStyle}
                        >
                          A+
                        </button>
                      </div>
                    </div>

                    {/* Page Turn Mode */}
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                        Modo de lectura
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => {
                            setReaderPageTurn('scroll');
                            sendReaderCommand('changeStyle', { pageTurnStyle: 'scroll' });
                          }}
                          style={{
                            ...readerBtnStyle,
                            flex: 1,
                            background:
                              readerPageTurn === 'scroll'
                                ? '#3b82f6'
                                : 'rgba(255,255,255,0.06)',
                            color: readerPageTurn === 'scroll' ? '#ffffff' : '#cbd5e1',
                          }}
                        >
                          📜 Scroll continuo
                        </button>
                        <button
                          onClick={() => {
                            setReaderPageTurn('paginated');
                            sendReaderCommand('changeStyle', { pageTurnStyle: 'paginated' });
                          }}
                          style={{
                            ...readerBtnStyle,
                            flex: 1,
                            background:
                              readerPageTurn === 'paginated'
                                ? '#3b82f6'
                                : 'rgba(255,255,255,0.06)',
                            color: readerPageTurn === 'paginated' ? '#ffffff' : '#cbd5e1',
                          }}
                        >
                          📖 Paginado
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <iframe
                  ref={iframeRef}
                  title="Foliate Reader"
                  src={readerIframeSrc}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    background: 'transparent',
                  }}
                />

                {/* 1. In-Book Full-Text Search Drawer */}
                {showSearchDrawer && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: 340,
                      background: 'rgba(15, 23, 42, 0.96)',
                      backdropFilter: 'blur(16px)',
                      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                      zIndex: 60,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '16px',
                      gap: 12,
                      boxShadow: '10px 0 30px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                        🔍 Buscar en el libro
                      </span>
                      <button
                        onClick={() => {
                          setShowSearchDrawer(false);
                          sendReaderCommand('clearSearch');
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>

                    {/* Search Input */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="Escribe palabra o frase..."
                        value={inBookSearchQuery}
                        onChange={e => {
                          const q = e.target.value;
                          setInBookSearchQuery(q);
                          if (!q.trim()) {
                            setInBookSearchResults([]);
                            sendReaderCommand('clearSearch');
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            handleExecuteInBookSearch(inBookSearchQuery);
                          }
                        }}
                        style={{
                          flex: 1,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#f8fafc',
                          padding: '8px 12px',
                          borderRadius: 6,
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => handleExecuteInBookSearch(inBookSearchQuery)}
                        style={{
                          background: '#3b82f6',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: 6,
                          padding: '0 12px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Buscar
                      </button>
                    </div>

                    <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{inBookSearchResults.length} coincidencias</span>
                      {isSearchingInBook && <span style={{ color: '#38bdf8' }}>Buscando...</span>}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {inBookSearchResults.length === 0 ? (
                        <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 30 }}>
                          {isSearchingInBook ? 'Escaneando capítulos...' : 'Ingresa un término para buscar en todo el libro'}
                        </div>
                      ) : (
                        inBookSearchResults.map((res, idx) => (
                          <div
                            key={`${res.cfi}-${idx}`}
                            onClick={() => sendReaderCommand('goToCfi', res.cfi)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: 6,
                              padding: '10px',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
                          >
                            <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600, marginBottom: 4 }}>
                              {res.chapter || currentChapter}
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.4 }}>
                              {formatSearchSnippet(res.excerpt, 120)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 2. AI Reading Assistant Drawer (Right side) */}
                {showAiDrawer && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      width: 380,
                      background: 'rgba(15, 23, 42, 0.96)',
                      backdropFilter: 'blur(20px)',
                      borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                      zIndex: 65,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '16px',
                      gap: 12,
                      boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>🤖</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                            Asistente IA de Lectura
                          </div>
                          <div style={{ fontSize: 10, color: '#10b981' }}>
                            ⚡ Antigravity Local (Zero-API-Key)
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAiDrawer(false)}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>

                    {/* Quick Prompt Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {[
                        { label: '💡 Resumir capítulo', prompt: `Por favor resume de forma clara y concisa los puntos principales del capítulo "${currentChapter}" de la obra "${activeBook.title}".` },
                        { label: '🔍 Explicar selección', prompt: selectedQuoteText ? `Explica el significado y contexto del siguiente fragmento de "${activeBook.title}":\n\n"${selectedQuoteText}"` : `Explica los conceptos clave del capítulo "${currentChapter}".` },
                        { label: '🧠 Mapa Mental Mermaid', prompt: `Genera un mapa mental o diagrama conceptual en formato Mermaid (flowchart TD) de las ideas de "${activeBook.title}" en el capítulo "${currentChapter}". Responde con el bloque \`\`\`mermaid\`\`\`.` },
                        { label: '❓ Preguntas de reflexión', prompt: `Plantea 3 preguntas profundas de comprensión y reflexión crítica sobre las ideas presentadas en "${currentChapter}".` },
                      ].map(chip => (
                        <button
                          key={chip.label}
                          onClick={() => handleSendAiPrompt(chip.prompt)}
                          disabled={isAiLoading}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#e2e8f0',
                            fontSize: 11,
                            padding: '5px 10px',
                            borderRadius: 14,
                            cursor: isAiLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => !isAiLoading && (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)')}
                          onMouseLeave={e => !isAiLoading && (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    {/* Messages List */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
                      {aiMessages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 40, lineHeight: 1.6 }}>
                          Selecciona un texto del libro o haz clic en un chip de acción rápida para analizar la lectura con Antigravity AI.
                        </div>
                      ) : (
                        aiMessages.map(m => (
                          <div
                            key={m.id}
                            style={{
                              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                              background: m.role === 'user' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                              border: m.role === 'user' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: 10,
                              padding: '10px 12px',
                              maxWidth: '90%',
                              fontSize: 12,
                              lineHeight: 1.5,
                              color: '#f8fafc',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            <div style={{ fontSize: 10, color: m.role === 'user' ? '#93c5fd' : '#10b981', marginBottom: 4, fontWeight: 700 }}>
                              {m.role === 'user' ? 'Tú' : 'Antigravity AI'}
                            </div>
                            {m.content}
                          </div>
                        ))
                      )}
                      {isAiLoading && (
                        <div style={{ alignSelf: 'flex-start', color: '#38bdf8', fontSize: 12, fontStyle: 'italic' }}>
                          Antigravity está razonando...
                        </div>
                      )}
                    </div>

                    {/* Input Box */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="Pregunta algo sobre el libro..."
                        value={aiPromptInput}
                        onChange={e => setAiPromptInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSendAiPrompt();
                        }}
                        disabled={isAiLoading}
                        style={{
                          flex: 1,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#f8fafc',
                          padding: '8px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => handleSendAiPrompt()}
                        disabled={isAiLoading || !aiPromptInput.trim()}
                        style={{
                          background: '#8b5cf6',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: 6,
                          padding: '0 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isAiLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Floating Selection Context Toolbar */}
                {selectionRangeData && (
                  <div
                    style={{
                      position: 'absolute',
                      left: selectionRangeData.pos
                        ? `${Math.max(15, Math.min(85, (selectionRangeData.pos.left + selectionRangeData.pos.right) * 50))}%`
                        : '50%',
                      top: selectionRangeData.pos
                        ? `${Math.max(8, Math.min(90, selectionRangeData.pos.top * 100 - 4))}%`
                        : '20%',
                      transform: 'translate(-50%, -100%)',
                      zIndex: 100,
                      background: 'rgba(15, 23, 42, 0.94)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '24px',
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                  >
                    {/* 5 Colors */}
                    <div style={{ display: 'flex', gap: 5, paddingRight: 6, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
                      {HIGHLIGHT_COLORS.map(col => (
                        <button
                          key={col.id}
                          onClick={() => {
                            if (activeBook && selectionRangeData.text) {
                              const next = addHighlight(
                                highlights,
                                activeBook.id,
                                selectionRangeData.text,
                                selectionRangeData.cfi,
                                { chapter: currentChapter, color: col.hex, note: selectionNoteText }
                              );
                              saveHighlightsToYjs(next);
                              setSelectedHighlightColor(col.id);
                              sendReaderCommand('renderAnnotations', next.map(h => ({ value: h.cfi, type: 'highlight', color: h.color || col.hex })));
                            }
                          }}
                          title={col.label}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: col.hex,
                            border: selectedHighlightColor === col.id ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        />
                      ))}
                    </div>

                    {/* Note button */}
                    <button
                      onClick={() => setShowSelectionNoteInput(s => !s)}
                      style={{
                        background: showSelectionNoteInput ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                        border: 'none',
                        color: '#cbd5e1',
                        fontSize: '12px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      title="Agregar nota personal"
                    >
                      📝 Nota
                    </button>

                    {/* TTS Pronounce button */}
                    <button
                      onClick={() => {
                        if (selectionRangeData.text) {
                          setShowTtsBar(true);
                          handlePlayTtsSentence(selectionRangeData.text, selectionRangeData.cfi);
                          setTtsState(s => ({ ...s, status: 'playing' }));
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#cbd5e1',
                        fontSize: '12px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      title="Leer selección con voz"
                    >
                      🔊 Escuchar
                    </button>

                    {/* Quote Card */}
                    <button
                      onClick={() => {
                        setSelectedQuoteText(selectionRangeData.text);
                        setShowQuoteCardModal(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '12px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      title="Crear tarjeta visual de cita"
                    >
                      🖼️ Tarjeta
                    </button>

                    {/* Daily Note quote */}
                    <button
                      onClick={() => {
                        setSelectedQuoteText(selectionRangeData.text);
                        setQuoteModalOpen(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#6ee7b7',
                        fontSize: '12px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      title="Citar en Diario de hoy"
                    >
                      📖 Diario
                    </button>

                    {/* Explain with AI */}
                    <button
                      onClick={() => {
                        setShowAiDrawer(true);
                        handleSendAiPrompt(`Explica detalladamente el siguiente fragmento del libro "${activeBook?.title}":\n\n"${selectionRangeData.text}"`);
                      }}
                      style={{
                        background: 'rgba(168, 85, 247, 0.25)',
                        border: '1px solid rgba(168, 85, 247, 0.4)',
                        color: '#d8b4fe',
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                      title="Explicar con Antigravity AI"
                    >
                      🤖 Explicar
                    </button>

                    {/* Dismiss selection button */}
                    <button
                      onClick={() => {
                        setSelectionRangeData(null);
                        setShowSelectionNoteInput(false);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '14px',
                        padding: '0 4px',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Note input below floating toolbar if active */}
                {selectionRangeData && showSelectionNoteInput && (
                  <div
                    style={{
                      position: 'absolute',
                      left: selectionRangeData.pos
                        ? `${Math.max(15, Math.min(85, (selectionRangeData.pos.left + selectionRangeData.pos.right) * 50))}%`
                        : '50%',
                      top: selectionRangeData.pos
                        ? `${Math.max(12, Math.min(94, selectionRangeData.pos.top * 100 + 4))}%`
                        : '28%',
                      transform: 'translateX(-50%)',
                      zIndex: 101,
                      background: 'rgba(15, 23, 42, 0.96)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      gap: 6,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      width: '320px',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Escribe una nota para esta cita..."
                      value={selectionNoteText}
                      onChange={e => setSelectionNoteText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && activeBook) {
                          const next = addHighlight(
                            highlights,
                            activeBook.id,
                            selectionRangeData.text,
                            selectionRangeData.cfi,
                            { chapter: currentChapter, color: selectedHighlightColor, note: selectionNoteText }
                          );
                          saveHighlightsToYjs(next);
                          setShowSelectionNoteInput(false);
                        }
                      }}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#f8fafc',
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => {
                        if (activeBook) {
                          const next = addHighlight(
                            highlights,
                            activeBook.id,
                            selectionRangeData.text,
                            selectionRangeData.cfi,
                            { chapter: currentChapter, color: selectedHighlightColor, note: selectionNoteText }
                          );
                          saveHighlightsToYjs(next);
                          setShowSelectionNoteInput(false);
                        }
                      }}
                      style={{
                        background: '#3b82f6',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: 4,
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Guardar
                    </button>
                  </div>
                )}

                {/* 4. Floating TTS Player Bar */}
                {showTtsBar && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 24,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 110,
                      background: 'rgba(15, 23, 42, 0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '16px',
                      padding: '10px 18px',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      maxWidth: '680px',
                      width: '90%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={handlePrevSentence}
                        style={readerBtnStyle}
                        title="Oración anterior"
                      >
                        ⏮️
                      </button>

                      {ttsState.status === 'playing' ? (
                        <button
                          onClick={handlePauseTts}
                          style={{
                            background: '#3b82f6',
                            border: 'none',
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: 36,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: 16,
                          }}
                          title="Pausar lectura de voz"
                        >
                          ⏸️
                        </button>
                      ) : (
                        <button
                          onClick={handleStartTts}
                          style={{
                            background: '#10b981',
                            border: 'none',
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: 36,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: 16,
                          }}
                          title="Iniciar / Reanudar lectura de voz"
                        >
                          ▶️
                        </button>
                      )}

                      <button
                        onClick={handleNextSentence}
                        style={readerBtnStyle}
                        title="Siguiente oración"
                      >
                        ⏭️
                      </button>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                        <span>🔊 Narrador de voz sincronizado</span>
                        <span style={{ color: '#38bdf8' }}>{ttsState.rate}x</span>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#f8fafc',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: 2,
                        }}
                      >
                        {ttsState.currentSentence || 'Preparado para leer...'}
                      </div>
                    </div>

                    {/* Speed Selectors */}
                    <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: 2 }}>
                      {[0.75, 1.0, 1.25, 1.5, 2.0].map(r => (
                        <button
                          key={r}
                          onClick={() => setTtsState(s => ({ ...s, rate: r }))}
                          style={{
                            background: ttsState.rate === r ? 'rgba(59, 130, 246, 0.45)' : 'transparent',
                            border: 'none',
                            color: ttsState.rate === r ? '#ffffff' : '#94a3b8',
                            fontSize: 10,
                            padding: '2px 5px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: ttsState.rate === r ? 700 : 400,
                          }}
                        >
                          {r}x
                        </button>
                      ))}
                    </div>

                    {/* Close TTS */}
                    <button
                      onClick={handleStopTts}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: 16,
                        cursor: 'pointer',
                        padding: '0 4px',
                      }}
                      title="Cerrar narrador de voz"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Interactive Progress Slider matching Anx Remix */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 24px',
                  background: 'rgba(15, 23, 42, 0.92)',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  gap: 16,
                  zIndex: 20,
                }}
              >
                <button
                  onClick={handlePrevPage}
                  style={{ ...readerBtnStyle, padding: '4px 10px' }}
                >
                  ◀
                </button>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(currentPercentage * 100)}
                    onChange={e => {
                      const pct = Number(e.target.value) / 100;
                      setCurrentPercentage(pct);
                      sendReaderCommand('goToPercent', pct);
                    }}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#60a5fa',
                      minWidth: 45,
                    }}
                  >
                    {formatReadingProgress(currentPercentage)}
                  </span>
                </div>
                <button
                  onClick={handleNextPage}
                  style={{ ...readerBtnStyle, padding: '4px 10px' }}
                >
                  ▶
                </button>
              </div>
            </div>
          ) : (
            /* ==================== ANX SUB-VIEWS ==================== */
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* TAB 1: 📚 BOOKSHELF */}
              {activeTab === 'bookshelf' && (
                <div
                  style={{
                    padding: '24px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                  }}
                >
                  {/* Category Filter Chips */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {allTags.map(tag => {
                      const active = selectedTag === tag;
                      return (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          style={{
                            padding: '5px 14px',
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
                        almacenarán localmente en AFFiNITe con toda la potencia de
                        Anx-Remix y sin depender de WebDAV.
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
                  ) : viewMode === 'grid' ? (
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
                        const progress = formatReadingProgress(book.readingPercentage);

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
                              onClick={() => setSelectedBookForDetail(book)}
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
                                  onClick={() => setSelectedBookForDetail(book)}
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

                              {/* Progress bar */}
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

                              {/* Action buttons */}
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
                                  📖 Leer
                                </button>

                                <button
                                  onClick={() => setSelectedBookForDetail(book)}
                                  style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#cbd5e1',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                  }}
                                  title="Ver detalles completos del libro"
                                >
                                  ℹ️ Detalles
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Bookshelf List View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {filteredAndSortedBooks.map(book => (
                        <div
                          key={book.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'rgba(15, 23, 42, 0.65)',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            gap: 16,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span style={{ fontSize: 24 }}>📖</span>
                            <div>
                              <div
                                onClick={() => setSelectedBookForDetail(book)}
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  color: '#f8fafc',
                                  cursor: 'pointer',
                                }}
                              >
                                {book.title}
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                {book.author} · {book.format.toUpperCase()} ·{' '}
                                {formatBookSize(book.size)}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 100 }}>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#60a5fa',
                                  fontWeight: 700,
                                  textAlign: 'right',
                                  marginBottom: 3,
                                }}
                              >
                                {formatReadingProgress(book.readingPercentage)}
                              </div>
                              <div
                                style={{
                                  width: '100%',
                                  height: 4,
                                  background: 'rgba(255,255,255,0.1)',
                                  borderRadius: 2,
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: formatReadingProgress(book.readingPercentage),
                                    height: '100%',
                                    background: '#3b82f6',
                                  }}
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => handleOpenReader(book)}
                              style={{
                                background: 'rgba(59, 130, 246, 0.2)',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                color: '#93c5fd',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Leer
                            </button>
                            <button
                              onClick={() => setSelectedBookForDetail(book)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                              }}
                              title="Detalles"
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

              {/* TAB 2: 📊 ESTADÍSTICAS (Matching Anx Remix statistics_page.dart) */}
              {activeTab === 'statistics' && (
                <div
                  style={{
                    padding: '24px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                  }}
                >
                  {/* KPI Cards */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 16,
                    }}
                  >
                    {[
                      {
                        icon: '⏱️',
                        label: 'Tiempo de Lectura Total',
                        value: formatReadingTime(stats.totalReadingMinutes),
                        sub: 'Sesiones acumuladas',
                      },
                      {
                        icon: '📖',
                        label: 'Libros en Biblioteca',
                        value: `${stats.completedBooks} / ${stats.totalBooks}`,
                        sub: `${stats.readingBooks} en curso actualmente`,
                      },
                      {
                        icon: '📝',
                        label: 'Notas & Citas Guardadas',
                        value: stats.totalHighlights,
                        sub: 'Subrayados activos',
                      },
                      {
                        icon: '🔥',
                        label: 'Racha de Lectura',
                        value: 'Activa',
                        sub: 'Lectura diaria continuada',
                      },
                    ].map((kpi, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(15, 23, 42, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 14,
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{kpi.icon}</span>
                          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                            {kpi.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc' }}>
                          {kpi.value}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{kpi.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Weekly Reading Chart */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 14,
                      padding: 24,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                        📅 Actividad Semanal de Lectura (Minutos por Día)
                      </span>
                      <span style={{ fontSize: 12, color: '#38bdf8' }}>
                        Meta: 30 min / día
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        height: 140,
                        padding: '10px 20px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: 10,
                      }}
                    >
                      {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, idx) => {
                        const heights = [45, 60, 30, 85, 95, 70, 50];
                        const h = heights[idx];
                        return (
                          <div
                            key={day}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: `${h}%`,
                                background:
                                  h > 60
                                    ? 'linear-gradient(180deg, #38bdf8, #2563eb)'
                                    : 'rgba(59, 130, 246, 0.4)',
                                borderRadius: '6px 6px 2px 2px',
                                transition: 'height 0.3s',
                              }}
                            />
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recently Read Books Table */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 14,
                      padding: 20,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                      📖 Libros leídos recientemente
                    </div>
                    {books.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        No hay libros registrados aún.
                      </div>
                    ) : (
                      books.slice(0, 5).map(b => (
                        <div
                          key={b.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 0',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{b.title}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{b.author}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700 }}>
                              {formatReadingProgress(b.readingPercentage)}
                            </span>
                            <button
                              onClick={() => handleOpenReader(b)}
                              style={readerBtnStyle}
                            >
                              Continuar
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: 📝 NOTAS & CITAS (Matching Anx Remix notes_page.dart) */}
              {activeTab === 'notes' && (
                <div
                  style={{
                    display: 'flex',
                    height: '100%',
                    padding: '20px 24px',
                    gap: 20,
                  }}
                >
                  {/* Master: Book Selector */}
                  <div
                    style={{
                      width: 280,
                      background: 'rgba(15, 23, 42, 0.7)',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                      📚 Libros con Notas ({highlights.length} total)
                    </div>

                    <button
                      onClick={() => setSelectedBookForNotes('all')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        background:
                          selectedBookForNotes === 'all'
                            ? 'rgba(59, 130, 246, 0.25)'
                            : 'transparent',
                        border:
                          selectedBookForNotes === 'all'
                            ? '1px solid #3b82f6'
                            : '1px solid transparent',
                        color: selectedBookForNotes === 'all' ? '#93c5fd' : '#cbd5e1',
                        textAlign: 'left',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      🌟 Todas las citas ({highlights.length})
                    </button>

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {books.map(b => {
                        const count = highlights.filter(h => h.bookId === b.id).length;
                        if (count === 0) return null;
                        const active = selectedBookForNotes === b.id;

                        return (
                          <button
                            key={b.id}
                            onClick={() => setSelectedBookForNotes(b.id)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              background: active
                                ? 'rgba(59, 130, 246, 0.25)'
                                : 'transparent',
                              border: active
                                ? '1px solid #3b82f6'
                                : '1px solid transparent',
                              color: active ? '#93c5fd' : '#cbd5e1',
                              textAlign: 'left',
                              fontSize: 12,
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 190,
                              }}
                            >
                              {b.title}
                            </span>
                            <span
                              style={{
                                background: 'rgba(255,255,255,0.1)',
                                padding: '1px 6px',
                                borderRadius: 10,
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detail: Highlights List */}
                  <div
                    style={{
                      flex: 1,
                      background: 'rgba(15, 23, 42, 0.7)',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      overflowY: 'auto',
                    }}
                  >
                    {/* Search & Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Buscar texto en las citas..."
                        value={notesSearchQuery}
                        onChange={e => setNotesSearchQuery(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          padding: '6px 12px',
                          color: '#f8fafc',
                          fontSize: 12,
                          width: 240,
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* Highlights Cards */}
                    {highlights
                      .filter(h =>
                        selectedBookForNotes === 'all'
                          ? true
                          : h.bookId === selectedBookForNotes
                      )
                      .filter(h =>
                        notesSearchQuery
                          ? h.text.toLowerCase().includes(notesSearchQuery.toLowerCase())
                          : true
                      ).length === 0 ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '60px 20px',
                          color: '#64748b',
                          fontSize: 13,
                        }}
                      >
                        No hay citas ni notas guardadas para esta selección.
                      </div>
                    ) : (
                      highlights
                        .filter(h =>
                          selectedBookForNotes === 'all'
                            ? true
                            : h.bookId === selectedBookForNotes
                        )
                        .filter(h =>
                          notesSearchQuery
                            ? h.text.toLowerCase().includes(notesSearchQuery.toLowerCase())
                            : true
                        )
                        .map(h => {
                          const book = books.find(b => b.id === h.bookId);

                          return (
                            <div
                              key={h.id}
                              style={{
                                background: 'rgba(255,255,255,0.03)',
                                borderLeft: `4px solid ${h.color || '#38bdf8'}`,
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                borderRight: '1px solid rgba(255,255,255,0.06)',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '0 8px 8px 0',
                                padding: 16,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 14,
                                  fontStyle: 'italic',
                                  color: '#f1f5f9',
                                  lineHeight: 1.5,
                                }}
                              >
                                &ldquo;{h.text}&rdquo;
                              </div>

                              {h.note && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: '#93c5fd',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                  }}
                                >
                                  📝 {h.note}
                                </div>
                              )}

                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: 11,
                                  color: '#64748b',
                                  marginTop: 4,
                                }}
                              >
                                <span>
                                  {book?.title || 'Libro'} · {h.chapter || 'Capítulo'} ·{' '}
                                  {dayjs(h.createdAt).format('DD MMM YYYY')}
                                </span>

                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(h.text);
                                      alert('¡Cita copiada al portapapeles!');
                                    }}
                                    style={readerBtnStyle}
                                  >
                                    Copiar
                                  </button>

                                  <button
                                    onClick={() => {
                                      setSelectedQuoteText(h.text);
                                      setQuoteNote(h.note || '');
                                      if (book) setSelectedBookForDetail(book);
                                      setQuoteModalOpen(true);
                                    }}
                                    style={{
                                      ...readerBtnStyle,
                                      background: 'rgba(16, 185, 129, 0.2)',
                                      color: '#6ee7b7',
                                    }}
                                  >
                                    Citar en Diario
                                  </button>

                                  <button
                                    onClick={() => saveHighlightsToYjs(removeHighlight(highlights, h.id))}
                                    style={{
                                      ...readerBtnStyle,
                                      color: '#ef4444',
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ⚙️ AJUSTES & PREFERENCIAS (Matching Anx Remix settings_page.dart) */}
              {activeTab === 'settings' && (
                <div
                  style={{
                    padding: '24px 32px',
                    maxWidth: 720,
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
                    ⚙️ Ajustes del Lector & Biblioteca Anx
                  </div>

                  {/* Settings card 1: Lector */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd' }}>
                      📖 Preferencias de Lectura
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Tema predeterminado</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Color de fondo y contraste al abrir cualquier libro
                        </div>
                      </div>
                      <select
                        value={readerTheme}
                        onChange={e => setReaderTheme(e.target.value as any)}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#cbd5e1',
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      >
                        <option value="dark">🌙 Oscuro (Slate #0f172a)</option>
                        <option value="sepia">📜 Sepia (Cálido #fbf0d9)</option>
                        <option value="light">☀️ Claro (Día #ffffff)</option>
                        <option value="oled">⬛ OLED (Negro absoluto #000000)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Modo de paso de página</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Desplazamiento vertical continuo o paginación horizontal
                        </div>
                      </div>
                      <select
                        value={readerPageTurn}
                        onChange={e => setReaderPageTurn(e.target.value as any)}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#cbd5e1',
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      >
                        <option value="scroll">📜 Scroll continuo</option>
                        <option value="paginated">📖 Paginado tradicional</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Tamaño de fuente base</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{readerFontSize} píxeles</div>
                      </div>
                      <input
                        type="range"
                        min={12}
                        max={26}
                        value={readerFontSize}
                        onChange={e => setReaderFontSize(Number(e.target.value))}
                        style={{ width: 140 }}
                      />
                    </div>
                  </div>

                  {/* Settings card 2: Storage */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>
                      💾 Almacenamiento Local Encapsulado
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                      Tus libros importados se encapsulan en el almacenamiento local de AFFiNITe:
                      <br />
                      <code
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          color: '#60a5fa',
                          display: 'inline-block',
                          marginTop: 6,
                        }}
                      >
                        ~/.var/app/app.affinite.Affinite/config/@affine/electron/library/books/
                      </code>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      100% offline, con sincronización de estado Yjs y citas directas al Diario.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== BOOK DETAIL MODAL (Matching Anx book_detail.dart) ==================== */}
          {selectedBookForDetail && (
            <div
              onClick={() => setSelectedBookForDetail(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(2, 6, 23, 0.85)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: '640px',
                  maxWidth: '92vw',
                  maxHeight: '90vh',
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  color: '#f8fafc',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Modal Header with Ambient Cover Blur */}
                <div
                  style={{
                    height: 180,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: 24,
                    background: selectedBookForDetail.cover
                      ? `url(${selectedBookForDetail.cover}) center/cover`
                      : 'linear-gradient(135deg, #1e3a8a, #0f172a)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(15,23,42,0.4) 0%, #0f172a 100%)',
                      backdropFilter: 'blur(12px)',
                    }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                    }}
                  >
                    <div
                      style={{
                        width: 72,
                        height: 100,
                        background: selectedBookForDetail.cover
                          ? `url(${selectedBookForDetail.cover}) center/cover`
                          : '#1e3a8a',
                        borderRadius: 8,
                        boxShadow: '0 8px 16px rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                        flexShrink: 0,
                      }}
                    >
                      {!selectedBookForDetail.cover && '📖'}
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>
                        {selectedBookForDetail.title}
                      </div>
                      <div style={{ fontSize: 13, color: '#93c5fd', marginTop: 2 }}>
                        {selectedBookForDetail.author}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        Formato {selectedBookForDetail.format.toUpperCase()} ·{' '}
                        {formatBookSize(selectedBookForDetail.size)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedBookForDetail(null)}
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      zIndex: 20,
                      background: 'rgba(0,0,0,0.4)',
                      border: 'none',
                      color: '#cbd5e1',
                      borderRadius: '50%',
                      width: 30,
                      height: 30,
                      cursor: 'pointer',
                      fontSize: 16,
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Modal Body */}
                <div
                  style={{
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    overflowY: 'auto',
                  }}
                >
                  {/* Rating Stars */}
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                      Calificación
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => {
                            const next = updateBookRating(books, selectedBookForDetail.id, star);
                            saveBooksToYjs(next);
                            setSelectedBookForDetail({ ...selectedBookForDetail, rating: star });
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: 20,
                            cursor: 'pointer',
                            color:
                              star <= (selectedBookForDetail.rating || 0)
                                ? '#fbbf24'
                                : '#475569',
                          }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reading Progress */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        marginBottom: 6,
                      }}
                    >
                      <span>Progreso de Lectura</span>
                      <span style={{ color: '#60a5fa' }}>
                        {formatReadingProgress(selectedBookForDetail.readingPercentage)}
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 8,
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: formatReadingProgress(selectedBookForDetail.readingPercentage),
                          height: '100%',
                          background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
                      Etiquetas / Categorías
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      {(selectedBookForDetail.tags || []).map(tag => (
                        <span
                          key={tag}
                          style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#93c5fd',
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {tag}
                          <button
                            onClick={() => {
                              const next = removeBookTag(books, selectedBookForDetail.id, tag);
                              saveBooksToYjs(next);
                              setSelectedBookForDetail({
                                ...selectedBookForDetail,
                                tags: (selectedBookForDetail.tags || []).filter(t => t !== tag),
                              });
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#93c5fd',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}

                      {/* Add Tag Input */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          type="text"
                          placeholder="+ Etiqueta..."
                          value={newTagInput}
                          onChange={e => setNewTagInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newTagInput.trim()) {
                              const next = addBookTag(books, selectedBookForDetail.id, newTagInput.trim());
                              saveBooksToYjs(next);
                              setSelectedBookForDetail({
                                ...selectedBookForDetail,
                                tags: [...(selectedBookForDetail.tags || []), newTagInput.trim()],
                              });
                              setNewTagInput('');
                            }
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12,
                            padding: '3px 8px',
                            color: '#cbd5e1',
                            fontSize: 11,
                            outline: 'none',
                            width: 90,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 14,
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      marginTop: 8,
                    }}
                  >
                    <button
                      onClick={() => handleDeleteBook(selectedBookForDetail)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        padding: '8px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      🗑️ Eliminar Libro
                    </button>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setSelectedBookForNotes(selectedBookForDetail.id);
                          setSelectedBookForDetail(null);
                          setActiveTab('notes');
                        }}
                        style={readerBtnStyle}
                      >
                        📝 Ver Notas
                      </button>

                      <button
                        onClick={() => handleOpenReader(selectedBookForDetail)}
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          border: 'none',
                          color: '#ffffff',
                          padding: '8px 20px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        ▶ Leer Ahora
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== QUOTE EXCERPT TO DAILY NOTE MODAL ==================== */}
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

          {/* 5. Excerpt Share Card Generator Modal */}
          {showQuoteCardModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                zIndex: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
              }}
            >
              <div
                style={{
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  padding: '24px',
                  maxWidth: '680px',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                    🖼️ Tarjeta de Cita (Quote Card)
                  </span>
                  <button
                    onClick={() => setShowQuoteCardModal(false)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}
                  >
                    ×
                  </button>
                </div>

                {/* Theme Picker */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {(Object.keys(QUOTE_CARD_THEMES) as QuoteCardThemeId[]).map(tId => {
                    const t = QUOTE_CARD_THEMES[tId];
                    return (
                      <button
                        key={tId}
                        onClick={() => setSelectedQuoteTheme(tId)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: 8,
                          background: selectedQuoteTheme === tId ? 'rgba(59, 130, 246, 0.35)' : 'rgba(255,255,255,0.06)',
                          border: selectedQuoteTheme === tId ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                          color: '#f8fafc',
                          fontSize: 12,
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
                    background: QUOTE_CARD_THEMES[selectedQuoteTheme].background,
                    color: QUOTE_CARD_THEMES[selectedQuoteTheme].textColor,
                    fontFamily: QUOTE_CARD_THEMES[selectedQuoteTheme].fontFamily,
                    borderRadius: 12,
                    padding: '28px',
                    border: `1px solid ${QUOTE_CARD_THEMES[selectedQuoteTheme].accentColor}33`,
                    position: 'relative',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: 48, lineHeight: 1, color: QUOTE_CARD_THEMES[selectedQuoteTheme].quoteMarkColor }}>
                    “
                  </div>
                  <div
                    style={{
                      fontSize: `${computeQuoteCardFontSize((selectedQuoteText || activeBook?.title || '').length)}px`,
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
                        background: QUOTE_CARD_THEMES[selectedQuoteTheme].accentColor,
                        marginBottom: 10,
                      }}
                    />
                    <div style={{ fontSize: 13, fontWeight: 700, color: QUOTE_CARD_THEMES[selectedQuoteTheme].accentColor }}>
                      {activeBook?.title}
                    </div>
                    <div style={{ fontSize: 11, color: QUOTE_CARD_THEMES[selectedQuoteTheme].subtextColor }}>
                      {activeBook?.author} · {currentChapter}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    onClick={async () => {
                      const blob = await generateQuoteCardImage(selectedQuoteTheme);
                      if (blob && navigator.clipboard) {
                        try {
                          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                          setQuoteCardCopiedFeedback(true);
                          setTimeout(() => setQuoteCardCopiedFeedback(false), 2500);
                        } catch {
                          // fallback
                        }
                      }
                    }}
                    style={{
                      background: 'rgba(59, 130, 246, 0.25)',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      color: '#60a5fa',
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {quoteCardCopiedFeedback ? '✓ ¡Imagen copiada!' : '📋 Copiar Imagen'}
                  </button>

                  <button
                    onClick={async () => {
                      const blob = await generateQuoteCardImage(selectedQuoteTheme);
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
                      borderRadius: 8,
                      fontSize: 13,
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
