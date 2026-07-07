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
  setupParagraph,
  setupStrike,
  setupTable,
  setupWikiLink,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';
import { isMarkdownRoundTripPreserved } from '../round-trip-check';

// Mirrors the markdown-relevant subset of the app's real extension set, same
// as markdown-golden-corpus.spec.ts, so the gate is exercised against the
// serializer behavior the app actually ships.
function createMarkdown() {
  const extensions = [
    setupBase({ docContent: 'frontmatter? block+' }),
    setupFrontmatter(),
    setupBlockquote(),
    setupBold(),
    setupList(),
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

function roundTrip(source: string): boolean {
  const markdown = createMarkdown();
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
  ])('preserves %s', (_label, source) => {
    expect(roundTrip(source)).toBe(true);
  });

  // The constructs plan 012 documents as mangling on save. The gate must
  // flag every one of them so the reformat is visible instead of silent.
  it.each([
    ['footnote reference', 'A claim.[^1]\n\n[^1]: The source.\n'],
    ['reference link', '[foo][ref]\n\n[ref]: https://example.com\n'],
    ['single-tilde strikethrough', 'this is ~gone~ now\n'],
    ['html entity', 'Tom &amp; Jerry\n'],
    ['math block', '$$\nx^2 + y^2\n$$\n'],
    ['definition list', 'term\n: definition\n'],
  ])('flags %s as not preserved', (_label, source) => {
    expect(roundTrip(source)).toBe(false);
  });
});
