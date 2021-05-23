import '@bangle.dev/emoji/style.css';
import '@bangle.dev/react-emoji-suggest/style.css';
import './inline-emoji.css';

import { emojiSuggest } from '@bangle.dev/react-emoji-suggest';
import { Extension } from 'extension-helpers';

import { emoji, emojiMarkdownItPlugin } from '@bangle.dev/emoji/index';
import { EmojiSuggestComponent } from './EmojiSuggestComponent';
import { emojiSuggestKey, emojiSuggestMarkName, extensionName } from './config';
import aliasLookup from 'emoji-lookup-data/data/alias_lookup.json';

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

const emojiLookup = Object.fromEntries(aliasLookup.map((r) => [r[0], r[1]]));

const extension = Extension.create({
  name: extensionName,
  editorSpecs: [
    emoji.spec({ getEmoji: (alias) => emojiLookup[alias] }),
    emojiSuggest.spec({ markName: emojiSuggestMarkName }),
  ],
  editorPlugins: [
    emoji.plugins(),
    emojiSuggest.plugins({
      key: emojiSuggestKey,
      emojis: aliasLookup.map((r) => [r[0], r[1]]),
      markName: emojiSuggestMarkName,
      tooltipRenderOpts: {
        getScrollContainer,
      },
    }),
  ],
  markdownItPlugins: [
    [
      emojiMarkdownItPlugin,
      {
        defs: emojiLookup,
      },
    ],
  ],
  EditorReactComponent: EmojiSuggestComponent,
});

export default extension;
