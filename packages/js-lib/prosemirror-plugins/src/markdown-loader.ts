import { listMarkdownPlugin } from '@bangle.dev/pm-markdown/list-markdown';
import { markdownLoader as upstreamMarkdownLoader } from '@bangle.dev/pm-markdown/markdown';
import type { CollectionType } from '@bangle.io/banger-editor';
import markdownIt from 'markdown-it';
import type { Schema } from 'prosemirror-model';

/** Creates an isolated tokenizer so editor extensions never mutate shared parser state. */
export function markdownLoader(items: CollectionType[], schema: Schema) {
  const tokenizer = markdownIt('commonmark', { html: false, breaks: false })
    .enable('strikethrough')
    .use(listMarkdownPlugin);
  for (const item of items) {
    for (const plugin of item.markdown?.tokenizerPlugins ?? []) {
      tokenizer.use(plugin);
    }
  }
  return upstreamMarkdownLoader(items, schema, tokenizer);
}
