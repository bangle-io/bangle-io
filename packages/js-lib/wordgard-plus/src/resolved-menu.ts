import {
  Command,
  type GardState,
  Menu,
  type Transaction,
  Wordgard,
} from '@bangle.io/wordgard-utils';
import { type Atom, atom } from 'jotai';
import { useAtomValue } from 'jotai/react';
import type { JotaiStore } from './bridge';

/**
 * A first-party menu item projected to plain data a React renderer can
 * consume. `run`/`mount` are the only non-data members; everything else is
 * comparable so the atom only notifies when something visible changed.
 */
export type ResolvedMenuNode =
  | ResolvedMenuButton
  | ResolvedMenuSeparator
  | ResolvedMenuSubmenu
  | ResolvedMenuCustom;

export type ResolvedMenuButton = {
  kind: 'button';
  /** Stable identity derived from the item's position in the menu tree. */
  key: string;
  /** Resolved textual label, when the item's label is textual. */
  label: string | null;
  /** SVG path (100x100 viewBox) when the item's label is an icon. */
  icon: string | null;
  /** Resolved description for tooltips / screen readers. */
  description: string | null;
  active: boolean;
  enabled: boolean;
  /** Dispatches the button's command against the live editor. */
  run: () => void;
};

export type ResolvedMenuSeparator = { kind: 'separator'; key: string };

export type ResolvedMenuSubmenu = {
  kind: 'submenu';
  key: string;
  label: string | null;
  icon: string | null;
  description: string | null;
  enabled: boolean;
  items: readonly ResolvedMenuNode[];
};

/**
 * A {@link Menu.CustomControl} manages its own DOM; the projection exposes
 * a mount function and leaves rendering to the consumer.
 */
export type ResolvedMenuCustom = {
  kind: 'custom';
  key: string;
  description: string | null;
  enabled: boolean;
  mount: (done: () => void) => { dom: HTMLElement; focus?: HTMLElement };
};

type ResolvedLabel = { label: string | null; icon: string | null };

function projectLabel(
  label: Menu.Label | undefined,
  state: GardState,
): ResolvedLabel {
  if (label === undefined) {
    return { label: null, icon: null };
  }
  if (typeof label === 'string') {
    return { label, icon: null };
  }
  if (typeof label === 'function') {
    return { label: label(state), icon: null };
  }
  return { label: null, icon: label.icon };
}

function projectDescription(
  description:
    | string
    | ((state: GardState, ...insert: unknown[]) => string)
    | undefined,
  fallback: string | null,
  state: GardState,
): string | null {
  if (description === undefined) {
    return fallback;
  }
  return typeof description === 'string' ? description : description(state);
}

/**
 * Mirrors the stock renderer's submenu-label behavior: an explicit label
 * wins, else the first active button child's label, else the default label.
 */
function submenuLabel(
  submenu: Menu.Submenu,
  content: readonly ResolvedMenuNode[],
  state: GardState,
): ResolvedLabel {
  if (submenu.label !== undefined) {
    return projectLabel(submenu.label, state);
  }
  const activeChild = content.find(
    (node): node is ResolvedMenuButton => node.kind === 'button' && node.active,
  );
  if (activeChild) {
    return { label: activeChild.label, icon: activeChild.icon };
  }
  return projectLabel(submenu.defaultLabel, state);
}

function projectItems(
  items: readonly Menu.Item.Resolved[],
  wg: Wordgard,
  state: GardState,
  parentKey: string,
): readonly ResolvedMenuNode[] {
  const nodes: ResolvedMenuNode[] = [];
  items.forEach((item, index) => {
    const key = parentKey === '' ? `${index}` : `${parentKey}.${index}`;
    if (item === '|') {
      nodes.push({ kind: 'separator', key });
      return;
    }
    if (item instanceof Menu.Button) {
      if (item.select && !item.select(state)) {
        return;
      }
      const { label, icon } = projectLabel(item.label, state);
      const run = item.run;
      nodes.push({
        kind: 'button',
        key,
        label,
        icon,
        description: projectDescription(item.description, label, state),
        active: item.active ? item.active(state) : false,
        enabled: item.enable ? item.enable(state) : true,
        run: () => {
          Command.dispatch(wg, run);
        },
      });
      return;
    }
    if (item instanceof Menu.CustomControl) {
      if (item.select && !item.select(state)) {
        return;
      }
      nodes.push({
        kind: 'custom',
        key,
        description: projectDescription(item.description, null, state),
        enabled: item.enable ? item.enable(state) : true,
        mount: (done) => item.render(wg, done),
      });
      return;
    }
    // Menu.Submenu.Resolved
    if (item.item.select && !item.item.select(state)) {
      return;
    }
    const content = projectItems(item.content, wg, state, key);
    const { label, icon } = submenuLabel(item.item, content, state);
    nodes.push({
      kind: 'submenu',
      key,
      label,
      icon,
      description: projectDescription(item.item.description, label, state),
      enabled: item.item.enable ? item.item.enable(state) : true,
      items: content,
    });
  });
  return nodes;
}

