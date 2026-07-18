import type { PMNode, Schema } from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';
import { createProductionMarkdown } from './production-markdown-test-helpers';

function roundTrip(source: string): string {
  const markdown = createProductionMarkdown();
  return markdown.serializer.serialize(markdown.parser.parse(source));
}

function collectNodeText(document: PMNode, name: string) {
  const result: string[] = [];
  document.descendants((node) => {
    if (node.type.name === name) result.push(node.textContent);
    return true;
  });
  return result;
}

function getNodeType(schema: Schema, name: string) {
  const type = schema.nodes[name];
  if (!type) throw new Error(`Missing schema node: ${name}`);
  return type;
}

describe('production math Markdown', () => {
  it('round trips inline math beside formatting, links, code, and dollars', () => {
    const source =
      '**bold** $x_1 + \\$2$ _italic_ [link](https://example.com) `$code$` and $5 and $6';
    expect(roundTrip(source)).toBe(source);
  });

  it('only retains a dollar escape when another dollar makes it necessary', () => {
    expect(roundTrip(String.raw`isolated \$ value`)).toBe('isolated $ value');
    expect(roundTrip(String.raw`escaped \$x$`)).toBe(String.raw`escaped \$x$`);
  });

  it('normalizes a complete single-line display block to canonical fences', () => {
    expect(roundTrip('$$x^2 + y^2$$')).toBe('$$\nx^2 + y^2\n$$');
  });

  it('preserves multiline TeX and intentional leading/trailing blank lines', () => {
    const source = String.raw`$$

\begin{aligned}
a_1 &= \frac{α}{β} \\
\text{pipe | ampersand} & \{x\} \\
\$ &= 2
\end{aligned}

$$`;
    expect(roundTrip(source)).toBe(source);
  });

  it('normalizes CRLF delimiters while preserving TeX source', () => {
    expect(roundTrip('$$\r\nx &= y \\\\ z\r\n$$')).toBe(
      '$$\nx &= y \\\\ z\n$$',
    );
  });

  it('supports display math in blockquotes and list items', () => {
    const source = '> $$\n> x + y\n> $$\n\n- item\n\n  $$\n  z\n  $$';
    expect(roundTrip(source)).toBe(source);
  });

  it.each([
    ['$x', '$x'],
    ['$5 and $6', '$5 and $6'],
    ['$ x $', '$ x $'],
    [String.raw`escaped \$x$`, String.raw`escaped \$x$`],
    ['$$\nunclosed', '$$ unclosed'],
    ['`$code$`', '`$code$`'],
    ['```\n$$\nx\n$$\n```', '```\n$$\nx\n$$\n```'],
  ])('leaves ambiguous or code-contained source as ordinary Markdown: %s', (source, expected) => {
    expect(roundTrip(source)).toBe(expected);
  });

  it('keeps unsupported KaTeX byte-identical and structurally stable', () => {
    const source =
      'valid $x$ invalid $\\unsupported{value}$\n\n$$\n\\begin{unsupported}\nraw & source\n\\end{unsupported}\n$$';
    const markdown = createProductionMarkdown();
    const first = markdown.parser.parse(source);
    const serialized = markdown.serializer.serialize(first);
    const second = markdown.parser.parse(serialized);

    expect(serialized).toBe(source);
    expect(second.eq(first)).toBe(true);
  });

  it('drops an empty inline node without consuming following blocks', () => {
    const markdown = createProductionMarkdown();
    const { schema } = markdown;
    const document = getNodeType(schema, 'doc').create(null, [
      getNodeType(schema, 'paragraph').create(
        null,
        getNodeType(schema, 'math_inline').create(),
      ),
      getNodeType(schema, 'paragraph').create(
        null,
        schema.text('important text'),
      ),
      getNodeType(schema, 'math_display').create(null, schema.text('z')),
    ]);

    const serialized = markdown.serializer.serialize(document);
    const reparsed = markdown.parser.parse(serialized);

    // The now-empty paragraph leaves one harmless leading blank line; most
    // importantly, it cannot become a display fence or consume later blocks.
    expect(serialized).toBe('\nimportant text\n\n$$\nz\n$$');
    expect(collectNodeText(reparsed, 'math_display')).toEqual(['z']);
    expect(reparsed.textContent).toContain('important text');
  });

  it.each([
    ['embedded dollar', 'a$b', '', String.raw`\$a\$b\$`],
    ['leading whitespace', ' x', '', String.raw`\$ x\$`],
    ['trailing whitespace', 'x ', '', String.raw`\$x \$`],
    ['trailing backslash', 'x\\', '', String.raw`\$x\\\$`],
    ['following digit', 'x', '2', String.raw`\$x\$2`],
  ])('falls back to non-destructive text for inline math with %s', (_label, content, suffix, expected) => {
    const markdown = createProductionMarkdown();
    const { schema } = markdown;
    const children = [
      getNodeType(schema, 'math_inline').create(null, schema.text(content)),
    ];
    if (suffix) children.push(schema.text(suffix));
    const document = getNodeType(schema, 'doc').create(
      null,
      getNodeType(schema, 'paragraph').create(null, children),
    );

    const serialized = markdown.serializer.serialize(document);
    const reparsed = markdown.parser.parse(serialized);

    expect(serialized).toBe(expected);
    expect(collectNodeText(reparsed, 'math_inline')).toEqual([]);
    expect(markdown.serializer.serialize(reparsed)).toBe(expected);
  });

  it('falls back when marked text contributes an earlier dollar on the line', () => {
    const markdown = createProductionMarkdown();
    const { schema } = markdown;
    const bold = schema.marks.bold;
    const link = schema.marks.link;
    if (!bold) throw new Error('Missing schema mark: bold');
    if (!link) throw new Error('Missing schema mark: link');
    const document = getNodeType(schema, 'doc').create(null, [
      getNodeType(schema, 'paragraph').create(null, [
        schema.text('cost$', [bold.create()]),
        getNodeType(schema, 'math_inline').create(null, schema.text('x')),
      ]),
      getNodeType(schema, 'paragraph').create(null, [
        schema.text('cost$', [
          link.create({ href: 'https://example.com', title: null }),
        ]),
        getNodeType(schema, 'math_inline').create(null, schema.text('y')),
      ]),
    ]);

    const serialized = markdown.serializer.serialize(document);
    const reparsed = markdown.parser.parse(serialized);

    expect(serialized).toBe(
      String.raw`**cost$**\$x\$

[cost$](https://example.com)\$y\$`,
    );
    expect(collectNodeText(reparsed, 'math_inline')).toEqual([]);
    expect(markdown.serializer.serialize(reparsed)).toBe(serialized);
  });

  it('falls back when an earlier unmatched dollar would reject the math opener', () => {
    const markdown = createProductionMarkdown();
    const { schema } = markdown;
    const document = getNodeType(schema, 'doc').create(
      null,
      getNodeType(schema, 'paragraph').create(null, [
        schema.text('a$b more '),
        getNodeType(schema, 'math_inline').create(null, schema.text('x')),
      ]),
    );

    const serialized = markdown.serializer.serialize(document);
    const reparsed = markdown.parser.parse(serialized);

    expect(serialized).toBe(String.raw`a$b more \$x\$`);
    expect(collectNodeText(reparsed, 'math_inline')).toEqual([]);
    expect(markdown.serializer.serialize(reparsed)).toBe(serialized);
  });

  it.each([
    ['unindented', '$$'],
    ['indented', '  $$'],
  ])('does not close display math on an %s delimiter line inside its source', (_label, delimiterLine) => {
    const markdown = createProductionMarkdown();
    const { schema } = markdown;
    const document = getNodeType(schema, 'doc').create(null, [
      getNodeType(schema, 'math_display').create(
        null,
        schema.text(`a\n${delimiterLine}\nb`),
      ),
      getNodeType(schema, 'paragraph').create(
        null,
        schema.text('important text'),
      ),
    ]);

    const serialized = markdown.serializer.serialize(document);
    const reparsed = markdown.parser.parse(serialized);

    expect(serialized).toBe(
      [
        '```',
        '$$',
        'a',
        delimiterLine,
        'b',
        '$$',
        '```',
        '',
        'important text',
      ].join('\n'),
    );
    expect(collectNodeText(reparsed, 'math_display')).toEqual([]);
    expect(collectNodeText(reparsed, 'code_block')).toEqual([
      `$$\na\n${delimiterLine}\nb\n$$`,
    ]);
    expect(reparsed.textContent).toContain('important text');
    expect(markdown.serializer.serialize(reparsed)).toBe(serialized);
  });
});
