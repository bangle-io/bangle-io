// @vitest-environment happy-dom

import {
  basicSchema,
  bulletList,
  type GardState,
  history,
  Leaf,
  Wordgard,
} from '@bangle.io/wordgard-utils';
import { createStore } from 'jotai';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createEditorAtoms } from '../bridge';

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.();
  }
});

/** Wordgard flushes plugin updates on animation frames. */
function nextFlush(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function makeEditor(
  extension: GardState.Extension,
  doc = '<p>hello world</p>',
) {
  const parent = document.createElement('div');
  document.body.append(parent);
  const wg = Wordgard.create({
    parent,
    doc,
    config: [basicSchema(), bulletList(), history(), extension],
  });
  cleanups.push(() => {
    wg.dom.remove();
    parent.remove();
  });
  return wg;
}

describe('createEditorAtoms', () => {
  test('seeds atoms from the initial state before any update', () => {
    const store = createStore();
    const { atoms, extension } = createEditorAtoms({ store });
    makeEditor(extension);

    expect(store.get(atoms.focused)).toBe(false);
    // The default selection is a cursor at the start of the document,
    // which resolves to position 1: inside the first textblock.
    expect(store.get(atoms.selection)).toEqual({
      anchor: 1,
      head: 1,
      from: 1,
      to: 1,
      empty: true,
    });
    expect(store.get(atoms.canUndo)).toBe(false);
    expect(store.get(atoms.canRedo)).toBe(false);
  });

  test('updates selection and undo depth after transactions', async () => {
    const store = createStore();
    const { atoms, extension } = createEditorAtoms({ store });
    const wg = makeEditor(extension);

    wg.dispatch({
      changes: { from: 1, to: 1, insert: [Leaf.text('A')], fit: true },
      selection: { anchor: 2 },
    });
    await nextFlush();

    expect(store.get(atoms.selection).anchor).toBe(2);
    expect(store.get(atoms.canUndo)).toBe(true);
    expect(store.get(atoms.canRedo)).toBe(false);
  });

  test('equality guards suppress notifications for irrelevant updates', async () => {
    const store = createStore();
    const { atoms, extension } = createEditorAtoms({ store });
    const wg = makeEditor(extension);
    await nextFlush();

    const selectionListener = vi.fn();
    const unsubscribe = store.sub(atoms.selection, selectionListener);
    cleanups.push(unsubscribe);

    // A transaction that neither moves the selection nor changes the doc.
    wg.dispatch({});
    await nextFlush();

    expect(selectionListener).not.toHaveBeenCalled();
  });

  test('state queries are exposed through the active atom', async () => {
    const store = createStore();
    const { atoms, extension } = createEditorAtoms({
      store,
      queries: { strongActive: (state) => state.selection.empty },
    });
    makeEditor(extension);

    expect(store.get(atoms.active)).toEqual({ strongActive: true });
  });

  test('two editors never share atom state', async () => {
    const store = createStore();
    const first = createEditorAtoms({ store });
    const second = createEditorAtoms({ store });
    const wg1 = makeEditor(first.extension);
    makeEditor(second.extension);

    wg1.dispatch({
      changes: { from: 1, to: 1, insert: [Leaf.text('A')], fit: true },
      selection: { anchor: 2 },
    });
    await nextFlush();

    expect(store.get(first.atoms.selection).anchor).toBe(2);
    expect(store.get(second.atoms.selection).anchor).toBe(1);
  });
});
