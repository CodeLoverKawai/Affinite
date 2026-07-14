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

// --- STYLING CONSTANTS (Sleek Dark/Light Adaptive Design) ---
const styles = {
  dashboardContainer: {
    padding: '24px',
    height: '100%',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    background: 'var(--affine-background-primary-color, #ffffff)',
  },
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
  },
  boardCard: {
    background: 'var(--affine-background-secondary-color, #f4f4f4)',
    border: '1px solid var(--affine-border-color, #e3e3e3)',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
  },
  boardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '0 24px',
    height: '60px',
    borderBottom: '1px solid var(--affine-border-color, #e3e3e3)',
    background: 'var(--affine-background-primary-color, #ffffff)',
  },
  boardTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--affine-text-primary-color, #121212)',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--affine-background-secondary-color, #f4f4f4)',
    border: '1px solid var(--affine-border-color, #e3e3e3)',
    borderRadius: '8px',
    padding: '6px 12px',
    gap: '8px',
    width: '260px',
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--affine-brand-color, #1e96eb)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(30, 150, 235, 0.25)',
    transition: 'background 0.2s',
  },
  // Kanban layout styles
  boardContent: {
    display: 'flex',
    gap: '20px',
    padding: '20px',
    overflowX: 'auto' as const,
    height: '100%',
    alignItems: 'flex-start',
    background: 'var(--affine-background-primary-color, #fafafa)',
  },
  column: {
    width: '280px',
    minWidth: '280px',
    background: 'var(--affine-background-secondary-color, #f4f4f4)',
    border: '1px solid var(--affine-border-color, #e3e3e3)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: '100%',
    padding: '12px',
    gap: '12px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontWeight: 700,
    fontSize: '14px',
    color: 'var(--affine-text-primary-color, #121212)',
    padding: '0 4px',
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    overflowY: 'auto' as const,
    flex: 1,
    paddingRight: '2px',
  },
  card: {
    background: 'var(--affine-background-primary-color, #ffffff)',
    border: '1px solid var(--affine-border-color, #e3e3e3)',
    borderRadius: '8px',
    padding: '12px',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  cardLabel: {
    width: '32px',
    height: '6px',
    borderRadius: '3px',
  },
  badgeList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    background: 'var(--affine-background-primary-color, #ffffff)',
    border: '1px solid var(--affine-border-color, #e3e3e3)',
    borderRadius: '16px',
    width: '640px',
    maxWidth: '90%',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
  },
};

// Available labels (Standard Planka palette)
const LABELS = [
  { name: 'Red', color: '#e12c40' },
  { name: 'Orange', color: '#ff7a00' },
  { name: 'Yellow', color: '#fcd53f' },
  { name: 'Green', color: '#2ecc71' },
  { name: 'Blue', color: '#1e96eb' },
  { name: 'Purple', color: '#9b59b6' },
];

