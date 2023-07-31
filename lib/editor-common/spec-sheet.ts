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
import type { RawSpecs } from '@bangle.dev/core';
import { markdownFrontMatter } from '@bangle.dev/markdown-front-matter';
import { table, tableCell, tableHeader, tableRow } from '@bangle.dev/table';

const headingSpec = (() => {
  const spec = heading.spec();

  if (spec) {
    return {
      ...spec,
      schema: {
        ...((spec as any).schema || {}),
        draggable: true,
      },
    };
  }

  return spec;
})();

export const rawSpecs: RawSpecs[] = [
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
  // stopwatch.spec(),
  markdownFrontMatter.spec(),
];
