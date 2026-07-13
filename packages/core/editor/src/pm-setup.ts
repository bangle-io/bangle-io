import {
  collection,
  createDocument,
  EditorState,
  EditorView,
  store as editorStore,
  markdownLoader,
  type NodeViewConstructor,
  Plugin,
  resolve,
  Schema,
} from '@bangle.io/prosemirror-plugins';

import type { Store } from '@bangle.io/types';

import type { setupExtensions } from './extensions';

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
                    const result = markdown.serializer.serialize(
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
