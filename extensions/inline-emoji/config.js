import { PluginKey } from '@bangle.dev/core/prosemirror/state';

export const extensionName = 'inline-emoji';
export const emojiSuggestKey = new PluginKey(extensionName + 'SuggestKey');
export const emojiSuggestMarkName = 'emojiSuggest';
