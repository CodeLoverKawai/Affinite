import { Text } from '@blocksuite/affine/store';
import { useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DocsService } from '../../../../modules/doc';
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
import type {
  AnxWebBookTag,
  AnxWebGroup,
  AnxWebNote,
  AnxWebReadingTime,
  AnxWebTag,
  LibraryBook,
} from './library-manager';
import {
  convertAnxNotesToHighlights,
  createLibraryBook,
  exportAnxNotesToMarkdown,
  formatBooksForAnxBridge,
  generateJournalQuoteMarkdown,
  getNumericBookId,
} from './library-manager';
import { DiagnosticModal } from './diagnostic-modal';
import { globalDiagnosticLogger, normalizeNoteColor } from './diagnostic-logger';

export const Component = () => {
  const workspaceService = useService(WorkspaceService);
  const journalService = useService(JournalService);
  const docsService = useService(DocsService);
  const workbench = useService(WorkbenchService).workbench;

  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [anxNotes, setAnxNotes] = useState<AnxWebNote[]>([]);
  const [anxReadingTimes, setAnxReadingTimes] = useState<AnxWebReadingTime[]>(
    []
  );
  const [anxGroups, setAnxGroups] = useState<AnxWebGroup[]>([]);
  const [anxTags, setAnxTags] = useState<AnxWebTag[]>([]);
  const [anxBookTags, setAnxBookTags] = useState<AnxWebBookTag[]>([]);
  const [bridgeBanner, setBridgeBanner] = useState<string | null>(null);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [diagBadge, setDiagBadge] = useState<{ errors: number; warns: number }>({
    errors: 0,
    warns: 0,
  });

  useEffect(() => {
    const unsub = globalDiagnosticLogger.subscribe(() => {
      const all = globalDiagnosticLogger.getEntries();
      const errors = all.filter(e => e.level === 'error' || e.level === 'fatal').length;
      const warns = all.filter(e => e.level === 'warn').length;
      setDiagBadge({ errors, warns });
    });
    return unsub;
  }, []);

  const booksRef = useRef<LibraryBook[]>(books);
  const anxNotesRef = useRef<AnxWebNote[]>(anxNotes);
  const anxReadingTimesRef = useRef<AnxWebReadingTime[]>(anxReadingTimes);
  const anxGroupsRef = useRef<AnxWebGroup[]>(anxGroups);
  const anxTagsRef = useRef<AnxWebTag[]>(anxTags);
  const anxBookTagsRef = useRef<AnxWebBookTag[]>(anxBookTags);
  const anxIframeRef = useRef<HTMLIFrameElement | null>(null);
  const isSyncingRef = useRef(false);
  const isOriginAnxRef = useRef(false);
  const lastCatalogFingerprintRef = useRef<string>('');

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  useEffect(() => {
    anxNotesRef.current = anxNotes;
  }, [anxNotes]);

  useEffect(() => {
    anxReadingTimesRef.current = anxReadingTimes;
  }, [anxReadingTimes]);

  useEffect(() => {
    anxGroupsRef.current = anxGroups;
  }, [anxGroups]);

  useEffect(() => {
    anxTagsRef.current = anxTags;
  }, [anxTags]);

  useEffect(() => {
    anxBookTagsRef.current = anxBookTags;
  }, [anxBookTags]);

  const showBridgeNotification = useCallback((msg: string) => {
    setBridgeBanner(msg);
    setTimeout(() => {
      setBridgeBanner(prev => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // 1. Sync Library State with Root Workspace Yjs Map ('affinite_library_v1')
  useEffect(() => {
    const rootYDoc = workspaceService.workspace.rootYDoc;
    const yMap = rootYDoc.getMap('affinite_library_v1');

    const syncFromYjs = () => {
      if (isOriginAnxRef.current) {
        isOriginAnxRef.current = false;
        return;
      }
      try {
        const rawBooks = yMap.get('books') as string | undefined;
        if (rawBooks) {
          const parsed = JSON.parse(rawBooks);
          if (Array.isArray(parsed)) setBooks(parsed);
        }
        const rawAnxNotes = yMap.get('anx_notes') as string | undefined;
        if (rawAnxNotes) {
          const parsed = JSON.parse(rawAnxNotes);
          if (Array.isArray(parsed)) {
            const normalized = parsed.map((n: AnxWebNote) => ({
              ...n,
              color: normalizeNoteColor(n.color),
            }));
            setAnxNotes(normalized);
          }
        } else {
          const rawHighlights = yMap.get('highlights') as string | undefined;
          if (rawHighlights) {
            try {
              const legacy = JSON.parse(rawHighlights);
              if (Array.isArray(legacy) && legacy.length > 0) {
                const migrated: AnxWebNote[] = legacy.map((h: any, idx: number) => ({
                  id: typeof h.id === 'number' ? h.id : idx + 1,
                  bookId: typeof h.bookId === 'number' ? h.bookId : 1,
                  content: h.text || '',
                  cfi: h.cfi || '',
                  chapter: h.chapter || '',
                  type: 'highlight',
                  color: h.color || 'yellow',
                  readerNote: h.note || '',
                  createTime: h.createdAt
                    ? new Date(h.createdAt).toISOString()
                    : new Date().toISOString(),
                  updateTime: h.createdAt
                    ? new Date(h.createdAt).toISOString()
                    : new Date().toISOString(),
                }));
                setAnxNotes(migrated);
                yMap.set('anx_notes', JSON.stringify(migrated));
              }
            } catch {
              // ignore
            }
          }
        }
        const rawReadingTimes = yMap.get('anx_reading_times') as
          | string
          | undefined;
        if (rawReadingTimes) {
          const parsed = JSON.parse(rawReadingTimes);
          if (Array.isArray(parsed)) setAnxReadingTimes(parsed);
        }
        const rawGroups = yMap.get('anx_groups') as string | undefined;
        if (rawGroups) {
          const parsed = JSON.parse(rawGroups);
          if (Array.isArray(parsed)) setAnxGroups(parsed);
        }
        const rawTags = yMap.get('anx_tags') as string | undefined;
        if (rawTags) {
          const parsed = JSON.parse(rawTags);
          if (Array.isArray(parsed)) setAnxTags(parsed);
        }
        const rawBookTags = yMap.get('anx_book_tags') as string | undefined;
        if (rawBookTags) {
          const parsed = JSON.parse(rawBookTags);
          if (Array.isArray(parsed)) setAnxBookTags(parsed);
        }
      } catch (err) {
        console.error('[Library] Failed to parse library data from Yjs', err);
      }
    };

    syncFromYjs();
    yMap.observe(syncFromYjs);

    return () => {
      yMap.unobserve(syncFromYjs);
    };
  }, [workspaceService.workspace.rootYDoc]);

  const sanitizeBooksForYjs = (bookList: LibraryBook[]): LibraryBook[] => {
    return bookList.map(b => {
      if (b.cover && (b.cover.startsWith('data:') || b.cover.length > 2048)) {
        const { cover: _cover, ...clean } = b;
        return clean;
      }
      return b;
    });
  };

  const saveBooksToYjs = useCallback(
    (newBooks: LibraryBook[]) => {
      const sanitized = sanitizeBooksForYjs(newBooks);
      setBooks(sanitized);
      booksRef.current = sanitized;
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_library_v1');
      yMap.set('books', JSON.stringify(sanitized));
    },
    [workspaceService.workspace.rootYDoc]
  );

  const saveAnxNotesToYjs = useCallback(
    (newNotes: AnxWebNote[]) => {
      const normalized = newNotes.map(n => ({
        ...n,
        color: normalizeNoteColor(n.color),
      }));
      setAnxNotes(normalized);
      anxNotesRef.current = normalized;
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_library_v1');
      const converted = convertAnxNotesToHighlights(normalized, booksRef.current);
      rootYDoc.transact(() => {
        yMap.set('anx_notes', JSON.stringify(normalized));
        yMap.set('highlights', JSON.stringify(converted));
      });
    },
    [workspaceService.workspace.rootYDoc]
  );

  const saveAnxReadingTimesToYjs = useCallback(
    (newTimes: AnxWebReadingTime[]) => {
      setAnxReadingTimes(newTimes);
      anxReadingTimesRef.current = newTimes;
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_library_v1');
      yMap.set('anx_reading_times', JSON.stringify(newTimes));
    },
    [workspaceService.workspace.rootYDoc]
  );

  const saveAnxGroupsToYjs = useCallback(
    (newGroups: AnxWebGroup[]) => {
      setAnxGroups(newGroups);
      anxGroupsRef.current = newGroups;
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_library_v1');
      yMap.set('anx_groups', JSON.stringify(newGroups));
    },
    [workspaceService.workspace.rootYDoc]
  );

  const saveAnxTagsToYjs = useCallback(
    (newTags: AnxWebTag[], newBookTags: AnxWebBookTag[]) => {
      setAnxTags(newTags);
      anxTagsRef.current = newTags;
      setAnxBookTags(newBookTags);
      anxBookTagsRef.current = newBookTags;
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_library_v1');
      rootYDoc.transact(() => {
        yMap.set('anx_tags', JSON.stringify(newTags));
        yMap.set('anx_book_tags', JSON.stringify(newBookTags));
      });
    },
    [workspaceService.workspace.rootYDoc]
  );

  // 2. Discover local EPUB/PDF files from Electron library folder on mount
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
              const safeCover =
                dBook.cover &&
                !dBook.cover.startsWith('data:') &&
                dBook.cover.length < 2048
                  ? dBook.cover
                  : undefined;
              if (existingIdx === -1) {
                const newB = createLibraryBook(dBook);
                if (safeCover) {
                  newB.cover = safeCover;
                } else {
                  delete newB.cover;
                }
                merged.push(newB);
              } else {
                merged[existingIdx] = {
                  ...merged[existingIdx],
                  size: dBook.size || merged[existingIdx].size,
                  cover: safeCover || merged[existingIdx].cover,
                };
              }
            }
            const sanitized = sanitizeBooksForYjs(merged);
            const rootYDoc = workspaceService.workspace.rootYDoc;
            const yMap = rootYDoc.getMap('affinite_library_v1');
            yMap.set('books', JSON.stringify(sanitized));
            booksRef.current = sanitized;
            return sanitized;
          });
        }
      }
    } catch (err) {
      console.warn('[Library] Could not list books from Electron disk', err);
    }
  }, [workspaceService.workspace.rootYDoc]);

  useEffect(() => {
    syncFromDisk();
  }, [syncFromDisk]);

  // 3. Send Full State Payload to Anx-Remix WebBridge
  const sendFullSyncToAnx = useCallback(
    (
      bookList: LibraryBook[] = booksRef.current,
      noteList: AnxWebNote[] = anxNotesRef.current,
      readingTimeList: AnxWebReadingTime[] = anxReadingTimesRef.current,
      groupList: AnxWebGroup[] = anxGroupsRef.current,
      tagList: AnxWebTag[] = anxTagsRef.current,
      bookTagList: AnxWebBookTag[] = anxBookTagsRef.current
    ) => {
      if (anxIframeRef.current?.contentWindow) {
        try {
          lastCatalogFingerprintRef.current = bookList
            .map(b => `${b.id}:${b.filePath}:${b.title}`)
            .join('|');
          const payload = JSON.stringify({
            type: 'anx-full-sync',
            books: formatBooksForAnxBridge(bookList),
            notes: noteList,
            readingTimes: readingTimeList,
            groups: groupList,
            tags: tagList,
            bookTags: bookTagList,
          });
          anxIframeRef.current.contentWindow.postMessage(payload, '*');
        } catch (err) {
          console.warn('[Library] Failed to postMessage to Anx iframe', err);
        }
      }
    },
    []
  );

  // Keep Anx-Remix synchronized whenever book catalog updates (excluding active reading progress)
  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    if (isOriginAnxRef.current) {
      isOriginAnxRef.current = false;
      return;
    }

    const currentFingerprint = books
      .map(b => `${b.id}:${b.filePath}:${b.title}`)
      .join('|');
    if (currentFingerprint === lastCatalogFingerprintRef.current) {
      // Books catalog has not changed (e.g. only reading percentage/position updated during active reading)
      return;
    }
    lastCatalogFingerprintRef.current = currentFingerprint;

    sendFullSyncToAnx(
      books,
      anxNotesRef.current,
      anxReadingTimesRef.current,
      anxGroupsRef.current,
      anxTagsRef.current,
      anxBookTagsRef.current
    );
  }, [books, sendFullSyncToAnx]);

  // 4. Native AFFiNITe Actions (Daily Journal Quote & BlockSuite Doc Export)
  const handleQuoteToDailyJournal = useCallback(
    (payload: {
      bookId?: number;
      bookTitle?: string;
      author?: string;
      filePath?: string;
      text: string;
      cfi?: string;
      chapter?: string;
      note?: string;
    }) => {
      const text = (payload.text || '').trim();
      if (!text) return;

      const todayStr = dayjs().format(JOURNAL_DATE_FORMAT);
      const mdQuote = generateJournalQuoteMarkdown({
        bookTitle: payload.bookTitle || 'Libro',
        author: payload.author || 'Desconocido',
        chapter: payload.chapter || '',
        cfi: payload.cfi || '',
        text,
        note: payload.note || '',
      });

      navigator.clipboard?.writeText(mdQuote).catch(() => {});

      const docRecord = journalService.ensureJournalByDate(todayStr);
      try {
        const { doc, release } = docsService.open(docRecord.id);
        try {
          doc.blockSuiteDoc.load();
          const rootBlockId = doc.blockSuiteDoc.root?.id;
          const noteBlock =
            doc.blockSuiteDoc.getBlocksByFlavour('affine:note')[0]?.id ||
            doc.blockSuiteDoc.addBlock('affine:note', {}, rootBlockId);
          if (noteBlock) {
            doc.blockSuiteDoc.addBlock(
              'affine:paragraph',
              {
                type: 'quote',
                text: new Text(
                  `${text}\n— ${payload.bookTitle || 'Libro'} (${payload.author || 'Desconocido'}${payload.chapter ? `, ${payload.chapter}` : ''})`
                ),
              },
              noteBlock
            );
            if (payload.note?.trim()) {
              doc.blockSuiteDoc.addBlock(
                'affine:paragraph',
                {
                  text: new Text(`💡 ${payload.note.trim()}`),
                },
                noteBlock
              );
            }
          }
        } finally {
          release();
        }
      } catch (err) {
        console.warn('[Library] Could not append block to journal doc', err);
      }

      showBridgeNotification(
        `📅 Cita añadida al Diario de hoy (${todayStr}) y copiada al portapapeles`
      );
      workbench.openDoc(docRecord.id, { at: 'active' });
    },
    [docsService, journalService, showBridgeNotification, workbench]
  );

  const handleExportBookNotesToDoc = useCallback(
    (payload: {
      bookId?: number;
      bookTitle?: string;
      author?: string;
      filePath?: string;
      text?: string;
      cfi?: string;
      chapter?: string;
      notes?: AnxWebNote[];
    }) => {
      const targetBook =
        booksRef.current.find(
          b =>
            (payload.filePath && b.filePath === payload.filePath) ||
            (payload.bookId &&
              getNumericBookId(b.id || b.filePath) === payload.bookId)
        ) ||
        createLibraryBook({
          title: payload.bookTitle || 'Libro',
          author: payload.author || 'Desconocido',
          filePath: payload.filePath || '',
        });

      const incomingNotes = Array.isArray(payload.notes)
        ? payload.notes
        : anxNotesRef.current.filter(
            n =>
              n.bookId ===
              (payload.bookId ||
                getNumericBookId(targetBook.id || targetBook.filePath))
          );

      const md = exportAnxNotesToMarkdown(targetBook, incomingNotes);
      const docRecord = docsService.createDoc({
        title: `Notas: ${targetBook.title}`,
      });
      const { doc, release } = docsService.open(docRecord.id);
      try {
        doc.blockSuiteDoc.load();
        const rootBlockId = doc.blockSuiteDoc.root?.id;
        const noteBlockId =
          doc.blockSuiteDoc.getBlocksByFlavour('affine:note')[0]?.id ||
          doc.blockSuiteDoc.addBlock('affine:note', {}, rootBlockId);
        doc.blockSuiteDoc.addBlock(
          'affine:paragraph',
          {
            text: new Text(md),
          },
          noteBlockId
        );
      } finally {
        release();
      }
      showBridgeNotification(
        `📄 Documento "Notas: ${targetBook.title}" creado en AFFiNITe`
      );
      workbench.openDoc(docRecord.id, { at: 'active' });
    },
    [docsService, showBridgeNotification, workbench]
  );

  // 5. Bi-Directional Message Listener from Anx-Remix WebBridge
  useEffect(() => {
    const handleHostMessage = async (event: MessageEvent) => {
      if (!event.data) return;
      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== 'object') return;
      const type = data.type;

      switch (type) {
        case 'anx-request-books': {
          sendFullSyncToAnx();
          break;
        }

        case 'anx-request-import': {
          try {
            const electronApi = (window as any).__apis?.handler?.library;
            if (electronApi?.importBook) {
              const imported = await electronApi.importBook();
              if (imported && imported.filePath) {
                const newBook = createLibraryBook(imported);
                const updated = [
                  newBook,
                  ...booksRef.current.filter(
                    b => b.filePath !== newBook.filePath
                  ),
                ];
                saveBooksToYjs(updated);
                sendFullSyncToAnx(updated);
                showBridgeNotification(
                  `📚 Libro importado: "${newBook.title}"`
                );
              }
            }
          } catch (err) {
            console.error(
              '[Library] Failed to import book from Anx request',
              err
            );
          }
          break;
        }

        case 'anx-delete-book': {
          const filePath = data.filePath;
          const target = booksRef.current.find(
            b =>
              b.filePath === filePath ||
              getNumericBookId(b.id || b.filePath) === data.id
          );
          if (target) {
            try {
              const electronApi = (window as any).__apis?.handler?.library;
              if (electronApi?.deleteBook && target.filePath) {
                await electronApi.deleteBook(target.filePath);
              }
            } catch {
              // ignore disk delete error
            }
            const next = booksRef.current.filter(b => b.id !== target.id);
            saveBooksToYjs(next);
            sendFullSyncToAnx(next);
          }
          break;
        }

        case 'anx-update-progress': {
          const pct =
            typeof data.percentage === 'number'
              ? Math.round(data.percentage * 100)
              : 0;
          const next = booksRef.current.map(b => {
            const isMatch =
              (data.filePath && b.filePath === data.filePath) ||
              getNumericBookId(b.id || b.filePath) === data.id;
            if (!isMatch) return b;
            return {
              ...b,
              readingPercentage: pct,
              lastReadPosition: data.cfi || b.lastReadPosition,
              updateTime: Date.now(),
            };
          });
          isOriginAnxRef.current = true;
          isSyncingRef.current = true;
          saveBooksToYjs(next);
          break;
        }

        case 'anx-diagnostic-log': {
          const level = data.level || 'info';
          const source = data.source || 'Foliate';
          const msg = data.message || '';
          const details = data.details;
          globalDiagnosticLogger.log(level, source, msg, details);
          break;
        }

        case 'anx-sync-notes': {
          if (Array.isArray(data.notes)) {
            isOriginAnxRef.current = true;
            isSyncingRef.current = true;
            globalDiagnosticLogger.log(
              'info',
              'Sync',
              `Sincronizando ${data.notes.length} notas desde Anx Reader`
            );
            saveAnxNotesToYjs(data.notes);
          }
          break;
        }

        case 'anx-sync-reading-times': {
          if (Array.isArray(data.readingTimes)) {
            isOriginAnxRef.current = true;
            isSyncingRef.current = true;
            saveAnxReadingTimesToYjs(data.readingTimes);
          }
          break;
        }

        case 'anx-sync-groups': {
          if (Array.isArray(data.groups)) {
            isOriginAnxRef.current = true;
            isSyncingRef.current = true;
            saveAnxGroupsToYjs(data.groups);
          }
          break;
        }

        case 'anx-update-book-meta': {
          const next = booksRef.current.map(b => {
            const isMatch =
              (data.filePath && b.filePath === data.filePath) ||
              getNumericBookId(b.id || b.filePath) === data.id;
            if (!isMatch) return b;
            const rawPct =
              typeof data.readingPercentage === 'number'
                ? data.readingPercentage
                : b.readingPercentage;
            return {
              ...b,
              title:
                typeof data.title === 'string' && data.title.trim()
                  ? data.title.trim()
                  : b.title,
              author:
                typeof data.author === 'string' && data.author.trim()
                  ? data.author.trim()
                  : b.author,
              cover:
                typeof data.coverPath === 'string' &&
                data.coverPath.trim() &&
                !data.coverPath.startsWith('data:') &&
                data.coverPath.length < 2048
                  ? data.coverPath.trim()
                  : b.cover,
              description:
                typeof data.description === 'string'
                  ? data.description
                  : b.description,
              rating:
                typeof data.rating === 'number' ? data.rating : b.rating,
              groupId:
                typeof data.groupId === 'number' ? data.groupId : b.groupId,
              lastReadPosition:
                typeof data.lastReadPosition === 'string' &&
                data.lastReadPosition
                  ? data.lastReadPosition
                  : b.lastReadPosition,
              readingPercentage:
                rawPct <= 1 && rawPct > 0 ? Math.round(rawPct * 100) : rawPct,
              updateTime: Date.now(),
            };
          });
          isOriginAnxRef.current = true;
          isSyncingRef.current = true;
          saveBooksToYjs(next);
          break;
        }

        case 'anx-sync-tags': {
          const nextTags = Array.isArray(data.tags)
            ? data.tags
            : anxTagsRef.current;
          const nextBookTags = Array.isArray(data.bookTags)
            ? data.bookTags
            : anxBookTagsRef.current;
          isOriginAnxRef.current = true;
          isSyncingRef.current = true;
          saveAnxTagsToYjs(nextTags, nextBookTags);
          break;
        }

        case 'anx-quote-to-journal': {
          handleQuoteToDailyJournal(data);
          break;
        }

        case 'anx-export-to-doc': {
          handleExportBookNotesToDoc(data);
          break;
        }

        case 'anx-ai-request': {
          const requestId = data.requestId;
          const rawMessages = Array.isArray(data.messages) ? data.messages : [];
          try {
            const aiApi = (window as any).__apis?.handler?.ai;
            let content = '';
            if (aiApi?.chat) {
              const lastMsg =
                rawMessages.length > 0
                  ? rawMessages[rawMessages.length - 1]?.content || ''
                  : '';
              const res = await aiApi.chat({
                provider: 'antigravity',
                modelId: 'gemini-4-argon-high',
                prompt: String(lastMsg),
                messages: rawMessages.map((m: any) => ({
                  role: m.role || 'user',
                  content: String(m.content || ''),
                })),
              });
              content =
                res?.content || 'No se recibió respuesta del modelo local.';
            } else {
              content =
                'El puente de IA local (Antigravity agy CLI) no está disponible en este entorno.';
            }
            anxIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({
                type: 'anx-ai-response',
                requestId,
                content,
              }),
              '*'
            );
          } catch (err: any) {
            anxIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({
                type: 'anx-ai-response',
                requestId,
                error: err?.message || String(err),
              }),
              '*'
            );
          }
          break;
        }
      }
    };

    window.addEventListener('message', handleHostMessage);
    return () => {
      window.removeEventListener('message', handleHostMessage);
    };
  }, [
    handleExportBookNotesToDoc,
    handleQuoteToDailyJournal,
    saveAnxGroupsToYjs,
    saveAnxNotesToYjs,
    saveAnxReadingTimesToYjs,
    saveAnxTagsToYjs,
    saveBooksToYjs,
    sendFullSyncToAnx,
    showBridgeNotification,
  ]);

  return (
    <>
      <ViewTitle title="Biblioteca" />
      <ViewIcon icon="allDocs" />
      <ViewHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
          <button
            onClick={() => setIsDiagnosticOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: diagBadge.errors > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.75)',
              border: `1px solid ${diagBadge.errors > 0 ? '#ef4444' : 'rgba(56, 189, 248, 0.35)'}`,
              color: diagBadge.errors > 0 ? '#fca5a5' : '#e2e8f0',
              padding: '4px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease',
            }}
            title="Abrir panel de diagnóstico y registro de errores"
          >
            <span>🩺 Diagnóstico</span>
            {diagBadge.errors > 0 ? (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {diagBadge.errors}
              </span>
            ) : diagBadge.warns > 0 ? (
              <span
                style={{
                  background: '#f59e0b',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {diagBadge.warns}
              </span>
            ) : null}
          </button>
        </div>
      </ViewHeader>

      <ViewBody>
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
          {bridgeBanner && (
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 18,
                zIndex: 50,
                background: 'rgba(15, 23, 42, 0.94)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.45)',
                color: '#f8fafc',
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 500,
                pointerEvents: 'none',
              }}
            >
              {bridgeBanner}
            </div>
          )}
          <iframe
            ref={anxIframeRef}
            onLoad={() => sendFullSyncToAnx()}
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

          <DiagnosticModal
            isOpen={isDiagnosticOpen}
            onClose={() => setIsDiagnosticOpen(false)}
            books={books}
            notes={anxNotes}
            onRepairNotes={repaired => {
              saveAnxNotesToYjs(repaired);
              sendFullSyncToAnx(booksRef.current, repaired);
            }}
          />
        </div>
      </ViewBody>
    </>
  );
};
export default Component;
