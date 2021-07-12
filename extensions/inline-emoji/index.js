import { emojiSuggest } from '@bangle.dev/react-emoji-suggest';
import { Extension } from 'extension-registry';

import { emoji, emojiMarkdownItPlugin } from '@bangle.dev/emoji';
import { EmojiSuggestComponent } from './EmojiSuggestComponent';
import { emojiSuggestKey, emojiSuggestMarkName, extensionName } from './config';

import { aliasEmojiPair, aliasToEmojiObj } from './emoji-data';

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

const maxItems = 500;

function getEmojis(queryText = '') {
  // let result = aliasLookup;
  let result = aliasEmojiPair
    .filter(([item]) => item.includes(queryText))
    .slice(0, maxItems);
  return [
    {
      name: undefined,
      emojis: result,
    },
  ];
}
const extension = Extension.create({
  name: extensionName,
  editor: {
    specs: [
      emoji.spec({ getEmoji: (alias) => aliasToEmojiObj[alias] }),
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
