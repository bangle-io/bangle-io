import { collection } from './common';
import type { EditorState } from './pm';
import { Decoration, DecorationSet, Plugin, PluginKey } from './pm';
import { isDocEmpty } from './pm-utils';

const key = new PluginKey('placeholder');

type PlaceholderText = string | ((state: EditorState) => string);

export type PlaceholderConfig = {
  /** Shown when the whole document is empty. */
  placeholder?: PlaceholderText;
  /**
   * Shown on the empty paragraph the cursor is in while the rest of the
   * document has content. Disabled unless provided.
   */
  blockPlaceholder?: PlaceholderText;
};

type RequiredConfig = Required<PlaceholderConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  placeholder: 'Type something...',
  blockPlaceholder: '',
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

function resolveText(text: PlaceholderText, state: EditorState): string {
  return typeof text === 'function' ? text(state) : text;
}

function pluginPlaceholder(config: RequiredConfig) {
  return new Plugin({
    key,
    props: {
      decorations(state) {
        const docEmpty = isDocEmpty(state.doc);
        const placeholderText = docEmpty
          ? resolveText(config.placeholder, state)
          : resolveText(config.blockPlaceholder, state);

        const deco = createPlaceholderDecoration(state, placeholderText, {
          // With content elsewhere in the doc the hint is a per-block nudge,
          // so it only belongs on plain paragraphs (not headings, code, etc.).
          paragraphOnly: !docEmpty,
        });
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
  { paragraphOnly }: { paragraphOnly: boolean },
): Decoration | null {
  if (!placeholderText) return null;

  const { selection } = state;
  if (!selection.empty) return null;

  const $pos = selection.$anchor;
  if ($pos.depth === 0) return null;

  const node = $pos.parent;
  if (node.content.size > 0) return null;
  if (!node.isTextblock || node.type.spec.code) return null;
  if (paragraphOnly && node.type.name !== 'paragraph') return null;

  const before = $pos.before();
  return Decoration.node(before, before + node.nodeSize, {
    class:
      'before:absolute before:opacity-30 before:pointer-events-none before:h-0 before:content-[attr(data-placeholder)]',
    'data-placeholder': placeholderText,
  });
}
