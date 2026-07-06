import {
  markdownLoader,
  resolve,
  Schema,
  setupBase,
  setupBlockquote,
  setupBold,
  setupCode,
  setupCodeBlock,
  setupHardBreak,
  setupHeading,
  setupHorizontalRule,
  setupImage,
  setupItalic,
  setupLink,
  setupList,
  setupParagraph,
  setupStrike,
  setupTable,
  setupWikiLink,
} from '@bangle.io/prosemirror-plugins';
import { MARKDOWN_CORPUS } from '@bangle.io/test-utils';
import { describe, expect, it } from 'vitest';

// Mirrors the markdown-relevant subset of the app's real extension set (see
// `packages/core/editor/src/extensions.ts`): every node/mark type that owns
// Markdown parsing or serialization behavior, without the app-only UI
// plugins (suggestions, menus, placeholder, drag/drop) that carry no
// Markdown fidelity of their own.
function createMarkdown() {
  const extensions = [
    setupBase(),
    setupParagraph(),
    setupHeading(),
    setupBlockquote(),
    setupList(),
    setupBold(),
    setupItalic(),
    setupStrike(),
    setupCode(),
    setupCodeBlock(),
    setupLink(),
    setupImage(),
    setupHardBreak(),
    setupHorizontalRule(),
    setupWikiLink(),
    setupTable(),
  ];
  const resolved = resolve(extensions);
  const schema = new Schema({ nodes: resolved.nodes, marks: resolved.marks });
  return markdownLoader(extensions, schema);
}

/**
 * Cross-engine parity contract test (see
 * `plans/011-wordgard-editor-w-migration.md`, milestone M1): every fixture in
 * `@bangle.io/test-utils`'s `MARKDOWN_CORPUS` whose `engines` includes
 * `'prosemirror'` must round-trip byte-identically through this engine's
 * parse/serialize pipeline. A future `editor-w` test asserts the same
 * contract for the Wordgard engine against the same corpus.
 */
describe('Markdown golden corpus (ProseMirror engine)', () => {
  const fixtures = MARKDOWN_CORPUS.filter((fixture) =>
    fixture.engines.includes('prosemirror'),
  );

  it.each(
    fixtures.map((fixture) => [fixture.name, fixture] as const),
  )('round trips byte-identically: %s', (_name, fixture) => {
    const markdown = createMarkdown();
    const document = markdown.parser.parse(fixture.markdown);
    const serialized = markdown.serializer.serialize(document);
    expect(serialized).toBe(fixture.markdown);
  });
});
