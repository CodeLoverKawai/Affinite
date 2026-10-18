import { describe, expect, it } from 'vitest';

import {
  getJournalDocInfo,
  isJournalDoc,
} from '@blocksuite/affine-widget-slash-menu';

describe('Habits Slash Menu Scoping & Journal Detection', () => {
  it('detects a daily journal doc from title and extracts the date', () => {
    const std = {
      store: {
        doc: {
          id: 'doc-1',
          meta: { title: '2026-10-18' },
        },
      },
    };

    const info = getJournalDocInfo(std);
    expect(info.isJournal).toBe(true);
    expect(info.dateStr).toBe('2026-10-18');
    expect(isJournalDoc(std)).toBe(true);
  });

  it('detects a weekly journal doc from title and allows habit invocation', () => {
    const std = {
      store: {
        doc: {
          id: 'doc-2',
          meta: {
            title: '2026-W42 · Semana 42 (12 oct – 18 oct)',
          },
        },
      },
    };

    const info = getJournalDocInfo(std);
    expect(info.isJournal).toBe(true);
    expect(info.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isJournalDoc(std)).toBe(true);
  });

  it('rejects regular docs so habits do not appear in non-journal pages', () => {
    const std = {
      store: {
        doc: {
          id: 'doc-3',
          meta: { title: 'Especificación de Arquitectura de Affinite' },
        },
      },
    };

    const info = getJournalDocInfo(std);
    expect(info.isJournal).toBe(false);
    expect(info.dateStr).toBe('');
    expect(isJournalDoc(std)).toBe(false);
  });

  it('detects a journal doc even if title was changed, via rootDoc pageProperties', () => {
    const pagePropertiesMap = new Map();
    pagePropertiesMap.set('doc-custom', {
      system: { journal: { value: '2026-10-15' } },
    });

    const rootDoc = {
      getMap: (key: string) => {
        if (key === 'affine:workspace-properties') {
          return {
            get: (prop: string) => {
              if (prop === 'pageProperties') {
                return pagePropertiesMap;
              }
              return undefined;
            },
          };
        }
        return undefined;
      },
    };

    const std = {
      store: {
        doc: {
          id: 'doc-custom',
          meta: { title: 'Notas de la Reunión del Jueves' },
          rootDoc,
        },
      },
    };

    const info = getJournalDocInfo(std);
    expect(info.isJournal).toBe(true);
    expect(info.dateStr).toBe('2026-10-15');
    expect(isJournalDoc(std)).toBe(true);
  });
});
