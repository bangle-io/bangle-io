import { Plugin } from '@prosekit/pm/state';
import { defineBasicExtension } from 'prosekit/basic';
import {
  type NodeJSON,
  createEditor,
  defineMarkSpec,
  definePlugin,
} from 'prosekit/core';
import { union } from 'prosekit/core';
import {
  defineCodeBlock,
  defineCodeBlockShiki,
} from 'prosekit/extensions/code-block';
import { defineDropCursor } from 'prosekit/extensions/drop-cursor';
import { defineInputRule } from 'prosekit/extensions/input-rule';

import type { Logger } from '@bangle.io/logger';
import { defineImage } from 'prosekit/extensions/image';
import { createGlobalDragHandlePlugin } from './drag/plugin-drag';
import { activeNode } from './plugin-active-node';
import { placeholderPlugin } from './plugin-placeholder';
import { type Store, storePlugin } from './pm-utils/atom';
import { docToMarkdown, markdownFromHTML, markdownToDoc } from './remark';
import { triggerInputRule } from './suggestions/input-rule';
import { pluginSuggestion } from './suggestions/plugin-suggestion';
import { suggestionsMark } from './suggestions/suggestions-mark';
import { funPlaceholder } from './utils';

const SLASH = { trigger: '/', markName: 'suggestions' };

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
      suggestionsMark({
        markName: SLASH.markName,
        className: 'text-pop',
        trigger: SLASH.trigger,
      }),
    ),
    defineInputRule(
      triggerInputRule({
        trigger: SLASH.trigger,
        markName: SLASH.markName,
      }),
    ),
    definePlugin(
      pluginSuggestion({
        markName: SLASH.markName,
        trigger: SLASH.trigger,
        logger,
      }),
    ),
  );
  const editor = createEditor({
    extension,
  });
  editor.setContent(markdownToDoc(defaultContent, editor.schema));
  return editor;
}
