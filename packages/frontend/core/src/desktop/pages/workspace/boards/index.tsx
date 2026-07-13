import { useCallback, useState } from 'react';

import { DatabaseBlockDataSource } from '@blocksuite/affine/blocks/database';
import {
  DeleteIcon,
  NewIcon,
  PlusIcon,
  SearchIcon,
} from '@blocksuite/icons/rc';
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

// Styled BoardCard Component
const BoardCard = ({
  doc,
  onOpen,
  onDelete,
}: {
  doc: DocRecord;
  onOpen: () => void;
  onDelete: () => void;
}) => {
  const title = useLiveData(doc.title$);
  const updatedAt = useLiveData(doc.updatedAt$);

  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Never';

  return (
    <div
      onClick={onOpen}
      style={{
        background: 'var(--affine-background-primary-color, #ffffff)',
        border: '1px solid var(--affine-border-color, #e3e3e3)',
        borderRadius: '8px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        position: 'relative',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--affine-text-primary-color, #121212)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '85%',
          }}
        >
          {title || 'Untitled Board'}
        </h4>
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--affine-text-secondary-color, #8c8c8c)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--affine-background-error-hover-color, #ffeef0)';
            e.currentTarget.style.color = '#e12c40';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--affine-text-secondary-color, #8c8c8c)';
          }}
          title="Delete Board"
        >
          <DeleteIcon style={{ width: '16px', height: '16px' }} />
        </button>
      </div>

      <div
        style={{
          fontSize: '12px',
          color: 'var(--affine-text-secondary-color, #8c8c8c)',
          marginTop: 'auto',
        }}
      >
        Modified {formattedDate}
      </div>
    </div>
  );
};

