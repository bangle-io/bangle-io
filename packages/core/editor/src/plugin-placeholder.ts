import type { EditorState } from '@prosekit/pm/state';
import { Plugin, PluginKey } from '@prosekit/pm/state';
import { Decoration, DecorationSet } from '@prosekit/pm/view';
import { isDocEmpty } from './utils';

const key = new PluginKey('placeholder');

export function placeholderPlugin(options: {
  placeholder: string | ((state: EditorState) => string);
}) {
  return new Plugin({
    key,
    props: {
      decorations(state) {
        const placeholderText =
          typeof options.placeholder === 'function'
            ? options.placeholder(state)
            : options.placeholder;

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
