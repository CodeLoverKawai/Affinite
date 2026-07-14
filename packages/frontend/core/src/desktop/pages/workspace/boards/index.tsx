import { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveData, useService } from '@toeverything/infra';

import { DocsService } from '../../../../modules/doc';
import { DocRecord } from '../../../../modules/doc/entities/record';
import { WorkbenchService } from '../../../../modules/workbench';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '../../../../modules/workbench';
import {
  DeleteIcon,
  NewIcon,
  PlusIcon,
  SearchIcon,
} from '@blocksuite/icons/rc';

// --- INLINE SVG ICONS (Bulletproof styling, no compilation risks) ---
const Icons = {
  Back: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  ),
  Calendar: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  ),
  Checklist: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"></polyline>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
    </svg>
  ),
  Comments: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  ),
  Close: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  )
};

// Gradients list for board cards (Trello/Planka style)
const BOARD_GRADIENTS = [
  'linear-gradient(135deg, #0079bf, #50b6f5)',
  'linear-gradient(135deg, #3f51b5, #2196f3)',
  'linear-gradient(135deg, #519839, #9ac855)',
  'linear-gradient(135deg, #d29034, #f4c270)',
  'linear-gradient(135deg, #b04632, #e5735f)',
  'linear-gradient(135deg, #89609e, #ba9bc8)',
];

const BoardCard = ({ doc, index, onClick }: { doc: DocRecord; index: number; onClick: () => void }) => {
  const title = useLiveData(doc.title$);
  const bgGradient = BOARD_GRADIENTS[index % BOARD_GRADIENTS.length];
  
  return (
    <div
      onClick={onClick}
      className="planka-board-item-card"
      style={{ background: bgGradient }}
    >
      <span className="planka-board-item-title">
        {title || 'Untitled Board'}
      </span>
      <button
        onClick={e => {
          e.stopPropagation();
          if (confirm('Delete this board?')) {
            doc.moveToTrash();
          }
        }}
        className="planka-board-item-delete"
      >
        <Icons.Trash />
      </button>
    </div>
  );
};

