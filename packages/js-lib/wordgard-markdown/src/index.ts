/**
 * `@bangle.io/wordgard-markdown` is the ProseMirror-free
 * `markdown string <-> Wordgard Plot.Doc` codec: it plays the same role
 * for the Wordgard editor engine that `prosemirror-markdown` plays for the
 * ProseMirror engine, built on the shared `@bangle.io/markdown-syntax`
 * tokenizer so both engines agree on what a stored note's Markdown means.
 *
 * This package is intentionally editor-free (no DOM, no Wordgard editor
 * state) — it only knows about `Plot.Doc` values, so it can run in a
 * worker, a test, or a headless indexer exactly like it runs inside
 * `editor-w`.
 *
 * Use {@link createNoteMarkdownCodec} for the batteries-included Bangle
 * note schema/spec set. Use {@link createMarkdownCodec} directly to build a
 * codec over a custom schema and/or spec set (e.g. for a reduced schema, or
 * to add a new construct's `MarkdownSpec` before it's promoted into the
 * default set).
 */
export {
  createMarkdownCodec,
  createNoteMarkdownCodec,
  type MarkdownCodec,
  type MarkdownCodecOptions,
} from './codec';
export { defaultMarkdownSpecs } from './default-specs';
export {
  isMarkMarkdownSpec,
  isNodeMarkdownSpec,
  type MarkdownSpec,
  type MarkMarkdownSpec,
  type MarkTypeRef,
  type NodeMarkdownSpec,
  type NodeTypeRef,
  type TokenParseSpec,
} from './spec';
export { MarkdownSerializerState } from './state';
