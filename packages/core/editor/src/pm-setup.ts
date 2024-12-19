import { Plugin } from '@prosekit/pm/state';
import { defineBasicExtension } from 'prosekit/basic';
import { type NodeJSON, createEditor, definePlugin } from 'prosekit/core';
import { union } from 'prosekit/core';
import {
  defineCodeBlock,
  defineCodeBlockShiki,
} from 'prosekit/extensions/code-block';
import { defineDropCursor } from 'prosekit/extensions/drop-cursor';
import { docToMarkdown, markdownFromHTML, markdownToDoc } from './remark';
import { activeNode } from './plugin-active-node';

export function createPMEditor({
  defaultContent,
  onDocChange,
}: {
  defaultContent: string;
  onDocChange: (doc: string) => void;
}) {
  const extension = union(
    defineBasicExtension(),
    defineDropCursor({
      color: false,
      width: 4,
      class: 'transition-all bg-blue-500',
    }),
    defineCodeBlock(),
    defineCodeBlockShiki({
      themes: ['github-light'],
      langs: ['typescript', 'javascript', 'python', 'rust', 'go', 'java'],
    }),
    definePlugin(
      () =>
        new Plugin({
          view() {
            return {
              update(view, prevState) {
                if (!view.state.doc.eq(prevState.doc)) {
                  onDocChange(docToMarkdown(view.state.doc));
                }
              },
            };
          },
        }),
    ),
    definePlugin(activeNode),
  );
  const editor = createEditor({
    extension,
  });
  editor.setContent(markdownToDoc(defaultContent, editor.schema));
  return editor;
}