export const Component = () => {
  const docsService = useService(DocsService);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const allDocs = useLiveData(docsService.list.docs$);
  
  const boardId = searchParams.get('boardId');

  // Filter doc records representing Boards
  const boardDocs = allDocs.filter((doc: DocRecord) => {
    const isBoard = doc.properties$.value['custom:isBoard'] === 'true';
    const isDeleted = doc.trash$.value;
    const matchesSearch = searchQuery
      ? (doc.title$.value || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return isBoard && !isDeleted && matchesSearch;
  });

  const handleCreateBoard = useCallback(() => {
    const defaultTitle = `Board ${boardDocs.length + 1}`;
    const docRecord = docsService.createDoc({
      title: defaultTitle,
    });
    docRecord.setCustomProperty('isBoard', 'true');

    // Automatically navigate to this board in detail view
    setSearchParams({ boardId: docRecord.id });
  }, [boardDocs.length, docsService, setSearchParams]);

  // CSS Styles injection for exact Planka look-and-feel
  const styleBlock = (
    <style>{`
      /* Planka Native CSS Theme */
      .planka-board-item-card {
        border-radius: 4px;
        padding: 16px;
        cursor: pointer;
        height: 96px;
        position: relative;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .planka-board-item-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.25);
      }
      .planka-board-item-title {
        font-weight: 700;
        font-size: 16px;
        color: #ffffff;
        text-shadow: 0 1px 2px rgba(0,0,0,0.4);
      }
      .planka-board-item-delete {
        align-self: flex-end;
        background: rgba(0, 0, 0, 0.15);
        border: none;
        cursor: pointer;
        color: #ffffff;
        opacity: 0.8;
        padding: 6px;
        border-radius: 4px;
        transition: background-color 0.15s, opacity 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .planka-board-item-delete:hover {
        opacity: 1;
        background: rgba(235, 87, 87, 0.9);
      }

      /* Board workspace layout styles */
      .planka-board-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #0079bf; /* Signature Planka Blue */
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .planka-board-details-header {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 0 16px;
        height: 48px;
        background: rgba(0, 0, 0, 0.15);
        gap: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .planka-board-details-title {
        font-weight: 700;
        font-size: 18px;
        color: #ffffff;
      }
      .planka-board-details-back-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: #ffffff;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: background 0.15s;
      }
      .planka-board-details-back-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      .planka-board-canvas {
        display: flex;
        gap: 12px;
        padding: 12px;
        overflow-x: auto;
        overflow-y: hidden;
        flex: 1;
        align-items: flex-start;
      }

      /* Column styles */
      .planka-board-col {
        width: 272px;
        min-width: 272px;
        background: #ebecf0;
        border-radius: 3px;
        display: flex;
        flex-direction: column;
        max-height: 100%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        padding: 8px;
        gap: 8px;
      }
      .planka-board-col-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 2px 4px;
      }
      .planka-board-col-title {
        font-weight: 600;
        font-size: 14px;
        color: #172b4d;
      }
      .planka-board-col-actions {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .planka-board-col-btn {
        background: transparent;
        border: none;
        font-size: 11px;
        cursor: pointer;
        padding: 4px;
        border-radius: 3px;
        color: #5e6c84;
        transition: background 0.15s, color 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .planka-board-col-btn:hover {
        background: rgba(9, 30, 66, 0.08);
        color: #172b4d;
      }
      .planka-board-col-delete {
        color: #eb5757;
      }
      .planka-board-col-delete:hover {
        background: rgba(235, 87, 87, 0.1);
        color: #eb5757;
      }

      /* Card styles */
      .planka-board-cards-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        flex: 1;
        padding-right: 2px;
      }
      .planka-board-card {
        background: #ffffff;
        border-radius: 3px;
        padding: 8px 10px;
        cursor: pointer;
        box-shadow: 0 1px 0 rgba(9,30,66,.25);
        display: flex;
        flex-direction: column;
        gap: 6px;
        transition: background 0.15s;
      }
      .planka-board-card:hover {
        background: #f4f5f7;
      }
      .planka-board-card-title {
        font-size: 14px;
        color: #172b4d;
        word-wrap: break-word;
      }
      .planka-board-card-badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 11px;
        color: #5e6c84;
        align-items: center;
        margin-top: 4px;
      }
      .planka-board-card-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 4px;
        border-radius: 3px;
        background: rgba(9, 30, 66, 0.04);
      }
      .planka-board-card-badge-due {
        background: #eb5757;
        color: #ffffff;
      }

      /* Add column / card buttons and forms */
      .planka-add-btn {
        background: transparent;
        border: none;
        border-radius: 3px;
        color: #5e6c84;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        padding: 6px 8px;
        text-align: left;
        width: 100%;
        transition: background 0.15s, color 0.15s;
      }
      .planka-add-btn:hover {
        background: rgba(9, 30, 66, 0.08);
        color: #172b4d;
      }
      .planka-add-column-btn {
        background: rgba(255, 255, 255, 0.24);
        color: #ffffff;
        width: 272px;
        min-width: 272px;
        border: none;
        font-weight: 600;
      }
      .planka-add-column-btn:hover {
        background: rgba(255, 255, 255, 0.32);
        color: #ffffff;
      }

      .planka-inline-form {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
      }
      .planka-inline-textarea {
        width: 100%;
        min-height: 54px;
        max-height: 162px;
        padding: 6px 8px;
        border-radius: 3px;
        border: none;
        box-shadow: 0 1px 0 rgba(9,30,66,.25);
        resize: none;
        font-size: 14px;
        outline: none;
        color: #172b4d;
      }
      .planka-inline-input {
        width: 100%;
        padding: 6px 8px;
        border-radius: 3px;
        border: 1px solid #dfe1e6;
        background: #ffffff;
        font-size: 14px;
        outline: none;
        color: #172b4d;
      }
      .planka-inline-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .planka-btn-submit {
        background: #5aac44;
        color: #ffffff;
        border: none;
        border-radius: 3px;
        padding: 6px 12px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 1px 0 rgba(9,30,66,.25);
        transition: background 0.15s;
      }
      .planka-btn-submit:hover {
        background: #61bd4f;
      }
      .planka-btn-cancel {
        background: transparent;
        border: none;
        font-size: 18px;
        color: #5e6c84;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.15s;
      }
      .planka-btn-cancel:hover {
        color: #172b4d;
      }

      /* Card Modal Overlay & Window */
      .planka-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        overflow-y: auto;
        padding: 48px 0;
      }
      .planka-modal-window {
        background: #f4f5f7;
        border-radius: 2px;
        width: 768px;
        max-width: 90%;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 16px -4px rgba(9,30,66,.25), 0 0 0 1px rgba(9,30,66,.08);
        position: relative;
        margin: auto;
      }
      .planka-modal-header {
        padding: 12px 40px 8px 16px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .planka-modal-title {
        font-size: 20px;
        font-weight: 600;
        color: #172b4d;
        border: none;
        background: transparent;
        width: 100%;
        padding: 4px;
        border-radius: 3px;
        transition: background 0.15s;
      }
      .planka-modal-title:focus {
        background: #ffffff;
        box-shadow: inset 0 0 0 2px #0079bf;
        outline: none;
      }
      .planka-modal-subtitle {
        font-size: 12px;
        color: #5e6c84;
        padding-left: 4px;
      }
      .planka-modal-close-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        background: transparent;
        border: none;
        font-size: 22px;
        cursor: pointer;
        color: #5e6c84;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, color 0.15s;
      }
      .planka-modal-close-btn:hover {
        background: rgba(9, 30, 66, 0.08);
        color: #172b4d;
      }

      /* Modal Columns grid */
      .planka-modal-grid {
        display: flex;
        padding: 0 16px 24px 16px;
        gap: 16px;
      }
      .planka-modal-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .planka-modal-sidebar {
        width: 168px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      /* Modal Sections */
      .planka-modal-section-title {
        font-size: 14px;
        font-weight: 600;
        color: #172b4d;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .planka-modal-section-body {
        padding-left: 22px;
      }
      .planka-modal-desc-input {
        width: 100%;
        min-height: 108px;
        background: rgba(9, 30, 66, 0.04);
        border: none;
        border-radius: 3px;
        padding: 8px 12px;
        resize: none;
        font-size: 14px;
        outline: none;
        color: #172b4d;
        transition: background 0.15s;
      }
      .planka-modal-desc-input:focus {
        background: #ffffff;
        box-shadow: inset 0 0 0 2px #0079bf;
      }

      /* Sidebar Actions */
      .planka-sidebar-title {
        font-size: 11px;
        font-weight: 600;
        color: #5e6c84;
        margin-bottom: 4px;
        text-transform: uppercase;
      }
      .planka-sidebar-btn {
        background: rgba(9, 30, 66, 0.04);
        border: none;
        border-radius: 3px;
        color: #172b4d;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 500;
        padding: 6px 12px;
        width: 100%;
        text-align: left;
        transition: background 0.15s;
      }
      .planka-sidebar-btn:hover {
        background: rgba(9, 30, 66, 0.08);
      }
      .planka-sidebar-btn-delete {
        background: #eb5757;
        color: #ffffff;
      }
      .planka-sidebar-btn-delete:hover {
        background: #cf2a2a;
      }

      /* Labels Badge Grid */
      .planka-label-pill-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4px;
      }
      .planka-label-pill {
        height: 24px;
        border-radius: 3px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: border 0.15s;
      }
      .planka-label-pill-active {
        border-color: #172b4d;
      }

      /* Checklist Styles */
      .planka-checklist-bar-container {
        width: 100%;
        height: 8px;
        background: rgba(9, 30, 66, 0.08);
        border-radius: 4px;
        margin-bottom: 12px;
        overflow: hidden;
      }
      .planka-checklist-bar-fill {
        height: 100%;
        background: #5aac44;
        transition: width 0.2s ease;
      }
      .planka-checklist-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px;
        border-radius: 3px;
        transition: background 0.15s;
      }
      .planka-checklist-item:hover {
        background: rgba(9, 30, 66, 0.04);
      }
      .planka-checklist-item-check {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 14px;
        color: #172b4d;
      }

      /* Comment Feed */
      .planka-comment-box {
        background: #ffffff;
        border-radius: 3px;
        padding: 8px;
        border: 1px solid #dfe1e6;
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
      }
      .planka-comment-textarea {
        border: none;
        outline: none;
        resize: none;
        width: 100%;
        min-height: 48px;
        font-size: 14px;
        color: #172b4d;
      }
      .planka-comment-feed {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .planka-comment-item {
        display: flex;
        gap: 10px;
        align-items: flex-start;
      }
      .planka-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #0079bf;
        color: #ffffff;
        font-weight: 700;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .planka-comment-bubble {
        flex: 1;
        background: #ffffff;
        border-radius: 3px;
        border: 1px solid #dfe1e6;
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .planka-comment-meta {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #5e6c84;
      }
      .planka-comment-text {
        font-size: 14px;
        color: #172b4d;
      }
    `}</style>
  );

  if (boardId) {
    return (
      <>
        {styleBlock}
        <BoardDetail boardId={boardId} onClose={() => setSearchParams({})} />
      </>
    );
  }

  return (
    <>
      {styleBlock}
      <ViewTitle title="Boards" />
      <ViewIcon icon="allDocs" />
      <ViewHeader>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 24px', height: '60px', borderBottom: '1px solid var(--affine-border-color, #e3e3e3)', background: 'var(--affine-background-primary-color, #ffffff)' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--affine-text-primary-color, #172b4d)' }}>Project Boards</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={styles.searchBox}>
              <SearchIcon style={{ color: 'var(--affine-text-secondary-color, #8c8c8c)', width: '16px', height: '16px' }} />
              <input
                type="text"
                placeholder="Search boards..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '13px',
                  color: 'var(--affine-text-primary-color, #121212)',
                }}
              />
            </div>
            <button onClick={handleCreateBoard} style={styles.createBtn}>
              <PlusIcon style={{ width: '14px', height: '14px' }} />
              Create Board
            </button>
          </div>
        </div>
      </ViewHeader>
      <ViewBody>
        <div style={styles.dashboardContainer}>
          {boardDocs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px', textAlign: 'center' }}>
              <NewIcon style={{ width: '48px', height: '48px', color: 'var(--affine-text-secondary-color)' }} />
              <div>
                <h3 style={{ margin: 0, fontWeight: 600, fontSize: '18px' }}>No boards found</h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--affine-text-secondary-color)', fontSize: '14px' }}>
                  Create your first native board to organize tasks without external databases.
                </p>
              </div>
              <button onClick={handleCreateBoard} style={styles.createBtn}>
                Create First Board
              </button>
            </div>
          ) : (
            <div style={styles.boardGrid}>
              {boardDocs.map((doc: DocRecord, index: number) => (
                <BoardCard
                  key={doc.id}
                  doc={doc}
                  index={index}
                  onClick={() => setSearchParams({ boardId: doc.id })}
                />
              ))}
            </div>
          )}
        </div>
      </ViewBody>
    </>
  );
};

