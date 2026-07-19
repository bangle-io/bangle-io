import {
  Blockquote,
  BulletList,
  CodeBlock,
  Doc,
  Emphasis,
  Heading,
  HorizontalRule,
  Leaf,
  LineBreak,
  Link,
  LinkTitle,
  ListItem,
  type Node,
  OrderedList,
  Paragraph,
  Schema,
  Strong,
  TaskItem,
} from '@bangle.io/wordgard-utils';
import { describe, expect, it } from 'vitest';
import { createMarkdownCodec, createNoteMarkdownCodec } from '../codec';
import { defaultMarkdownSpecs } from '../default-specs';

describe('createMarkdownCodec failure paths', () => {
  it('throws a descriptive error for a markdown-it token type with no registered spec', () => {
    // A schema/spec set that never registers a `heading` parse handler:
    // parsing a heading must fail loudly rather than silently drop it.
    const schema = Schema.define([Doc, Paragraph]);
    const specs = defaultMarkdownSpecs.filter(
      (spec) => !('node' in spec) || spec.node !== Heading,
    );
    const codec = createMarkdownCodec({ schema, specs });

    expect(() => codec.parse('# A heading')).toThrow(
      /Token type `heading_open` not supported by Markdown parser/,
    );
  });

  it('throws a descriptive error naming the node type when serializing an unsupported node', () => {
    // A schema that includes Strong (so parsing succeeds) but a spec set
    // with no serializer registered for it: serializing must name the type.
    const schema = Schema.define([Doc, Paragraph, Strong]);
    const specs = defaultMarkdownSpecs.filter(
      (spec) => !('mark' in spec) || spec.mark !== Strong,
    );
    const codec = createMarkdownCodec({ schema, specs });

    const doc = schema.doc([Paragraph.create([Leaf.text('bold', [Strong])])]);

    expect(() => codec.serialize(doc)).toThrow(
      /Mark type `Strong` not supported by Markdown renderer/,
    );
  });

  it('throws a descriptive error naming the plot type when serializing an unsupported plot', () => {
    const schema = Schema.define([Doc, Paragraph, Emphasis]);
    const specs = defaultMarkdownSpecs.filter(
      (spec) => !('node' in spec) || spec.node !== Paragraph,
    );
    const codec = createMarkdownCodec({ schema, specs });

    const doc = schema.doc([Paragraph.create([Leaf.text('hi')])]);

    expect(() => codec.serialize(doc)).toThrow(
      /Node type `Paragraph` not supported by Markdown serializer/,
    );
  });
});

describe('createNoteMarkdownCodec', () => {
  it('exposes its schema', () => {
    const codec = createNoteMarkdownCodec();
    expect(codec.schema).toBeInstanceOf(Schema);
  });

  it('does not leak a titled link’s LinkTitle mark onto trailing text', () => {
    // `link_close` tokens carry no attributes, so the parser must remember
    // which marks the matching `link_open` added (Link + LinkTitle) instead
    // of recomputing them from the close token — recomputing would remove
    // only Link and leave LinkTitle active for the rest of the paragraph.
    const codec = createNoteMarkdownCodec();
    const doc = codec.parse('[a](b "c") more text');

    const paragraph = doc.content[0];
    if (!paragraph || !paragraph.isPlot) throw new Error('expected paragraph');
    const trailing = paragraph.content[paragraph.content.length - 1];
    if (!trailing) throw new Error('expected trailing text');

    expect(trailing.isText).toBe(true);
    expect(trailing.mark(LinkTitle)).toBeUndefined();
    expect(trailing.mark(Link)).toBeUndefined();
    expect(codec.serialize(doc)).toBe('[a](b "c") more text');
  });

  it('expels enclosing whitespace from a Strong-marked text node', () => {
    // CommonMark forbids whitespace just inside `**`/`_` delimiters, so
    // `** bold **` never parses into a Strong mark in the first place (it
    // stays literal text) — this case can only be exercised by constructing
    // the marked node directly, mirroring how a Wordgard editing command
    // (not the Markdown parser) could produce this document shape.
    const codec = createNoteMarkdownCodec();
    const { schema } = codec;

    // A lone marked node: there is no following node for the trailing
    // whitespace to be expelled past, so (matching the ProseMirror engine
    // exactly) only the leading whitespace moves outside the delimiters.
    const lone = schema.doc([
      Paragraph.create([Leaf.text(' bold ', [Strong])]),
    ]);
    expect(codec.serialize(lone)).toBe(' **bold** ');

    // With a following sibling, both sides expel.
    const withSibling = schema.doc([
      Paragraph.create([Leaf.text(' bold ', [Strong]), Leaf.text('after')]),
    ]);
    expect(codec.serialize(withSibling)).toBe(' **bold** after');
  });
});

