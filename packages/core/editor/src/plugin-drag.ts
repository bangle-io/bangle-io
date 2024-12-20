import type { ProseMirrorNode } from '@prosekit/pm/model';
import type { EditorState } from '@prosekit/pm/state';
import { Plugin, PluginKey } from '@prosekit/pm/state';
import type { Transaction } from '@prosekit/pm/state';
import { Decoration, DecorationSet } from '@prosekit/pm/view';
import type { EditorView } from '@prosekit/pm/view';

/**
 * Type definition for the createCustomElement function.
 * It takes a ProseMirror node and returns an HTMLElement or null.
 */
type CreateCustomElement = (node: ProseMirrorNode) => HTMLElement | null;

/**
 * Plugin options interface.
 */
interface CustomElementPluginOptions {
  createCustomElement: CreateCustomElement;
}

/**
 * Creates a ProseMirror plugin that inserts a custom element at the start of each block node.
 *
 * @param createCustomElement - A function that returns the custom DOM element.
 * @param options - Additional options for the plugin.
 * @returns The ProseMirror plugin.
 */
export function customElementPlugin(
  createCustomElement: CreateCustomElement,
  _options: Partial<CustomElementPluginOptions> = {},
): Plugin {
  const getDecorations = (doc: ProseMirrorNode): DecorationSet => {
    const decorations: Decoration[] = [];

    doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (!node.isBlock) return;

      const customElement = createCustomElement(node);
      if (customElement) {
        // Position the widget at the start of the node (pos + 1 to skip the node's starting character)
        const deco = Decoration.widget(pos + 1, customElement, { side: -1 });
        decorations.push(deco);
      }
    });

    return DecorationSet.create(doc, decorations);
  };

  return new Plugin({
    key: new PluginKey('customElementPlugin'),
    state: {
      init(_, state) {
        return getDecorations(state.doc);
      },
      apply(tr: Transaction, oldDecorationSet: DecorationSet) {
        if (tr.docChanged) {
          return getDecorations(tr.doc);
        }
        return oldDecorationSet;
      },
    },
    props: {
      decorations(state: EditorState) {
        return this.getState(state) ?? null;
      },
    },
    view(_editorView: EditorView) {
      return {
        update: (_view: EditorView, _prevState: EditorState) => {
          // You can perform additional updates here if needed
        },
      };
    },
  });
}

export function createCustomElement(node: ProseMirrorNode): HTMLElement | null {
  // Example: Insert custom element only for paragraph nodes
  if (node.type.name !== 'paragraph') {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className =
    'inline-flex items-center justify-center bg-blue-500 text-white rounded';

  // Add fixed positioning styles
  wrapper.style.position = 'absolute';
  wrapper.style.transform = 'translateX(-40px)';
  wrapper.style.marginTop = '3px'; // Add a small top margin for alignment

  // Example content: SVG icon and label
  wrapper.innerHTML = `
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    `;

  return wrapper;
}
