import { collection } from '../common';
import {
  AllSelection,
  type Command,
  type EditorState,
  type EditorView,
  Plugin,
  PluginKey,
  type Selection,
  TextSelection,
} from '../pm';
import {
  createVirtualElementFromSelection,
  type VirtualElement,
} from '../pm-utils';
import { store } from '../store';

export type SelectionMenuState = {
  from: number;
  to: number;
  anchorEl: () => VirtualElement | null;
};

type DismissedSelection = {
  anchor: number;
  head: number;
};

const selectionMenuKey = new PluginKey<DismissedSelection | undefined>(
  'selection-menu',
);
const dismissMeta = 'dismiss-selection-menu';
type SelectionMenuStates = ReadonlyMap<EditorView, SelectionMenuState>;
const $internalSelectionMenu = store.atom<SelectionMenuStates>(new Map());

export const $selectionMenu = store.atom((get) => get($internalSelectionMenu));

function setSelectionMenuForView(
  state: EditorState,
  view: EditorView,
  value: SelectionMenuState | undefined,
) {
  const current = store.get(state, $internalSelectionMenu);
  if (value === undefined && !current.has(view)) {
    return;
  }

  const next = new Map(current);
  if (value) {
    next.set(view, value);
  } else {
    next.delete(view);
  }
  store.set(state, $internalSelectionMenu, next);
}

function endpointIsInCodeBlock(selection: Selection): boolean {
  return [selection.$from, selection.$to].some(($pos) => {
    for (let depth = $pos.depth; depth > 0; depth--) {
      if ($pos.node(depth).type.spec.code) {
        return true;
      }
    }
    return false;
  });
}

function selectionContainsEligibleInlineContent(selection: Selection): boolean {
  let containsEligibleInline = false;
  selection.$from.doc.nodesBetween(selection.from, selection.to, (node) => {
    if (node.type.spec.code) {
      return false;
    }
    if (node.isInline) {
      containsEligibleInline = true;
      return false;
    }
    return !containsEligibleInline;
  });
  return containsEligibleInline;
}

function selectionMenuPlugin() {
  return new Plugin<DismissedSelection | undefined>({
    key: selectionMenuKey,
    state: {
      init: () => undefined,
      apply(transaction, dismissed, oldState, newState) {
        const meta = transaction.getMeta(selectionMenuKey) as
          | typeof dismissMeta
          | undefined;
        if (meta === dismissMeta) {
          const { anchor, head } = newState.selection;
          return { anchor, head };
        }
        if (!oldState.selection.eq(newState.selection)) {
          return undefined;
        }
        return dismissed;
      },
    },
    props: {
      handleKeyDown(view, event) {
        if (event.key !== 'Escape') {
          return false;
        }
        if (!store.get(view.state, $internalSelectionMenu).has(view)) {
          return false;
        }
        view.dispatch(view.state.tr.setMeta(selectionMenuKey, dismissMeta));
        return true;
      },
    },
    view(view) {
      const clearOwnedState = () =>
        setSelectionMenuForView(view.state, view, undefined);

      const sync = () => {
        const { selection } = view.state;
        const dismissed = selectionMenuKey.getState(view.state);

        if (
          !view.editable ||
          !(
            selection instanceof TextSelection ||
            selection instanceof AllSelection
          ) ||
          selection.empty ||
          endpointIsInCodeBlock(selection) ||
          !selectionContainsEligibleInlineContent(selection) ||
          (dismissed?.anchor === selection.anchor &&
            dismissed.head === selection.head)
        ) {
          clearOwnedState();
          return;
        }

        const { from, to } = selection;
        const anchorEl = () =>
          createVirtualElementFromSelection(view, from, to);
        if (!anchorEl()) {
          clearOwnedState();
          return;
        }

        setSelectionMenuForView(view.state, view, { from, to, anchorEl });
      };

      // Plugin views are not guaranteed to receive an update immediately.
      sync();

      return {
        update: sync,
        destroy: clearOwnedState,
      };
    },
  });
}

/** Dismisses the current selection menu until the selection changes. */
export function dismissSelectionMenu(): Command {
  return (state, dispatch, view) => {
    const menus = store.get(state, $internalSelectionMenu);
    const owner =
      view && view.state === state
        ? view
        : [...menus.keys()].find((candidate) => candidate.state === state);
    if (!owner || !menus.has(owner)) {
      return false;
    }
    dispatch?.(state.tr.setMeta(selectionMenuKey, dismissMeta));
    return true;
  };
}

export function setupSelectionMenu() {
  return collection({
    id: 'selection-menu',
    plugin: {
      selectionMenu: selectionMenuPlugin(),
    },
    command: {
      dismissSelectionMenu,
    },
    $selectionMenu,
  });
}
