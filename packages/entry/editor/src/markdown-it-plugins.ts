import type { MarkdownParser } from 'prosemirror-markdown';

import type { SpecRegistry } from '@bangle.dev/core';
import * as markdown from '@bangle.dev/markdown';
import { frontMatterMarkdownItPlugin } from '@bangle.dev/markdown-front-matter';
const markdownItPlugins = [frontMatterMarkdownItPlugin];

export function getMarkdownTokenizer(
  specRegistry: SpecRegistry,
): MarkdownParser {
  let tokenizer = markdown.getDefaultMarkdownItTokenizer();

  for (const plugin of markdownItPlugins) {
    // to allow passing of plugin options
    if (Array.isArray(plugin)) {
      // @ts-expect-error - plugin
      tokenizer = tokenizer.use(...plugin);
    } else {
      tokenizer = tokenizer.use(plugin);
    }
  }

  return markdown.markdownParser(specRegistry, tokenizer);
}
