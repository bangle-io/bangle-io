import { Plugin } from '@prosekit/pm/state';
import { defineBasicExtension } from 'prosekit/basic';
import { type NodeJSON, createEditor, definePlugin } from 'prosekit/core';
import { union } from 'prosekit/core';
import {
  defineCodeBlock,
  defineCodeBlockShiki,
} from 'prosekit/extensions/code-block';
import { defineDropCursor } from 'prosekit/extensions/drop-cursor';
import {
  type ListAttributes,
  getListType,
  isListNode,
} from 'prosemirror-flat-list';
import {
  createCustomElement,
  createDragAndDropPlugin,
  customElementPlugin,
} from './dd';
import { activeNode } from './plugin-active-node';
import { createGlobalDragHandlePlugin } from './plugin-drag2';
import { placeholderPlugin } from './plugin-placeholder';
import { docToMarkdown, markdownFromHTML, markdownToDoc } from './remark';
import { funPlaceholder } from './utils';

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
      width: 1,
      class:
        'transition-all bg-pop border-solid border-2 border-solid border-pop rounded-sm',
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
    definePlugin(
      createGlobalDragHandlePlugin({
        notDraggableClassName: 'prosemirror-flat-list',
      }),
    ),
  );
  const editor = createEditor({
    extension,
  });
  editor.setContent(markdownToDoc(defaultContent, editor.schema));
  return editor;
}
