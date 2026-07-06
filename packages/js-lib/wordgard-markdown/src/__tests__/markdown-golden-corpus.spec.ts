import { MARKDOWN_CORPUS } from '@bangle.io/test-utils';
import { describe, expect, it } from 'vitest';
import { createNoteMarkdownCodec } from '../codec';

/**
 * Cross-engine parity contract test (see
 * `plans/011-wordgard-editor-w-migration.md`, milestone M1): every fixture in
 * `@bangle.io/test-utils`'s `MARKDOWN_CORPUS` whose `engines` includes
 * `'wordgard'` must round-trip byte-identically through this package's
 * `createNoteMarkdownCodec()`. The ProseMirror engine asserts the same
 * contract in `packages/core/editor/src/__tests__/markdown-golden-corpus.spec.ts`
 * against the same corpus — a failure here means this engine has drifted
 * from the shared fixed point, not that the fixture itself is wrong.
 */
describe('golden corpus (wordgard)', () => {
  const codec = createNoteMarkdownCodec();
  const wordgardFixtures = MARKDOWN_CORPUS.filter((f) =>
    f.engines.includes('wordgard'),
  );

  it.each(
    wordgardFixtures.map((f) => [f.name, f.markdown] as const),
  )('%s', (_name, markdown) => {
    const doc = codec.parse(markdown);
    const out = codec.serialize(doc);
    expect(out).toBe(markdown);
  });
});
