import { collection } from './common';
import { Plugin, PluginKey } from './pm';
import { Decoration, DecorationSet, type EditorView } from './pm';

export type HoverOptions = {
  /**
   * The CSS class to apply when a node is hovered.
   */
  className: string;
};

type RequiredHoverOptions = Required<HoverOptions>;

const DEFAULT_HOVER_OPTIONS: RequiredHoverOptions = {
  className: 'hover',
};

export function setupHover(options: HoverOptions = DEFAULT_HOVER_OPTIONS) {
  const plugin = {
    hover: hoverPlugin(options),
  };

  return collection({
    id: 'hover',
    plugin,
  });
}

function hoverPlugin(options: RequiredHoverOptions) {
  const { className } = options;
  const pluginKey = new PluginKey('hover');

  return new Plugin({
    key: pluginKey,

    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, inDecorationSet) {
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

          const nodeElement = target.closest('[data-node-type]');
          if (!nodeElement) return false;

          const pos = view.posAtDOM(nodeElement, 0);
          if (pos == null) return false;

          const { state, dispatch } = view;

          const currentDecoration = pluginKey.getState(state).find();
          if (currentDecoration.length > 0) {
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
