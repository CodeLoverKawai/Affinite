import { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveData, useService } from '@toeverything/infra';

import { DocsService } from '../../../../modules/doc';
import { DocRecord } from '../../../../modules/doc/entities/record';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '../../../../modules/workbench';
import {
  NewIcon,
  PlusIcon,
  SearchIcon,
} from '@blocksuite/icons/rc';

// --- INLINE SVG ICONS ---
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
  ),
  Palette: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.0346 19.176 5.12262 19.264 5.1613 19.378C5.20002 19.492 5.17676 19.6108 5.13023 19.8485C4.84379 21.3121 4.54226 21.8213 5.42426 21.9796C5.64287 22.0189 5.88937 22 6.16667 22H12Z" />
      <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
      <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" />
    </svg>
  )
};

// Gradients list for board dashboard items
const BOARD_GRADIENTS = [
  'linear-gradient(135deg, #1e293b, #0f172a)',
  'linear-gradient(135deg, #1e1b4b, #312e81)',
  'linear-gradient(135deg, #064e3b, #022c22)',
  'linear-gradient(135deg, #78350f, #451a03)',
  'linear-gradient(135deg, #701a75, #4a044e)',
  'linear-gradient(135deg, #1f2937, #111827)',
];

// Curated HD Wallpapers & Glass Colors
const WALLPAPER_PRESETS = [
  { name: 'Dark Cosmic', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80' },
  { name: 'Deep Space Nebula', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80' },
  { name: 'Forest Mist', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80' },
  { name: 'Cyberpunk Night', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80' },
  { name: 'Minimal Obsidian', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80' },
];

const COLOR_PRESETS = [
  { name: 'Midnight Glass', color: 'linear-gradient(135deg, #0f172a, #1e293b)' },
  { name: 'Aurora Borealis', color: 'linear-gradient(135deg, #052e16, #064e3b)' },
  { name: 'Deep Indigo', color: 'linear-gradient(135deg, #1e1b4b, #312e81)' },
  { name: 'Obsidian Velvet', color: 'linear-gradient(135deg, #18181b, #09090b)' },
  { name: 'Sunset Glow', color: 'linear-gradient(135deg, #451a03, #78350f)' },
  { name: 'Royal Purple', color: 'linear-gradient(135deg, #3b0764, #581c87)' },
];

// Available labels
const LABELS = [
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Green', color: '#10b981' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Purple', color: '#a855f7' },
];

const BoardCardItem = ({ doc, index, onClick }: { doc: DocRecord; index: number; onClick: () => void }) => {
  const docsService = useService(DocsService);
  const title = useLiveData(doc.title$);
  const [boardBg, setBoardBg] = useState<string>('');

  useEffect(() => {
    const { doc: openedDoc, release } = docsService.open(doc.id);
    const yMap = openedDoc.yDoc.getMap('board_data');

    const updateBg = () => {
      const bg = yMap.get('background') as string;
      if (bg) {
        setBoardBg(bg);
      }
    };

    updateBg();
    yMap.observeDeep(updateBg);

    return () => {
      yMap.unobserveDeep(updateBg);
      release();
    };
  }, [doc.id, docsService]);

  const defaultGradient = BOARD_GRADIENTS[index % BOARD_GRADIENTS.length];
  const isImage = boardBg && (boardBg.startsWith('http') || boardBg.startsWith('data:'));
  const backgroundStyle = isImage
    ? `url("${boardBg}") center/cover no-repeat`
    : (boardBg || defaultGradient);

  return (
    <div
      onClick={onClick}
      className="affinite-board-item-card"
      style={{
        background: backgroundStyle,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dark overlay to keep board titles readable */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,23,42,0.35), rgba(15,23,42,0.85))', borderRadius: '12px', zIndex: 1 }} />
      
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
        <span className="affinite-board-item-title">
          {title || 'Untitled Board'}
        </span>
        <div className="affinite-board-item-footer">
          <span className="affinite-board-item-badge">Native Board</span>
          <button
            onClick={e => {
              e.stopPropagation();
              if (confirm('Delete this board?')) {
                doc.moveToTrash();
              }
            }}
            className="affinite-board-item-delete"
            title="Delete board"
          >
            <Icons.Trash />
          </button>
        </div>
      </div>
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

  // CSS Styles injection for AFFiNITe Dark Glassmorphism
  const styleBlock = (
    <style>{`
      /* AFFiNITe Dark Glassmorphism CSS Theme */
      .affinite-board-item-card {
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        height: 120px;
        position: relative;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        border: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
      }
      .affinite-board-item-card:hover {
        transform: translateY(-3px) scale(1.01);
        box-shadow: 0 12px 28px rgba(0,0,0,0.5);
        border-color: rgba(255, 255, 255, 0.2);
      }
      .affinite-board-item-title {
        font-weight: 700;
        font-size: 17px;
        color: #f8fafc;
        text-shadow: 0 1px 3px rgba(0,0,0,0.6);
        letter-spacing: -0.01em;
      }
      .affinite-board-item-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .affinite-board-item-badge {
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.1);
        padding: 3px 8px;
        border-radius: 6px;
        backdrop-filter: blur(4px);
      }
      .affinite-board-item-delete {
        background: rgba(0, 0, 0, 0.25);
        border: none;
        cursor: pointer;
        color: #cbd5e1;
        padding: 6px;
        border-radius: 6px;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .affinite-board-item-delete:hover {
        color: #ffffff;
        background: rgba(239, 68, 68, 0.9);
      }

      /* Board workspace layout styles */
      .affinite-board-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        overflow: hidden;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-size: cover;
        background-position: center;
      }
      .affinite-board-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
        pointer-events: none;
        transition: background-color 0.2s ease;
      }
      .affinite-board-content-wrapper {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;
      }
      .affinite-board-details-header {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 0 20px;
        height: 54px;
        background: rgba(15, 17, 21, 0.65);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        gap: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        z-index: 10;
        justify-content: space-between;
      }
      .affinite-board-details-title-container {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }
      .affinite-board-details-title-input {
        background: transparent;
        border: 1px solid transparent;
        color: #f8fafc;
        font-weight: 700;
        font-size: 18px;
        padding: 4px 10px;
        border-radius: 8px;
        outline: none;
        transition: all 0.15s;
        max-width: 340px;
      }
      .affinite-board-details-title-input:hover {
        background: rgba(255, 255, 255, 0.06);
      }
      .affinite-board-details-title-input:focus {
        background: rgba(0, 0, 0, 0.4);
        border-color: rgba(59, 130, 246, 0.5);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      .affinite-board-details-back-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #f1f5f9;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s;
        backdrop-filter: blur(4px);
      }
      .affinite-board-details-back-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }
      .affinite-board-canvas {
        display: flex;
        gap: 16px;
        padding: 20px;
        overflow-x: auto;
        overflow-y: hidden;
        flex: 1;
        align-items: flex-start;
        width: 100%;
        box-sizing: border-box;
      }
      .affinite-board-canvas::-webkit-scrollbar {
        height: 10px;
      }
      .affinite-board-canvas::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 5px;
      }
      .affinite-board-canvas::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      /* Fixed Column styles for standard Kanban experience */
      .affinite-board-col {
        width: 280px;
        min-width: 280px;
        max-width: 280px;
        flex-shrink: 0;
        background: rgba(22, 26, 34, 0.75);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        max-height: 100%;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        padding: 12px;
        gap: 10px;
        transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, opacity 0.2s ease, border-color 0.2s ease;
      }
      .affinite-board-col-dragging {
        opacity: 0.45;
        transform: scale(0.97) rotate(0.8deg);
        box-shadow: 0 16px 36px rgba(0,0,0,0.5);
        border-color: rgba(59, 130, 246, 0.5);
      }
      .affinite-board-col-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 6px;
        cursor: grab;
      }
      .affinite-board-col-header:active {
        cursor: grabbing;
      }
      .affinite-board-col-title {
        font-weight: 700;
        font-size: 14px;
        color: #f1f5f9;
        word-wrap: break-word;
        max-width: 210px;
        letter-spacing: -0.01em;
      }
      .affinite-board-col-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .affinite-board-col-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 14px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        color: #94a3b8;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .affinite-board-col-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #f8fafc;
      }
      .affinite-board-col-delete {
        color: #ef4444;
      }
      .affinite-board-col-delete:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #fca5a5;
      }

      /* Card styles */
      .affinite-board-cards-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        flex: 1;
        padding-right: 4px;
        min-height: 24px;
      }
      .affinite-board-cards-list::-webkit-scrollbar {
        width: 6px;
      }
      .affinite-board-cards-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }
      .affinite-board-card {
        background: rgba(33, 38, 48, 0.85);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 10px 12px;
        cursor: grab;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        gap: 6px;
        transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
      }
      .affinite-board-card-dragging {
        opacity: 0.35;
        transform: scale(0.96);
        border-color: #3b82f6;
        box-shadow: 0 8px 24px rgba(59,130,246,0.3);
      }
      .affinite-board-card:active {
        cursor: grabbing;
      }
      .affinite-board-card:hover {
        background: rgba(42, 48, 61, 0.95);
        border-color: rgba(255, 255, 255, 0.18);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
      }
      .affinite-label-pill {
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display: inline-flex;
        align-items: center;
        cursor: pointer;
      }
      .affinite-label-pill:hover {
        transform: scale(1.06);
        filter: brightness(1.15);
      }
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
      }
      .affinite-board-card-title {
        font-size: 14px;
        color: #f1f5f9;
        font-weight: 500;
        line-height: 1.4;
        word-wrap: break-word;
      }
      .affinite-board-card-badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        font-size: 11px;
        color: #94a3b8;
        align-items: center;
        margin-top: 4px;
      }
      .affinite-board-card-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.04);
      }
      .affinite-board-card-badge-due {
        background: rgba(239, 68, 68, 0.2);
        color: #fca5a5;
        border-color: rgba(239, 68, 68, 0.3);
      }

      /* Add column / card buttons and forms */
      .affinite-add-btn {
        background: rgba(255, 255, 255, 0.04);
        border: 1px dashed rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        color: #94a3b8;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        padding: 8px 12px;
        text-align: left;
        width: 100%;
        transition: all 0.15s;
      }
      .affinite-add-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.25);
        color: #f1f5f9;
      }
      .affinite-add-column-btn {
        background: rgba(22, 26, 34, 0.6);
        backdrop-filter: blur(12px);
        border: 1px dashed rgba(255, 255, 255, 0.15);
        color: #f1f5f9;
        width: 280px;
        min-width: 270px;
        height: 48px;
        font-weight: 600;
        border-radius: 12px;
      }
      .affinite-add-column-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.3);
      }

      .affinite-inline-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
      }
      .affinite-inline-textarea {
        width: 100%;
        min-height: 56px;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(15, 17, 21, 0.8);
        resize: none;
        font-size: 14px;
        outline: none;
        color: #f8fafc;
        box-sizing: border-box;
      }
      .affinite-inline-textarea:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      .affinite-inline-input {
        width: 100%;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(15, 17, 21, 0.8);
        font-size: 14px;
        outline: none;
        color: #f8fafc;
        box-sizing: border-box;
      }
      .affinite-inline-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      .affinite-inline-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .affinite-btn-submit {
        background: #2563eb;
        color: #ffffff;
        border: none;
        border-radius: 6px;
        padding: 6px 14px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .affinite-btn-submit:hover {
        background: #3b82f6;
      }
      .affinite-btn-cancel {
        background: transparent;
        border: none;
        font-size: 18px;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.15s;
      }
      .affinite-btn-cancel:hover {
        color: #f1f5f9;
      }

      /* Card Modal Overlay & Window */
      .affinite-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        overflow-y: auto;
        padding: 24px;
      }
      .affinite-modal-window {
        background: #181b22;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        width: 740px;
        max-width: 95%;
        max-height: 88vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
        position: relative;
        color: #f8fafc;
      }
      .affinite-modal-header {
        padding: 20px 48px 12px 20px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .affinite-modal-title {
        font-size: 20px;
        font-weight: 700;
        color: #f8fafc;
        border: 1px solid transparent;
        background: transparent;
        width: 100%;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.15s;
      }
      .affinite-modal-title:focus {
        background: rgba(0, 0, 0, 0.4);
        border-color: #3b82f6;
        outline: none;
      }
      .affinite-modal-subtitle {
        font-size: 13px;
        color: #94a3b8;
        padding-left: 8px;
      }
      .affinite-modal-close-btn {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 20px;
        cursor: pointer;
        color: #94a3b8;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .affinite-modal-close-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #f1f5f9;
      }

      /* Modal Columns grid */
      .affinite-modal-grid {
        display: flex;
        padding: 20px;
        gap: 20px;
      }
      .affinite-modal-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .affinite-modal-sidebar {
        width: 180px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 180px;
      }

      /* Modal Sections */
      .affinite-modal-section-title {
        font-size: 14px;
        font-weight: 700;
        color: #cbd5e1;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        letter-spacing: -0.01em;
      }
      .affinite-modal-section-body {
        padding-left: 4px;
      }
      .affinite-modal-desc-input {
        width: 100%;
        min-height: 110px;
        background: rgba(15, 17, 21, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 10px 14px;
        resize: vertical;
        font-size: 14px;
        outline: none;
        color: #f8fafc;
        transition: all 0.15s;
        box-sizing: border-box;
      }
      .affinite-modal-desc-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }

      /* Checklist Styles */
      .affinite-checklist-bar-container {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        margin-bottom: 12px;
        overflow: hidden;
      }
      .affinite-checklist-bar-fill {
        height: 100%;
        background: #10b981;
        transition: width 0.2s ease;
      }
      .affinite-checklist-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.04);
        transition: background 0.15s;
      }
      .affinite-checklist-item:hover {
        background: rgba(255, 255, 255, 0.06);
      }

      /* Customize Drawer style */
      .affinite-customize-drawer {
        position: absolute;
        top: 60px;
        right: 20px;
        width: 280px;
        background: rgba(20, 24, 33, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 12px;
        box-shadow: 0 16px 36px rgba(0,0,0,0.5);
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        z-index: 100;
        color: #f8fafc;
      }
      .affinite-customize-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .affinite-wallpaper-thumb {
        height: 48px;
        border-radius: 6px;
        cursor: pointer;
        border: 2px solid transparent;
        background-size: cover;
        background-position: center;
        transition: transform 0.15s, border-color 0.15s;
      }
      .affinite-wallpaper-thumb:hover {
        transform: scale(1.05);
      }
      .affinite-wallpaper-thumb-active {
        border-color: #3b82f6;
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 24px', height: '60px', borderBottom: '1px solid var(--affine-border-color, rgba(255,255,255,0.08))', background: 'var(--affine-background-primary-color, #17181c)' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--affine-text-primary-color, #f8fafc)' }}>Project Boards</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={styles.searchBox}>
              <SearchIcon style={{ color: 'var(--affine-text-secondary-color, #94a3b8)', width: '16px', height: '16px' }} />
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
                  color: 'var(--affine-text-primary-color, #f8fafc)',
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '320px', gap: '16px', textAlign: 'center' }}>
              <NewIcon style={{ width: '48px', height: '48px', color: 'var(--affine-text-secondary-color, #94a3b8)' }} />
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '18px', color: '#f8fafc' }}>No boards created yet</h3>
                <p style={{ margin: '6px 0 0 0', color: 'var(--affine-text-secondary-color, #94a3b8)', fontSize: '14px' }}>
                  Create your first native Kanban board to organize tasks directly in AFFiNITe.
                </p>
              </div>
              <button onClick={handleCreateBoard} style={styles.createBtn}>
                Create First Board
              </button>
            </div>
          ) : (
            <div style={styles.boardGrid}>
              {boardDocs.map((doc: DocRecord, index: number) => (
                <BoardCardItem
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

// --- BOARD DETAIL KANBAN VIEW (DARK GLASSMORPHISM) ---
const BoardDetail = ({ boardId, onClose }: { boardId: string; onClose: () => void }) => {
  const docsService = useService(DocsService);
  const [boardData, setBoardData] = useState<{ columns: any[]; cards: any[]; background?: string; backgroundOverlay?: number }>({
    columns: [],
    cards: [],
    background: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80',
    backgroundOverlay: 0.35,
  });
  const [activeCard, setActiveCard] = useState<any | null>(null);
  const [labelsExpanded, setLabelsExpanded] = useState(false);

  // Customization Drawer toggle
  const [showCustomize, setShowCustomize] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  
  // Inline input states
  const [newColTitle, setNewColTitle] = useState('');
  const [showAddCol, setShowAddCol] = useState(false);
  const [addingCardColId, setAddingCardColId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  // Drag and Drop tracking states
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  const docRef = useRef<any>(null);

  // Sync state with Yjs Map inside the BlockSuite document
  useEffect(() => {
    const { doc, release } = docsService.open(boardId);
    docRef.current = doc;
    setTitleInput(doc.record.title$.value || '');

    const yMap = doc.yDoc.getMap('board_data');

    const updateState = () => {
      const columnsStr = yMap.get('columns') as string;
      const cardsStr = yMap.get('cards') as string;
      const bg = yMap.get('background') as string;
      const overlay = yMap.get('backgroundOverlay') as number;

      setBoardData({
        columns: columnsStr ? JSON.parse(columnsStr) : [],
        cards: cardsStr ? JSON.parse(cardsStr) : [],
        background: bg || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80',
        backgroundOverlay: overlay !== undefined ? Number(overlay) : 0.35,
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

  // Save changes to Yjs
  const saveToYjs = useCallback((columns: any[], cards: any[]) => {
    if (!docRef.current) return;
    const yMap = docRef.current.yDoc.getMap('board_data');
    docRef.current.yDoc.transact(() => {
      yMap.set('columns', JSON.stringify(columns));
      yMap.set('cards', JSON.stringify(cards));
    });
  }, []);

  const saveBackgroundToYjs = (bgValue: string, overlayVal?: number) => {
    if (!docRef.current) return;
    const yMap = docRef.current.yDoc.getMap('board_data');
    docRef.current.yDoc.transact(() => {
      if (bgValue !== undefined) yMap.set('background', bgValue);
      if (overlayVal !== undefined) yMap.set('backgroundOverlay', overlayVal);
    });
  };

  const handleSaveTitle = () => {
    if (titleInput.trim() && docRef.current) {
      docRef.current.record.setMeta({ title: titleInput });
    }
  };

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

  const isUrlBackground = (boardData.background || '').startsWith('http') || (boardData.background || '').startsWith('data:');

  return (
    <div
      className="affinite-board-container"
      style={{
        backgroundImage: isUrlBackground ? `url("${boardData.background}")` : undefined,
        background: !isUrlBackground ? (boardData.background || '#0f172a') : undefined,
      }}
    >
      {/* Dark overlay with configurable opacity */}
      <div
        className="affinite-board-overlay"
        style={{ backgroundColor: `rgba(0, 0, 0, ${boardData.backgroundOverlay ?? 0.35})` }}
      />

      <div className="affinite-board-content-wrapper">
        <div className="affinite-board-details-header">
          <div className="affinite-board-details-title-container">
            <button onClick={onClose} className="affinite-board-details-back-btn">
              <Icons.Back />
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
              className="affinite-board-details-title-input"
              title="Click to rename board"
            />
          </div>

          <button 
            onClick={() => setShowCustomize(!showCustomize)} 
            className="affinite-board-details-back-btn"
          >
            <Icons.Palette />
            Customize
          </button>
        </div>

        {/* Customize background and properties panel */}
        {showCustomize && (
          <div className="affinite-customize-drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Wallpaper & Theme</span>
              <button onClick={() => setShowCustomize(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}>×</button>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Custom Image (URL or Local File)</div>
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
                  className="affinite-inline-input"
                  style={{ fontSize: '12px', padding: '6px 8px' }}
                />
                <label className="affinite-btn-submit" style={{ fontSize: '11px', padding: '6px 10px', cursor: 'pointer', textAlign: 'center', display: 'block' }}>
                  📁 Upload Local Image
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (evt.target?.result) {
                            saveBackgroundToYjs(evt.target.result as string);
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
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>HD Wallpapers</div>
              <div className="affinite-customize-grid">
                {WALLPAPER_PRESETS.map(w => {
                  const isActive = boardData.background === w.url;
                  return (
                    <div
                      key={w.name}
                      onClick={() => saveBackgroundToYjs(w.url)}
                      style={{ backgroundImage: `url("${w.url}")` }}
                      className={`affinite-wallpaper-thumb ${isActive ? 'affinite-wallpaper-thumb-active' : ''}`}
                      title={w.name}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>Gradient Colors</div>
              <div className="affinite-customize-grid">
                {COLOR_PRESETS.map(c => {
                  const isActive = boardData.background === c.color;
                  return (
                    <div
                      key={c.name}
                      onClick={() => saveBackgroundToYjs(c.color)}
                      style={{ background: c.color }}
                      className={`affinite-wallpaper-thumb ${isActive ? 'affinite-wallpaper-thumb-active' : ''}`}
                      title={c.name}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                <span>Overlay Darkness</span>
                <span style={{ color: '#3b82f6', fontWeight: 600 }}>{Math.round((boardData.backgroundOverlay ?? 0.35) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={boardData.backgroundOverlay ?? 0.35}
                onChange={e => saveBackgroundToYjs(boardData.background || '', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6' }}
              />
            </div>
          </div>
        )}
        
        <div
          className="affinite-board-canvas"
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY * 1.2;
            }
          }}
        >
          {boardData.columns.map((col) => {
            const colCards = boardData.cards.filter(c => c.columnId === col.id);
            const isAddingCard = addingCardColId === col.id;

            return (
              <div 
                key={col.id} 
                className={`affinite-board-col ${draggedColId === col.id ? 'affinite-board-col-dragging' : ''}`}
                draggable={!draggedCardId}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', `col:${col.id}`);
                  setDraggedColId(col.id);
                }}
                onDragEnd={() => setDraggedColId(null)}
                onDragOver={(e) => {
                  if (draggedColId && draggedColId !== col.id) {
                    e.preventDefault();
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragData = e.dataTransfer.getData('text/plain');
                  if (dragData.startsWith('col:')) {
                    const fromColId = dragData.split(':')[1];
                    const fromIdx = boardData.columns.findIndex(c => c.id === fromColId);
                    const toIdx = boardData.columns.findIndex(c => c.id === col.id);
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
                <div className="affinite-board-col-header">
                  <span className="affinite-board-col-title">{col.title}</span>
                  <div className="affinite-board-col-actions">
                    <button onClick={() => handleDeleteColumn(col.id)} className="affinite-board-col-btn affinite-board-col-delete" title="Delete list">×</button>
                  </div>
                </div>
                
                <div 
                  className="affinite-board-cards-list"
                  onDragOver={(e) => {
                    if (draggedCardId) {
                      e.preventDefault();
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragData = e.dataTransfer.getData('text/plain');
                    if (dragData.startsWith('card:')) {
                      const fromCardId = dragData.split(':')[1];
                      const fromCardIdx = boardData.cards.findIndex(c => c.id === fromCardId);
                      if (fromCardIdx !== -1) {
                        const fromCard = boardData.cards[fromCardIdx];
                        if (fromCard.columnId !== col.id) {
                          const updatedCards = boardData.cards.map(c => 
                            c.id === fromCard.id ? { ...c, columnId: col.id } : c
                          );
                          saveToYjs(boardData.columns, updatedCards);
                        }
                      }
                    }
                  }}
                >
                  {colCards.map(card => {
                    const checkedCount = card.checklist?.filter((item: any) => item.completed).length || 0;
                    const totalCount = card.checklist?.length || 0;
                    return (
                      <div
                        key={card.id}
                        onClick={() => setActiveCard(card)}
                        className={`affinite-board-card ${draggedCardId === card.id ? 'affinite-board-card-dragging' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData('text/plain', `card:${card.id}`);
                          setDraggedCardId(card.id);
                        }}
                        onDragEnd={() => setDraggedCardId(null)}
                        onDragOver={(e) => {
                          if (draggedCardId && draggedCardId !== card.id) {
                            e.preventDefault();
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const dragData = e.dataTransfer.getData('text/plain');
                          if (dragData.startsWith('card:')) {
                            const fromCardId = dragData.split(':')[1];
                            const fromCardIdx = boardData.cards.findIndex(c => c.id === fromCardId);
                            if (fromCardIdx !== -1) {
                              const fromCard = boardData.cards[fromCardIdx];
                              if (fromCard.id !== card.id) {
                                const updatedCards = [...boardData.cards];
                                updatedCards.splice(fromCardIdx, 1);
                                const targetIdx = updatedCards.findIndex(c => c.id === card.id);
                                const newCard = { ...fromCard, columnId: card.columnId };
                                updatedCards.splice(targetIdx, 0, newCard);
                                saveToYjs(boardData.columns, updatedCards);
                              }
                            }
                          }
                          setDraggedCardId(null);
                        }}
                      >
                        {card.labels?.length > 0 && (
                          <div
                            onClick={e => {
                              e.stopPropagation();
                              setLabelsExpanded(!labelsExpanded);
                            }}
                            style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', cursor: 'pointer', marginBottom: '2px' }}
                          >
                            {card.labels.map((c: string) => {
                              const labelObj = LABELS.find(l => l.color === c);
                              const labelName = labelObj ? labelObj.name : '';
                              return labelsExpanded ? (
                                <div
                                  key={c}
                                  className="affinite-label-pill"
                                  style={{
                                    background: c,
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {labelName}
                                </div>
                              ) : (
                                <div key={c} className="affinite-label-pill" style={{ width: '36px', height: '6px', borderRadius: '3px', background: c }} />
                              );
                            })}
                          </div>
                        )}
                        <span className="affinite-board-card-title">{card.title}</span>
                        
                        {(totalCount > 0 || card.comments?.length > 0 || card.dueDate) && (
                          <div className="affinite-board-card-badge-row">
                            {card.dueDate && (
                              <div className="affinite-board-card-badge affinite-board-card-badge-due">
                                <Icons.Calendar />
                                <span>{card.dueDate}</span>
                              </div>
                            )}
                            {totalCount > 0 && (
                              <div className="affinite-board-card-badge">
                                <Icons.Checklist />
                                <span>{checkedCount}/{totalCount}</span>
                              </div>
                            )}
                            {card.comments?.length > 0 && (
                              <div className="affinite-board-card-badge">
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

                {/* Inline card creator */}
                {isAddingCard ? (
                  <div className="affinite-inline-form">
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
                      className="affinite-inline-textarea"
                      autoFocus
                    />
                    <div className="affinite-inline-actions">
                      <button onClick={() => handleAddCard(col.id)} className="affinite-btn-submit">Add Card</button>
                      <button onClick={() => setAddingCardColId(null)} className="affinite-btn-cancel">×</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAddingCardColId(col.id);
                      setNewCardTitle('');
                    }}
                    className="affinite-add-btn"
                  >
                    + Add card
                  </button>
                )}
              </div>
            );
          })}
          
          {/* Add Column Button / Form */}
          {showAddCol ? (
            <div className="affinite-board-col" style={{ height: 'auto', width: '280px', minWidth: '270px' }}>
              <div className="affinite-inline-form">
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
                  className="affinite-inline-input"
                  autoFocus
                />
                <div className="affinite-inline-actions">
                  <button onClick={handleAddColumn} className="affinite-btn-submit">Add List</button>
                  <button onClick={() => setShowAddCol(false)} className="affinite-btn-cancel">×</button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddCol(true)}
              className="affinite-add-btn affinite-add-column-btn"
            >
              + Add another list
            </button>
          )}
        </div>

        {/* CARD DETAILS MODAL */}
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

// --- CARD DETAIL MODAL (DARK GLASSMORPHISM) ---
const CardModal = ({
  card,
  columns,
  onUpdate,
  onDelete,
  onClose,
}: {
  card: any;
  columns: any[];
  onUpdate: (card: any) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
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

  const currentList = columns.find(c => c.id === card.columnId)?.title || '';

  return (
    <div className="affinite-modal-overlay" onClick={onClose}>
      <div className="affinite-modal-window" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="affinite-modal-close-btn">×</button>

        <div className="affinite-modal-header">
          <input
            type="text"
            value={card.title}
            onChange={e => onUpdate({ ...card, title: e.target.value })}
            className="affinite-modal-title"
          />
          <div className="affinite-modal-subtitle">
            in list <span style={{ color: '#3b82f6', fontWeight: 600 }}>{currentList}</span>
          </div>
        </div>

        <div className="affinite-modal-grid">
          <div className="affinite-modal-main">
            
            {/* Description Section */}
            <div>
              <div className="affinite-modal-section-title">
                <Icons.Checklist />
                <span>Description</span>
              </div>
              <div className="affinite-modal-section-body">
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  onBlur={handleDescBlur}
                  placeholder="Add a more detailed description..."
                  className="affinite-modal-desc-input"
                />
              </div>
            </div>

            {/* Checklist Section */}
            <div>
              <div className="affinite-modal-section-title">
                <Icons.Checklist />
                <span>Checklist ({checkedCount}/{totalCount})</span>
              </div>
              
              <div className="affinite-modal-section-body">
                {totalCount > 0 && (
                  <div className="affinite-checklist-bar-container">
                    <div className="affinite-checklist-bar-fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {(card.checklist || []).map((todo: any) => (
                    <div key={todo.id} className="affinite-checklist-item">
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => toggleTodo(todo.id)}
                          style={{ width: '16px', height: '16px', accentColor: '#10b981', flexShrink: 0, cursor: 'pointer' }}
                        />
                        <span style={{ textDecoration: todo.completed ? 'line-through' : 'none', opacity: todo.completed ? 0.5 : 1, overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0, fontSize: '13px', color: '#f1f5f9', textAlign: 'left' }}>
                          {todo.title}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        title="Delete item"
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginLeft: '12px',
                          transition: 'all 0.15s',
                        }}
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="affinite-inline-actions">
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
                    className="affinite-inline-input"
                    style={{ flex: 1, padding: '6px 10px' }}
                  />
                  <button onClick={handleAddTodo} className="affinite-btn-submit" style={{ padding: '6px 14px', fontSize: '12px' }}>Add</button>
                </div>
              </div>
            </div>

            {/* Comments / Activity */}
            <div>
              <div className="affinite-modal-section-title">
                <Icons.Comments />
                <span>Comments & Activity</span>
              </div>
              
              <div className="affinite-modal-section-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  <textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    className="affinite-inline-textarea"
                    style={{ minHeight: '48px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleAddComment} className="affinite-btn-submit">Save Comment</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(card.comments || []).map((comm: any) => (
                    <div key={comm.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#3b82f6' }}>{comm.author}</span>
                        <span>{new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#f1f5f9' }}>{comm.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Modal Sidebar */}
          <div className="affinite-modal-sidebar">
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Labels</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {LABELS.map(l => {
                  const isSelected = (card.labels || []).includes(l.color);
                  return (
                    <div
                      key={l.color}
                      onClick={() => toggleLabel(l.color)}
                      style={{
                        background: l.color,
                        width: '42px',
                        height: '24px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                        boxShadow: isSelected ? '0 0 8px ' + l.color : 'none',
                        transition: 'all 0.15s',
                      }}
                      title={l.name}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Actions</div>
              <button
                onClick={() => onDelete(card.id)}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  width: '100%',
                  fontWeight: 600,
                  fontSize: '13px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Icons.Trash />
                Delete Card
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  dashboardContainer: {
    padding: '24px',
    height: '100%',
    overflowY: 'auto',
    background: 'var(--affine-background-primary-color, #17181c)',
  },
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '20px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--affine-background-secondary-color, rgba(255,255,255,0.06))',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid var(--affine-border-color, rgba(255,255,255,0.08))',
    width: '240px',
  },
  createBtn: {
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.15s',
  },
};
