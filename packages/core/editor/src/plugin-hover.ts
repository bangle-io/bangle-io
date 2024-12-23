import { Plugin, PluginKey } from '@prosekit/pm/state';
import { Decoration, DecorationSet } from '@prosekit/pm/view';
import type { EditorView } from '@prosekit/pm/view';

/**
 * Options for the hover class plugin.
 */
interface HoverClassPluginOptions {
  /**
   * The CSS class to apply when a node is hovered.
   */
  className: string;
}

/**
 * Creates a ProseMirror plugin that adds a custom CSS class to nodes on hover.
 */
export function hoverClassPlugin(options: HoverClassPluginOptions): Plugin {
  const { className } = options;

  // Define a unique plugin key
  const pluginKey = new PluginKey('hoverClassPlugin');

  return new Plugin({
    key: pluginKey,

    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, inDecorationSet) {
        // Adjust decorations based on document changes
        let decorationSet = inDecorationSet.map(tr.mapping, tr.doc);
        const meta = tr.getMeta(pluginKey);
        if (meta?.hoverDecoration) {
          decorationSet = DecorationSet.create(tr.doc, meta.hoverDecoration);
        }
        return decorationSet;
      },
    },

    props: {
      decorations(state) {
        return pluginKey.getState(state);
      },

      handleDOMEvents: {
        mouseover(view: EditorView, event: MouseEvent) {
          const target = event.target as HTMLElement;
          if (!target) return false;

          // Find the closest node element
          const nodeElement = target.closest('[data-node-type]');
          if (!nodeElement) return false;

          const pos = view.posAtDOM(nodeElement, 0);
          if (pos == null) return false;

          const { state, dispatch } = view;

          // Avoid redundant decorations
          const currentDecoration = pluginKey.getState(state).find();
          if (currentDecoration.size > 0) {
            const existing = currentDecoration.find()[0];
            if (existing.from === pos) return false;
          }

          const nodeDecoration = Decoration.node(pos, pos + 1, {
            class: className,
          });

          const decorations = DecorationSet.create(state.doc, [nodeDecoration]);

          dispatch(
            state.tr.setMeta(pluginKey, { hoverDecoration: decorations }),
          );

          return false;
        },

        mouseout(view: EditorView, _event: MouseEvent) {
          const { state, dispatch } = view;
          const currentDecoration = pluginKey.getState(state);

          if (currentDecoration.find().length > 0) {
            dispatch(
              state.tr.setMeta(pluginKey, {
                hoverDecoration: DecorationSet.empty,
              }),
            );
          }

          return false;
        },
      },
    },
  });
}
