import { describe, expect, it } from 'vitest';
import { createNoteMarkdownCodec } from '../codec';

/**
 * Round-trip fixtures: `serialize(parse(md)) === md` for every construct the
 * note schema supports. These assert byte parity with the ProseMirror
 * engine's own Markdown conventions (see `default-specs.ts`), which is the
 * whole point of this package — a silent divergence here would mean two
 * editor engines disagree about what a stored note's Markdown means.
 */
describe('createNoteMarkdownCodec round-trip', () => {
  const codec = createNoteMarkdownCodec();
  const roundTrip = (md: string) => codec.serialize(codec.parse(md));

  it.each([
    ['single paragraph', 'Hello world'],
    ['multiple paragraphs', 'First paragraph\n\nSecond paragraph'],
    ['heading 1', '# Heading one'],
    ['heading 2', '## Heading two'],
    ['heading 3', '### Heading three'],
    ['heading 4', '#### Heading four'],
    ['heading 5', '##### Heading five'],
    ['heading 6', '###### Heading six'],
    ['blockquote', '> quoted text'],
    ['nested blockquote', '> outer\n>\n> > inner'],
    ['horizontal rule', 'above\n\n---\n\nbelow'],
    ['hard break', 'line one\\\nline two'],
    ['multiple hard breaks', 'a\\\n\\\nb'],
    ['bold spanning a hard break', '**bold line one\\\nbold line two**'],
    ['bold ending right before a hard break', '**bold**\\\nplain text'],
    ['bold', '**bold text**'],
    ['italic', '_italic text_'],
    ['strikethrough', '~~struck text~~'],
    ['inline code', 'some `code` here'],
    [
      'inline code with backticks inside',
      'some `` code with ` backtick `` here',
    ],
    ['bold+italic mixable', '**bold _both_**'],
    ['image no title', '![alt text](./image.png)'],
    ['image with title', '![alt text](./image.png "a title")'],
    ['image empty alt', '![](./image.png)'],
    ['link with title', '[link text](https://example.com "a title")'],
    ['link relative url', '[relative](../notes/other.md)'],
    ['autolink', '<https://example.com/path>'],
    ['escaped emphasis', '\\*not em\\*'],
    ['wiki link target only', '[[target-note]]'],
    ['wiki link with label', '[[target-note|Display Label]]'],
    ['wiki link unicode', '[[日本語ノート|ラベル]]'],
    ['empty code block', '```\n```'],
    ['code block with language', '```js\nconst x = 1;\n```'],
    ['code block with backticks inside', '````\n```\nnested fence\n```\n````'],
  ])('%s', (_name, md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('empty document round-trips to empty string', () => {
    expect(roundTrip('')).toBe('');
  });

  it('an escaped wiki-link opener parses as plain text, not a wiki link', () => {
    // `\[[..]]` escapes only the first `[`, so the wikiLinkTokenizer (which
    // runs before markdown-it's `escape` rule) never sees a `[[` opener —
    // the whole thing becomes plain text. Escaping isn't guaranteed to be
    // byte-identical on round-trip (unescaped brackets that happen to need
    // escaping look identical to originally-escaped ones after parsing);
    // what matters is that it re-parses back to the same plain text, with
    // no wiki link node created.
    const md = '\\[[not a wiki link]]';
    const doc = createNoteMarkdownCodec().parse(md);
    const paragraph = doc.content[0];
    if (!paragraph?.isPlot) throw new Error('expected a paragraph plot');
    expect(paragraph.content.some((n) => n.name === 'WikiLink')).toBe(false);
    expect(paragraph.textContent()).toBe('[[not a wiki link]]');

    const out = roundTrip(md);
    expect(out).toBe('\\[\\[not a wiki link\\]\\]');
    // Re-parsing the serialized form must still not produce a wiki link,
    // and must preserve the same literal text.
    const reparsed = createNoteMarkdownCodec().parse(out);
    const reparsedParagraph = reparsed.content[0];
    if (!reparsedParagraph?.isPlot)
      throw new Error('expected a paragraph plot');
    expect(reparsedParagraph.textContent()).toBe('[[not a wiki link]]');
  });

  describe('lists', () => {
    it.each([
      ['bullet list single item', '- one'],
      ['bullet list multiple items', '- one\n\n- two\n\n- three'],
      ['ordered list', '1. first\n\n1. second\n\n1. third'],
      ['task list', '- [ ] todo one\n\n- [x] todo two'],
      [
        'nested bullet list',
        '- one\n\n- two\n\n  - nested a\n\n  - nested b\n\n- three',
      ],
      [
        'mixed nested list kinds',
        '- one\n\n  1. nested ordered a\n\n  1. nested ordered b\n\n- two',
      ],
      ['multi-paragraph list item', '- one\n\n  more text\n\n- two'],
    ])('%s', (_name, md) => {
      expect(roundTrip(md)).toBe(md);
    });
  });

  describe('constructs combined inside lists', () => {
    it.each([
      ['bold inside list item', '- **bold item**'],
      ['wiki link inside list item', '- item with [[a-note]]'],
      ['wiki link inside bold', '**bold [[a-note|label]] text**'],
    ])('%s', (_name, md) => {
      expect(roundTrip(md)).toBe(md);
    });
  });

  it('an empty blockquote is filled with a default paragraph, not rejected', () => {
    // `>` with no content is valid Markdown, but Wordgard's Blockquote plot
    // requires at least one block child. `Schema.createAndFill` supplies an
    // empty default paragraph (see `parser.ts`'s `closeNode`), matching the
    // ProseMirror engine's own `"> "` output for the same input.
    expect(roundTrip('>')).toBe('> ');
  });
});

describe('createNoteMarkdownCodec parse shape', () => {
  const codec = createNoteMarkdownCodec();

  it('heading level is stored as the plot tag param', () => {
    const doc = codec.parse('### Level three');
    const heading = doc.content[0];
    expect(heading?.isPlot).toBe(true);
    expect(heading && !heading.isLeaf ? heading.tag.param : undefined).toBe(3);
  });

  it('a task item inside an ordered list parses without failing', () => {
    // GFM allows `1. [ ] x`; the schema admits the transient
    // OrderedList > TaskItem shape (see `taskListContentOverrides`) so a
    // legal note never turns into a load failure. Serialization normalizes
    // the item back to a `- [ ]` bullet, matching the ProseMirror engine.
    const doc = codec.parse('1. [ ] task');
    const list = doc.content[0];
    if (!list?.isPlot) throw new Error('expected a plot');
    expect(list.tag.type.name).toBe('OrderedList');
    const [item] = list.content;
    expect(item?.isPlot && item.name).toBe('TaskItem');
    expect(codec.serialize(doc)).toBe('- [ ] task');
  });

  it('task item checked state is stored as the plot tag param', () => {
    const doc = codec.parse('- [x] done\n\n- [ ] not done');
    const list = doc.content[0];
    expect(list?.isPlot).toBe(true);
    if (!list?.isPlot) throw new Error('expected a plot');
    const [doneItem, notDoneItem] = list.content;
    expect(
      doneItem?.isPlot && !doneItem.isLeaf ? doneItem.tag.param : undefined,
    ).toBe(true);
    expect(
      notDoneItem?.isPlot && !notDoneItem.isLeaf
        ? notDoneItem.tag.param
        : undefined,
    ).toBe(false);
  });

  it('wiki link target is the leaf param and label is a mark', () => {
    const doc = codec.parse('[[my-target|My Label]]');
    const paragraph = doc.content[0];
    if (!paragraph?.isPlot) throw new Error('expected a paragraph plot');
    const wikiLink = paragraph.content[0];
    expect(wikiLink?.isLeaf).toBe(true);
    if (!wikiLink?.isLeaf) throw new Error('expected a leaf');
    expect(wikiLink.param).toBe('my-target');
    const labelMark = wikiLink.marks.find((m) => m.name === 'WikiLinkLabel');
    expect(labelMark?.value).toBe('My Label');
  });

  it('code block language is stored as a CodeBlockLanguage mark on the plot', () => {
    const doc = codec.parse('```typescript\nconst x = 1;\n```');
    const codeBlock = doc.content[0];
    expect(codeBlock?.isPlot).toBe(true);
    if (!codeBlock?.isPlot) throw new Error('expected a plot');
    const languageMark = codeBlock.tag.marks.find(
      (m) => m.name === 'CodeBlockLanguage',
    );
    expect(languageMark?.value).toBe('typescript');
  });
});
