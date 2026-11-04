import {
  AFFINITE_YMAP_BOARD,
  AFFINITE_YMAP_HABITS,
  normalizeHabitId,
  resolveRootYDoc,
} from '@affine/core/modules/affinite-hub';

/**
 * Helper to determine if a column title represents a completed/done state.
 * Matches: complet, hech, finaliz, done, terminad, finish (case-insensitive).
 */
export function isDoneColumnName(name?: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  const trimmed = name.trim();
  if (/^(not\s+|no\s+|sin\s+|un|in)/i.test(trimmed)) {
    return false;
  }
  return /\b(done|finish|finished)\b|complet|hech|finaliz|terminad/i.test(trimmed);
}

/**
 * Toggles completion for a habit on a specific date in Yjs CRDT storage.
 *
 * - Resolves the root Y.Doc via `doc = rootDocOrWrapper?.yDoc ?? rootDocOrWrapper?.doc ?? rootDocOrWrapper`
 *   and `resolveRootYDoc(doc)`.
 * - Reads `affinite_habits_v1` map and parses `habits` array.
 * - Normalizes `targetHabitId = normalizeHabitId(habitId)`.
 * - Toggles quantitative vs boolean habits according to their specification.
 * - Updates Y.Doc atomically inside `doc.transact(() => { yMap.set('habits', JSON.stringify(list)); })`.
 * - Returns the new completion state (boolean).
 */
