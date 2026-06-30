import { listMarkdownPlugin } from '@bangle.dev/pm-markdown/list-markdown';
import { markdownLoader as upstreamMarkdownLoader } from '@bangle.dev/pm-markdown/markdown';
import type { CollectionType } from '@bangle.io/banger-editor';
import markdownIt from 'markdown-it';
import type { Schema } from 'prosemirror-model';

/**
 * Creates an isolated tokenizer so editor extensions never mutate shared parser state.
 *
 * Long term, this wrapper should disappear into the upstream Markdown loader:
 * extension-owned tokenizer plugins, parse rules, and serializer rules should be
 * assembled by one authoritative loader so Bangle.io cannot drift from upstream
 * default Markdown behavior. Until then, keep this tokenizer construction in
 * lockstep with @bangle.dev/pm-markdown's defaultTokenizers.
 */
export function createMarkdownTokenizer(items: readonly CollectionType[]) {
  const tokenizer = markdownIt('commonmark', { html: false, breaks: false })
    .enable('strikethrough')
    .use(listMarkdownPlugin);
  for (const item of items) {
    for (const plugin of item.markdown?.tokenizerPlugins ?? []) {
      tokenizer.use(plugin);
    }
  }
  return tokenizer;
}

export function markdownLoader(items: CollectionType[], schema: Schema) {
  const tokenizer = createMarkdownTokenizer(items);
  return upstreamMarkdownLoader(items, schema, tokenizer);
}
