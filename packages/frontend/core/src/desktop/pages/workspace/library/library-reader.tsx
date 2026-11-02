import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  LibraryBook,
  HIGHLIGHT_COLORS,
} from './library-manager';
import { AnxWebNote } from './diagnostic-logger';

export interface LibraryReaderProps {
  book: LibraryBook;
  initialCfi?: string;
  notes: AnxWebNote[];
  onClose: (progress: {
    lastReadPosition: string;
    readingPercentage: number;
  }) => void;
  onSaveNotes: (updatedNotes: AnxWebNote[]) => void;
  onQuoteToJournal?: (quote: {
    bookTitle: string;
    author: string;
    text: string;
    chapter?: string;
    cfi?: string;
    note?: string;
  }) => void;
}

export interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

export const cleanCfi = (cfi: string): string =>
  cfi.split(',')[0].replace(/^epubcfi\(|\)$/g, '');

export const isBookmarkedAtCfi = (
  notes: AnxWebNote[],
  bookId: number | string,
  currentCfi?: string | null
): boolean => {
  if (!currentCfi || !notes || notes.length === 0) return false;
  const targetCfi = cleanCfi(currentCfi);
  const numericBookId = Number(bookId);

  return notes.some(n => {
    if (n.type !== 'bookmark') return false;
    if (Number(n.bookId) !== numericBookId) return false;
    return n.cfi === currentCfi || cleanCfi(n.cfi) === targetCfi;
  });
};

export function buildFoliateUrl(options: {
  filePath: string;
  initialCfi?: string | null;
  lastReadPosition?: string | null;
  theme?: 'dark' | 'sepia' | 'light';
  fontSize?: number;
}): string {
  const theme = options.theme || 'dark';
  const fontSize = options.fontSize || 100;

  const bgMap = {
    dark: '#090d16',
    sepia: '#f7f1e3',
    light: '#ffffff',
  };
  const fgMap = {
    dark: '#f8fafc',
    sepia: '#2c3437',
    light: '#1e293b',
  };

  const initialStyle = {
    fontSize: Number((fontSize / 100).toFixed(2)),
    fontColor: fgMap[theme],
    backgroundColor: bgMap[theme],
    pageTurnStyle: 'slide',
    maxColumnCount: 1,
    columnThreshold: 800,
    spacing: 1.6,
    paragraphSpacing: 0.8,
    sideMargin: 8,
    topMargin: 40,
    bottomMargin: 40,
    justify: true,
    hyphenate: false,
    writingMode: 'horizontal-tb',
    textAlign: 'justify',
    useBookStyles: false,
  };

  const cleanFilePath = options.filePath.startsWith('assets://')
    ? options.filePath
    : `assets://local-file/${encodeURIComponent(options.filePath)}`;

  const targetCfi = options.initialCfi || options.lastReadPosition || '';

  const params = new URLSearchParams();
  params.set('url', cleanFilePath);
  params.set('initialCfi', targetCfi);
  params.set('cfi', targetCfi);
  params.set('theme', theme);
  params.set('style', JSON.stringify(initialStyle));

  return `assets://./foliate/index.html?${params.toString()}`;
}

export function unpackFoliateMessage(rawData: any): { eventType: string; payload: any } {
  let data = rawData;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return { eventType: '', payload: null };
    }
  }
  if (!data || typeof data !== 'object') {
    return { eventType: '', payload: null };
  }

  if (data.type === 'anx-reader' && data.event) {
    return {
      eventType: data.event,
      payload: data.data || {},
    };
  }

  return {
    eventType: data.type || '',
    payload: data,
  };
}

