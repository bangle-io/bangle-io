import '@bangle.dev/core/style.css';
import '@bangle.dev/tooltip/style.css';
import '@bangle.dev/react-menu/style.css';
import '@bangle.dev/markdown-front-matter/style.css';
import '@bangle.dev/table/style.css';
import './extensions-override.css';

import { collabClient } from '@bangle.dev/collab-client';

import { trailingNode } from '@bangle.dev/trailing-node';
import { timestamp } from '@bangle.dev/timestamp';
import stopwatch from '@bangle.dev/react-stopwatch';
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
} from '@bangle.dev/core/components/components';
import { table, tableCell, tableHeader, tableRow } from '@bangle.dev/table';

let headingSpec = heading.spec();

headingSpec = {
  ...headingSpec,
  schema: {
    ...headingSpec.schema,
    draggable: true,
  },
};

export const rawSpecs = [
  doc.spec({ content: 'frontMatter? block+' }),
  text.spec(),
  paragraph.spec(),
  blockquote.spec(),
  bulletList.spec(),
  codeBlock.spec(),
  hardBreak.spec(),
  headingSpec,
  horizontalRule.spec(),
  listItem.spec(),
  orderedList.spec(),
  table,
  tableCell,
  tableHeader,
  tableRow,
  bold.spec(),
  code.spec(),
  italic.spec(),
  strike.spec(),
  link.spec(),
  underline.spec(),
  collabClient.spec(),
  stopwatch.spec(),
  trailingNode.spec(),
  timestamp.spec(),
  markdownFrontMatter.spec(),
];
