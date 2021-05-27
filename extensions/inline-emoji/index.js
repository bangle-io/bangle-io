import '@bangle.dev/emoji/style.css';
import '@bangle.dev/react-emoji-suggest/style.css';
import './inline-emoji.css';

import { emojiSuggest } from '@bangle.dev/react-emoji-suggest';
import { Extension } from 'extension-helpers';

import { emoji, emojiMarkdownItPlugin } from '@bangle.dev/emoji/index';
import { EmojiSuggestComponent } from './EmojiSuggestComponent';
import { emojiSuggestKey, emojiSuggestMarkName, extensionName } from './config';
import aliasLookup from 'emoji-lookup-data/data/alias_lookup.json';
import categoryLookup from 'emoji-lookup-data/data/category_lookup.json';
import emojiArray from 'emoji-lookup-data/data/emoji.json';
import aliasArray from 'emoji-lookup-data/data/aliases.json';

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

const aliasEmojiPair = aliasLookup.map((r) => [r[0], r[1]]);
const aliasEmojiObject = Object.fromEntries(aliasEmojiPair);
const maxItems = 200;

function getEmojis(queryText) {
  let result = aliasLookup;
  if (queryText) {
    result = aliasLookup
      .filter(([item]) => item.includes(queryText))
      .slice(0, maxItems);
  }

  if (result.length < 50) {
    return [
      {
        name: undefined,
        emojis: result,
      },
    ];
  }

  const resultIndexSet = new Set(result.map((r) => r[2]));

  return Object.entries(categoryLookup)
    .map(([categoryName, eIndices]) => {
      const emo = eIndices
        .filter((eIndex) => resultIndexSet.has(eIndex))
        .flatMap((eIndex) =>
          aliasArray[eIndex].map((a) => [a, emojiArray[eIndex]]),
        );
      return [categoryName, emo];
    })
    .filter((r) => {
      return r[1].length > 0;
    })
    .map((r) => ({
      name: r[0],
      emojis: r[1],
    }));
}
const extension = Extension.create({
  name: extensionName,
  editorSpecs: [
    emoji.spec({ getEmoji: (alias) => aliasEmojiObject[alias] }),
    emojiSuggest.spec({ markName: emojiSuggestMarkName }),
  ],
  editorPlugins: [
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
        defs: aliasEmojiObject,
      },
    ],
  ],
  EditorReactComponent: EmojiSuggestComponent,
});

export default extension;
