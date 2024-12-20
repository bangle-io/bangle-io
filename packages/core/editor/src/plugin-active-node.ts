import type { EditorState } from '@prosekit/pm/state';
import { Plugin, PluginKey } from '@prosekit/pm/state';
import { Decoration, DecorationSet } from '@prosekit/pm/view';

export function activeNode() {
  const key = new PluginKey('active-node');

  return new Plugin({
    key,
    state: {
      init: (_, state) => {
        return buildDeco(state);
      },
      apply: (tr, old, _oldState, newState) => {
        if (!tr.selectionSet) {
          return old;
        }

        return buildDeco(newState);
      },
    },
    props: {
      decorations(state) {
        return key.getState(state);
      },
    },
  });
}

function buildDeco(state: EditorState): DecorationSet {
  const selection = state.selection;
  const resolved = selection.$from;
  const decorations = selection.empty
    ? [
        Decoration.node(resolved.before(), resolved.after(), {
          class: 'rounded-sm animate-editor-selected-node',
        }),
      ]
    : [];

  return DecorationSet.create(state.doc, decorations);
}
