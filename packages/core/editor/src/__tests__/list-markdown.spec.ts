import { describe, expect, it, vi } from 'vitest';
import { createProductionMarkdown } from './production-markdown-test-helpers';

describe('ProseMirror list Markdown metadata', () => {
  it('retains tight and loose list semantics on flat items', () => {
    const markdown = createProductionMarkdown();
    const tight = markdown.parser.parse('- one\n- two');
    const loose = markdown.parser.parse('- one\n\n- two');

    expect(
      Array.from(
        { length: tight.childCount },
        (_, i) => tight.child(i).attrs.tight,
      ),
    ).toEqual([true, true]);
    expect(
      Array.from(
        { length: loose.childCount },
        (_, i) => loose.child(i).attrs.tight,
      ),
    ).toEqual([false, false]);
  });

  it('keeps task checked state separate from an ordered container', () => {
    const markdown = createProductionMarkdown();
    const doc = markdown.parser.parse('1. [x] done');
    const item = doc.firstChild;

    expect(item?.attrs).toMatchObject({
      checked: true,
      kind: 'task',
      listKind: 'ordered',
      tight: true,
    });
    expect(markdown.serializer.serialize(doc)).toBe('1. [x] done');
  });

  it('serializes a mixed tightness run as loose', () => {
    const markdown = createProductionMarkdown();
    const parsed = markdown.parser.parse('- one\n\n- two');
    const first = parsed.child(0);
    const second = parsed.child(1);
    const mixed = parsed.type.create(parsed.attrs, [
      first,
      second.type.create({ ...second.attrs, tight: true }, second.content),
    ]);

    expect(markdown.serializer.serialize(mixed)).toBe('- one\n\n- two');
  });

  it.each([
    {
      name: 'adjacent paragraphs',
      blocks: ['first', 'extra'],
      expected: '- first\n\n  extra\n\n- second',
      expectedTypes: ['paragraph', 'paragraph'],
    },
    {
      name: 'a paragraph after a nested list',
      blocks: ['- nested', 'after'],
      expected: '- \n  - nested\n\n  after\n\n- second',
      expectedTypes: ['list', 'paragraph'],
    },
    {
      name: 'a thematic break after a paragraph',
      blocks: ['first', '***'],
      expected: '- first\n\n  ---\n\n- second',
      expectedTypes: ['paragraph', 'horizontalRule'],
    },
    {
      name: 'adjacent blockquotes',
      blocks: ['> first', '> extra'],
      expected: '- > first\n\n  > extra\n\n- second',
      expectedTypes: ['blockquote', 'blockquote'],
    },
    {
      name: 'a table after a blockquote',
      blocks: ['> first', '| h |\n| --- |\n| cell |'],
      expected: '- > first\n\n  | h |\n  | --- |\n  | cell |\n\n- second',
      expectedTypes: ['blockquote', 'table'],
    },
  ])('renders an edited tight item with $name as loose', ({
    blocks,
    expected,
    expectedTypes,
  }) => {
    const markdown = createProductionMarkdown();
    const parsed = markdown.parser.parse('- first\n- second');
    const first = parsed.child(0);
    const children = blocks.map((source) => {
      const child = markdown.parser.parse(source).firstChild;
      if (!child) throw new Error(`expected a block for ${source}`);
      return child;
    });
    const changed = first.type.create(first.attrs, children);
    const edited = parsed.type.create(parsed.attrs, [changed, parsed.child(1)]);

    const serialized = markdown.serializer.serialize(edited);
    const reparsed = markdown.parser.parse(serialized);
    expect(serialized).toBe(expected);
    expect(
      Array.from(
        { length: reparsed.child(0).childCount },
        (_, index) => reparsed.child(0).child(index).type.name,
      ),
    ).toEqual(expectedTypes);
    expect(markdown.serializer.serialize(reparsed)).toBe(serialized);
  });

  it('keeps representable compound items tight and disambiguates a leading thematic break', () => {
    const markdown = createProductionMarkdown();
    const parsed = markdown.parser.parse('- first\n- second');
    const first = parsed.child(0);
    const block = (source: string) => {
      const child = markdown.parser.parse(source).firstChild;
      if (!child) throw new Error(`expected a block for ${source}`);
      return child;
    };
    const compound = first.type.create(first.attrs, [
      block('first'),
      block('> quote'),
      block('```\ncode\n```'),
    ]);
    const withRuleFirst = first.type.create(first.attrs, [
      block('***'),
      block('after'),
    ]);

    const tight = parsed.type.create(parsed.attrs, [compound, parsed.child(1)]);
    expect(markdown.serializer.serialize(tight)).toBe(
      '- first\n  > quote\n  ```\n  code\n  ```\n- second',
    );

    const rule = parsed.type.create(parsed.attrs, [
      withRuleFirst,
      parsed.child(1),
    ]);
    const serializedRule = markdown.serializer.serialize(rule);
    expect(serializedRule).toBe('- \n  ---\n  after\n- second');
    expect(
      markdown.serializer.serialize(markdown.parser.parse(serializedRule)),
    ).toBe(serializedRule);
  });

  it.each([
    {
      name: 'a blockquote',
      source: '> quote',
      expected: '- [ ] \n  > quote\n- [ ] second',
      expectedType: 'blockquote',
      ordered: false,
    },
    {
      name: 'a heading',
      source: '# heading',
      expected: '- [ ] \n  # heading\n- [ ] second',
      expectedType: 'heading',
      ordered: false,
    },
    {
      name: 'a fenced code block',
      source: '```\ncode\n```',
      expected: '- [ ] \n  ```\n  code\n  ```\n- [ ] second',
      expectedType: 'code_block',
      ordered: false,
    },
    {
      name: 'a thematic break',
      source: '***',
      expected: '- [ ] \n\n  ---\n\n- [ ] second',
      expectedType: 'horizontalRule',
      ordered: false,
    },
    {
      name: 'an ordered task blockquote',
      source: '> quote',
      expected: '1. [ ] \n   > quote\n1. [ ] second',
      expectedType: 'blockquote',
      ordered: true,
    },
  ])('preserves task state when an edited task starts with $name', ({
    expected,
    expectedType,
    ordered,
    source,
  }) => {
    const markdown = createProductionMarkdown();
    const parsed = markdown.parser.parse(
      ordered ? '1. [ ] first\n1. [ ] second' : '- [ ] first\n- [ ] second',
    );
    const block = markdown.parser.parse(source).firstChild;
    if (!block) throw new Error(`expected a block for ${source}`);
    const first = parsed.child(0);
    const edited = parsed.type.create(parsed.attrs, [
      first.type.create(first.attrs, [block]),
      parsed.child(1),
    ]);

    const serialized = markdown.serializer.serialize(edited);
    const reparsed = markdown.parser.parse(serialized);
    expect(serialized).toBe(expected);
    expect(reparsed.child(0).attrs).toMatchObject({
      kind: 'task',
      listKind: ordered ? 'ordered' : 'bullet',
    });
    expect(
      Array.from(
        { length: reparsed.child(0).childCount },
        (_, index) => reparsed.child(0).child(index).type.name,
      ),
    ).toEqual(['paragraph', expectedType]);
    expect(markdown.serializer.serialize(reparsed)).toBe(serialized);
  });

  it('computes list-run tightness in linear work', () => {
    const markdown = createProductionMarkdown();
    const itemCount = 300;
    const parsed = markdown.parser.parse(
      Array.from({ length: itemCount }, (_, i) => `- item ${i}`).join('\n'),
    );
    const child = vi.spyOn(parsed, 'child');

    const serialized = markdown.serializer.serialize(parsed);

    expect(serialized.split('\n')).toHaveLength(itemCount);
    expect(child.mock.calls.length).toBeLessThan(itemCount * 10);
  });
});
