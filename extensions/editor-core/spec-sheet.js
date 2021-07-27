import {
  blockquote,
  bold,
  bulletList,
  code,
  codeBlock,
  doc,
  hardBreak,
  heading,
  horizontalRule,
  italic,
  link,
  listItem,
  orderedList,
  paragraph,
  strike,
  text,
  underline,
} from '@bangle.dev/base-components';
import { markdownFrontMatter } from '@bangle.dev/markdown-front-matter';
import stopwatch from '@bangle.dev/react-stopwatch';
import { table, tableCell, tableHeader, tableRow } from '@bangle.dev/table';
import { timestamp } from '@bangle.dev/timestamp';
import { trailingNode } from '@bangle.dev/trailing-node';

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
  stopwatch.spec(),
  trailingNode.spec(),
  timestamp.spec(),
  markdownFrontMatter.spec(),
];