const BoardCard = ({ doc, onClick }: { doc: DocRecord; onClick: () => void }) => {
  const title = useLiveData(doc.title$);
  return (
    <div
      onClick={onClick}
      style={styles.boardCard}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--affine-brand-color, #1e96eb)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--affine-border-color, #e3e3e3)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--affine-text-primary-color)' }}>
          {title || 'Untitled Board'}
        </span>
        <button
          onClick={e => {
            e.stopPropagation();
            doc.moveToTrash();
          }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ff4d4f' }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export const Component = () => {
  const docsService = useService(DocsService);
  const workbenchService = useService(WorkbenchService);
  const allDocs = useLiveData(docsService.list.docs$);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // If a board is selected, render the BoardDetail view. Otherwise, render Dashboard.
  if (boardId) {
    return <BoardDetail boardId={boardId} onClose={() => setSearchParams({})} />;
  }

  return (
    <>
      <ViewTitle title="Boards" />
      <ViewIcon icon="allDocs" />
      <ViewHeader>
        <div style={styles.boardHeader}>
          <div style={styles.boardTitle}>Project Boards</div>
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
              {boardDocs.map((doc: DocRecord) => (
                <BoardCard
                  key={doc.id}
                  doc={doc}
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
  const [newColTitle, setNewColTitle] = useState('');
  const [showAddCol, setShowAddCol] = useState(false);
  const docRef = useRef<any>(null);

  // Sync state with Yjs Map inside the BlockSuite document
  useEffect(() => {
    const { doc, release } = docsService.open(boardId);
    docRef.current = doc;

    const yMap = doc.blockSuiteDoc.getMap('board_data');

    const updateState = () => {
      const columns = yMap.get('columns') as any[];
      const cards = yMap.get('cards') as any[];
      setBoardData({
        columns: columns ? JSON.parse(JSON.stringify(columns)) : [],
        cards: cards ? JSON.parse(JSON.stringify(cards)) : [],
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

  // Helper to commit updates back to Yjs Map
  const saveToYjs = useCallback((columns: any[], cards: any[]) => {
    if (!docRef.current) return;
    const yMap = docRef.current.blockSuiteDoc.getMap('board_data');
    docRef.current.blockSuiteDoc.transact(() => {
      yMap.set('columns', columns);
      yMap.set('cards', cards);
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
    const title = prompt('Enter card title:');
    if (!title?.trim()) return;
    const newCard = {
      id: `card-${Date.now()}`,
      columnId,
      title,
      description: '',
      labels: [],
      checklist: [],
      comments: [],
    };
    const updatedCards = [...boardData.cards, newCard];
    saveToYjs(boardData.columns, updatedCards);
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
    <>
      <ViewTitle title="Boards" />
      <ViewIcon icon="import" />
      <ViewHeader>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0 16px', height: '60px', background: 'var(--affine-background-primary-color, #ffffff)', borderBottom: '1px solid var(--affine-border-color, #e3e3e3)', gap: '16px' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--affine-brand-color, #1e96eb)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ← Back
          </button>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--affine-text-primary-color, #121212)' }}>
            {getBoardTitle()}
          </div>
        </div>
      </ViewHeader>
      
      <ViewBody>
        <div style={styles.boardContent}>
          {boardData.columns.map((col, colIdx) => {
            const colCards = boardData.cards.filter(c => c.columnId === col.id);
            return (
              <div key={col.id} style={styles.column}>
                <div style={styles.columnHeader}>
                  <span>{col.title}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button disabled={colIdx === 0} onClick={() => moveColumn(colIdx, 'left')} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>◀</button>
                    <button disabled={colIdx === boardData.columns.length - 1} onClick={() => moveColumn(colIdx, 'right')} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>▶</button>
                    <button onClick={() => handleDeleteColumn(col.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ff4d4f' }}>×</button>
                  </div>
                </div>
                
                <div style={styles.cardList}>
                  {colCards.map(card => {
                    const checkedCount = card.checklist?.filter((item: any) => item.completed).length || 0;
                    const totalCount = card.checklist?.length || 0;
                    return (
                      <div
                        key={card.id}
                        onClick={() => setActiveCard(card)}
                        style={styles.card}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.06)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                        }}
                      >
                        {card.labels?.length > 0 && (
                          <div style={styles.badgeList}>
                            {card.labels.map((c: string) => (
                              <div key={c} style={{ ...styles.cardLabel, background: c }} />
                            ))}
                          </div>
                        )}
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--affine-text-primary-color)' }}>
                          {card.title}
                        </span>
                        
                        {(totalCount > 0 || card.comments?.length > 0 || card.dueDate) && (
                          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--affine-text-secondary-color, #8c8c8c)', marginTop: '4px', alignItems: 'center' }}>
                            {card.dueDate && <span>📅 {card.dueDate}</span>}
                            {totalCount > 0 && <span>☑ {checkedCount}/{totalCount}</span>}
                            {card.comments?.length > 0 && <span>💬 {card.comments.length}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handleAddCard(col.id)}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--affine-border-color, #e3e3e3)',
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--affine-text-secondary-color, #8c8c8c)',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  + Add Card
                </button>
              </div>
            );
          })}
          
          {/* Add Column Button */}
          {showAddCol ? (
            <div style={{ ...styles.column, height: 'auto' }}>
              <input
                type="text"
                placeholder="Column title..."
                value={newColTitle}
                onChange={e => setNewColTitle(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--affine-border-color, #e3e3e3)', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleAddColumn} style={{ ...styles.createBtn, padding: '4px 10px', fontSize: '12px' }}>Add</button>
                <button onClick={() => setShowAddCol(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddCol(true)}
              style={{
                width: '280px',
                minWidth: '280px',
                background: 'var(--affine-background-secondary-color, #f4f4f4)',
                border: '1px dashed var(--affine-border-color, #e3e3e3)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--affine-text-secondary-color, #8c8c8c)',
              }}
            >
              + Add Column
            </button>
          )}
        </div>
      </ViewBody>

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
    </>
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

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--affine-border-color, #e3e3e3)', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
          <input
            type="text"
            value={card.title}
            onChange={e => onUpdate({ ...card, title: e.target.value })}
            style={{ fontSize: '18px', fontWeight: 700, border: 'none', background: 'transparent', outline: 'none', color: 'var(--affine-text-primary-color)', width: '80%' }}
          />
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--affine-text-secondary-color)' }}>×</button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Main Info */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: '20px', borderRight: '1px solid var(--affine-border-color, #e3e3e3)' }}>
            
            {/* Description */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: 'var(--affine-text-primary-color)' }}>Description</div>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                onBlur={handleDescBlur}
                placeholder="Write card description..."
                style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '8px', border: '1px solid var(--affine-border-color, #e3e3e3)', outline: 'none', resize: 'none', fontSize: '13px', background: 'var(--affine-background-primary-color)' }}
              />
            </div>

            {/* Checklist */}
            <div>
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--affine-text-primary-color)' }}>Checklist</span>
                {totalCount > 0 && <span style={{ fontSize: '12px', color: 'var(--affine-text-secondary-color)' }}>{progressPercent}% completed</span>}
              </div>
              
              {totalCount > 0 && (
                <div style={{ width: '100%', height: '6px', background: 'var(--affine-background-secondary-color, #f4f4f4)', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--affine-brand-color, #1e96eb)', transition: 'width 0.2s ease' }} />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px', marginBottom: '10px' }}>
                {(card.checklist || []).map((todo: any) => (
                  <div key={todo.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--affine-text-primary-color)' }}>
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
                    <button onClick={() => handleDeleteTodo(todo.id)} style={{ background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Add item..."
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--affine-border-color, #e3e3e3)', fontSize: '13px' }}
                />
                <button onClick={handleAddTodo} style={{ ...styles.createBtn, padding: '4px 12px', fontSize: '12px' }}>Add</button>
              </div>
            </div>

            {/* Comments Section */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: 'var(--affine-text-primary-color)' }}>Comments</div>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--affine-border-color, #e3e3e3)', fontSize: '13px' }}
                />
                <button onClick={handleAddComment} style={{ ...styles.createBtn, padding: '6px 12px', fontSize: '13px' }}>Post</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                {(card.comments || []).map((comm: any) => (
                  <div key={comm.id} style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px', background: 'var(--affine-background-secondary-color, #f9f9f9)', padding: '10px', borderRadius: '8px', border: '1px solid var(--affine-border-color, #e8e8e8)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--affine-text-secondary-color)' }}>
                      <span style={{ fontWeight: 600 }}>{comm.author}</span>
                      <span>{new Date(comm.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--affine-text-primary-color)' }}>{comm.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar controls */}
          <div style={{ width: '180px', padding: '24px', display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
            {/* Color Labels */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: 'var(--affine-text-primary-color)' }}>Labels</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {LABELS.map(l => {
                  const isSelected = card.labels?.includes(l.color);
                  return (
                    <div
                      key={l.color}
                      onClick={() => toggleLabel(l.color)}
                      style={{
                        height: '24px',
                        background: l.color,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid var(--affine-text-primary-color, #121212)' : 'none',
                        boxShadow: isSelected ? '0 0 4px rgba(0,0,0,0.2)' : 'none',
                      }}
                      title={l.name}
                    />
                  );
                })}
              </div>
            </div>

            {/* Card due date */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: 'var(--affine-text-primary-color)' }}>Due Date</div>
              <input
                type="date"
                value={card.dueDate || ''}
                onChange={e => onUpdate({ ...card, dueDate: e.target.value })}
                style={{ width: '100%', padding: '4px', border: '1px solid var(--affine-border-color, #e3e3e3)', borderRadius: '4px', fontSize: '12px' }}
              />
            </div>

            {/* Move to another column */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: 'var(--affine-text-primary-color)' }}>Move to</div>
              <select
                value={card.columnId}
                onChange={e => onMove(card, e.target.value)}
                style={{ width: '100%', padding: '4px', border: '1px solid var(--affine-border-color, #e3e3e3)', borderRadius: '4px', fontSize: '12px' }}
              >
                {columns.map(col => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>

            {/* Position relative controls */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: 'var(--affine-text-primary-color)' }}>Position</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => onMove(card, 'up')} style={{ flex: 1, padding: '4px', border: '1px solid var(--affine-border-color)', borderRadius: '4px', cursor: 'pointer' }}>▲ Up</button>
                <button onClick={() => onMove(card, 'down')} style={{ flex: 1, padding: '4px', border: '1px solid var(--affine-border-color)', borderRadius: '4px', cursor: 'pointer' }}>▼ Down</button>
              </div>
            </div>

            {/* Delete button */}
            <button
              onClick={() => onDelete(card.id)}
              style={{
                width: '100%',
                padding: '8px',
                background: '#ff4d4f',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                marginTop: 'auto',
              }}
            >
              Delete Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
