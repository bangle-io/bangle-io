import { collection } from '../common';
import {
  type Command,
  type EditorState,
  type EditorView,
  isInTable,
  Plugin,
  PluginKey,
  selectedRect,
} from '../pm';
import {
  createVirtualElementFromRange,
  type VirtualElement,
} from '../pm-utils';
import { store } from '../store';

export type TableMenuState = {
  show: boolean;
  // Start position of the table node, used to key menu identity.
  tablePos: number;
  anchorEl: () => VirtualElement | null;
};

type DismissedTable = {
  tablePos: number;
};

const tableMenuKey = new PluginKey<DismissedTable | undefined>('table-menu');
const dismissMeta = 'dismiss-table-menu';

type TableMenuStates = ReadonlyMap<EditorView, TableMenuState>;

// Menu state is keyed by view because every editor shares the application store.
const $internalTableMenu = store.atom<TableMenuStates>(new Map());

export const $tableMenu = store.atom((get) => get($internalTableMenu));

function setTableMenuForView(
  state: EditorState,
  view: EditorView,
  value: TableMenuState | undefined,
) {
  const current = store.get(state, $internalTableMenu);
  if (value === undefined && !current.has(view)) {
    return;
  }

  const next = new Map(current);
  if (value) {
    next.set(view, value);
  } else {
    next.delete(view);
  }
  store.set(state, $internalTableMenu, next);
}

/**
 * Tracks whether the selection sits inside a table and exposes the table's
 * position and DOM anchor so React can render row/column controls next to it.
 */
function tableMenuPlugin() {
  return new Plugin<DismissedTable | undefined>({
    key: tableMenuKey,
    state: {
      init: () => undefined,
      apply(transaction, dismissed, _oldState, newState) {
        const meta = transaction.getMeta(tableMenuKey) as
          | typeof dismissMeta
          | undefined;
        if (meta === dismissMeta) {
          if (!isInTable(newState)) {
            return undefined;
          }
          return { tablePos: selectedRect(newState).tableStart - 1 };
        }
        if (dismissed && !transaction.doc.eq(transaction.before)) {
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
        if (!store.get(view.state, $internalTableMenu).has(view)) {
          return false;
        }
        view.dispatch(view.state.tr.setMeta(tableMenuKey, dismissMeta));
        return true;
      },
    },
    view(view) {
      const clearOwnedState = () =>
        setTableMenuForView(view.state, view, undefined);

      const sync = () => {
        const { state } = view;

        if (!view.editable || !isInTable(state)) {
          clearOwnedState();
          return;
        }

        const rect = selectedRect(state);
        const tablePos = rect.tableStart - 1;
        const dismissed = tableMenuKey.getState(state);
        if (dismissed?.tablePos === tablePos) {
          clearOwnedState();
          return;
        }

        const table = state.doc.nodeAt(tablePos);
        if (!table) {
          clearOwnedState();
          return;
        }

        const anchorEl = () =>
          createVirtualElementFromRange(
            view,
            tablePos,
            tablePos + table.nodeSize,
          );
        if (!anchorEl()) {
          clearOwnedState();
          return;
        }

        setTableMenuForView(state, view, {
          show: true,
          tablePos,
          anchorEl,
        });
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

/** Hides the table menu for the active table until the document changes. */
function dismissTableMenu(): Command {
  return (state, dispatch, view) => {
    const menus = store.get(state, $internalTableMenu);
    const owner =
      view && view.state === state
        ? view
        : [...menus.keys()].find((candidate) => candidate.state === state);
    if (!owner || !menus.has(owner)) {
      return false;
    }
    dispatch?.(state.tr.setMeta(tableMenuKey, dismissMeta));
    return true;
  };
}

export function setupTableMenu() {
  return collection({
    id: 'table-menu',
    plugin: {
      tableMenu: tableMenuPlugin(),
    },
    command: {
      dismissTableMenu,
    },
    $tableMenu,
  });
}