function nodeEqual(nodeA: ResolvedMenuNode, nodeB: ResolvedMenuNode): boolean {
  if (nodeA.key !== nodeB.key) {
    return false;
  }
  switch (nodeA.kind) {
    case 'separator':
      return nodeB.kind === 'separator';
    case 'custom':
      return (
        nodeB.kind === 'custom' &&
        nodeA.description === nodeB.description &&
        nodeA.enabled === nodeB.enabled
      );
    case 'button':
      return (
        nodeB.kind === 'button' &&
        nodeA.label === nodeB.label &&
        nodeA.icon === nodeB.icon &&
        nodeA.description === nodeB.description &&
        nodeA.active === nodeB.active &&
        nodeA.enabled === nodeB.enabled
      );
    case 'submenu':
      return (
        nodeB.kind === 'submenu' &&
        nodeA.label === nodeB.label &&
        nodeA.icon === nodeB.icon &&
        nodeA.description === nodeB.description &&
        nodeA.enabled === nodeB.enabled &&
        nodesEqual(nodeA.items, nodeB.items)
      );
  }
}

function nodesEqual(
  a: readonly ResolvedMenuNode[],
  b: readonly ResolvedMenuNode[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((nodeA, index) => {
    const nodeB = b[index];
    return nodeB !== undefined && nodeEqual(nodeA, nodeB);
  });
}

function collectUpdateFor(
  items: readonly Menu.Item.Resolved[],
  into: Array<(tr: Transaction) => boolean>,
): void {
  for (const item of items) {
    if (item === '|') {
      continue;
    }
    if (item instanceof Menu.Button || item instanceof Menu.CustomControl) {
      if (item.updateFor) {
        into.push(item.updateFor);
      }
      continue;
    }
    if (item.item.updateFor) {
      into.push(item.item.updateFor);
    }
    collectUpdateFor(item.content, into);
  }
}

export type MenuAtoms = {
  /** The resolved menu tree, projected to plain data. */
  items: Atom<readonly ResolvedMenuNode[]>;
};

/**
 * Resolves the first-party menu model — the items feature bundles register
 * on the {@link Menu.Item.source} facet, shaped by an optional
 * {@link Menu.Template} — into a Jotai atom of plain data, re-evaluated the
 * way the stock menu bar does it: on document/selection changes plus any
 * transaction an item's `updateFor` marks as relevant.
 *
 * This never forks a parallel menu-item registry: the tree comes from
 * `Menu.resolve` over the editor's own configuration, so custom React
 * toolbars stay in sync with keyboard shortcuts and the stock `menuBar`.
 *
 * Like {@link createEditorAtoms}, this returns an `extension` for the
 * consumer's own `Wordgard.create` config and never wraps the editor.
 */
export function createMenuAtoms(config: {
  store: JotaiStore;
  template?: Menu.Template | readonly Menu.Template[];
}): {
  atoms: MenuAtoms;
  /** Add this to the editor's `Wordgard.create` config. */
  extension: GardState.Extension;
} {
  const { store, template } = config;

  const $items = atom<readonly ResolvedMenuNode[]>([]);

  const plugin = Wordgard.Plugin.define((wg) => {
    const resolved = Menu.resolve(wg.state.facet(Menu.Item.source), template);
    const updateFor: Array<(tr: Transaction) => boolean> = [];
    collectUpdateFor(resolved, updateFor);

    const project = (state: GardState) => {
      const next = projectItems(resolved, wg, state, '');
      if (!nodesEqual(store.get($items), next)) {
        store.set($items, next);
      }
    };

    project(wg.state);
    return {
      update: (update: Wordgard.Update) => {
        const relevant =
          update.docChanged ||
          update.selectionSet ||
          update.transactions.some((tr) =>
            updateFor.some((predicate) => predicate(tr)),
          );
        if (relevant) {
          project(update.state);
        }
      },
    };
  });

  return { atoms: { items: $items }, extension: plugin.extension };
}

/**
 * Convenience hook over {@link createMenuAtoms}: subscribes to the resolved
 * menu in the store the atoms were created with.
 */
export function useResolvedMenu(
  menu: MenuAtoms,
  store: JotaiStore,
): readonly ResolvedMenuNode[] {
  return useAtomValue(menu.items, { store });
}
