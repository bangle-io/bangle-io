import { describe, expect, it } from 'vitest';
import { isMarkdownRoundTripPreserved } from '../round-trip-check';
import { createProductionMarkdown } from './production-markdown-test-helpers';

// Mirrors the markdown-relevant subset of the app's real extension set, same
// as markdown-golden-corpus.spec.ts, so the gate is exercised against the
// serializer behavior the app actually ships.
function roundTrip(source: string): boolean {
  const markdown = createProductionMarkdown();
  const doc = markdown.parser.parse(source);
  if (!doc) {
    throw new Error('parse returned null');
  }
  const serialized = markdown.serializer.serialize(doc);
  return isMarkdownRoundTripPreserved(source, serialized);
}

describe('isMarkdownRoundTripPreserved comparator', () => {
  it('accepts identical content', () => {
    expect(isMarkdownRoundTripPreserved('# Hi\n', '# Hi\n')).toBe(true);
  });

  it('tolerates CRLF sources against LF output', () => {
    expect(
      isMarkdownRoundTripPreserved('# Hi\r\n\r\ntext\r\n', '# Hi\n\ntext\n'),
    ).toBe(true);
  });

  it('tolerates trailing whitespace differences at end of file', () => {
    expect(isMarkdownRoundTripPreserved('# Hi\n\n\n', '# Hi\n')).toBe(true);
  });

  it('rejects any content difference', () => {
    expect(isMarkdownRoundTripPreserved('*bold*', '_bold_')).toBe(false);
  });
});

describe('round-trip gate against the real serializer', () => {
  it.each([
    ['heading and paragraph', '# Title\n\nSome text here.\n'],
    ['bullet list', '- one\n\n- two\n'],
    ['fenced code block', '```js\nconst a = 1;\n```\n'],
    ['blockquote', '> quoted text\n'],
    ['inline formatting', 'Some **bold** and _italic_ and `code`.\n'],
    ['link', '[bangle](https://bangle.io)\n'],
    ['math block', '$$\nx^2 + y^2\n$$\n'],
    ['escaped dollar', String.raw`escaped \$x$`],
  ])('preserves %s', (_label, source) => {
    expect(roundTrip(source)).toBe(true);
  });

  // Constructs documented by plan 012 or its follow-up fidelity audit as
  // mangling on save. The gate must flag every one of them so the reformat is
  // visible instead of silent.
  it.each([
    ['footnote reference', 'A claim.[^1]\n\n[^1]: The source.\n'],
    [
      'orphan footnote definition that disappears',
      'Before.\n\n[^orphan]: definition\n\nAfter.\n',
    ],
    ['reference link', '[foo][ref]\n\n[ref]: https://example.com\n'],
    ['single-tilde strikethrough', 'this is ~gone~ now\n'],
    ['html entity', 'Tom &amp; Jerry\n'],
    ['multiline raw HTML that collapses', '<div>\nraw **body**\n</div>\n'],
    ['unsupported folding callout marker', '> [!note]+ Folded\n> Body\n'],
    ['definition list', 'term\n: definition\n'],
  ])('flags %s as not preserved', (_label, source) => {
    expect(roundTrip(source)).toBe(false);
  });

  // Not every mismatch is a benign reformat: an unused reference definition is
  // dropped entirely on save (`Some text.\n\n[u]: https://x` -> `Some text.`),
  // so the notice must never claim the user's content is safe. This locks in
  // that the gate still fires for the genuine data-loss case.
  it('flags an unused reference definition whose content is dropped', () => {
    const source = 'Some paragraph.\n\n[unused]: https://example.com\n';
    const markdown = createProductionMarkdown();
    const doc = markdown.parser.parse(source);
    if (!doc) {
      throw new Error('parse returned null');
    }
    const serialized = markdown.serializer.serialize(doc);
    expect(serialized).not.toContain('https://example.com');
    expect(isMarkdownRoundTripPreserved(source, serialized)).toBe(false);
  });
});
