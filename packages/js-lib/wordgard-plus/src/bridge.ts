import {
  type GardState,
  redoDepth,
  undoDepth,
  Wordgard,
} from '@bangle.io/wordgard-utils';
import { type Atom, atom, type createStore } from 'jotai';

/**
 * The Jotai store type wordgard-plus modules share state through. Consumers
 * pass their own store so chrome state lives wherever the rest of their UI
 * state does.
 */
export type JotaiStore = ReturnType<typeof createStore>;

/** A plain-data snapshot of the selection, safe to hold in UI state. */
export type SelectionSummary = {
  anchor: number;
  head: number;
  from: number;
  to: number;
  empty: boolean;
};

/**
 * Boolean state queries evaluated per update, e.g.
 * `{ bulletList: listIsActive(BulletList.tag) }`. Keys become the keys of
 * the `active` atom's value.
 */
export type StateQueries = Record<string, (state: GardState) => boolean>;

export type EditorAtoms<TQueries extends StateQueries = StateQueries> = {
  /** Whether the editor currently has focus. */
  focused: Atom<boolean>;
  /** The current selection, as plain offsets. */
  selection: Atom<SelectionSummary>;
  /** Whether there is anything to undo (requires the history extension). */
  canUndo: Atom<boolean>;
  /** Whether there is anything to redo (requires the history extension). */
  canRedo: Atom<boolean>;
  /** The result of each configured {@link StateQueries state query}. */
  active: Atom<{ readonly [K in keyof TQueries]: boolean }>;
};

function selectionSummary(state: GardState): SelectionSummary {
  const selection = state.selection;
  return {
    anchor: selection.anchor,
    head: selection.head,
    from: selection.from,
    to: selection.to,
    empty: selection.empty,
  };
}

function selectionEqual(a: SelectionSummary, b: SelectionSummary): boolean {
  return (
    a.anchor === b.anchor &&
    a.head === b.head &&
    a.from === b.from &&
    a.to === b.to &&
    a.empty === b.empty
  );
}

/**
 * History depth queries throw when the history extension is absent; a
 * missing history simply means "nothing to undo" for chrome purposes.
 */
function safeDepth(
  depth: (state: GardState) => number,
  state: GardState,
): boolean {
  try {
    return depth(state) > 0;
  } catch {
    return false;
  }
}

/**
 * Creates per-editor Jotai read atoms fed by a single editor plugin.
 *
 * Wordgard-idiomatic shape: update hooks are configuration (facets/plugins),
 * not post-hoc subscriptions on a live instance, so this returns an
 * `extension` the consumer adds to their own `Wordgard.create` config — the
 * bridge never owns or wraps the editor. Atoms are created per call, so two
 * editors never share chrome state; pass one `store` per UI tree.
 *
 * The atoms are derived read models only. The write path is always "React
 * dispatches a command/transaction"; nothing ever syncs an atom back into
 * the editor.
 *
 * Every atom write is equality-guarded so a keystroke that does not change
 * a value never notifies that atom's subscribers.
 */
export function createEditorAtoms<TQueries extends StateQueries>(config: {
  store: JotaiStore;
  queries?: TQueries;
}): {
  atoms: EditorAtoms<TQueries>;
  /** Add this to the editor's `Wordgard.create` config. */
  extension: GardState.Extension;
} {
  const { store, queries } = config;

  const $focused = atom(false);
  const $selection = atom<SelectionSummary>({
    anchor: 0,
    head: 0,
    from: 0,
    to: 0,
    empty: true,
  });
  const $canUndo = atom(false);
  const $canRedo = atom(false);
  const emptyActive = Object.fromEntries(
    Object.keys(queries ?? {}).map((key) => [key, false]),
  ) as { readonly [K in keyof TQueries]: boolean };
  const $active = atom(emptyActive);

  const sync = (state: GardState, focused: boolean) => {
    if (store.get($focused) !== focused) {
      store.set($focused, focused);
    }

    const nextSelection = selectionSummary(state);
    if (!selectionEqual(store.get($selection), nextSelection)) {
      store.set($selection, nextSelection);
    }

    const nextCanUndo = safeDepth(undoDepth, state);
    if (store.get($canUndo) !== nextCanUndo) {
      store.set($canUndo, nextCanUndo);
    }
    const nextCanRedo = safeDepth(redoDepth, state);
    if (store.get($canRedo) !== nextCanRedo) {
      store.set($canRedo, nextCanRedo);
    }

    if (queries) {
      const previous = store.get($active);
      let changed = false;
      const next: Record<string, boolean> = {};
      for (const [key, query] of Object.entries(queries)) {
        const value = query(state);
        next[key] = value;
        if (previous[key] !== value) {
          changed = true;
        }
      }
      if (changed) {
        store.set($active, next as typeof emptyActive);
      }
    }
  };

  const plugin = Wordgard.Plugin.define((wg) => {
    // Seed immediately so atoms reflect the initial document/selection
    // before the first transaction.
    sync(wg.state, wg.hasFocus);
    return {
      update: (update: Wordgard.Update) => {
        sync(update.state, update.editor.hasFocus);
      },
      disconnect: () => {
        if (store.get($focused)) {
          store.set($focused, false);
        }
      },
    };
  });

  return {
    atoms: {
      focused: $focused,
      selection: $selection,
      canUndo: $canUndo,
      canRedo: $canRedo,
      active: $active,
    },
    extension: plugin.extension,
  };
}
