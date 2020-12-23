import * as markdown from '@bangle.dev/markdown/index';
import { defaultMarkdownItTokenizer } from '@bangle.dev/markdown/index';
import { emojiMarkdownItPlugin } from '@bangle.dev/emoji/index';
import { specRegistry } from 'bangle-play/app/editor/spec-sheet';
import { frontMatterMarkdownItPlugin } from '@bangle.dev/markdown-front-matter';

const parser = markdown.markdownParser(
  specRegistry,
  defaultMarkdownItTokenizer
    .use(emojiMarkdownItPlugin)
    .use(frontMatterMarkdownItPlugin),
);

const serializer = markdown.markdownSerializer(specRegistry);

export const markdownParser = (markdownStr) => parser.parse(markdownStr);
export const markdownSerializer = (doc) => serializer.serialize(doc);
