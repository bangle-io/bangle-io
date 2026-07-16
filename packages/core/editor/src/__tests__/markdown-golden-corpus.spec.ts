import { MARKDOWN_CORPUS, MARKDOWN_SPEC_CORPUS } from '@bangle.io/test-utils';
import { describe, expect, it } from 'vitest';
import { createProductionMarkdown } from './production-markdown-test-helpers';

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
    const markdown = createProductionMarkdown();
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