export const Component = () => {
  const docsService = useService(DocsService);
  const workbenchService = useService(WorkbenchService);
  const allDocs = useLiveData(docsService.list.docs$);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter doc records representing Board layouts
  const boardDocs = allDocs.filter((doc: DocRecord) => {
    const isBoard = doc.properties$.value['custom:isBoard'] === 'true';
    const isDeleted = doc.trash$.value;
    const matchesSearch = searchQuery
      ? (doc.title$.value || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return isBoard && !isDeleted && matchesSearch;
  });

  // Create native document with database board layout pre-populated
  const handleCreateBoard = useCallback(async () => {
    const defaultTitle = `Board ${boardDocs.length + 1}`;
    const docRecord = docsService.createDoc({
      title: defaultTitle,
    });

    // Mark as Kanban Project Board
    docRecord.setCustomProperty('isBoard', 'true');

    // Open and insert a database block with Kanban layout
    const { doc, release } = docsService.open(docRecord.id);
    try {
      const disposePriorityLoad = doc.addPriorityLoad(10);
      await doc.waitForSyncReady();
      disposePriorityLoad();

      const [noteBlock] = doc.blockSuiteDoc.getBlocksByFlavour('affine:note');
      if (noteBlock) {
        // Clear initial paragraphs
        const paragraphs = doc.blockSuiteDoc.getBlocksByFlavour('affine:paragraph');
        paragraphs.forEach((p: any) => doc.blockSuiteDoc.deleteBlock(p));

        // Add database block
        const databaseId = doc.blockSuiteDoc.addBlock(
          'affine:database',
          {
            columns: [],
            cells: {},
          },
          noteBlock.id
        );

        const database = doc.blockSuiteDoc.getModelById(databaseId);
        if (database) {
          const datasource = new DatabaseBlockDataSource(database);
          
          // Pre-populate core Planka-like columns
          datasource.propertyAdd('end', { type: 'select', name: 'Assignee' });
          datasource.propertyAdd('end', { type: 'multi-select', name: 'Labels' });
          datasource.propertyAdd('end', { type: 'date', name: 'Due Date' });
          datasource.propertyAdd('end', { type: 'checkbox', name: 'Completed' });

          // Add Kanban layout (which automatically uses the Status column)
          datasource.viewManager.viewAdd('kanban');
        }
      }
    } catch (err) {
      console.error('[Boards] Error setting up native board:', err);
    } finally {
      release();
    }

    // Open the new board in workbench
    workbenchService.workbench.openDoc(docRecord.id);
  }, [boardDocs.length, docsService, workbenchService]);

  return (
    <>
      <ViewTitle title="Boards" />
      <ViewIcon icon="allDocs" />
      <ViewHeader>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0 24px', gap: '16px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '20px', color: 'var(--affine-text-primary-color, #121212)' }}>
            Project Boards
          </div>
          <div style={{ flex: 1 }} />
          {/* Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--affine-background-secondary-color, #f4f4f4)',
              border: '1px solid var(--affine-border-color, #e3e3e3)',
              borderRadius: '6px',
              padding: '4px 8px',
              gap: '6px',
              width: '240px',
            }}
          >
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
          {/* Create Board Button */}
          <button
            onClick={handleCreateBoard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--affine-brand-color, #1e96eb)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(30, 150, 235, 0.2)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--affine-brand-hover-color, #0f85d8)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--affine-brand-color, #1e96eb)';
            }}
          >
            <PlusIcon style={{ width: '14px', height: '14px' }} />
            Create Board
          </button>
        </div>
      </ViewHeader>

      <ViewBody>
        <div style={{ padding: '24px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Native Planka-like Features Guide Card */}
          <div
            style={{
              background: 'var(--affine-background-secondary-color, #f9f9f9)',
              border: '1px solid var(--affine-border-color, #e8e8e8)',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--affine-text-primary-color, #121212)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💡 Guía de Características en tus Tableros Nativos
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--affine-text-primary-color)' }}>📎 Archivos y Portadas</span>
                <span style={{ fontSize: '12px', color: 'var(--affine-text-secondary-color, #777)' }}>
                  Arrastra y suelta imágenes o PDFs directamente dentro de cualquier tarjeta para adjuntarlos.
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--affine-text-primary-color)' }}>💬 Comentarios y Notas</span>
                <span style={{ fontSize: '12px', color: 'var(--affine-text-secondary-color, #777)' }}>
                  Escribe descripciones con formato enriquecido y añade hilos de comentarios usando la barra nativa en tus tarjetas.
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--affine-text-primary-color)' }}>📅 Tareas y Checklists</span>
                <span style={{ fontSize: '12px', color: 'var(--affine-text-secondary-color, #777)' }}>
                  Escribe <code style={{background:'#e8e8e8', padding:'1px 4px', borderRadius:'3px'}}>/todo</code> en el cuerpo de la tarjeta para crear listas de tareas interactivas.
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--affine-text-primary-color)' }}>👥 Asignados y Fechas</span>
                <span style={{ fontSize: '12px', color: 'var(--affine-text-secondary-color, #777)' }}>
                  Usa las columnas pre-pobladas de la tarjeta para asignar miembros, poner fechas límite e hitos.
                </span>
              </div>
            </div>
          </div>

          {boardDocs.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                textAlign: 'center',
                gap: '16px',
                padding: '40px 0',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--affine-background-secondary-color, #f4f4f4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--affine-text-secondary-color, #8c8c8c)',
                }}
              >
                <NewIcon style={{ width: '32px', height: '32px' }} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontWeight: 600, fontSize: '18px' }}>
                  No boards found
                </h3>
                <p style={{ margin: 0, color: 'var(--affine-text-secondary-color, #8c8c8c)', fontSize: '14px' }}>
                  Create your first native board to organize your tasks offline-first.
                </p>
              </div>
              <button
                onClick={handleCreateBoard}
                style={{
                  background: 'var(--affine-brand-color, #1e96eb)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(30, 150, 235, 0.2)',
                  transition: 'background 0.2s',
                }}
              >
                Create First Board
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '16px',
              }}
            >
              {boardDocs.map((doc: DocRecord) => (
                <BoardCard
                  key={doc.id}
                  doc={doc}
                  onOpen={() => workbenchService.workbench.openDoc(doc.id)}
                  onDelete={() => doc.moveToTrash()}
                />
              ))}
            </div>
          )}
        </div>
      </ViewBody>
    </>
  );
};
