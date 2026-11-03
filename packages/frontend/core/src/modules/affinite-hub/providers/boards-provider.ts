import { CATEGORY_COLORS, normalizeCategory } from '../categories';
import { AFFINITE_YMAP_BOARD } from '../keys';
import type { DatedItem } from '../types';

function isDoneColumnName(name?: string): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return (
    n === 'done' ||
    n === 'completado' ||
    n === 'completadas' ||
    n === 'hecho' ||
    n === 'finalizado' ||
    n.includes('done') ||
    n.includes('complet')
  );
}

function isCardDone(card: any, columnTitle?: string): boolean {
  if (card.done === true || card.completed === true || card.isDone === true) {
    return true;
  }
  if (isDoneColumnName(columnTitle)) {
    return true;
  }
  if (Array.isArray(card.checklist) && card.checklist.length > 0) {
    return card.checklist.every((item: any) => Boolean(item?.completed));
  }
  return false;
}

export function extractBoardDatedItems(
  boardDocOrYDoc: any,
  boardId?: string
): DatedItem[] {
  if (!boardDocOrYDoc) {
    return [];
  }

  try {
    const yDoc =
      boardDocOrYDoc.spaceDoc ??
      boardDocOrYDoc.yDoc ??
      boardDocOrYDoc.doc ??
      boardDocOrYDoc;
    if (!yDoc || typeof yDoc.getMap !== 'function') {
      return [];
    }

    const yMap = yDoc.getMap(AFFINITE_YMAP_BOARD);
    if (!yMap) {
      return [];
    }

    const rawCards = yMap.get('cards');
    if (!rawCards) {
      return [];
    }

    let cards: any[] = [];
    if (typeof rawCards === 'string') {
      try {
        const parsed = JSON.parse(rawCards);
        if (Array.isArray(parsed)) {
          cards = parsed;
        } else {
          return [];
        }
      } catch {
        return [];
      }
    } else if (Array.isArray(rawCards)) {
      cards = rawCards;
    } else {
      return [];
    }

    const rawCols = yMap.get('columns');
    let columns: any[] = [];
    if (typeof rawCols === 'string') {
      try {
        const parsed = JSON.parse(rawCols);
        if (Array.isArray(parsed)) {
          columns = parsed;
        }
      } catch {
        columns = [];
      }
    } else if (Array.isArray(rawCols)) {
      columns = rawCols;
    }

    const colMap = new Map<string, string>();
    for (const col of columns) {
      if (col && typeof col === 'object' && col.id) {
        colMap.set(col.id, col.title || '');
      }
    }

    const effectiveBoardId =
      boardId ||
      (typeof boardDocOrYDoc?.id === 'string' ? boardDocOrYDoc.id : undefined);

    const result: DatedItem[] = [];

    for (const card of cards) {
      if (
        !card ||
        typeof card !== 'object' ||
        !card.dueDate ||
        typeof card.dueDate !== 'string'
      ) {
        continue;
      }

      const columnTitle = colMap.get(card.columnId);
      const isDone = isCardDone(card, columnTitle);
      const categoryRaw =
        card.category || (Array.isArray(card.labels) ? card.labels[0] : null);
      const category = normalizeCategory(categoryRaw);
      const color = CATEGORY_COLORS[category];
      const allDay = !card.dueDate.includes('T');
      const href = effectiveBoardId
        ? `/boards?boardId=${effectiveBoardId}`
        : '/boards';

      const rawId = String(card.id ?? '');
      const cleanCardId = rawId.startsWith('board-') ? rawId : `board-${rawId}`;

      result.push({
        id: cleanCardId,
        source: 'board',
        title: card.title || '',
        start: card.dueDate,
        end: undefined,
        allDay,
        category,
        color,
        done: Boolean(isDone),
        href,
        metadata: {
          cardId: card.id,
          columnId: card.columnId,
          boardId: effectiveBoardId,
        },
      });
    }

    return result;
  } catch {
    return [];
  }
}
