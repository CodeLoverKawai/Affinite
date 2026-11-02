import { describe, expect, test } from 'vitest';
import * as Y from 'yjs';

import { resolveRootYDoc } from '../yjs-root';

describe('resolveRootYDoc', () => {
  test('un subdoc resuelve al documento raíz', () => {
    const root = new Y.Doc();
    const page = new Y.Doc();
    root.getMap('spaces').set('page1', page);
    expect(resolveRootYDoc(page)).toBe(root);
  });
  test('el raíz se resuelve a sí mismo', () => {
    const root = new Y.Doc();
    expect(resolveRootYDoc(root)).toBe(root);
  });
  test('escribir vía raíz resuelto es visible en el mapa de /habits', () => {
    const root = new Y.Doc();
    const page = new Y.Doc();
    root.getMap('spaces').set('p', page);
    resolveRootYDoc(page).getMap('affinite_habits_v1').set('habits', '[]');
    expect(root.getMap('affinite_habits_v1').get('habits')).toBe('[]');
  });
  test('maneja null o undefined sin error', () => {
    expect(resolveRootYDoc(null)).toBeNull();
    expect(resolveRootYDoc(undefined)).toBeUndefined();
  });
  test('subdoc anidado en múltiples niveles resuelve al documento raíz', () => {
    const root = new Y.Doc();
    const parentSubdoc = new Y.Doc();
    const childSubdoc = new Y.Doc();
    root.getMap('spaces').set('level1', parentSubdoc);
    parentSubdoc.getMap('spaces').set('level2', childSubdoc);
    expect(resolveRootYDoc(childSubdoc)).toBe(root);
  });
});
