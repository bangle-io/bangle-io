import { Plugin } from '@prosekit/pm/state';
import { defineBasicExtension } from 'prosekit/basic';
import {
  Priority,
  createEditor,
  defineKeymap,
  defineMarkSpec,
  definePlugin,
  withPriority,
} from 'prosekit/core';
import { union } from 'prosekit/core';
import {
  defineCodeBlock,
  defineCodeBlockShiki,
} from 'prosekit/extensions/code-block';
import { defineDropCursor } from 'prosekit/extensions/drop-cursor';
import { defineInputRule } from 'prosekit/extensions/input-rule';

import type { Logger } from '@bangle.io/logger';
import { storePlugin, suggestions } from '@bangle.io/prosemirror-plugins';
import type { Store } from '@bangle.io/types';
import { createGlobalDragHandlePlugin } from './drag/plugin-drag';
import { activeNode } from './plugin-active-node';
import { placeholderPlugin } from './plugin-placeholder';
import { docToMarkdown, markdownToDoc } from './remark';
import { funPlaceholder } from './utils';

const SLASH = { trigger: '/', markName: 'slash-command' };

export function createPMEditor({
  defaultContent,
  onDocChange,
  logger,
  store,
}: {
  defaultContent: string;
  onDocChange: (doc: string) => void;
  logger?: Logger;
  store?: Store;
}) {
  const extension = union(
    definePlugin(storePlugin(store)),
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
    definePlugin(placeholderPlugin({ placeholder: funPlaceholder })),
    definePlugin(
      createGlobalDragHandlePlugin({
        notDraggableClassName: 'prosemirror-flat-list',
        excludedTags: ['blockquote'],
      }),
    ),
    // suggestions
    defineMarkSpec(
      suggestions.suggestionsMark({
        markName: SLASH.markName,
        className: 'text-pop',
        trigger: SLASH.trigger,
      }),
    ),
    defineInputRule(
      suggestions.triggerInputRule({
        markName: SLASH.markName,
        trigger: SLASH.trigger,
      }),
    ),
    definePlugin(
      suggestions.pluginSuggestion({
        markName: SLASH.markName,
        trigger: SLASH.trigger,
        logger,
      }),
    ),
    withPriority(
      defineKeymap(suggestions.suggestionKeymap()),
      Priority.highest,
    ),
  );
  const editor = createEditor({
    extension,
  });
  editor.setContent(markdownToDoc(defaultContent, editor.schema));
  return editor;
}
