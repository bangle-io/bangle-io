import markdownIt from 'markdown-it';
import { listTokenizer } from './list-syntax';

/**
 * Builds the engine-neutral base Markdown tokenizer that every editor engine —
 * and every headless Markdown consumer (e.g. the backlink indexer) — must
 * share.
 *
 * The token stream this produces is engine-agnostic: turning tokens into a
 * ProseMirror or Wordgard document is the codec's job, not the tokenizer's.
 * Both engines MUST tokenize with the same base configuration, or they would
 * disagree about what a stored note means (e.g. whether `~~x~~` is a
 * strikethrough, or whether `- [ ] x` is a task item) — the single fidelity
 * invariant this package exists to protect. Feature-specific inline syntax
 * (such as {@link wikiLinkTokenizer}) is layered on top with `.use(...)` so
 * each consumer opts into exactly the constructs it understands.
 *
 * Every call returns a fresh instance so callers never mutate shared parser
 * state.
 */
export function createBaseMarkdownTokenizer() {
  return markdownIt('commonmark', { html: false, breaks: false })
    .enable('strikethrough')
    .use(listTokenizer);
}
