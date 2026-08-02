import {
  collection,
  createDocument,
  EditorState,
  EditorView,
  store as editorStore,
  markdownLoader,
  type NodeViewConstructor,
  Plugin,
  type PMNode,
  resolve,
  Schema,
  stripSyntheticSuggestionText,
} from '@bangle.io/prosemirror-plugins';

import type { Store } from '@bangle.io/types';

import type { setupExtensions } from './extensions';

/**
 * Produces the exact Markdown projection used for durable editor saves.
 * Reconciliation must use this same projection when deciding whether disk
 * already contains the current document, including removal of UI-only
 * suggestion text that must never reach storage.
 */
export function serializeEditorDocumentForSave(
  markdown: ReturnType<typeof markdownLoader>,
  doc: PMNode,
): string {
  return markdown.serializer.serialize(stripSyntheticSuggestionText(doc));
}

export function createEditor({
  domNode,
  defaultContent = '',
  onDocChange,
  store,
  extensions,
  nodeViews,
}: {
  domNode: HTMLElement;
  defaultContent?: string;
  onDocChange?: (doc: string) => void;
  store: Store;
  extensions: ReturnType<typeof setupExtensions>;
  nodeViews?: Record<string, NodeViewConstructor>;
}) {
  const resolved = resolve(
    {
      editor: collection({
        id: 'editor',
        plugin: {
          storePlugin: editorStore.storePlugin(store),
        },
      }),
      ...extensions,
      saveDoc: collection({
        id: 'save-doc',
        plugin: {
          saveDoc: new Plugin({
            view() {
              return {
                update(view, prevState) {
                  if (onDocChange && !view.state.doc.eq(prevState.doc)) {
                    // A synthetic suggestion trigger (the "+" button's "/")
                    // must never reach storage, even when a debounced save
                    // fires while the menu is still open or the editor
                    // unmounts mid-suggestion.
                    const result = serializeEditorDocumentForSave(
                      markdown,
                      view.state.doc,
                    );

                    onDocChange(result);
                  }
                },
              };
            },
          }),
        },
      }),
    },
    false,
    true,
  );

  const schema = new Schema({
    topNode: 'doc',
    nodes: resolved.nodes,
    marks: resolved.marks,
  });

  const markdown = markdownLoader([...Object.values(extensions)], schema);

  return new EditorView(
    { mount: domNode },
    {
      state: EditorState.create({
        doc: defaultContent
          ? markdown.parser.parse(defaultContent)
          : createDocument({ schema, content: '' }),
        schema,
        plugins: resolved.resolvePlugins({ schema }),
      }),
      nodeViews,
    },
  );
}
