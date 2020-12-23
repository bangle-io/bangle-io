import '@bangle.dev/core/style.css';
import '@bangle.dev/tooltip/style.css';

import * as collab from '@bangle.dev/collab/client/collab-extension';
import { emoji } from '@bangle.dev/emoji/index';
import '@bangle.dev/emoji/style.css';
import '@bangle.dev/react-menu/style.css';
import '@bangle.dev/react-emoji-suggest/style.css';
import '@bangle.dev/markdown-front-matter/style.css';
import './extensions-override.css';
import { trailingNode } from '@bangle.dev/trailing-node';
import { timestamp } from '@bangle.dev/timestamp';
import { SpecRegistry } from '@bangle.dev/core/spec-registry';
import stopwatch from '@bangle.dev/react-stopwatch';
import sticker from '@bangle.dev/react-sticker';
import { emojiSuggest } from '@bangle.dev/react-emoji-suggest';
import { markdownFrontMatter } from '@bangle.dev/markdown-front-matter';
import {
  bold,
  code,
  italic,
  strike,
  link,
  underline,
  doc,
  text,
  paragraph,
  blockquote,
  bulletList,
  codeBlock,
  hardBreak,
  heading,
  horizontalRule,
  listItem,
  orderedList,
  todoItem,
  todoList,
  image,
} from '@bangle.dev/core/components/index';

export const specRegistry = new SpecRegistry([
  doc.spec({ content: 'frontMatter? block+' }),
  text.spec(),
  paragraph.spec(),
  blockquote.spec(),
  bulletList.spec(),
  codeBlock.spec(),
  hardBreak.spec(),
  heading.spec(),
  horizontalRule.spec(),
  listItem.spec(),
  orderedList.spec(),
  todoItem.spec(),
  todoList.spec(),
  image.spec(),
  bold.spec(),
  code.spec(),
  italic.spec(),
  strike.spec(),
  link.spec(),
  underline.spec(),
  collab.spec(),
  emoji.spec(),
  emojiSuggest.spec({ markName: 'emojiSuggest' }),
  stopwatch.spec(),
  trailingNode.spec(),
  timestamp.spec(),
  sticker.spec(),
  markdownFrontMatter.spec(),
]);
