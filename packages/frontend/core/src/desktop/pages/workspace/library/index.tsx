import { useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';

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
  AnxWebBookTag,
  AnxWebGroup,
  AnxWebNote,
  AnxWebReadingTime,
  AnxWebTag,
  convertAnxNotesToHighlights,
  createLibraryBook,
  exportAnxNotesToMarkdown,
  formatBooksForAnxBridge,
  generateJournalQuoteMarkdown,
  getNumericBookId,
  LibraryBook,
} from './library-manager';

export const Component = () => {
  const workspaceService = useService(WorkspaceService);
  const journalService = useService(JournalService);
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

  const booksRef = useRef<LibraryBook[]>(books);
  const anxNotesRef = useRef<AnxWebNote[]>(anxNotes);
  const anxReadingTimesRef = useRef<AnxWebReadingTime[]>(anxReadingTimes);
  const anxGroupsRef = useRef<AnxWebGroup[]>(anxGroups);
  const anxTagsRef = useRef<AnxWebTag[]>(anxTags);
  const anxBookTagsRef = useRef<AnxWebBookTag[]>(anxBookTags);
  const anxIframeRef = useRef<HTMLIFrameElement | null>(null);

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
      try {
        const rawBooks = yMap.get('books') as string | undefined;
        if (rawBooks) {
          const parsed = JSON.parse(rawBooks);
          if (Array.isArray(parsed)) setBooks(parsed);
        }
        const rawAnxNotes = yMap.get('anx_notes') as string | undefined;
        if (rawAnxNotes) {
          const parsed = JSON.parse(rawAnxNotes);
          if (Array.isArray(parsed)) setAnxNotes(parsed);
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

  const saveBooksToYjs = useCallback(
    (newBooks: LibraryBook[]) => {
      setBooks(newBooks);
      booksRef.current = newBooks;
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_library_v1');
      yMap.set('books', JSON.stringify(newBooks));
    },
    [workspaceService.workspace.rootYDoc]
  );

  const saveAnxNotesToYjs = useCallback(
    (newNotes: AnxWebNote[]) => {
      setAnxNotes(newNotes);
      anxNotesRef.current = newNotes;
      const rootYDoc = workspaceService.workspace.rootYDoc;
      const yMap = rootYDoc.getMap('affinite_library_v1');
      yMap.set('anx_notes', JSON.stringify(newNotes));
      const converted = convertAnxNotesToHighlights(newNotes, booksRef.current);
      yMap.set('highlights', JSON.stringify(converted));
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
      yMap.set('anx_tags', JSON.stringify(newTags));
      yMap.set('anx_book_tags', JSON.stringify(newBookTags));
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
            const rootYDoc = workspaceService.workspace.rootYDoc;
            const yMap = rootYDoc.getMap('affinite_library_v1');
            yMap.set('books', JSON.stringify(merged));
            booksRef.current = merged;
            return merged;
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

  // Keep Anx-Remix synchronized whenever books update
  useEffect(() => {
    sendFullSyncToAnx(
      books,
      anxNotes,
      anxReadingTimes,
      anxGroups,
      anxTags,
      anxBookTags
    );
  }, [
    anxBookTags,
    anxGroups,
    anxNotes,
    anxReadingTimes,
    anxTags,
    books,
    sendFullSyncToAnx,
  ]);

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

      const doc = journalService.ensureJournalByDate(todayStr);
      try {
        doc.load();
        const noteBlock =
          doc.getBlocksByFlavour('affine:note')[0]?.id ||
          doc.addBlock('affine:note', {}, doc.root?.id);
        if (noteBlock) {
          doc.addBlock(
            'affine:paragraph',
            {
              type: 'quote',
              text: new doc.Text(
                `${text}\n— ${payload.bookTitle || 'Libro'} (${payload.author || 'Desconocido'}${payload.chapter ? `, ${payload.chapter}` : ''})`
              ),
            },
            noteBlock
          );
          if (payload.note?.trim()) {
            doc.addBlock(
              'affine:paragraph',
              {
                text: new doc.Text(`💡 ${payload.note.trim()}`),
              },
              noteBlock
            );
          }
        }
      } catch (err) {
        console.warn('[Library] Could not append block to journal doc', err);
      }

      showBridgeNotification(
        `📅 Cita añadida al Diario de hoy (${todayStr}) y copiada al portapapeles`
      );
      workbench.openDoc(doc.id, { at: 'active' });
    },
    [journalService, showBridgeNotification, workbench]
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
      const doc = workspaceService.workspace.createDoc({
        title: `Notas: ${targetBook.title}`,
      });
      doc.load();
      const noteBlockId = doc.addBlock('affine:note', {}, doc.root?.id);
      doc.addBlock(
        'affine:paragraph',
        {
          text: new doc.Text(md),
        },
        noteBlockId
      );
      showBridgeNotification(
        `📄 Documento "Notas: ${targetBook.title}" creado en AFFiNITe`
      );
      workbench.openDoc(doc.id, { at: 'active' });
    },
    [showBridgeNotification, workbench, workspaceService.workspace]
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
              lastCfi: data.cfi || b.lastCfi,
              updateTime: Date.now(),
            };
          });
          saveBooksToYjs(next);
          break;
        }

        case 'anx-sync-notes': {
          if (Array.isArray(data.notes)) {
            saveAnxNotesToYjs(data.notes);
          }
          break;
        }

        case 'anx-sync-reading-times': {
          if (Array.isArray(data.readingTimes)) {
            saveAnxReadingTimesToYjs(data.readingTimes);
          }
          break;
        }

        case 'anx-sync-groups': {
          if (Array.isArray(data.groups)) {
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
                typeof data.coverPath === 'string' && data.coverPath.trim()
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
    saveBooksToYjs,
    sendFullSyncToAnx,
    showBridgeNotification,
  ]);

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
        </div>
      </ViewBody>
    </>
  );
};
export default Component;
