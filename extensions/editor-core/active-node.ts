import { Decoration, DecorationSet, Plugin } from '@bangle.dev/pm';

export function activeNode() {
  return new Plugin({
    props: {
      decorations(state) {
        const selection = state.selection;
        const resolved = selection.$from;

        const decorations = selection.empty
          ? [
              Decoration.node(resolved.before(), resolved.after(), {
                class: 'selected-node',
              }),
            ]
          : [];
        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
}
