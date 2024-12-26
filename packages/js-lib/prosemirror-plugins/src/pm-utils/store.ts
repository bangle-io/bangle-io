import { type EditorState, Plugin, PluginKey } from '@prosekit/pm/state';
import { type Atom, type WritableAtom, createStore } from 'jotai';
export type Store = ReturnType<typeof createStore>;

const atomStoreKey = new PluginKey('atomStore');

export function storePlugin(store?: Store) {
  return new Plugin<any>({
    key: atomStoreKey,
    state: {
      init() {
        return store || createStore();
      },
      apply(_, v) {
        return v;
      },
    },
  });
}

function resolveStore(editorState: EditorState): Store {
  const store = atomStoreKey.getState(editorState);
  if (!store) {
    throw new Error('Store not found');
  }

  return store as Store;
}

function get<Value>(editorState: EditorState, atom: Atom<Value>): Value {
  const store = resolveStore(editorState);
  return store.get(atom);
}

function set<Value, Args extends unknown[], Result>(
  editorState: EditorState,
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
) {
  const store = resolveStore(editorState);
  store.set(atom, ...args);
}

function sub(
  editorState: EditorState,
  atom: Atom<unknown>,
  listener: () => void,
): () => void {
  const store = resolveStore(editorState);
  return store.sub(atom, listener);
}

export const editorStore = {
  get,
  set,
  sub,
};
