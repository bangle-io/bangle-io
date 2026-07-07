import { Node, Plot, Schema } from 'wordgard/doc';
import { Doc } from 'wordgard/types';

/**
 * A YAML frontmatter block: raw text between `---` fences at the very top
 * of a note. It shares a code block's raw-text feel (inline text content,
 * {@link Node.Role.Code} so marks stay out) but is its own type and
 * deliberately NOT part of the `Content` group — it is only valid where a
 * schema explicitly admits it via {@link frontmatterDocContentOverride}.
 *
 * The shared tokenizer (`frontmatterTokenizer` in
 * `@bangle.io/markdown-syntax`) only ever produces a frontmatter token for
 * the first line of a document, so parsed frontmatter always sits first;
 * editor-side invariants (single instance, top position under editing
 * commands) are corrections for the editor milestone, not schema rules.
 */
export const Frontmatter: Plot.Tag<null> = Plot.define('Frontmatter', {
  inlineContent: true,
  role: Node.Role.Code,
  shape: {
    element: 'pre',
    selector: 'pre[data-frontmatter]',
    attributes: () => ({ 'data-frontmatter': '' }),
  },
});

/**
 * Schema override admitting {@link Frontmatter} into the built-in
 * {@link Doc} plot's content. Include this alongside `Frontmatter` when
 * defining a schema.
 */
export const frontmatterDocContentOverride: Schema.Override =
  Schema.Override.plotContent(Doc, (content) => [content, Frontmatter.type]);
