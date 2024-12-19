import type { EditorState } from '@prosekit/pm/state';
import { Decoration, DecorationSet } from '@prosekit/pm/view';
const extName = '@bangle.io/core-editor';
import { Plugin, PluginKey } from '@prosekit/pm/state';

export function activeNode() {
  const key = new PluginKey(extName + ':active_node');

  return new Plugin({
    key,
    state: {
      init: (_, state) => {
        return buildDeco(state);
      },
      apply: (tr, old, oldState, newState) => {
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
