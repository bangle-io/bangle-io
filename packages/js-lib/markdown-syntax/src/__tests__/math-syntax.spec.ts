import { describe, expect, it } from 'vitest';
import { mathTokenizer } from '../math-syntax';
import { createBaseMarkdownTokenizer } from '../tokenizer';

type Token = ReturnType<
  ReturnType<typeof createBaseMarkdownTokenizer>['parse']
>[number];

function parse(source: string): Token[] {
  return createBaseMarkdownTokenizer().use(mathTokenizer).parse(source, {});
}

function collect(tokens: readonly Token[], type: string): Token[] {
  const result: Token[] = [];
  for (const token of tokens) {
    if (token.type === type) result.push(token);
    if (token.children) result.push(...collect(token.children, type));
  }
  return result;
}

describe('mathTokenizer inline math', () => {
  it.each([
    ['before $x + 1$ after', 'x + 1'],
    ['$5$', '5'],
    ['Unicode $α + β$ works', 'α + β'],
    ['escaped content $x \\$ y$ works', 'x \\$ y'],
  ])('accepts %s', (source, expected) => {
    expect(collect(parse(source), 'math_inline').map((t) => t.content)).toEqual(
      [expected],
    );
  });

  it.each([
    String.raw`escaped \$x$`,
    '`code $x$`',
    '$5 and $6',
    '$ x $',
    '$x $',
    '$x$5',
    '$x',
    '$$',
    '$x$5 and y$',
    'line $x\ny$ break',
  ])('declines ambiguous source %s', (source) => {
    expect(collect(parse(source), 'math_inline')).toEqual([]);
  });

  it('preserves an escaped dollar as engine-neutral text syntax', () => {
    const [token] = collect(
      parse(String.raw`escaped \$x$`),
      'math_escaped_dollar',
    );
    expect(token?.content).toBe('$');
    expect(token?.markup).toBe(String.raw`\$`);
  });
});

describe('mathTokenizer display math', () => {
  it('preserves canonical multiline content', () => {
    const source = String.raw`$$
\begin{aligned}
a &= b \\
c &= d
\end{aligned}
$$`;
    const [token] = collect(parse(source), 'math_display');
    expect(token?.content).toBe(
      String.raw`\begin{aligned}
a &= b \\
c &= d
\end{aligned}
`,
    );
  });

  it('accepts a complete single-line block without trimming TeX', () => {
    const [token] = collect(parse('$$  x + y  $$'), 'math_display');
    expect(token?.content).toBe('  x + y  ');
  });

  it('accepts nested display blocks in blockquotes and list items', () => {
    const source = '> $$\n> x + y\n> $$\n\n- item\n\n  $$\n  z\n  $$';
    expect(
      collect(parse(source), 'math_display').map((t) => t.content),
    ).toEqual(['x + y\n', 'z\n']);
  });

  it('normalizes CRLF for the shared Markdown pipeline', () => {
    const [token] = collect(parse('$$\r\nx\r\ny\r\n$$'), 'math_display');
    expect(token?.content).toBe('x\ny\n');
  });

  it.each([
    '$$\nunclosed',
    '$$   $$',
    '$$$$$',
    '$$ trailing',
    'before $$x$$ after',
    '```\n$$\nx\n$$\n```',
  ])('declines incomplete or non-block source %s', (source) => {
    expect(collect(parse(source), 'math_display')).toEqual([]);
  });
});

describe('mathTokenizer opt-in behavior', () => {
  it('does not change base tokenizer consumers', () => {
    const baseTokens = createBaseMarkdownTokenizer().parse('$x$', {});
    expect(collect(baseTokens, 'math_inline')).toEqual([]);
  });
});
