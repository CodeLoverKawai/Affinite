import { Modal, useConfirmModal } from '@affine/component';
import {
  ArrowLeftSmallIcon,
  CheckBoxCheckLinearIcon,
  CloseIcon,
  CommentIcon,
  DateTimeIcon,
  DeleteIcon,
  EdgelessIcon,
  NewIcon,
  PlusIcon,
  SearchIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { type Doc, type DocRecord, DocsService } from '../../../../modules/doc';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '../../../../modules/workbench';
import * as styles from './boards.css';

export interface BoardColumn {
  id: string;
  title: string;
}

export interface BoardChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface BoardComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface BoardCard {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  labels?: string[];
  checklist?: BoardChecklistItem[];
  comments?: BoardComment[];
  dueDate?: string;
}

export interface BoardDocItem {
  doc: DocRecord;
  index: number;
  onClick: () => void;
  onDelete: (doc: DocRecord) => void;
}

interface BoardDataState {
  columns: BoardColumn[];
  cards: BoardCard[];
  background: string;
  backgroundOverlay: number;
}

// Offline-safe surface & gradient presets (zero external Unsplash URLs)
const PRESET_WALLPAPERS = [
  {
    name: 'Default Theme',
    value: 'default',
    preview: 'var(--affine-background-primary-color)',
  },
  {
    name: 'Soft Surface',
    value: 'var(--affine-background-secondary-color)',
    preview: 'var(--affine-background-secondary-color)',
  },
  {
    name: 'Ocean Breeze',
    value: 'linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(16, 185, 129, 0.18))',
    preview: 'linear-gradient(135deg, #3b82f6, #10b981)',
  },
  {
    name: 'Aurora Mist',
    value: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
    preview: 'linear-gradient(135deg, #10b981, #06b6d4)',
  },
  {
    name: 'Indigo Dawn',
    value: 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(168, 85, 247, 0.22))',
    preview: 'linear-gradient(135deg, #6366f1, #a855f7)',
  },
  {
    name: 'Sunset Horizon',
    value: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(236, 72, 153, 0.2))',
    preview: 'linear-gradient(135deg, #f97316, #ec4899)',
  },
];

const COLOR_PRESETS = [
  {
    name: 'Cobalt Wave',
    color: 'linear-gradient(135deg, rgba(37, 99, 235, 0.28), rgba(14, 165, 233, 0.24))',
  },
  {
    name: 'Emerald Canopy',
    color: 'linear-gradient(135deg, rgba(5, 150, 105, 0.28), rgba(20, 184, 166, 0.24))',
  },
  {
    name: 'Violet Pulse',
    color: 'linear-gradient(135deg, rgba(124, 58, 237, 0.28), rgba(217, 70, 239, 0.24))',
  },
  {
    name: 'Amber Glow',
    color: 'linear-gradient(135deg, rgba(217, 119, 6, 0.26), rgba(244, 63, 94, 0.22))',
  },
  {
    name: 'Rose Quartz',
    color: 'linear-gradient(135deg, rgba(225, 29, 72, 0.24), rgba(147, 51, 234, 0.24))',
  },
  {
    name: 'Teal Horizon',
    color: 'linear-gradient(135deg, rgba(13, 148, 136, 0.28), rgba(59, 130, 246, 0.24))',
  },
];

const BOARD_ACCENT_BANNERS = [
  'linear-gradient(90deg, #3b82f6, #6366f1)',
  'linear-gradient(90deg, #10b981, #06b6d4)',
  'linear-gradient(90deg, #8b5cf6, #ec4899)',
  'linear-gradient(90deg, #f59e0b, #ef4444)',
  'linear-gradient(90deg, #0ea5e9, #2563eb)',
  'linear-gradient(90deg, #14b8a6, #6366f1)',
];

// Available card labels
const LABELS = [
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Green', color: '#10b981' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Purple', color: '#a855f7' },
];

function sanitizeBoardBackground(bg?: string): string {
  if (!bg || bg === 'default') {
    return 'default';
  }
  if (bg.includes('unsplash.com')) {
    return 'default';
  }
  return bg;
}

