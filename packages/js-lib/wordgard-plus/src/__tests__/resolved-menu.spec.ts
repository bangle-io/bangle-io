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
import type { ResolvedMenuButton, ResolvedMenuNode } from '../resolved-menu';
import { createMenuAtoms } from '../resolved-menu';

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.();
  }
});

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

function allButtons(nodes: readonly ResolvedMenuNode[]): ResolvedMenuButton[] {
  const buttons: ResolvedMenuButton[] = [];
  for (const node of nodes) {
    if (node.kind === 'button') {
      buttons.push(node);
    } else if (node.kind === 'submenu') {
      buttons.push(...allButtons(node.items));
    }
  }
  return buttons;
}

function findButton(
  nodes: readonly ResolvedMenuNode[],
  match: RegExp,
): ResolvedMenuButton {
  const button = allButtons(nodes).find(
    (candidate) =>
      (candidate.description && match.test(candidate.description)) ||
      (candidate.label && match.test(candidate.label)),
  );
  if (!button) {
    throw new Error(`No menu button matching ${match}`);
  }
  return button;
}

describe('createMenuAtoms', () => {
  test('projects the first-party menu items registered by extension bundles', () => {
    const store = createStore();
    const { atoms, extension } = createMenuAtoms({ store });
    makeEditor(extension);

    const items = store.get(atoms.items);
    expect(items.length).toBeGreaterThan(0);

    // Buttons contributed by basicSchema / bulletList / history bundles.
    expect(() => findButton(items, /strong/i)).not.toThrow();
    expect(() => findButton(items, /list/i)).not.toThrow();
    expect(() => findButton(items, /undo/i)).not.toThrow();
  });

  test('a projected run() dispatches the button command and re-projects state', async () => {
    const store = createStore();
    const { atoms, extension } = createMenuAtoms({ store });
    makeEditor(extension);

    const strongBefore = findButton(store.get(atoms.items), /strong/i);
    expect(strongBefore.active).toBe(false);

    // Toggling strong at the cursor adds the mark to the active marks.
    strongBefore.run();
    await nextFlush();

    const strongAfter = findButton(store.get(atoms.items), /strong/i);
    expect(strongAfter.active).toBe(true);
  });

  test('enabled state follows the editor, e.g. undo after a document change', async () => {
    const store = createStore();
    const { atoms, extension } = createMenuAtoms({ store });
    const wg = makeEditor(extension);

    expect(findButton(store.get(atoms.items), /undo/i).enabled).toBe(false);

    wg.dispatch({
      changes: { from: 1, to: 1, insert: [Leaf.text('A')], fit: true },
      userEvent: 'input.type',
    });
    await nextFlush();

    expect(findButton(store.get(atoms.items), /undo/i).enabled).toBe(true);
  });

  test('the items atom only notifies when something visible changed', async () => {
    const store = createStore();
    const { atoms, extension } = createMenuAtoms({ store });
    const wg = makeEditor(extension);
    await nextFlush();

    const listener = vi.fn();
    cleanups.push(store.sub(atoms.items, listener));

    // No doc/selection change and no updateFor-relevant transaction.
    wg.dispatch({});
    await nextFlush();
    expect(listener).not.toHaveBeenCalled();

    wg.dispatch({
      changes: { from: 1, to: 1, insert: [Leaf.text('A')], fit: true },
      userEvent: 'input.type',
    });
    await nextFlush();
    // Undo becomes available -> visible change -> exactly one notification.
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
