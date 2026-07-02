import {
  type CollectionType,
  markdownLoader,
  resolve,
  Schema,
  setupBase,
  setupBold,
  setupCode,
  setupHardBreak,
  setupItalic,
  setupLink,
  setupParagraph,
  setupTable,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';

function createTestSetup() {
  const extensions: CollectionType[] = [
    setupBase(),
    setupParagraph(),
    setupBold(),
    setupItalic(),
    setupCode(),
    setupLink(),
    setupHardBreak(),
    setupTable(),
  ];
  const resolved = resolve(extensions);
  const schema = new Schema({
    nodes: resolved.nodes,
    marks: resolved.marks,
  });
  const markdown = markdownLoader(extensions, schema);
  const nodeType = (name: string) => {
    const type = schema.nodes[name];
    if (!type) {
      throw new Error(`Missing node type: ${name}`);
    }
    return type;
  };
  return { markdown, schema, nodeType };
}

function roundTrip(source: string): string {
  const { markdown } = createTestSetup();
  return markdown.serializer.serialize(markdown.parser.parse(source));
}

describe('table markdown round trips', () => {
  it.each([
    [
      'simple table',
      ['| Name | Status |', '| --- | --- |', '| Alpha | Done |'].join('\n'),
    ],
    [
      'multiple body rows',
      [
        '| a | b |',
        '| --- | --- |',
        '| 1 | 2 |',
        '| 3 | 4 |',
        '| 5 | 6 |',
      ].join('\n'),
    ],
    [
      'empty cells',
      ['| a |  | c |', '| --- | --- | --- |', '|  | b |  |'].join('\n'),
    ],
    [
      'escaped pipes',
      ['| a \\| b | c |', '| --- | --- |', '| d | e \\| f |'].join('\n'),
    ],
    [
      'inline code containing a pipe',
      ['| code |', '| --- |', '| `a \\| b` |'].join('\n'),
    ],
    [
      'links inside cells',
      ['| link |', '| --- |', '| [Bangle](https://bangle.io) |'].join('\n'),
    ],
    [
      'emphasis and strong inside cells',
      ['| _em_ and **strong** |', '| --- |', '| plain |'].join('\n'),
    ],
    [
      'alignment',
      [
        '| Left | Center | Right | None |',
        '| :--- | :---: | ---: | --- |',
        '| a | b | c | d |',
      ].join('\n'),
    ],
    [
      'table between paragraphs',
      ['before', '', '| a |', '| --- |', '| b |', '', 'after'].join('\n'),
    ],
    [
      'line breaks inside cells persist as <br>',
      ['| multi |', '| --- |', '| first<br>second |'].join('\n'),
    ],
    [
      'consecutive and marked-up line breaks in cells',
      ['| a<br><br>b | **bold**<br>_em_ |', '| --- | --- |'].join('\n'),
    ],
    [
      'escaped \\<br> stays literal text in cells',
      ['| a\\<br>b |', '| --- |'].join('\n'),
    ],
    [
      '<br> inside a code span stays code text',
      ['| `a<br>b` |', '| --- |'].join('\n'),
    ],
  ])('%s', (_name, source) => {
    const serialized = roundTrip(source);
    expect(serialized).toBe(source);
    // A second pass must be stable, otherwise every save would rewrite the note.
    expect(roundTrip(serialized)).toBe(serialized);
  });

  it('parses pipe tables into header and body cells', () => {
    const { markdown } = createTestSetup();
    const doc = markdown.parser.parse(
      ['| Name | Status |', '| --- | --- |', '| Alpha | Done |'].join('\n'),
    );

    const table = doc.firstChild;
    expect(table?.type.name).toBe('table');
    expect(table?.childCount).toBe(2);

    const headerRow = table?.child(0);
    expect(headerRow?.type.name).toBe('table_row');
    expect(headerRow?.child(0).type.name).toBe('table_header');
    expect(headerRow?.child(0).textContent).toBe('Name');

    const bodyRow = table?.child(1);
    expect(bodyRow?.child(0).type.name).toBe('table_cell');
    expect(bodyRow?.child(1).textContent).toBe('Done');
  });

  it('parses alignment into cell attrs and unknown alignment as null', () => {
    const { markdown } = createTestSetup();
    const doc = markdown.parser.parse(
      ['| L | C | R | N |', '| :--- | :---: | ---: | --- |'].join('\n'),
    );
    const headerRow = doc.firstChild?.child(0);
    expect(headerRow?.child(0).attrs.align).toBe('left');
    expect(headerRow?.child(1).attrs.align).toBe('center');
    expect(headerRow?.child(2).attrs.align).toBe('right');
    expect(headerRow?.child(3).attrs.align).toBe(null);
  });

  it('preserves inline code pipes semantically', () => {
    const { markdown } = createTestSetup();
    const source = ['| code |', '| --- |', '| `a \\| b` |'].join('\n');
    const doc = markdown.parser.parse(source);
    const cell = doc.firstChild?.child(1)?.child(0);
    // markdown-it unescapes \| before inline parsing, even in code spans.
    expect(cell?.textContent).toBe('a | b');

    const reparsed = markdown.parser.parse(markdown.serializer.serialize(doc));
    expect(reparsed.eq(doc)).toBe(true);
  });

  it('keeps malformed pipe-looking text as a paragraph', () => {
    const { markdown } = createTestSetup();
    const source = '| not | a table |';
    const doc = markdown.parser.parse(source);
    expect(doc.firstChild?.type.name).toBe('paragraph');
    expect(markdown.serializer.serialize(doc)).toBe('| not | a table |');
  });

  it('parses <br> inside cells into hard breaks', () => {
    const { markdown } = createTestSetup();
    const doc = markdown.parser.parse(
      ['| multi |', '| --- |', '| first<br/>second |'].join('\n'),
    );
    const cell = doc.firstChild?.child(1)?.child(0);
    expect(cell?.childCount).toBe(3);
    expect(cell?.child(1).type.name).toBe('hard_break');
  });

  it('keeps entity-encoded &lt;br&gt; in cells as literal text', () => {
    const { markdown } = createTestSetup();
    const source = ['| a&lt;br&gt;b |', '| --- |'].join('\n');
    const doc = markdown.parser.parse(source);
    const cell = doc.firstChild?.child(0)?.child(0);
    // The entity decodes to text, not to a line break.
    expect(cell?.childCount).toBe(1);
    expect(cell?.textContent).toBe('a<br>b');

    // It re-serializes in escaped form so it cannot be reinterpreted as a
    // break, and stays stable from then on.
    const serialized = markdown.serializer.serialize(doc);
    expect(serialized).toBe(['| a\\<br>b |', '| --- |'].join('\n'));
    expect(roundTrip(serialized)).toBe(serialized);
    expect(markdown.parser.parse(serialized).eq(doc)).toBe(true);
  });

  it('keeps <br> text outside tables as plain text', () => {
    const { markdown } = createTestSetup();
    const source = 'a<br>b';
    const doc = markdown.parser.parse(source);
    expect(doc.firstChild?.type.name).toBe('paragraph');
    expect(doc.firstChild?.childCount).toBe(1);
    expect(markdown.serializer.serialize(doc)).toBe('a<br>b');
  });

  it('serializes hard breaks inside cells as <br>', () => {
    const { markdown, schema, nodeType } = createTestSetup();
    const doc = schema.topNodeType.create(null, [
      nodeType('table').create(null, [
        nodeType('table_row').create(null, [
          nodeType('table_header').create(null, schema.text('h')),
        ]),
        nodeType('table_row').create(null, [
          nodeType('table_cell').create(null, [
            schema.text('a'),
            nodeType('hard_break').create(),
            schema.text('b'),
          ]),
        ]),
      ]),
    ]);

    const serialized = markdown.serializer.serialize(doc);
    expect(serialized).toBe(['| h |', '| --- |', '| a<br>b |'].join('\n'));
  });

  it('pads ragged rows so the table stays rectangular', () => {
    const { markdown, schema, nodeType } = createTestSetup();
    const doc = schema.topNodeType.create(null, [
      nodeType('table').create(null, [
        nodeType('table_row').create(null, [
          nodeType('table_header').create(null, schema.text('a')),
          nodeType('table_header').create(null, schema.text('b')),
        ]),
        nodeType('table_row').create(null, [
          nodeType('table_cell').create(null, schema.text('1')),
        ]),
      ]),
    ]);

    expect(markdown.serializer.serialize(doc)).toBe(
      ['| a | b |', '| --- | --- |', '| 1 |  |'].join('\n'),
    );
  });

  it('serializes a table whose first row lost its header cells', () => {
    const { markdown, schema, nodeType } = createTestSetup();
    const doc = schema.topNodeType.create(null, [
      nodeType('table').create(null, [
        nodeType('table_row').create(null, [
          nodeType('table_cell').create(null, schema.text('x')),
        ]),
        nodeType('table_row').create(null, [
          nodeType('table_cell').create(null, schema.text('y')),
        ]),
      ]),
    ]);

    const serialized = markdown.serializer.serialize(doc);
    expect(serialized).toBe(['| x |', '| --- |', '| y |'].join('\n'));
    // Reparsing promotes the first row to a real header row.
    const reparsed = markdown.parser.parse(serialized);
    expect(reparsed.firstChild?.child(0)?.child(0)?.type.name).toBe(
      'table_header',
    );
  });
});
