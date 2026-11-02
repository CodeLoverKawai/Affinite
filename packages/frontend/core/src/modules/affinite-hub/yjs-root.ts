import type * as Y from 'yjs';

/** Sube por la cadena de subdocs hasta el documento raíz del workspace. */
export function resolveRootYDoc(doc: Y.Doc | any): any {
  if (!doc) return doc;
  let current = doc;
  while (current?._item?.parent?.doc) {
    current = current._item.parent.doc;
  }
  return current;
}