/**
 * Serialize-only cases over directly constructed documents, ported from
 * prosemirror-markdown's own test suite: these document shapes cannot be
 * produced by parsing Markdown (the parser never yields them), only by
 * editing commands, so the round-trip corpus cannot cover them.
 */
describe('serializing constructed documents', () => {
  const codec = createNoteMarkdownCodec();
  const { schema } = codec;
  const paragraph = (text: string) => Paragraph.create([Leaf.text(text)]);

  function listDocument(
    firstItemContent: Parameters<typeof ListItem.create>[0],
  ) {
    return schema.doc([
      BulletList.create([
        ListItem.create(firstItemContent),
        ListItem.create([paragraph('second')]),
      ]),
    ]);
  }

  function taskListDocument(firstBlock: Node, ordered = false) {
    const items = [
      TaskItem.of(false).create([firstBlock]),
      TaskItem.of(false).create([paragraph('second')]),
    ];
    return schema.doc([
      ordered ? OrderedList.of(1).create(items) : BulletList.create(items),
    ]);
  }

  it.each([
    {
      name: 'adjacent paragraphs',
      blocks: () => [paragraph('first'), paragraph('extra')],
      expected: '- first\n\n  extra\n\n- second',
      expectedTypes: ['Paragraph', 'Paragraph'],
    },
    {
      name: 'a paragraph after a nested list',
      blocks: () => [
        BulletList.create([ListItem.create([paragraph('nested')])]),
        paragraph('after'),
      ],
      expected: '- \n  - nested\n\n  after\n\n- second',
      expectedTypes: ['BulletList', 'Paragraph'],
    },
    {
      name: 'a thematic break after a paragraph',
      blocks: () => [paragraph('first'), HorizontalRule],
      expected: '- first\n\n  ---\n\n- second',
      expectedTypes: ['Paragraph', 'HorizontalRule'],
    },
    {
      name: 'adjacent blockquotes',
      blocks: () => [
        Blockquote.create([paragraph('first')]),
        Blockquote.create([paragraph('extra')]),
      ],
      expected: '- > first\n\n  > extra\n\n- second',
      expectedTypes: ['Blockquote', 'Blockquote'],
    },
  ])('renders an edited tight item with $name as loose', ({
    blocks,
    expected,
    expectedTypes,
  }) => {
    const serialized = codec.serialize(listDocument(blocks()));
    const reparsed = codec.parse(serialized);
    const list = reparsed.content[0];
    if (!list?.isPlot) throw new Error('expected a list');
    const first = list.content[0];
    if (!first?.isPlot) throw new Error('expected a list item');

    expect(serialized).toBe(expected);
    expect(first.content.map((node) => node.name)).toEqual(expectedTypes);
    expect(codec.serialize(reparsed)).toBe(serialized);
  });

  it('keeps representable compound items tight and disambiguates a leading thematic break', () => {
    const tight = listDocument([
      paragraph('first'),
      Blockquote.create([paragraph('quote')]),
      CodeBlock.create([Leaf.text('code')]),
    ]);
    expect(codec.serialize(tight)).toBe(
      '- first\n  > quote\n  ```\n  code\n  ```\n- second',
    );

    const rule = codec.serialize(
      listDocument([HorizontalRule, paragraph('after')]),
    );
    expect(rule).toBe('- \n  ---\n  after\n- second');
    expect(codec.serialize(codec.parse(rule))).toBe(rule);
  });

  it.each([
    {
      name: 'a blockquote',
      block: () => Blockquote.create([paragraph('quote')]),
      expected: '- [ ] \n  > quote\n- [ ] second',
      expectedType: 'Blockquote',
      ordered: false,
    },
    {
      name: 'a heading',
      block: () => Heading.of(1).create([Leaf.text('heading')]),
      expected: '- [ ] \n  # heading\n- [ ] second',
      expectedType: 'Heading',
      ordered: false,
    },
    {
      name: 'a fenced code block',
      block: () => CodeBlock.create([Leaf.text('code')]),
      expected: '- [ ] \n  ```\n  code\n  ```\n- [ ] second',
      expectedType: 'CodeBlock',
      ordered: false,
    },
    {
      name: 'a thematic break',
      block: () => HorizontalRule,
      expected: '- [ ] \n\n  ---\n\n- [ ] second',
      expectedType: 'HorizontalRule',
      ordered: false,
    },
    {
      name: 'an ordered task blockquote',
      block: () => Blockquote.create([paragraph('quote')]),
      expected: '1. [ ] \n   > quote\n1. [ ] second',
      expectedType: 'Blockquote',
      ordered: true,
    },
  ])('preserves task state when an edited task starts with $name', ({
    block,
    expected,
    expectedType,
    ordered,
  }) => {
    const serialized = codec.serialize(taskListDocument(block(), ordered));
    const reparsed = codec.parse(serialized);
    const list = reparsed.content[0];
    if (!list?.isPlot) throw new Error('expected a list');
    const first = list.content[0];
    if (!first?.isPlot) throw new Error('expected a list item');

    expect(serialized).toBe(expected);
    expect(list.name).toBe(ordered ? 'OrderedList' : 'BulletList');
    expect(first.name).toBe('TaskItem');
    expect(first.content.map((node) => node.name)).toEqual([
      'Paragraph',
      expectedType,
    ]);
    expect(codec.serialize(reparsed)).toBe(serialized);
  });

  it('drops trailing hard breaks', () => {
    const doc = schema.doc([
      Paragraph.create([Leaf.text('a'), LineBreak, LineBreak]),
    ]);
    expect(codec.serialize(doc)).toBe('a');
  });

  it('does not crash when a block ends in a hard break', () => {
    const doc = schema.doc([
      Paragraph.create([
        Leaf.text('foo', [Strong]),
        LineBreak.withMarks([Strong]),
      ]),
    ]);
    expect(codec.serialize(doc)).toBe('**foo**');
  });

  it('expels whitespace before a hard break outside the mark', () => {
    const doc = schema.doc([
      Paragraph.create([
        Leaf.text('foo ', [Strong]),
        LineBreak.withMarks([Strong]),
        Leaf.text('bar'),
      ]),
    ]);
    expect(codec.serialize(doc)).toBe('**foo** \\\nbar');
  });

  it('drops marks whose entire text is expelled whitespace', () => {
    const doc = schema.doc([
      Paragraph.create([
        Leaf.text('Text with', []),
        Leaf.text(' ', [Emphasis]),
        Leaf.text('an emphasized space'),
      ]),
    ]);
    expect(codec.serialize(doc)).toBe('Text with an emphasized space');
  });

  it('expels whitespace from emphasis around a nested link', () => {
    const link = Link.of('https://x');
    const doc = schema.doc([
      Paragraph.create([
        Leaf.text('One', []),
        Leaf.text(' two ', [Emphasis]),
        Leaf.text('three', [Emphasis, link]),
        Leaf.text(' four ', [Emphasis]),
        Leaf.text('five'),
      ]),
    ]);
    expect(codec.serialize(doc)).toBe('One _two [three](https://x) four_ five');
  });

  it('keeps a newline inside an inline mark intact', () => {
    // A text leaf containing a raw newline can only be constructed
    // programmatically. prosemirror-markdown emits the newline as-is inside
    // the delimiters; so does this serializer.
    const doc = schema.doc([
      Paragraph.create([Leaf.text('text1\ntext2', [Strong])]),
    ]);
    expect(codec.serialize(doc)).toBe('**text1\ntext2**');
  });

  it('orders overlapping mark delimiters by spec registration, not mark rank', () => {
    // Wordgard's own mark-set order ranks Link (20) before Strong (60), but
    // serialization must nest Strong outside Link to match the ProseMirror
    // engine — `serializationMarks` re-sorts by the mark specs' order.
    const doc = schema.doc([
      Paragraph.create([Leaf.text('x', [Link.of('https://u'), Strong])]),
    ]);
    expect(codec.serialize(doc)).toBe('**[x](https://u)**');
  });
});