// --- BOARD DETAIL KANBAN VIEW (YJS DRIVEN) ---
const BoardDetail = ({ boardId, onClose }: { boardId: string; onClose: () => void }) => {
  const docsService = useService(DocsService);
  const [boardData, setBoardData] = useState<{ columns: any[]; cards: any[] }>({ columns: [], cards: [] });
  const [activeCard, setActiveCard] = useState<any | null>(null);
  
  // Inline input states to replace prompt() dialogs
  const [newColTitle, setNewColTitle] = useState('');
  const [showAddCol, setShowAddCol] = useState(false);
  const [addingCardColId, setAddingCardColId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  const docRef = useRef<any>(null);

  // Sync state with Yjs Map inside the BlockSuite document
  useEffect(() => {
    const { doc, release } = docsService.open(boardId);
    docRef.current = doc;

    const yMap = doc.yDoc.getMap('board_data');

    const updateState = () => {
      // Yjs map only stores primitive values (like JSON string).
      // We retrieve them from JSON string, otherwise fallback to empty lists.
      const columnsStr = yMap.get('columns') as string;
      const cardsStr = yMap.get('cards') as string;
      setBoardData({
        columns: columnsStr ? JSON.parse(columnsStr) : [],
        cards: cardsStr ? JSON.parse(cardsStr) : [],
      });
    };

    updateState();
    
    // Listen to changes deeply for real-time multiplayer updates
    const observer = () => {
      updateState();
    };
    yMap.observeDeep(observer);

    return () => {
      yMap.unobserveDeep(observer);
      release();
    };
  }, [boardId, docsService]);

  // Helper to commit updates back to Yjs Map (serialized as primitive string)
  const saveToYjs = useCallback((columns: any[], cards: any[]) => {
    if (!docRef.current) return;
    const yMap = docRef.current.yDoc.getMap('board_data');
    docRef.current.yDoc.transact(() => {
      yMap.set('columns', JSON.stringify(columns));
      yMap.set('cards', JSON.stringify(cards));
    });
  }, []);

  const handleAddColumn = () => {
    if (!newColTitle.trim()) return;
    const newCol = {
      id: `col-${Date.now()}`,
      title: newColTitle,
    };
    const updatedCols = [...boardData.columns, newCol];
    saveToYjs(updatedCols, boardData.cards);
    setNewColTitle('');
    setShowAddCol(false);
  };

  const handleAddCard = (columnId: string) => {
    if (!newCardTitle.trim()) return;
    const newCard = {
      id: `card-${Date.now()}`,
      columnId,
      title: newCardTitle,
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

  const handleUpdateCard = (updatedCard: any) => {
    const updatedCards = boardData.cards.map(c => c.id === updatedCard.id ? updatedCard : c);
    saveToYjs(boardData.columns, updatedCards);
    if (activeCard && activeCard.id === updatedCard.id) {
      setActiveCard(updatedCard);
    }
  };

  const handleDeleteCard = (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    const updatedCards = boardData.cards.filter(c => c.id !== cardId);
    saveToYjs(boardData.columns, updatedCards);
    setActiveCard(null);
  };

  const handleDeleteColumn = (columnId: string) => {
    if (!confirm('Delete this column and all its cards?')) return;
    const updatedCols = boardData.columns.filter(c => c.id !== columnId);
    const updatedCards = boardData.cards.filter(c => c.columnId !== columnId);
    saveToYjs(updatedCols, updatedCards);
  };

  // Helper to reorder columns
  const moveColumn = (index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= boardData.columns.length) return;
    const cols = [...boardData.columns];
    const [temp] = cols.splice(index, 1);
    cols.splice(newIndex, 0, temp);
    saveToYjs(cols, boardData.cards);
  };

  // Helper to move card between columns or reorder
  const moveCard = (card: any, direction: 'up' | 'down' | string) => {
    const cardsInCol = boardData.cards.filter(c => c.columnId === card.columnId);
    const index = cardsInCol.findIndex(c => c.id === card.id);
    
    if (direction === 'up' && index > 0) {
      const updated = [...boardData.cards];
      const otherCard = cardsInCol[index - 1];
      const idxA = updated.findIndex(c => c.id === card.id);
      const idxB = updated.findIndex(c => c.id === otherCard.id);
      updated[idxA] = otherCard;
      updated[idxB] = card;
      saveToYjs(boardData.columns, updated);
    } else if (direction === 'down' && index < cardsInCol.length - 1) {
      const updated = [...boardData.cards];
      const otherCard = cardsInCol[index + 1];
      const idxA = updated.findIndex(c => c.id === card.id);
      const idxB = updated.findIndex(c => c.id === otherCard.id);
      updated[idxA] = otherCard;
      updated[idxB] = card;
      saveToYjs(boardData.columns, updated);
    } else if (typeof direction === 'string' && direction !== 'up' && direction !== 'down') {
      // Move to another column
      const updatedCard = { ...card, columnId: direction };
      handleUpdateCard(updatedCard);
    }
  };

  const getBoardTitle = () => {
    if (!docRef.current) return 'Boards';
    return docRef.current.meta$.value?.title || 'Untitled Board';
  };

  return (
    <div className="planka-board-container">
      <div className="planka-board-details-header">
        <button onClick={onClose} className="planka-board-details-back-btn">
          <Icons.Back />
          Boards
        </button>
        <div className="planka-board-details-title">
          {getBoardTitle()}
        </div>
      </div>
      
      <div className="planka-board-canvas">
        {boardData.columns.map((col, colIdx) => {
          const colCards = boardData.cards.filter(c => c.columnId === col.id);
          const isAddingCard = addingCardColId === col.id;

          return (
            <div key={col.id} className="planka-board-col">
              <div className="planka-board-col-header">
                <span className="planka-board-col-title">{col.title}</span>
                <div className="planka-board-col-actions">
                  <button disabled={colIdx === 0} onClick={() => moveColumn(colIdx, 'left')} className="planka-board-col-btn">◀</button>
                  <button disabled={colIdx === boardData.columns.length - 1} onClick={() => moveColumn(colIdx, 'right')} className="planka-board-col-btn">▶</button>
                  <button onClick={() => handleDeleteColumn(col.id)} className="planka-board-col-btn planka-board-col-delete">×</button>
                </div>
              </div>
              
              <div className="planka-board-cards-list">
                {colCards.map(card => {
                  const checkedCount = card.checklist?.filter((item: any) => item.completed).length || 0;
                  const totalCount = card.checklist?.length || 0;
                  return (
                    <div
                      key={card.id}
                      onClick={() => setActiveCard(card)}
                      className="planka-board-card"
                    >
                      {card.labels?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {card.labels.map((c: string) => (
                            <div key={c} style={{ width: '32px', height: '6px', borderRadius: '3px', background: c }} />
                          ))}
                        </div>
                      )}
                      <span className="planka-board-card-title">{card.title}</span>
                      
                      {(totalCount > 0 || card.comments?.length > 0 || card.dueDate) && (
                        <div className="planka-board-card-badge-row">
                          {card.dueDate && (
                            <div className="planka-board-card-badge planka-board-card-badge-due">
                              <Icons.Calendar />
                              <span>{card.dueDate}</span>
                            </div>
                          )}
                          {totalCount > 0 && (
                            <div className="planka-board-card-badge">
                              <Icons.Checklist />
                              <span>{checkedCount}/{totalCount}</span>
                            </div>
                          )}
                          {card.comments?.length > 0 && (
                            <div className="planka-board-card-badge">
                              <Icons.Comments />
                              <span>{card.comments.length}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Inline card creator to replace prompts */}
              {isAddingCard ? (
                <div className="planka-inline-form">
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
                    className="planka-inline-textarea"
                    autoFocus
                  />
                  <div className="planka-inline-actions">
                    <button onClick={() => handleAddCard(col.id)} className="planka-btn-submit">Add Card</button>
                    <button onClick={() => setAddingCardColId(null)} className="planka-btn-cancel">×</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddingCardColId(col.id);
                    setNewCardTitle('');
                  }}
                  className="planka-add-btn"
                >
                  + Add card
                </button>
              )}
            </div>
          );
        })}
        
        {/* Add Column Button / Form */}
        {showAddCol ? (
          <div className="planka-board-col" style={{ height: 'auto' }}>
            <div className="planka-inline-form">
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
                className="planka-inline-input"
                autoFocus
              />
              <div className="planka-inline-actions">
                <button onClick={handleAddColumn} className="planka-btn-submit">Add List</button>
                <button onClick={() => setShowAddCol(false)} className="planka-btn-cancel">×</button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCol(true)}
            className="planka-add-btn planka-add-column-btn"
          >
            + Add another list
          </button>
        )}
      </div>

      {/* --- PLANKA-LIKE CARD DETAILS MODAL --- */}
      {activeCard && (
        <CardModal
          card={activeCard}
          columns={boardData.columns}
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
          onClose={() => setActiveCard(null)}
          onMove={moveCard}
        />
      )}
    </div>
  );
};

// --- PLANKA CARD DETAIL MODAL OVERLAY ---
const CardModal = ({
  card,
  columns,
  onUpdate,
  onDelete,
  onClose,
  onMove,
}: {
  card: any;
  columns: any[];
  onUpdate: (card: any) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onMove: (card: any, dir: string) => void;
}) => {
  const [desc, setDesc] = useState(card.description || '');
  const [newTodo, setNewTodo] = useState('');
  const [newComment, setNewComment] = useState('');

  const handleDescBlur = () => {
    onUpdate({ ...card, description: desc });
  };

  const toggleLabel = (color: string) => {
    const labels = card.labels || [];
    const newLabels = labels.includes(color)
      ? labels.filter((c: string) => c !== color)
      : [...labels, color];
    onUpdate({ ...card, labels: newLabels });
  };

  const handleAddTodo = () => {
    if (!newTodo.trim()) return;
    const updatedChecklist = [
      ...(card.checklist || []),
      { id: `todo-${Date.now()}`, title: newTodo, completed: false },
    ];
    onUpdate({ ...card, checklist: updatedChecklist });
    setNewTodo('');
  };

  const toggleTodo = (todoId: string) => {
    const updatedChecklist = card.checklist.map((item: any) =>
      item.id === todoId ? { ...item, completed: !item.completed } : item
    );
    onUpdate({ ...card, checklist: updatedChecklist });
  };

  const handleDeleteTodo = (todoId: string) => {
    const updatedChecklist = card.checklist.filter((item: any) => item.id !== todoId);
    onUpdate({ ...card, checklist: updatedChecklist });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: `comm-${Date.now()}`,
      author: 'You',
      text: newComment,
      createdAt: new Date().toISOString(),
    };
    const updatedComments = [comment, ...(card.comments || [])];
    onUpdate({ ...card, comments: updatedComments });
    setNewComment('');
  };

  const checkedCount = card.checklist?.filter((item: any) => item.completed).length || 0;
  const totalCount = card.checklist?.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // Get current list title
  const currentList = columns.find(c => c.id === card.columnId)?.title || '';

  return (
    <div className="planka-modal-overlay" onClick={onClose}>
      <div className="planka-modal-window" onClick={e => e.stopPropagation()}>
        {/* Close Button */}
        <button onClick={onClose} className="planka-modal-close-btn">×</button>

        {/* Modal Header */}
        <div className="planka-modal-header">
          <input
            type="text"
            value={card.title}
            onChange={e => onUpdate({ ...card, title: e.target.value })}
            className="planka-modal-title"
          />
          <div className="planka-modal-subtitle">
            in list <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{currentList}</span>
          </div>
        </div>

        {/* Modal Main Grid */}
        <div className="planka-modal-grid">
          {/* Main Content Area */}
          <div className="planka-modal-main">
            
            {/* Description Section */}
            <div>
              <div className="planka-modal-section-title">
                <Icons.Checklist />
                <span>Description</span>
              </div>
              <div className="planka-modal-section-body">
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  onBlur={handleDescBlur}
                  placeholder="Add a more detailed description..."
                  className="planka-modal-desc-input"
                />
              </div>
            </div>

            {/* Checklist Section */}
            <div>
              <div className="planka-modal-section-title">
                <Icons.Checklist />
                <span>Checklist</span>
              </div>
              
              <div className="planka-modal-section-body">
                {totalCount > 0 && (
                  <div className="planka-checklist-bar-container">
                    <div className="planka-checklist-bar-fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {(card.checklist || []).map((todo: any) => (
                    <div key={todo.id} className="planka-checklist-item">
                      <label className="planka-checklist-item-check">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => toggleTodo(todo.id)}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span style={{ textDecoration: todo.completed ? 'line-through' : 'none', opacity: todo.completed ? 0.6 : 1 }}>
                          {todo.title}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        style={{ background: 'transparent', border: 'none', color: '#eb5757', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>

                <div className="planka-inline-actions">
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
                    className="planka-inline-input"
                    style={{ flex: 1, padding: '4px 8px' }}
                  />
                  <button onClick={handleAddTodo} className="planka-btn-submit" style={{ padding: '4px 12px', fontSize: '12px' }}>Add</button>
                </div>
              </div>
            </div>

            {/* Comments/Activity Section */}
            <div>
              <div className="planka-modal-section-title">
                <Icons.Comments />
                <span>Activity / Comments</span>
              </div>
              
              <div className="planka-modal-section-body">
                <div className="planka-comment-box">
                  <textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    className="planka-comment-textarea"
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleAddComment} className="planka-btn-submit">Save</button>
                  </div>
                </div>

                <div className="planka-comment-feed">
                  {(card.comments || []).map((comm: any) => (
                    <div key={comm.id} className="planka-comment-item">
                      <div className="planka-avatar">
                        {comm.author.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="planka-comment-bubble">
                        <div className="planka-comment-meta">
                          <span style={{ fontWeight: 600 }}>{comm.author}</span>
                          <span>{new Date(comm.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="planka-comment-text">{comm.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Actions Area */}
          <div className="planka-modal-sidebar">
            <div className="planka-sidebar-title">Add to Card</div>
            
            {/* Color Labels Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#5e6c84' }}>Labels</span>
              <div className="planka-label-pill-grid">
                {LABELS.map(l => {
                  const isSelected = card.labels?.includes(l.color);
                  return (
                    <div
                      key={l.color}
                      onClick={() => toggleLabel(l.color)}
                      className={`planka-label-pill ${isSelected ? 'planka-label-pill-active' : ''}`}
                      style={{ background: l.color }}
                      title={l.name}
                    />
                  );
                })}
              </div>
            </div>

            {/* Date Selection Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#5e6c84' }}>Due Date</span>
              <input
                type="date"
                value={card.dueDate || ''}
                onChange={e => onUpdate({ ...card, dueDate: e.target.value })}
                className="planka-inline-input"
                style={{ padding: '4px 6px', fontSize: '12px' }}
              />
            </div>

            <div className="planka-sidebar-title" style={{ marginTop: '16px' }}>Actions</div>

            {/* Move to another column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#5e6c84' }}>Move to list</span>
              <select
                value={card.columnId}
                onChange={e => onMove(card, e.target.value)}
                className="planka-inline-input"
                style={{ padding: '4px', fontSize: '12px' }}
              >
                {columns.map(col => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>

            {/* Reorder vertical position */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <button onClick={() => onMove(card, 'up')} className="planka-sidebar-btn" style={{ justifyContent: 'center', fontSize: '12px' }}>▲ Up</button>
              <button onClick={() => onMove(card, 'down')} className="planka-sidebar-btn" style={{ justifyContent: 'center', fontSize: '12px' }}>▼ Down</button>
            </div>

            {/* Delete Card Button */}
            <button
              onClick={() => onDelete(card.id)}
              className="planka-sidebar-btn planka-sidebar-btn-delete"
              style={{ marginTop: '24px', justifyContent: 'center', fontWeight: 600 }}
            >
              Delete Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
