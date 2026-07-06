import { listMarkdownPlugin } from '@bangle.dev/pm-markdown/list-markdown';
import markdownIt from 'markdown-it';

/**
 * Builds the engine-neutral base Markdown tokenizer that every editor engine —
 * and every headless Markdown consumer (e.g. the backlink indexer) — must
 * share.
 *
 * The token stream this produces is engine-agnostic: turning tokens into a
 * ProseMirror or Wordgard document is the codec's job, not the tokenizer's.
 * Both engines MUST tokenize with the same base configuration, or they would
 * disagree about what a stored note means (e.g. whether `~~x~~` is a
 * strikethrough) — the single fidelity invariant this package exists to
 * protect. Feature-specific inline syntax (such as {@link wikiLinkTokenizer})
 * is layered on top with `.use(...)` so each consumer opts into exactly the
 * constructs it understands.
 *
 * Every call returns a fresh instance so callers never mutate shared parser
 * state. Keep this in lockstep with `@bangle.dev/pm-markdown`'s default
 * tokenizers; `listMarkdownPlugin` is consumed purely as a markdown-it plugin
 * (engine-neutral tokenization), not for any ProseMirror behavior.
 */
export function createBaseMarkdownTokenizer() {
  return markdownIt('commonmark', { html: false, breaks: false })
    .enable('strikethrough')
    .use(listMarkdownPlugin);
}
