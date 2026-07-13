import {
  markdownLoader,
  resolve,
  Schema,
  setupBase,
  setupBlockquote,
  setupBold,
  setupCode,
  setupCodeBlock,
  setupHardBreak,
  setupItalic,
  setupLink,
  setupList,
  setupMath,
  setupParagraph,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';

function createMarkdown() {
  const extensions = [
    setupBase(),
    setupBlockquote(),
    setupBold(),
    setupList(),
    setupHardBreak(),
    setupParagraph(),
    setupCode(),
    setupCodeBlock(),
    setupItalic(),
    setupLink(),
    setupMath(),
  ];
  const resolved = resolve(extensions);
  const schema = new Schema({ nodes: resolved.nodes, marks: resolved.marks });
  return markdownLoader(extensions, schema);
}

function roundTrip(source: string): string {
  const markdown = createMarkdown();
  return markdown.serializer.serialize(markdown.parser.parse(source));
}

describe('production math Markdown', () => {
  it('round trips inline math beside formatting, links, code, and dollars', () => {
    const source =
      '**bold** $x_1 + \\$2$ _italic_ [link](https://example.com) `$code$` and $5 and $6';
    expect(roundTrip(source)).toBe(source);
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
    const markdown = createMarkdown();
    const first = markdown.parser.parse(source);
    const serialized = markdown.serializer.serialize(first);
    const second = markdown.parser.parse(serialized);

    expect(serialized).toBe(source);
    expect(second.eq(first)).toBe(true);
  });
});
