import { markdownLoader as upstreamMarkdownLoader } from '@bangle.dev/pm-markdown/markdown';
import type { CollectionType } from '@bangle.io/banger-editor';
import { createBaseMarkdownTokenizer } from '@bangle.io/markdown-syntax';
import type { Schema } from 'prosemirror-model';
import { createMarkdownSerializer } from './markdown-serializer';

/**
 * Assembles the ProseMirror-stack tokenizer: the engine-neutral base
 * (`@bangle.io/markdown-syntax`) plus every extension's own markdown-it plugins.
 *
 * The base configuration lives in the shared syntax package so this editor
 * engine and any other agree byte-for-byte on how Markdown tokenizes; only the
 * per-extension `tokenizerPlugins` are ProseMirror-collection specific and stay
 * here.
 */
function createMarkdownTokenizer(items: readonly CollectionType[]) {
  const tokenizer = createBaseMarkdownTokenizer();
  for (const item of items) {
    for (const plugin of item.markdown?.tokenizerPlugins ?? []) {
      tokenizer.use(plugin);
    }
  }
  return tokenizer;
}

export function markdownLoader(items: CollectionType[], schema: Schema) {
  const tokenizer = createMarkdownTokenizer(items);
  const markdown = upstreamMarkdownLoader(items, schema, tokenizer);
  return {
    ...markdown,
    serializer: createMarkdownSerializer(markdown.serializer),
  };
}
