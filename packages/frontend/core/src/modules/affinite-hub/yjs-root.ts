/** Sube por la cadena de subdocs hasta el documento raíz del workspace. */
export function resolveRootYDoc<T extends { _item?: any } = any>(
  doc: T | null | undefined
): T | null | undefined {
  if (!doc) return doc;
  let current: any = doc;
  while (current?._item?.parent?.doc) {
    current = current._item.parent.doc;
  }
  return current as T;
}
