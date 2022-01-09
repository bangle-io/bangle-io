import { PluginKey } from '@bangle.dev/pm';

import { makeSafeForCSS } from '@bangle.io/utils';

export const extensionName = '@bangle.io/inline-emoji';
export const emojiSuggestKey = new PluginKey(extensionName + 'SuggestKey');
export const emojiSuggestMarkName =
  makeSafeForCSS(extensionName) + '-emojiSuggest';