export const LibraryReader: React.FC<LibraryReaderProps> = ({
  book,
  initialCfi,
  notes,
  onClose,
  onSaveNotes,
  onQuoteToJournal,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentCfi, setCurrentCfi] = useState<string>(
    initialCfi || book.lastReadPosition || ''
  );
  const [readingProgress, setReadingProgress] = useState<number>(
    book.readingPercentage || 0
  );
  const [currentChapter, setCurrentChapter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'none' | 'toc' | 'bookmarks' | 'notes'>('none');
  const [toc, setToc] = useState<TocItem[]>([]);
  const [fontSize, setFontSize] = useState<number>(100);
  const [theme, setTheme] = useState<'dark' | 'sepia' | 'light'>('dark');
  const [selectionData, setSelectionData] = useState<{
    text: string;
    cfi: string;
    x: number;
    y: number;
  } | null>(null);

  const numericBookId = Number(book.id) || 1;
  const bookBookmarks = notes.filter(
    n => n.type === 'bookmark' && Number(n.bookId) === numericBookId
  );
  const bookHighlights = notes.filter(
    n => n.type !== 'bookmark' && Number(n.bookId) === numericBookId
  );

  const isCurrentPageBookmarked = isBookmarkedAtCfi(
    notes,
    numericBookId,
    currentCfi
  );

  const postToFoliate = useCallback((payload: Record<string, any>) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify(payload),
        '*'
      );
    } catch {}
  }, []);

  const evalInFoliate = useCallback((source: string) => {
    postToFoliate({
      type: 'anx-eval',
      script: source,
      source,
    });
  }, [postToFoliate]);

  // Sync annotations into Foliate when ready or updated
  const syncAnnotationsToFoliate = useCallback(() => {
    const formatted = notes
      .filter(n => Number(n.bookId) === numericBookId)
      .map(n => ({
        id: n.id,
        value: n.cfi,
        cfi: n.cfi,
        type: n.type,
        color: n.color?.startsWith('#') ? n.color : `#${n.color}`,
        note: n.content || n.readerNote || '',
      }));

    evalInFoliate(`
      if (typeof window.renderAnnotations === 'function') {
        window.allAnnotations = ${JSON.stringify(formatted)};
        window.renderAnnotations(window.allAnnotations);
      }
    `);
  }, [evalInFoliate, notes, numericBookId]);

  // Handle message from Foliate iframe
  useEffect(() => {
    const handleFoliateMessage = (e: MessageEvent) => {
      const { eventType, payload } = unpackFoliateMessage(e.data);
      if (!eventType) return;

      switch (eventType) {
        case 'onLoadEnd':
        case 'on-load-end':
          syncAnnotationsToFoliate();
          break;

        case 'onRelocated':
        case 'on-relocated': {
          if (payload.cfi) setCurrentCfi(payload.cfi);
          if (typeof payload.fraction === 'number') {
            setReadingProgress(Math.round(payload.fraction * 100));
          } else if (typeof payload.progress === 'number') {
            setReadingProgress(Math.round(payload.progress * 100));
          }
          if (payload.tocItem?.label) {
            setCurrentChapter(payload.tocItem.label);
          }
          break;
        }

        case 'onSetToc':
        case 'on-set-toc': {
          const tocList = Array.isArray(payload)
            ? payload
            : Array.isArray(payload.toc)
              ? payload.toc
              : null;
          if (tocList) {
            setToc(tocList);
          }
          break;
        }

        case 'onSelectionEnd':
        case 'on-selection-end': {
          if (payload.text && payload.cfi) {
            setSelectionData({
              text: payload.text,
              cfi: payload.cfi,
              x: Math.min(window.innerWidth - 220, Math.max(20, (payload.x || 100))),
              y: Math.min(window.innerHeight - 100, Math.max(70, (payload.y || 100))),
            });
          } else {
            setSelectionData(null);
          }
          break;
        }
      }
    };

    window.addEventListener('message', handleFoliateMessage);
    return () => window.removeEventListener('message', handleFoliateMessage);
  }, [syncAnnotationsToFoliate]);

  // Toggle Bookmark for current position
  const handleToggleBookmark = () => {
    if (!currentCfi) return;
    const targetCfi = cleanCfi(currentCfi);

    const existingIndex = notes.findIndex(
      n =>
        n.type === 'bookmark' &&
        Number(n.bookId) === numericBookId &&
        (n.cfi === currentCfi || cleanCfi(n.cfi) === targetCfi)
    );

    if (existingIndex !== -1) {
      // Remove bookmark
      const removedId = notes[existingIndex].id;
      const nextNotes = notes.filter((_, idx) => idx !== existingIndex);
      onSaveNotes(nextNotes);
      evalInFoliate(`window.removeAnnotation?.('${currentCfi}')`);
    } else {
      // Add bookmark
      const newBm: AnxWebNote = {
        id: Date.now(),
        bookId: numericBookId,
        content: currentChapter ? `Marcador: ${currentChapter}` : `Marcador (${readingProgress}%)`,
        cfi: currentCfi,
        chapter: currentChapter || '',
        type: 'bookmark',
        color: '#F59E0B',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
      };
      const nextNotes = [newBm, ...notes];
      onSaveNotes(nextNotes);
      evalInFoliate(`
        window.addAnnotation?.({
          id: ${newBm.id},
          type: 'bookmark',
          value: '${newBm.cfi}',
          color: '#F59E0B',
          note: '${newBm.content}',
        })
      `);
    }
  };

  // Add Highlight
  const handleAddHighlight = (colorHex: string) => {
    if (!selectionData) return;
    const newNote: AnxWebNote = {
      id: Date.now(),
      bookId: numericBookId,
      content: selectionData.text,
      cfi: selectionData.cfi,
      chapter: currentChapter || '',
      type: 'highlight',
      color: colorHex,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    };

    const nextNotes = [newNote, ...notes];
    onSaveNotes(nextNotes);

    evalInFoliate(`
      window.addAnnotation?.({
        id: ${newNote.id},
        type: 'highlight',
        value: '${newNote.cfi}',
        color: '${colorHex}',
        note: '${newNote.content.replace(/'/g, "\\'")}',
      });
      window.clearSelection?.();
    `);

    setSelectionData(null);
  };

  // Navigation
  const handleNavigateToCfi = (cfi: string) => {
    postToFoliate({
      type: 'anx-command',
      command: 'goToCfi',
      args: [cfi],
    });
    setActiveTab('none');
  };

  const handleNavigateToHref = (href: string) => {
    evalInFoliate(`window.reader?.view?.goTo?.('${href}')`);
    setActiveTab('none');
  };

  const handlePrevPage = () => {
    postToFoliate({
      type: 'anx-command',
      command: 'prevPage',
    });
  };

  const handleNextPage = () => {
    postToFoliate({
      type: 'anx-command',
      command: 'nextPage',
    });
  };

  // Theme & Font Size
  const handleFontSizeChange = (delta: number) => {
    const nextSize = Math.max(70, Math.min(180, fontSize + delta));
    setFontSize(nextSize);
    postToFoliate({
      type: 'anx-command',
      command: 'changeStyle',
      args: [{ fontSize: Number((nextSize / 100).toFixed(2)) }],
    });
  };

  const handleThemeChange = (newTheme: 'dark' | 'sepia' | 'light') => {
    setTheme(newTheme);
    postToFoliate({
      type: 'anx-command',
      command: 'changeStyle',
      args: [{ theme: newTheme }],
    });
  };

  const foliateUrl = useMemo(
    () =>
      buildFoliateUrl({
        filePath: book.filePath,
        initialCfi,
        lastReadPosition: book.lastReadPosition,
        theme,
        fontSize,
      }),
    [book.filePath, book.lastReadPosition, fontSize, initialCfi, theme]
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#090d16',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* 1. Header Toolbar */}
      <div
        style={{
          height: 52,
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() =>
              onClose({
                lastReadPosition: currentCfi,
                readingPercentage: readingProgress,
              })
            }
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 8,
              padding: '6px 12px',
              color: '#f1f5f9',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
            title="Guardar progreso y volver a la biblioteca"
          >
            <span>← Biblioteca</span>
          </button>

          <div style={{ maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{book.title}</span>
            {book.author && (
              <span style={{ color: '#94a3b8', fontSize: 13, marginLeft: 8 }}>
                · {book.author}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* TOC Button */}
          <button
            onClick={() => setActiveTab(activeTab === 'toc' ? 'none' : 'toc')}
            style={{
              background: activeTab === 'toc' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${activeTab === 'toc' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
              color: activeTab === 'toc' ? '#38bdf8' : '#e2e8f0',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            📖 Índice
          </button>

          {/* Bookmarks Tab Button */}
          <button
            onClick={() =>
              setActiveTab(activeTab === 'bookmarks' ? 'none' : 'bookmarks')
            }
            style={{
              background: activeTab === 'bookmarks' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${activeTab === 'bookmarks' ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'}`,
              color: activeTab === 'bookmarks' ? '#f59e0b' : '#e2e8f0',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            🔖 Marcadores ({bookBookmarks.length})
          </button>

          {/* Notes Tab Button */}
          <button
            onClick={() =>
              setActiveTab(activeTab === 'notes' ? 'none' : 'notes')
            }
            style={{
              background: activeTab === 'notes' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${activeTab === 'notes' ? '#a855f7' : 'rgba(255, 255, 255, 0.1)'}`,
              color: activeTab === 'notes' ? '#a855f7' : '#e2e8f0',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            📝 Notas ({bookHighlights.length})
          </button>

          {/* Font Size A- / A+ */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.06)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => handleFontSizeChange(-10)}
              style={{ border: 'none', background: 'none', color: '#cbd5e1', padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}
              title="Reducir fuente"
            >
              A-
            </button>
            <button
              onClick={() => handleFontSizeChange(10)}
              style={{ border: 'none', background: 'none', color: '#cbd5e1', padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}
              title="Aumentar fuente"
            >
              A+
            </button>
          </div>

          {/* THE PROMINENT VISUAL BOOKMARK RIBBON BUTTON */}
          <button
            onClick={handleToggleBookmark}
            style={{
              background: isCurrentPageBookmarked
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${isCurrentPageBookmarked ? '#f59e0b' : 'rgba(255, 255, 255, 0.16)'}`,
              color: isCurrentPageBookmarked ? '#0f172a' : '#f8fafc',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: isCurrentPageBookmarked
                ? '0 0 14px rgba(245, 158, 11, 0.45)'
                : 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            title={isCurrentPageBookmarked ? 'Quitar marcador de esta página' : 'Guardar marcador en esta página'}
          >
            <span style={{ fontSize: 14 }}>{isCurrentPageBookmarked ? '★' : '☆'}</span>
            <span>{isCurrentPageBookmarked ? 'Marcador activo' : 'Marcar página'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Reader Core and Collapsible Side Drawer */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'hidden' }}>
        {/* The Foliate iframe */}
        <iframe
          ref={iframeRef}
          src={foliateUrl}
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            border: 'none',
            background: theme === 'dark' ? '#090d16' : theme === 'sepia' ? '#f7f1e3' : '#ffffff',
          }}
          title={book.title}
        />

        {/* Floating Highlight / Annotation Popover */}
        {selectionData && (
          <div
            style={{
              position: 'absolute',
              top: selectionData.y,
              left: selectionData.x,
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 12,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
              zIndex: 10000,
            }}
          >
            {/* Color buttons */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {HIGHLIGHT_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleAddHighlight(c.hex)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: c.hex,
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease',
                  }}
                  title={`Subrayar ${c.label}`}
                />
              ))}
            </div>

            <div style={{ width: 1, height: 18, background: 'rgba(255, 255, 255, 0.16)', margin: '0 4px' }} />

            {/* Quote to Journal button */}
            {onQuoteToJournal && (
              <button
                onClick={() => {
                  onQuoteToJournal({
                    bookTitle: book.title,
                    author: book.author,
                    text: selectionData.text,
                    chapter: currentChapter,
                    cfi: selectionData.cfi,
                  });
                  handleAddHighlight('#66CCFF');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 6px',
                }}
                title="Citar fragmento en el Diario de Notas de AFFiNITe"
              >
                Citar en Diario
              </button>
            )}

            {/* Cancel / Dismiss */}
            <button
              onClick={() => setSelectionData(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: 12,
                cursor: 'pointer',
                marginLeft: 4,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Collapsible Sidebar Drawer */}
        {activeTab !== 'none' && (
          <div
            style={{
              width: 360,
              background: '#0d131f',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-6px 0 24px rgba(0, 0, 0, 0.4)',
              zIndex: 9000,
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                height: 48,
                padding: '0 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0' }}>
                {activeTab === 'toc' && 'Índice de Capítulos'}
                {activeTab === 'bookmarks' && `Marcadores Guardados (${bookBookmarks.length})`}
                {activeTab === 'notes' && `Notas y Citas (${bookHighlights.length})`}
              </span>
              <button
                onClick={() => setActiveTab('none')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {/* Tab 1: TOC */}
              {activeTab === 'toc' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {toc.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: 13, padding: 16, textAlign: 'center' }}>
                      Cargando índice...
                    </div>
                  ) : (
                    toc.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleNavigateToHref(item.href)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 13,
                          color: '#e2e8f0',
                          cursor: 'pointer',
                          background: 'rgba(255, 255, 255, 0.03)',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {item.label}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 2: Bookmarks */}
              {activeTab === 'bookmarks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {bookBookmarks.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: 13, padding: 24, textAlign: 'center' }}>
                      No tienes marcadores guardados en este libro. Pulsa el botón "Marcar página" en la barra superior.
                    </div>
                  ) : (
                    bookBookmarks.map(bm => (
                      <div
                        key={bm.id}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: 'rgba(245, 158, 11, 0.08)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleNavigateToCfi(bm.cfi)}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fef3c7' }}>
                            ★ {bm.content || 'Marcador de página'}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                            {new Date(bm.createTime || Date.now()).toLocaleDateString()}
                          </div>
                        </div>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onSaveNotes(notes.filter(n => n.id !== bm.id));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: 14,
                            padding: '4px 6px',
                          }}
                          title="Eliminar marcador"
                        >
                          🗑
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Notes & Highlights */}
              {activeTab === 'notes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bookHighlights.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: 13, padding: 24, textAlign: 'center' }}>
                      Selecciona cualquier texto en el libro para resaltarlo o añadir una nota de lectura.
                    </div>
                  ) : (
                    bookHighlights.map(hl => (
                      <div
                        key={hl.id}
                        style={{
                          padding: '12px',
                          borderRadius: 10,
                          background: 'rgba(255, 255, 255, 0.04)',
                          borderLeft: `4px solid ${hl.color || '#38bdf8'}`,
                          cursor: 'pointer',
                        }}
                        onClick={() => handleNavigateToCfi(hl.cfi)}
                      >
                        <div style={{ fontSize: 13, color: '#f1f5f9', fontStyle: 'italic', lineHeight: 1.5 }}>
                          "{hl.content}"
                        </div>
                        {hl.readerNote && (
                          <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 6, fontWeight: 500 }}>
                            Nota: {hl.readerNote}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: '#64748b' }}>
                          <span>{hl.chapter || 'Capítulo'}</span>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onSaveNotes(notes.filter(n => n.id !== hl.id));
                              evalInFoliate(`window.removeAnnotation?.('${hl.cfi}')`);
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
                            title="Eliminar subrayado"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Progress Bar */}
      <div
        style={{
          height: 44,
          background: 'rgba(15, 23, 42, 0.96)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          userSelect: 'none',
          fontSize: 12,
          color: '#94a3b8',
        }}
      >
        <button
          onClick={handlePrevPage}
          style={{
            background: 'none',
            border: 'none',
            color: '#cbd5e1',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            padding: '4px 8px',
          }}
        >
          ‹ Página anterior
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 420, margin: '0 20px' }}>
          <input
            type="range"
            min={0}
            max={100}
            value={readingProgress}
            onChange={e => {
              const val = Number(e.target.value);
              setReadingProgress(val);
              evalInFoliate(`reader?.view?.goToFraction?.(${val / 100})`);
            }}
            style={{ flex: 1, accentColor: '#38bdf8', cursor: 'pointer' }}
          />
          <span style={{ fontWeight: 600, color: '#38bdf8', minWidth: 36 }}>
            {readingProgress}%
          </span>
        </div>

        <button
          onClick={handleNextPage}
          style={{
            background: 'none',
            border: 'none',
            color: '#cbd5e1',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            padding: '4px 8px',
          }}
        >
          Página siguiente ›
        </button>
      </div>
    </div>
  );
};
