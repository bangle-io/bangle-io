import {
  markdownLoader,
  resolve,
  Schema,
  setupBase,
  setupBlockquote,
  setupBold,
  setupCode,
  setupCodeBlock,
  setupFrontmatter,
  setupHardBreak,
  setupHeading,
  setupHorizontalRule,
  setupImage,
  setupItalic,
  setupLink,
  setupList,
  setupMath,
  setupParagraph,
  setupStrike,
  setupTable,
  setupWikiLink,
} from '@bangle.io/prosemirror-plugins';
import { MARKDOWN_CORPUS, MARKDOWN_SPEC_CORPUS } from '@bangle.io/test-utils';
import { describe, expect, it } from 'vitest';

// Mirrors the markdown-relevant subset of the app's real extension set (see
// `packages/core/editor/src/extensions.ts`): every node/mark type that owns
// Markdown parsing or serialization behavior, without the app-only UI
// plugins (suggestions, menus, placeholder, drag/drop) that carry no
// Markdown fidelity of their own.
//
// Registration order must match `setupExtensions`' relative order for marks
// (bold, strike, italic, link): PM mark rank follows schema insertion
// order, and rank decides delimiter nesting when marks overlap — a different
// order here would make this test bless canonical forms (`_~~x~~_`) that the
// real app serializes differently (`~~_x_~~`). The `code` mark is the one
// exception: `setupCode` pins it to the lowest priority so it always ranks
// last (innermost on serialize) regardless of registration order.
function createMarkdown() {
  const extensions = [
    setupBase({ docContent: 'frontmatter? block+' }),
    setupFrontmatter(),
    setupBlockquote(),
    setupBold(),
    setupList(),
    setupMath(),
    setupHardBreak(),
    setupHeading(),
    setupParagraph(),
    setupStrike(),
    setupWikiLink(),
    setupHorizontalRule(),
    setupCode(),
    setupCodeBlock(),
    setupItalic(),
    setupLink(),
    setupImage(),
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
 * `'prosemirror'` must serialize to its expected bytes (`canonical` for
 * normalization fixtures, the input itself otherwise), and that expected
 * form must be a fixed point of this engine's parse/serialize round trip.
 * The Wordgard engine asserts the same contract against the same corpus in
 * `packages/js-lib/wordgard-markdown`.
 */
describe('Markdown golden corpus (ProseMirror engine)', () => {
  const fixtures = [...MARKDOWN_CORPUS, ...MARKDOWN_SPEC_CORPUS].filter(
    (fixture) => fixture.engines.includes('prosemirror'),
  );

  it.each(
    fixtures.map((fixture) => [fixture.name, fixture] as const),
  )('round trips byte-identically: %s', (_name, fixture) => {
    const markdown = createMarkdown();
    const roundTrip = (input: string) =>
      markdown.serializer.serialize(markdown.parser.parse(input));

    const expected = fixture.canonical ?? fixture.markdown;
    expect(roundTrip(fixture.markdown)).toBe(expected);
    if (fixture.canonical !== undefined) {
      // The canonical form must itself be stable, or the "normalization"
      // never converges and every save would rewrite the note.
      expect(roundTrip(fixture.canonical)).toBe(fixture.canonical);
    }
  });
});