export function toggleHabitCompletionInYjs(
  rootDocOrWrapper: any,
  habitId: string,
  dateStr: string
): boolean {
  if (!rootDocOrWrapper || !habitId || !dateStr) {
    return false;
  }

  const rawDoc =
    rootDocOrWrapper?.yDoc ?? rootDocOrWrapper?.doc ?? rootDocOrWrapper;
  const resolvedDoc =
    typeof rawDoc?.getMap === 'function'
      ? (resolveRootYDoc(rawDoc) ?? rawDoc)
      : null;

  if (!resolvedDoc || typeof resolvedDoc.getMap !== 'function') {
    return false;
  }

  const yMap = resolvedDoc.getMap(AFFINITE_YMAP_HABITS);
  if (!yMap || typeof yMap.get !== 'function') {
    return false;
  }

  const rawHabits = yMap.get('habits');
  if (!rawHabits) {
    return false;
  }

  let list: any[] = [];
  if (typeof rawHabits === 'string') {
    try {
      const parsed = JSON.parse(rawHabits);
      if (Array.isArray(parsed)) {
        list = parsed;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  } else if (Array.isArray(rawHabits)) {
    list = rawHabits;
  } else {
    return false;
  }

  const rawTarget = habitId.endsWith(`-${dateStr}`)
    ? habitId.slice(0, -(dateStr.length + 1))
    : habitId;
  const targetHabitId = normalizeHabitId(rawTarget);

  const habit = list.find((h: any) => {
    if (!h || typeof h !== 'object') return false;
    const hid = String(h.id ?? '');
    const normH = normalizeHabitId(hid);
    return (
      normH === targetHabitId ||
      hid === rawTarget ||
      hid === habitId ||
      normH === habitId ||
      normH.replace(/^habit-/, '') === targetHabitId.replace(/^habit-/, '') ||
      hid.replace(/^habit-/, '') === rawTarget.replace(/^habit-/, '')
    );
  });

  if (!habit) {
    return false;
  }

  if (!habit.entries || typeof habit.entries !== 'object') {
    habit.entries = {};
  }

  let newCompletionState = false;

  if (habit.type === 'quantitative') {
    const target =
      typeof habit.targetValue === 'number' && habit.targetValue > 0
        ? habit.targetValue
        : 1;
    const currentVal = habit.entries[dateStr];
    if (typeof currentVal === 'number' && currentVal >= target) {
      delete habit.entries[dateStr];
      newCompletionState = false;
    } else {
      habit.entries[dateStr] = target;
      newCompletionState = true;
    }
  } else {
    const currentVal = habit.entries[dateStr];
    if (currentVal) {
      delete habit.entries[dateStr];
      newCompletionState = false;
    } else {
      habit.entries[dateStr] = true;
      newCompletionState = true;
    }
  }

  const executeUpdate = () => {
    yMap.set('habits', JSON.stringify(list));
  };

  if (typeof resolvedDoc.transact === 'function') {
    resolvedDoc.transact(executeUpdate);
  } else {
    executeUpdate();
  }

  return newCompletionState;
}

/**
 * Toggles completion for a board card in Yjs CRDT storage.
 *
 * - Resolves `doc = boardDocOrWrapper?.yDoc ?? boardDocOrWrapper?.doc ?? boardDocOrWrapper`.
 * - Reads `board_data` map, parses `columns` and `cards`.
 * - Finds target card by `cardId` (matching direct or prefixed `board-` ID).
 * - If card has checklist items (`card.checklist?.length > 0`):
 *   - If all are completed, sets all to `completed: false`.
 *   - If not all are completed, sets all to `completed: true`.
 *   - Updates card in `cards` list and saves back `yMap.set('cards', JSON.stringify(cards))`.
 *   - Returns boolean indicating if checklist is now all completed.
 * - Else (no checklist):
 *   - Identifies if current column is done (`isDoneColumnName(currentCol.title)`).
 *   - If currently done, moves `card.columnId` to first non-done column.
 *   - If not done, moves `card.columnId` to a done column (or creates 'Done' column if none exists).
 *   - Saves back `yMap.set('cards', JSON.stringify(cards))` and `yMap.set('columns', JSON.stringify(columns))`.
 *   - Returns `!currentlyDone`.
 */
export function toggleBoardCardCompletionInYjs(
  boardDocOrWrapper: any,
  cardId: string
): boolean {
  if (!boardDocOrWrapper || !cardId) {
    return false;
  }

  const doc =
    boardDocOrWrapper?.yDoc ?? boardDocOrWrapper?.doc ?? boardDocOrWrapper;
  if (!doc || typeof doc.getMap !== 'function') {
    return false;
  }

  const yMap = doc.getMap(AFFINITE_YMAP_BOARD);
  if (!yMap || typeof yMap.get !== 'function') {
    return false;
  }

  const rawCards = yMap.get('cards');
  if (!rawCards) {
    return false;
  }

  let cards: any[] = [];
  if (typeof rawCards === 'string') {
    try {
      const parsed = JSON.parse(rawCards);
      if (Array.isArray(parsed)) {
        cards = parsed;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  } else if (Array.isArray(rawCards)) {
    cards = rawCards;
  } else {
    return false;
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

  const targetId = String(cardId);
  const card = cards.find((c: any) => {
    if (!c || typeof c !== 'object') return false;
    const cid = String(c.id ?? '');
    return (
      cid === targetId ||
      `board-${cid}` === targetId ||
      cid === targetId.replace(/^board-/, '')
    );
  });

  if (!card) {
    return false;
  }

  if (Array.isArray(card.checklist) && card.checklist.length > 0) {
    const allCompleted = card.checklist.every((item: any) =>
      Boolean(item?.completed)
    );
    const newChecklistState = !allCompleted;

    for (const item of card.checklist) {
      if (item && typeof item === 'object') {
        item.completed = newChecklistState;
      }
    }

    if ('completed' in card) card.completed = newChecklistState;
    if ('done' in card) card.done = newChecklistState;
    if ('isDone' in card) card.isDone = newChecklistState;

    const executeUpdate = () => {
      yMap.set('cards', JSON.stringify(cards));
    };

    if (typeof doc.transact === 'function') {
      doc.transact(executeUpdate);
    } else {
      executeUpdate();
    }

    return newChecklistState;
  }

  const currentCol = columns.find((c: any) => c && c.id === card.columnId);
  const currentlyDone = currentCol ? isDoneColumnName(currentCol.title) : false;

  let nextColumns = [...columns];
  let targetColId = card.columnId;

  if (currentlyDone) {
    const firstTodoCol = nextColumns.find(
      (c: any) => c && !isDoneColumnName(c.title)
    );
    if (firstTodoCol) {
      targetColId = firstTodoCol.id;
    } else {
      const todoCol = { id: `col-${Date.now()}`, title: 'To Do' };
      nextColumns.push(todoCol);
      targetColId = todoCol.id;
    }
  } else {
    let doneCol = nextColumns.find((c: any) => c && isDoneColumnName(c.title));
    if (!doneCol) {
      doneCol = { id: `col-${Date.now()}`, title: 'Done' };
      nextColumns.push(doneCol);
    }
    targetColId = doneCol.id;
  }

  card.columnId = targetColId;
  const newDoneState = !currentlyDone;

  if ('completed' in card) card.completed = newDoneState;
  if ('done' in card) card.done = newDoneState;
  if ('isDone' in card) card.isDone = newDoneState;

  const executeUpdate = () => {
    yMap.set('cards', JSON.stringify(cards));
    yMap.set('columns', JSON.stringify(nextColumns));
  };

  if (typeof doc.transact === 'function') {
    doc.transact(executeUpdate);
  } else {
    executeUpdate();
  }

  return newDoneState;
}
