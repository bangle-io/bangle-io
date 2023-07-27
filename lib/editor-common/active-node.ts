import type { EditorState } from '@bangle.dev/pm';
import { Decoration, DecorationSet, Plugin, PluginKey } from '@bangle.dev/pm';

const extName = '@bangle.io/core-editor';

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
          class: 'B-editor-common_selected-node',
        }),
      ]
    : [];

  return DecorationSet.create(state.doc, decorations);
}
