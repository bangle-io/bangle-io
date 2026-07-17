import { MARKDOWN_CORPUS, MARKDOWN_SPEC_CORPUS } from '@bangle.io/test-utils';
import { describe, expect, it } from 'vitest';
import { createNoteMarkdownCodec } from '../codec';

/**
 * Cross-engine parity contract test (see
 * `plans/011-wordgard-editor-w-migration.md`, milestone M1): every fixture in
 * `@bangle.io/test-utils`'s `MARKDOWN_CORPUS` whose `engines` includes
 * `'wordgard'` must serialize to its expected bytes (`canonical` for
 * normalization fixtures, the input itself otherwise) through this package's
 * `createNoteMarkdownCodec()`, and that expected form must be a fixed point
 * of the round trip. The ProseMirror engine asserts the same contract in
 * `packages/core/editor/src/__tests__/markdown-golden-corpus.spec.ts`
 * against the same corpus — a failure here means this engine has drifted
 * from the shared fixed point, not that the fixture itself is wrong.
 */
describe('golden corpus (wordgard)', () => {
  const codec = createNoteMarkdownCodec();
  const roundTrip = (input: string) => codec.serialize(codec.parse(input));
  const wordgardFixtures = [...MARKDOWN_CORPUS, ...MARKDOWN_SPEC_CORPUS].filter(
    (f) => f.engines.includes('wordgard'),
  );

  it.each(
    wordgardFixtures.map((f) => [f.name, f] as const),
  )('%s', (_name, fixture) => {
    const expected = fixture.canonical ?? fixture.markdown;
    expect(roundTrip(fixture.markdown)).toBe(expected);
    if (fixture.canonical !== undefined) {
      // The canonical form must itself be stable, or the "normalization"
      // never converges and every save would rewrite the note.
      expect(roundTrip(fixture.canonical)).toBe(fixture.canonical);
    }
  });
});