const BoardCardItem = ({ doc, index, onClick, onDelete }: BoardDocItem) => {
  const docsService = useService(DocsService);
  const title = useLiveData(doc.title$);
  const properties = useLiveData(doc.properties$);
  const cachedBg = sanitizeBoardBackground(properties['custom:boardBackground']);
  const [boardBg, setBoardBg] = useState<string>(cachedBg);

  useEffect(() => {
    if (properties['custom:boardBackground']) {
      setBoardBg(sanitizeBoardBackground(properties['custom:boardBackground']));
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const { doc: openedDoc, release } = docsService.open(doc.id);
      try {
        const yMap = openedDoc.yDoc.getMap('board_data');
        const rawBg = yMap.get('background') as string | undefined;
        const sanitized = sanitizeBoardBackground(rawBg);
        if (sanitized && !cancelled) {
          setBoardBg(sanitized);
          doc.setCustomProperty('boardBackground', sanitized);
        }
      } finally {
        release();
      }
    }, Math.min(index * 40, 400));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [doc, index, docsService, properties]);

  const defaultBanner = BOARD_ACCENT_BANNERS[index % BOARD_ACCENT_BANNERS.length];
  const resolvedBg = sanitizeBoardBackground(boardBg);
  const isImage =
    resolvedBg !== 'default' &&
    (resolvedBg.startsWith('http') || resolvedBg.startsWith('data:'));
  const bannerStyle = isImage
    ? { backgroundImage: `url("${resolvedBg}")` }
    : {
        background:
          resolvedBg !== 'default' ? resolvedBg : defaultBanner,
      };

  return (
    <div onClick={onClick} className={styles.boardItemCard}>
      <div className={styles.boardItemBanner} style={bannerStyle} />
      <div className={styles.boardItemBody}>
        <span className={styles.boardItemTitle}>
          {title || 'Untitled Board'}
        </span>
        <div className={styles.boardItemFooter}>
          <span className={styles.boardItemBadge}>Native Board</span>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onDelete(doc);
            }}
            className={styles.boardItemDelete}
            title="Delete board"
          >
            <DeleteIcon width={14} height={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const Component = () => {
  const docsService = useService(DocsService);
  const { openConfirmModal } = useConfirmModal();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const allDocs = useLiveData(docsService.list.docs$);

  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const boardId = selectedBoardId || searchParams.get('boardId');

  const handleOpenBoard = useCallback(
    (id: string) => {
      setSelectedBoardId(id);
      setSearchParams({ boardId: id });
    },
    [setSearchParams]
  );

  const handleCloseBoard = useCallback(() => {
    setSelectedBoardId(null);
    setSearchParams({});
  }, [setSearchParams]);

  const handleDeleteBoardDoc = useCallback(
    (doc: DocRecord) => {
      openConfirmModal({
        title: 'Delete this board?',
        description:
          'This board will be moved to Trash and can be restored later.',
        confirmText: 'Delete',
        confirmButtonOptions: {
          variant: 'error',
        },
        onConfirm: () => {
          doc.moveToTrash();
        },
      });
    },
    [openConfirmModal]
  );

  const boardDocs = allDocs.filter((doc: DocRecord) => {
    const isBoard = doc.properties$.value['custom:isBoard'] === 'true';
    const isDeleted = doc.trash$.value;
    const matchesSearch = searchQuery
      ? (doc.title$.value || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      : true;
    return isBoard && !isDeleted && matchesSearch;
  });

  const handleCreateBoard = useCallback(() => {
    const defaultTitle = `Board ${boardDocs.length + 1}`;
    const docRecord = docsService.createDoc({
      title: defaultTitle,
    });
    docRecord.setCustomProperty('isBoard', 'true');
    docRecord.setCustomProperty('boardBackground', 'default');

    setSelectedBoardId(docRecord.id);
    setSearchParams({ boardId: docRecord.id });
  }, [boardDocs.length, docsService, setSearchParams]);

  const isMobile = BUILD_CONFIG.isMobileEdition;

  if (boardId) {
    if (isMobile) {
      return (
        <div
          style={{
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <BoardDetail boardId={boardId} onClose={handleCloseBoard} />
        </div>
      );
    }
    return (
      <>
        <ViewTitle title="Boards" />
        <ViewIcon icon="boards" />
        <ViewHeader>
          <div className={styles.detailTopbar}>
            <button
              type="button"
              onClick={handleCloseBoard}
              className={styles.backToBoardsBtn}
            >
              <ArrowLeftSmallIcon width={16} height={16} />
              Back to Boards
            </button>
          </div>
        </ViewHeader>
        <ViewBody>
          <BoardDetail boardId={boardId} onClose={handleCloseBoard} />
        </ViewBody>
      </>
    );
  }

  if (isMobile) {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className={styles.dashboardHeaderMobile}>
          <div className={styles.dashboardTitleMobile}>Project Boards</div>
          <div className={styles.dashboardToolbar}>
            <div className={styles.searchBoxMobile}>
              <SearchIcon className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <button
              type="button"
              onClick={handleCreateBoard}
              className={styles.createBtn}
            >
              <PlusIcon width={14} height={14} />
              Create
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div className={styles.dashboardContainer}>
            {boardDocs.length === 0 ? (
              <div className={styles.emptyState}>
                <NewIcon className={styles.emptyIcon} />
                <div>
                  <h3 className={styles.emptyTitle}>No boards created yet</h3>
                  <p className={styles.emptyDescription}>
                    Create your first native Kanban board to organize tasks
                    directly in AFFiNE.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateBoard}
                  className={styles.createBtn}
                >
                  Create First Board
                </button>
              </div>
            ) : (
              <div className={styles.boardGrid}>
                {boardDocs.map((doc: DocRecord, index: number) => (
                  <BoardCardItem
                    key={doc.id}
                    doc={doc}
                    index={index}
                    onClick={() => handleOpenBoard(doc.id)}
                    onDelete={handleDeleteBoardDoc}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ViewTitle title="Boards" />
      <ViewIcon icon="boards" />
      <ViewHeader>
        <div className={styles.dashboardHeader}>
          <div className={styles.dashboardTitle}>Project Boards</div>
          <div className={styles.dashboardToolbar}>
            <div className={styles.searchBox}>
              <SearchIcon className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search boards..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <button
              type="button"
              onClick={handleCreateBoard}
              className={styles.createBtn}
            >
              <PlusIcon width={14} height={14} />
              Create Board
            </button>
          </div>
        </div>
      </ViewHeader>
      <ViewBody>
        <div className={styles.dashboardContainer}>
          {boardDocs.length === 0 ? (
            <div className={styles.emptyState}>
              <NewIcon className={styles.emptyIcon} />
              <div>
                <h3 className={styles.emptyTitle}>No boards created yet</h3>
                <p className={styles.emptyDescription}>
                  Create your first native Kanban board to organize tasks
                  directly in AFFiNE.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateBoard}
                className={styles.createBtn}
              >
                Create First Board
              </button>
            </div>
          ) : (
            <div className={styles.boardGrid}>
              {boardDocs.map((doc: DocRecord, index: number) => (
                <BoardCardItem
                  key={doc.id}
                  doc={doc}
                  index={index}
                  onClick={() => handleOpenBoard(doc.id)}
                  onDelete={handleDeleteBoardDoc}
                />
              ))}
            </div>
          )}
        </div>
      </ViewBody>
    </>
  );
};

const BoardDetail = ({
  boardId,
  onClose,
}: {
  boardId: string;
  onClose: () => void;
}) => {
  const docsService = useService(DocsService);
  const { openConfirmModal } = useConfirmModal();
  const [boardData, setBoardData] = useState<BoardDataState>({
    columns: [],
    cards: [],
    background: 'default',
    backgroundOverlay: 0,
  });
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [labelsExpanded, setLabelsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  const [showCustomize, setShowCustomize] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');

  const [newColTitle, setNewColTitle] = useState('');
  const [showAddCol, setShowAddCol] = useState(false);
  const [addingCardColId, setAddingCardColId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  const docRef = useRef<Doc | null>(null);

  useEffect(() => {
    const { doc, release } = docsService.open(boardId);
    docRef.current = doc;
    setTitleInput(doc.record.title$.value || '');

    const yMap = doc.yDoc.getMap('board_data');

    const updateState = () => {
      const columnsStr = yMap.get('columns') as string | undefined;
      const cardsStr = yMap.get('cards') as string | undefined;
      const rawBg = yMap.get('background') as string | undefined;
      const overlay = yMap.get('backgroundOverlay') as number | undefined;
      const sanitizedBg = sanitizeBoardBackground(rawBg);

      let parsedColumns: BoardColumn[] = [];
      let parsedCards: BoardCard[] = [];
      try {
        parsedColumns = columnsStr ? (JSON.parse(columnsStr) as BoardColumn[]) : [];
      } catch {
        parsedColumns = [];
      }
      try {
        parsedCards = cardsStr ? (JSON.parse(cardsStr) as BoardCard[]) : [];
      } catch {
        parsedCards = [];
      }

      setBoardData({
        columns: parsedColumns,
        cards: parsedCards,
        background: sanitizedBg,
        backgroundOverlay:
          overlay !== undefined
            ? Number(overlay)
            : sanitizedBg === 'default'
              ? 0
              : 0.15,
      });
    };

    updateState();

    const observer = () => {
      updateState();
    };
    yMap.observeDeep(observer);

    return () => {
      yMap.unobserveDeep(observer);
      release();
    };
  }, [boardId, docsService]);

  const saveToYjs = useCallback(
    (columns: BoardColumn[], cards: BoardCard[]) => {
      if (!docRef.current) return;
      const yMap = docRef.current.yDoc.getMap('board_data');
      docRef.current.yDoc.transact(() => {
        yMap.set('columns', JSON.stringify(columns));
        yMap.set('cards', JSON.stringify(cards));
      });
    },
    []
  );

  const saveBackgroundToYjs = useCallback(
    (bgValue: string, overlayVal?: number) => {
      if (!docRef.current) return;
      const sanitized = sanitizeBoardBackground(bgValue);
      const yMap = docRef.current.yDoc.getMap('board_data');
      docRef.current.yDoc.transact(() => {
        yMap.set('background', sanitized);
        if (overlayVal !== undefined) {
          yMap.set('backgroundOverlay', overlayVal);
        } else if (sanitized === 'default') {
          yMap.set('backgroundOverlay', 0);
        }
      });
      docRef.current.record.setCustomProperty('boardBackground', sanitized);
    },
    []
  );

  const handleSaveTitle = () => {
    if (titleInput.trim() && docRef.current) {
      docRef.current.record.setMeta({ title: titleInput });
    }
  };

  const handleAddColumn = () => {
    if (!newColTitle.trim()) return;
    const newCol: BoardColumn = {
      id: `col-${Date.now()}`,
      title: newColTitle.trim(),
    };
    const updatedCols = [...boardData.columns, newCol];
    saveToYjs(updatedCols, boardData.cards);
    setNewColTitle('');
    setShowAddCol(false);
  };

  const handleAddCard = (columnId: string) => {
    if (!newCardTitle.trim()) return;
    const newCard: BoardCard = {
      id: `card-${Date.now()}`,
      columnId,
      title: newCardTitle.trim(),
      description: '',
      labels: [],
      checklist: [],
      comments: [],
    };
    const updatedCards = [...boardData.cards, newCard];
    saveToYjs(boardData.columns, updatedCards);
    setNewCardTitle('');
    setAddingCardColId(null);
  };

  const handleUpdateCard = useCallback(
    (updatedCard: BoardCard) => {
      const updatedCards = boardData.cards.map(c =>
        c.id === updatedCard.id ? updatedCard : c
      );
      saveToYjs(boardData.columns, updatedCards);
      setActiveCard(prev =>
        prev && prev.id === updatedCard.id ? updatedCard : prev
      );
    },
    [boardData.cards, boardData.columns, saveToYjs]
  );

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      openConfirmModal({
        title: 'Delete card?',
        description:
          'Are you sure you want to permanently remove this card from the board?',
        confirmText: 'Delete',
        confirmButtonOptions: {
          variant: 'error',
        },
        onConfirm: () => {
          const updatedCards = boardData.cards.filter(c => c.id !== cardId);
          saveToYjs(boardData.columns, updatedCards);
          setActiveCard(null);
        },
      });
    },
    [boardData.cards, boardData.columns, openConfirmModal, saveToYjs]
  );

  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      openConfirmModal({
        title: 'Delete list and all its cards?',
        description:
          'This will remove the list and all cards contained within it.',
        confirmText: 'Delete List',
        confirmButtonOptions: {
          variant: 'error',
        },
        onConfirm: () => {
          const updatedCols = boardData.columns.filter(c => c.id !== columnId);
          const updatedCards = boardData.cards.filter(
            c => c.columnId !== columnId
          );
          saveToYjs(updatedCols, updatedCards);
        },
      });
    },
    [boardData.cards, boardData.columns, openConfirmModal, saveToYjs]
  );

  const resolvedBackground = sanitizeBoardBackground(boardData.background);
  const isDefaultBackground = resolvedBackground === 'default';
  const isUrlBackground =
    !isDefaultBackground &&
    (resolvedBackground.startsWith('http') ||
      resolvedBackground.startsWith('data:'));

  return (
    <div
      className={styles.boardContainer}
      style={{
        backgroundImage: isUrlBackground
          ? `url("${resolvedBackground}")`
          : undefined,
        background:
          !isDefaultBackground && !isUrlBackground
            ? resolvedBackground
            : 'var(--affine-background-primary-color)',
      }}
    >
      {!isDefaultBackground && (boardData.backgroundOverlay ?? 0) > 0 && (
        <div
          className={styles.boardOverlay}
          style={{
            backgroundColor: `rgba(0, 0, 0, ${boardData.backgroundOverlay})`,
          }}
        />
      )}

      <div className={styles.boardContentWrapper}>
        <div className={styles.boardDetailsHeader}>
          <div className={styles.boardDetailsTitleContainer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.boardDetailsBackBtn}
            >
              <ArrowLeftSmallIcon width={16} height={16} />
              Boards
            </button>

            <input
              type="text"
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className={styles.boardDetailsTitleInput}
              title="Click to rename board"
            />
          </div>

          <div className={styles.boardHeaderActions}>
            <div className={styles.viewSwitchGroup}>
              <button
                type="button"
                className={styles.viewSwitchBtn}
                data-active={viewMode === 'kanban'}
                onClick={() => setViewMode('kanban')}
              >
                Kanban
              </button>
              <button
                type="button"
                className={styles.viewSwitchBtn}
                data-active={viewMode === 'table'}
                onClick={() => setViewMode('table')}
              >
                Table
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowCustomize(!showCustomize)}
              className={styles.boardDetailsBackBtn}
            >
              <EdgelessIcon width={15} height={15} />
              Customize
            </button>
          </div>
        </div>

        {showCustomize && (
          <div className={styles.customizeDrawer}>
            <div className={styles.customizeHeader}>
              <span className={styles.customizeTitle}>Surface & Theme</span>
              <button
                type="button"
                onClick={() => setShowCustomize(false)}
                className={styles.btnCancel}
                aria-label="Close customize drawer"
              >
                <CloseIcon width={16} height={16} />
              </button>
            </div>

            <div>
              <div className={styles.customizeSectionLabel}>
                Custom Image (URL or Local File)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Paste image URL (https://...)"
                  value={customUrlInput}
                  onChange={e => setCustomUrlInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customUrlInput.trim()) {
                      saveBackgroundToYjs(customUrlInput.trim());
                      setCustomUrlInput('');
                    }
                  }}
                  className={styles.inlineInput}
                />
                <label className={styles.uploadLabelBtn}>
                  Upload Local Image
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = evt => {
                          if (typeof evt.target?.result === 'string') {
                            saveBackgroundToYjs(evt.target.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <div className={styles.customizeSectionLabel}>Theme Surfaces</div>
              <div className={styles.customizeGrid}>
                {PRESET_WALLPAPERS.map(w => {
                  const isActive = resolvedBackground === w.value;
                  return (
                    <div
                      key={w.name}
                      onClick={() => saveBackgroundToYjs(w.value)}
                      style={{ background: w.preview }}
                      className={clsx(
                        styles.wallpaperThumb,
                        isActive && styles.wallpaperThumbActive
                      )}
                      title={w.name}
                    >
                      <span className={styles.wallpaperThumbLabel}>
                        {w.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className={styles.customizeSectionLabel}>Gradient Accents</div>
              <div className={styles.customizeGrid}>
                {COLOR_PRESETS.map(c => {
                  const isActive = resolvedBackground === c.color;
                  return (
                    <div
                      key={c.name}
                      onClick={() => saveBackgroundToYjs(c.color)}
                      style={{ background: c.color }}
                      className={clsx(
                        styles.wallpaperThumb,
                        isActive && styles.wallpaperThumbActive
                      )}
                      title={c.name}
                    >
                      <span className={styles.wallpaperThumbLabel}>
                        {c.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {!isDefaultBackground && (
              <div>
                <div className={styles.overlayRangeRow}>
                  <span>Overlay Contrast</span>
                  <span className={styles.overlayRangeValue}>
                    {Math.round((boardData.backgroundOverlay ?? 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.7"
                  step="0.05"
                  value={boardData.backgroundOverlay ?? 0}
                  onChange={e =>
                    saveBackgroundToYjs(
                      resolvedBackground,
                      parseFloat(e.target.value)
                    )
                  }
                  className={styles.overlayRangeInput}
                />
              </div>
            )}
          </div>
        )}

        {viewMode === 'table' ? (
          <div className={styles.tableViewWrapper} data-scrollable="true">
            <table className={styles.boardTable}>
              <thead>
                <tr>
                  <th className={styles.tableHeadCell}>Card Title</th>
                  <th className={styles.tableHeadCell}>List</th>
                  <th className={styles.tableHeadCell}>Labels</th>
                  <th className={styles.tableHeadCell}>Due Date</th>
                  <th className={styles.tableHeadCell}>Checklist</th>
                  <th className={styles.tableHeadCell}>Comments</th>
                </tr>
              </thead>
              <tbody>
                {boardData.cards.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.tableEmptyCell}>
                      No cards on this board yet. Switch to Kanban view to add
                      lists and cards.
                    </td>
                  </tr>
                ) : (
                  boardData.cards.map(card => {
                    const colName =
                      boardData.columns.find(c => c.id === card.columnId)
                        ?.title || 'Unassigned';
                    const checkedCount =
                      card.checklist?.filter(item => item.completed).length ||
                      0;
                    const totalCount = card.checklist?.length || 0;
                    return (
                      <tr
                        key={card.id}
                        className={styles.tableRow}
                        onClick={() => setActiveCard(card)}
                      >
                        <td className={styles.tableCell}>
                          <strong>{card.title}</strong>
                        </td>
                        <td className={styles.tableCell}>
                          <span className={styles.tableColumnBadge}>
                            {colName}
                          </span>
                        </td>
                        <td className={styles.tableCell}>
                          <div className={styles.labelRow}>
                            {(card.labels || []).map(color => {
                              const labelObj = LABELS.find(
                                l => l.color === color
                              );
                              return (
                                <span
                                  key={color}
                                  className={styles.labelPill}
                                  style={{ backgroundColor: color }}
                                >
                                  {labelObj?.name || color}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className={styles.tableCell}>
                          {card.dueDate || '—'}
                        </td>
                        <td className={styles.tableCell}>
                          {totalCount > 0
                            ? `${checkedCount}/${totalCount}`
                            : '—'}
                        </td>
                        <td className={styles.tableCell}>
                          {card.comments?.length || 0}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className={styles.boardCanvas}
            onWheel={e => {
              const target = e.target as HTMLElement | null;
              if (target && target.closest('[data-scrollable="true"]')) {
                return;
              }
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY * 1.2;
              }
            }}
          >
            {boardData.columns.map(col => {
              const colCards = boardData.cards.filter(
                c => c.columnId === col.id
              );
              const isAddingCard = addingCardColId === col.id;

              return (
                <div
                  key={col.id}
                  className={clsx(
                    styles.boardCol,
                    draggedColId === col.id && styles.boardColDragging
                  )}
                  draggable={!draggedCardId}
                  onDragStart={e => {
                    e.dataTransfer.setData('text/plain', `col:${col.id}`);
                    setDraggedColId(col.id);
                  }}
                  onDragEnd={() => setDraggedColId(null)}
                  onDragOver={e => {
                    if (draggedColId && draggedColId !== col.id) {
                      e.preventDefault();
                    }
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    const dragData = e.dataTransfer.getData('text/plain');
                    if (dragData.startsWith('col:')) {
                      const fromColId = dragData.split(':')[1];
                      const fromIdx = boardData.columns.findIndex(
                        c => c.id === fromColId
                      );
                      const toIdx = boardData.columns.findIndex(
                        c => c.id === col.id
                      );
                      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
                        const cols = [...boardData.columns];
                        const [temp] = cols.splice(fromIdx, 1);
                        cols.splice(toIdx, 0, temp);
                        saveToYjs(cols, boardData.cards);
                      }
                    }
                    setDraggedColId(null);
                  }}
                >
                  <div className={styles.boardColHeader}>
                    <div className={styles.boardColTitleGroup}>
                      <span className={styles.boardColTitle}>{col.title}</span>
                      <span className={styles.boardColCount}>
                        {colCards.length}
                      </span>
                    </div>
                    <div className={styles.boardColActions}>
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(col.id)}
                        className={clsx(
                          styles.boardColBtn,
                          styles.boardColDelete
                        )}
                        title="Delete list"
                      >
                        <CloseIcon width={14} height={14} />
                      </button>
                    </div>
                  </div>

                  <div
                    className={styles.boardCardsList}
                    data-scrollable="true"
                    onWheel={e => {
                      e.stopPropagation();
                    }}
                    onDragOver={e => {
                      if (draggedCardId) {
                        e.preventDefault();
                      }
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      const dragData = e.dataTransfer.getData('text/plain');
                      if (dragData.startsWith('card:')) {
                        const fromCardId = dragData.split(':')[1];
                        const fromCardIdx = boardData.cards.findIndex(
                          c => c.id === fromCardId
                        );
                        if (fromCardIdx !== -1) {
                          const fromCard = boardData.cards[fromCardIdx];
                          if (fromCard.columnId !== col.id) {
                            const updatedCards = boardData.cards.map(c =>
                              c.id === fromCard.id
                                ? { ...c, columnId: col.id }
                                : c
                            );
                            saveToYjs(boardData.columns, updatedCards);
                          }
                        }
                      }
                    }}
                  >
                    {colCards.map(card => {
                      const checkedCount =
                        card.checklist?.filter(item => item.completed).length ||
                        0;
                      const totalCount = card.checklist?.length || 0;
                      const commentCount = card.comments?.length || 0;
                      return (
                        <div
                          key={card.id}
                          onClick={() => setActiveCard(card)}
                          className={clsx(
                            styles.boardCard,
                            draggedCardId === card.id &&
                              styles.boardCardDragging
                          )}
                          draggable
                          onDragStart={e => {
                            e.stopPropagation();
                            e.dataTransfer.setData(
                              'text/plain',
                              `card:${card.id}`
                            );
                            setDraggedCardId(card.id);
                          }}
                          onDragEnd={() => setDraggedCardId(null)}
                          onDragOver={e => {
                            if (draggedCardId && draggedCardId !== card.id) {
                              e.preventDefault();
                            }
                          }}
                          onDrop={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            const dragData =
                              e.dataTransfer.getData('text/plain');
                            if (dragData.startsWith('card:')) {
                              const fromCardId = dragData.split(':')[1];
                              const fromCardIdx = boardData.cards.findIndex(
                                c => c.id === fromCardId
                              );
                              if (fromCardIdx !== -1) {
                                const fromCard = boardData.cards[fromCardIdx];
                                if (fromCard.id !== card.id) {
                                  const updatedCards = [...boardData.cards];
                                  updatedCards.splice(fromCardIdx, 1);
                                  const targetIdx = updatedCards.findIndex(
                                    c => c.id === card.id
                                  );
                                  const movedCard: BoardCard = {
                                    ...fromCard,
                                    columnId: card.columnId,
                                  };
                                  updatedCards.splice(targetIdx, 0, movedCard);
                                  saveToYjs(boardData.columns, updatedCards);
                                }
                              }
                            }
                            setDraggedCardId(null);
                          }}
                        >
                          {card.labels && card.labels.length > 0 && (
                            <div
                              onClick={e => {
                                e.stopPropagation();
                                setLabelsExpanded(!labelsExpanded);
                              }}
                              className={styles.labelRow}
                            >
                              {card.labels.map(c => {
                                const labelObj = LABELS.find(
                                  l => l.color === c
                                );
                                const labelName = labelObj ? labelObj.name : '';
                                return labelsExpanded ? (
                                  <div
                                    key={c}
                                    className={styles.labelPill}
                                    style={{ backgroundColor: c }}
                                  >
                                    {labelName}
                                  </div>
                                ) : (
                                  <div
                                    key={c}
                                    className={styles.labelPillCompact}
                                    style={{ backgroundColor: c }}
                                  />
                                );
                              })}
                            </div>
                          )}
                          <span className={styles.boardCardTitle}>
                            {card.title}
                          </span>

                          {(totalCount > 0 ||
                            commentCount > 0 ||
                            Boolean(card.dueDate)) && (
                            <div className={styles.boardCardBadgeRow}>
                              {card.dueDate && (
                                <div
                                  className={clsx(
                                    styles.boardCardBadge,
                                    styles.boardCardBadgeDue
                                  )}
                                >
                                  <DateTimeIcon width={13} height={13} />
                                  <span>{card.dueDate}</span>
                                </div>
                              )}
                              {totalCount > 0 && (
                                <div className={styles.boardCardBadge}>
                                  <CheckBoxCheckLinearIcon
                                    width={13}
                                    height={13}
                                  />
                                  <span>
                                    {checkedCount}/{totalCount}
                                  </span>
                                </div>
                              )}
                              {commentCount > 0 && (
                                <div className={styles.boardCardBadge}>
                                  <CommentIcon width={13} height={13} />
                                  <span>{commentCount}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isAddingCard ? (
                    <div className={styles.inlineForm}>
                      <textarea
                        placeholder="Enter a title for this card..."
                        value={newCardTitle}
                        onChange={e => setNewCardTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddCard(col.id);
                          }
                        }}
                        className={styles.inlineTextarea}
                        autoFocus
                      />
                      <div className={styles.inlineActions}>
                        <button
                          type="button"
                          onClick={() => handleAddCard(col.id)}
                          className={styles.btnSubmit}
                        >
                          Add Card
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingCardColId(null)}
                          className={styles.btnCancel}
                          aria-label="Cancel adding card"
                        >
                          <CloseIcon width={16} height={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingCardColId(col.id);
                        setNewCardTitle('');
                      }}
                      className={styles.addBtn}
                    >
                      <PlusIcon width={14} height={14} />
                      Add card
                    </button>
                  )}
                </div>
              );
            })}

            {showAddCol ? (
              <div className={styles.addColumnFormCard}>
                <div className={styles.inlineForm}>
                  <input
                    type="text"
                    placeholder="Enter list title..."
                    value={newColTitle}
                    onChange={e => setNewColTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleAddColumn();
                      }
                    }}
                    className={styles.inlineInput}
                    autoFocus
                  />
                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      className={styles.btnSubmit}
                    >
                      Add List
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCol(false)}
                      className={styles.btnCancel}
                      aria-label="Cancel adding list"
                    >
                      <CloseIcon width={16} height={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddCol(true)}
                className={styles.addColumnBtn}
              >
                <PlusIcon width={14} height={14} />
                Add another list
              </button>
            )}
          </div>
        )}

        {activeCard && (
          <CardModal
            card={activeCard}
            columns={boardData.columns}
            onUpdate={handleUpdateCard}
            onDelete={handleDeleteCard}
            onClose={() => setActiveCard(null)}
          />
        )}
      </div>
    </div>
  );
};

const CardModal = ({
  card,
  columns,
  onUpdate,
  onDelete,
  onClose,
}: {
  card: BoardCard;
  columns: BoardColumn[];
  onUpdate: (card: BoardCard) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) => {
  const [desc, setDesc] = useState(card.description || '');
  const [newTodo, setNewTodo] = useState('');
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    setDesc(card.description || '');
  }, [card.id, card.description]);

  const handleDescBlur = () => {
    onUpdate({ ...card, description: desc });
  };

  const toggleLabel = (color: string) => {
    const labels = card.labels || [];
    const newLabels = labels.includes(color)
      ? labels.filter(c => c !== color)
      : [...labels, color];
    onUpdate({ ...card, labels: newLabels });
  };

  const handleAddTodo = () => {
    if (!newTodo.trim()) return;
    const updatedChecklist: BoardChecklistItem[] = [
      ...(card.checklist || []),
      { id: `todo-${Date.now()}`, title: newTodo.trim(), completed: false },
    ];
    onUpdate({ ...card, checklist: updatedChecklist });
    setNewTodo('');
  };

  const toggleTodo = (todoId: string) => {
    const updatedChecklist = (card.checklist || []).map(item =>
      item.id === todoId ? { ...item, completed: !item.completed } : item
    );
    onUpdate({ ...card, checklist: updatedChecklist });
  };

  const handleDeleteTodo = (todoId: string) => {
    const updatedChecklist = (card.checklist || []).filter(
      item => item.id !== todoId
    );
    onUpdate({ ...card, checklist: updatedChecklist });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment: BoardComment = {
      id: `comm-${Date.now()}`,
      author: 'You',
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
    };
    const updatedComments = [comment, ...(card.comments || [])];
    onUpdate({ ...card, comments: updatedComments });
    setNewComment('');
  };

  const checkedCount =
    card.checklist?.filter(item => item.completed).length || 0;
  const totalCount = card.checklist?.length || 0;
  const progressPercent =
    totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const currentList = columns.find(c => c.id === card.columnId)?.title || '';

  return (
    <Modal
      open={Boolean(card)}
      onOpenChange={open => {
        if (!open) {
          onClose();
        }
      }}
      width={740}
      contentOptions={{
        className: styles.modalContent,
      }}
    >
      <div className={styles.modalHeader}>
        <input
          type="text"
          value={card.title}
          onChange={e => onUpdate({ ...card, title: e.target.value })}
          className={styles.modalTitle}
        />
        <div className={styles.modalSubtitle}>
          in list <span className={styles.modalListHighlight}>{currentList}</span>
        </div>
      </div>

      <div className={styles.modalGrid}>
        <div className={styles.modalMain}>
          <div>
            <div className={styles.modalSectionTitle}>
              <CheckBoxCheckLinearIcon width={15} height={15} />
              <span>Description</span>
            </div>
            <div className={styles.modalSectionBody}>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                onBlur={handleDescBlur}
                placeholder="Add a more detailed description..."
                className={styles.modalDescInput}
              />
            </div>
          </div>

          <div>
            <div className={styles.modalSectionTitle}>
              <CheckBoxCheckLinearIcon width={15} height={15} />
              <span>
                Checklist ({checkedCount}/{totalCount})
              </span>
            </div>

            <div className={styles.modalSectionBody}>
              {totalCount > 0 && (
                <div className={styles.checklistBarContainer}>
                  <div
                    className={styles.checklistBarFill}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}

              <div className={styles.checklistList}>
                {(card.checklist || []).map(todo => (
                  <div key={todo.id} className={styles.checklistItem}>
                    <label className={styles.checklistLabel}>
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id)}
                        className={styles.checklistCheckbox}
                      />
                      <span
                        className={
                          todo.completed
                            ? styles.checklistTextCompleted
                            : styles.checklistText
                        }
                      >
                        {todo.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteTodo(todo.id)}
                      title="Delete item"
                      className={styles.checklistDeleteBtn}
                    >
                      <DeleteIcon width={14} height={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.inlineActions}>
                <input
                  type="text"
                  placeholder="Add an item..."
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleAddTodo();
                    }
                  }}
                  className={styles.inlineInput}
                />
                <button
                  type="button"
                  onClick={handleAddTodo}
                  className={styles.btnSubmit}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className={styles.modalSectionTitle}>
              <CommentIcon width={15} height={15} />
              <span>Comments & Activity</span>
            </div>

            <div className={styles.modalSectionBody}>
              <div className={styles.commentForm}>
                <textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className={styles.inlineTextarea}
                />
                <div className={styles.commentFormFooter}>
                  <button
                    type="button"
                    onClick={handleAddComment}
                    className={styles.btnSubmit}
                  >
                    Save Comment
                  </button>
                </div>
              </div>

              <div className={styles.commentList}>
                {(card.comments || []).map(comm => (
                  <div key={comm.id} className={styles.commentCard}>
                    <div className={styles.commentMeta}>
                      <span className={styles.commentAuthor}>
                        {comm.author}
                      </span>
                      <span>
                        {new Date(comm.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className={styles.commentBody}>{comm.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.modalSidebar}>
          <div>
            <div className={styles.sidebarSectionLabel}>Labels</div>
            <div className={styles.labelsGrid}>
              {LABELS.map(l => {
                const isSelected = (card.labels || []).includes(l.color);
                return (
                  <div
                    key={l.color}
                    onClick={() => toggleLabel(l.color)}
                    style={{
                      backgroundColor: l.color,
                      boxShadow: isSelected ? `0 0 8px ${l.color}` : 'none',
                    }}
                    className={clsx(
                      styles.labelSwatch,
                      isSelected && styles.labelSwatchSelected
                    )}
                    title={l.name}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <div className={styles.sidebarSectionLabel}>Due Date</div>
            <div className={styles.dueDateGroup}>
              <input
                type="date"
                value={card.dueDate || ''}
                onChange={e =>
                  onUpdate({ ...card, dueDate: e.target.value || undefined })
                }
                className={styles.dueDateInput}
              />
              {card.dueDate ? (
                <button
                  type="button"
                  onClick={() => onUpdate({ ...card, dueDate: undefined })}
                  className={styles.clearDateBtn}
                >
                  Clear date
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <div className={styles.sidebarSectionLabel}>Actions</div>
            <button
              type="button"
              onClick={() => onDelete(card.id)}
              className={styles.deleteCardBtn}
            >
              <DeleteIcon width={14} height={14} />
              Delete Card
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
