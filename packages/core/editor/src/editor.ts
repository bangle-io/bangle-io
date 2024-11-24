import '@bangle.dev/core/style.css';
import './style.css';

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
  image,
  italic,
  link,
  listItem,
  orderedList,
  paragraph,
  strike,
  text,
  underline,
} from '@bangle.dev/base-components';
import {
  BangleEditor,
  BangleEditorState,
  Plugin,
  SpecRegistry,
} from '@bangle.dev/core';
import { markdownParser, markdownSerializer } from '@bangle.dev/markdown';
import { markdownFrontMatter } from '@bangle.dev/markdown-front-matter';

import { getMarkdownTokenizer } from './markdown-it-plugins';
import { activeNode } from './plugins/active-node';

const specRegistry = new SpecRegistry([
  doc.spec({ content: 'frontMatter? block+' }),
  text.spec(),
  paragraph.spec(),
  blockquote.spec(),
  bold.spec(),
  bulletList.spec(),
  code.spec(),
  codeBlock.spec(),
  hardBreak.spec(),
  heading.spec(),
  horizontalRule.spec(),
  image.spec(),
  italic.spec(),
  link.spec(),
  listItem.spec(),
  orderedList.spec(),
  strike.spec(),
  underline.spec(),
  markdownFrontMatter.spec(),
]);

const parser = getMarkdownTokenizer(specRegistry);
const serializer = markdownSerializer(specRegistry);

export function createEditor(
  domNode: HTMLElement,
  markdown: string,
  onChange: (markdown: string) => void,
) {
  const state = new BangleEditorState({
    specRegistry,
    // @ts-expect-error - TODO: fix this
    plugins: () => [
      blockquote.plugins(),
      bold.plugins(),
      bulletList.plugins(),
      code.plugins(),
      codeBlock.plugins(),
      hardBreak.plugins(),
      heading.plugins(),
      horizontalRule.plugins(),
      image.plugins(),
      italic.plugins(),
      link.plugins(),
      listItem.plugins(),
      orderedList.plugins(),
      paragraph.plugins(),
      strike.plugins(),
      underline.plugins(),
      activeNode(),
      new Plugin({
        view: () => ({
          update: (view, prevState) => {
            if (!view.state.doc.eq(prevState.doc)) {
              onChange(serializer.serialize(view.state.doc));
            }
          },
        }),
      }),
    ],
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    initialValue: parser.parse(markdown)!,
  });

  const editor = new BangleEditor(domNode, { state });
  return editor;
}
