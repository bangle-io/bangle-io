import { collection } from './common/collection';
import type { EditorState } from './pm';
import { Plugin, PluginKey } from './pm';
import { Decoration, DecorationSet } from './pm';
import { isDocEmpty } from './pm-utils';

const key = new PluginKey('placeholder');

export type PlaceholderConfig = {
  placeholder?: string | ((state: EditorState) => string);
};

type RequiredConfig = Required<PlaceholderConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  placeholder: 'Type something...',
};

export function setupPlaceholder(config: PlaceholderConfig) {
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const plugin = {
    placeholder: pluginPlaceholder(finalConfig),
  };

  return collection({
    id: 'placeholder',
    plugin,
  });
}

function pluginPlaceholder(config: RequiredConfig) {
  return new Plugin({
    key,
    props: {
      decorations(state) {
        const placeholderText =
          typeof config.placeholder === 'function'
            ? config.placeholder(state)
            : config.placeholder;

        if (!isDocEmpty(state.doc)) {
          return null;
        }

        const deco = createPlaceholderDecoration(state, placeholderText);
        if (!deco) {
          return null;
        }

        return DecorationSet.create(state.doc, [deco]);
      },
    },
  });
}

function createPlaceholderDecoration(
  state: EditorState,
  placeholderText: string,
): Decoration | null {
  if (!placeholderText) return null;

  const { selection } = state;
  if (!selection.empty) return null;

  const $pos = selection.$anchor;
  const node = $pos.parent;
  if (node.content.size > 0) return null;

  const before = $pos.before();
  return Decoration.node(before, before + node.nodeSize, {
    class:
      'before:absolute before:opacity-30 before:pointer-events-none before:h-0 before:content-[attr(data-placeholder)]',
    'data-placeholder': placeholderText,
  });
}
