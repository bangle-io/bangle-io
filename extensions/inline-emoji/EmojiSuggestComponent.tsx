import React from 'react';
import { EmojiSuggest } from '@bangle.dev/react-emoji-suggest';
import { emojiSuggestKey } from './config';

export function EmojiSuggestComponent() {
  return <EmojiSuggest emojiSuggestKey={emojiSuggestKey} />;
}
