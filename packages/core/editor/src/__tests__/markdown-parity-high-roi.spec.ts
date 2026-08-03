import { describe, expect, it } from 'vitest';
import { createProductionMarkdown } from './production-markdown-test-helpers';

const markdown = createProductionMarkdown();

describe('high-ROI Markdown parity constructs', () => {
  it.each([
    ['marker-only callout', '> [!note]\n'],
    ['callout with a body', '> [!warning]\n> Careful **here**.\n'],
    [
      'callout with a title and multiple paragraphs',
      '> [!tip] Optional title\n>\n> First paragraph.\n>\n> Second paragraph.\n',
    ],
    ['nested callout', '> [!note]\n> Outer\n>\n> > [!tip]\n> > Nested\n'],
  ])('round trips %s byte-for-byte', (_label, source) => {
    const doc = markdown.parser.parse(source);
    expect(markdown.serializer.serialize(doc)).toBe(source.trimEnd());
    expect(doc.firstChild?.attrs.calloutType).toBeTruthy();
  });

  it('keeps ordinary blockquotes unchanged', () => {
    const source = '> Ordinary **quote**.\n';
    const doc = markdown.parser.parse(source);
    expect(doc.firstChild?.attrs.calloutType).toBeNull();
    expect(markdown.serializer.serialize(doc)).toBe(source.trimEnd());
  });

  it.each([
    'before ==highlighted== after',
    '==**bold** and [linked](https://example.com)==',
  ])('round trips highlight marks: %s', (source) => {
    const doc = markdown.parser.parse(source);
    const highlight = markdown.schema.marks.highlight;
    expect(highlight).toBeDefined();
    if (!highlight) {
      throw new Error('highlight mark is missing from the production schema');
    }
    expect(doc.rangeHasMark(0, doc.content.size, highlight)).toBe(true);
    expect(markdown.serializer.serialize(doc)).toBe(source);
  });
});
