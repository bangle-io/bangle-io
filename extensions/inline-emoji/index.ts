import { emoji, emojiMarkdownItPlugin } from '@bangle.dev/emoji';
import type { EditorView } from '@bangle.dev/pm';
import { emojiSuggest } from '@bangle.dev/react-emoji-suggest';

import { Extension } from '@bangle.io/extension-registry';

import { emojiSuggestKey, emojiSuggestMarkName, extensionName } from './config';
import { aliasEmojiPair, aliasToEmojiObj } from './emoji-data';
import { EmojiSuggestComponent } from './EmojiSuggestComponent';

const getScrollContainer = (view: EditorView) => {
  return view.dom.parentElement!;
};

const maxItems = 500;

function getEmojis(queryText = '') {
  let result = aliasEmojiPair
    .filter(([item]) => (item ? item.includes(queryText) : false))
    .slice(0, maxItems);

  return [
    {
      name: '',
      emojis: result,
    },
  ];
}
const extension = Extension.create({
  name: extensionName,
  editor: {
    specs: [
      emoji.spec({
        getEmoji: (alias): string => {
          return aliasToEmojiObj[alias] || '�';
        },
      }),
      emojiSuggest.spec({ markName: emojiSuggestMarkName }),
    ],
    plugins: [
      emoji.plugins(),
      emojiSuggest.plugins({
        key: emojiSuggestKey,
        getEmojiGroups: (queryText) => {
          const result = getEmojis(queryText);

          return result;
        },
        markName: emojiSuggestMarkName,
        tooltipRenderOpts: {
          getScrollContainer,
          placement: 'bottom',
        },
      }),
    ],
    markdownItPlugins: [
      [
        emojiMarkdownItPlugin,
        {
          defs: aliasToEmojiObj,
        },
      ],
    ],
    ReactComponent: EmojiSuggestComponent,
  },
});

export default extension;
