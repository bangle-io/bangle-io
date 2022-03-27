import { Decoration, DecorationSet, EditorState, Plugin } from '@bangle.dev/pm';

export function activeNode() {
  return new Plugin({
    state: {
      init(_, state) {
        return buildDeco(state);
      },
      apply(tr, old, oldState, newState) {
        if (!tr.selectionSet) {
          return old;
        }

        return buildDeco(newState);
      },
    },
    props: {
      decorations(state: EditorState) {
        return this.getState(state);
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
          class: 'B-core-editor_selected-node',
        }),
      ]
    : [];

  return DecorationSet.create(state.doc, decorations);
}
