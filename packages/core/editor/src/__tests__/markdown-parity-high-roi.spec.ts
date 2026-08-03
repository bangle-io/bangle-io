import { EditorState } from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';
import { createProductionMarkdown } from './production-markdown-test-helpers';

const markdown = createProductionMarkdown();

describe('high-ROI Markdown parity constructs', () => {
  it.each([
    ['marker-only callout', '> [!note]\n'],
    ['callout with a body', '> [!warning]\n> Careful **here**.\n'],
    ['callout with an adjacent list', '> [!note]\n> - First\n> - Second\n'],
    ['callout with an adjacent heading', '> [!note]\n> # Heading\n'],
    [
      'callout with adjacent fenced code',
      '> [!note]\n> ```js\n> const value = 1;\n> ```\n',
    ],
    ['callout with an empty fenced block', '> [!note]\n> ```\n> ```\n'],
    ['callout with an adjacent horizontal rule', '> [!note]\n> ***\n'],
    [
      'callout with an image-only paragraph',
      '> [!note]\n> ![Diagram](asset.png)\n',
    ],
    [
      'callout with an adjacent nested callout',
      '> [!note]\n> > [!tip]\n> > Nested\n',
    ],
    ['callout with intentional blank separation', '> [!note]\n>\n> Body\n'],
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

  it.each([
    [
      'highlight into bold',
      ['highlight', 1, 8] as const,
      ['bold', 5, 14] as const,
      '==one **two**== **three**',
    ],
    [
      'bold into highlight',
      ['bold', 1, 8] as const,
      ['highlight', 5, 14] as const,
      '**one ==two==** ==three==',
    ],
  ])('keeps %s edits as parseable Markdown', (_label, first, second, expected) => {
    const doc = markdown.parser.parse('one two three');
    const state = EditorState.create({ doc, schema: markdown.schema });
    const highlight = markdown.schema.marks.highlight;
    const bold = markdown.schema.marks.bold;
    if (!highlight || !bold) {
      throw new Error('highlight and bold marks are required');
    }
    const markTypes = { bold, highlight };
    const edited = state.tr
      .addMark(first[1], first[2], markTypes[first[0]].create())
      .addMark(second[1], second[2], markTypes[second[0]].create()).doc;

    const serialized = markdown.serializer.serialize(edited);
    expect(serialized).toBe(expected);
    const reparsed = markdown.parser.parse(serialized);
    let trailingTextKeepsMark = false;
    reparsed.descendants((node) => {
      if (node.text === 'three') {
        trailingTextKeepsMark = node.marks.some(
          (mark) => mark.type === markTypes[second[0]],
        );
      }
    });
    expect(trailingTextKeepsMark).toBe(true);
    expect(markdown.serializer.serialize(reparsed)).toBe(serialized);
  });
});
