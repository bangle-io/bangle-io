import { describe, expect, it } from 'vitest';
import { highlightTokenizer } from '../highlight-syntax';
import { createBaseMarkdownTokenizer } from '../tokenizer';

function inlineTypes(source: string): string[] {
  const tokens = createBaseMarkdownTokenizer()
    .use(highlightTokenizer)
    .parseInline(source, {});
  return tokens.flatMap(
    (token) => token.children?.map((child) => child.type) ?? [token.type],
  );
}

describe('highlightTokenizer', () => {
  it('tokenizes balanced double-equals delimiters', () => {
    expect(inlineTypes('before ==marked== after')).toEqual([
      'text',
      'highlight_open',
      'text',
      'highlight_close',
      'text',
    ]);
  });

  it('composes with other inline Markdown', () => {
    expect(inlineTypes('==**bold** and [link](https://x)==')).toContain(
      'strong_open',
    );
    expect(inlineTypes('==**bold** and [link](https://x)==')).toContain(
      'link_open',
    );
  });

  it('declines single, unbalanced, and whitespace-only delimiters', () => {
    expect(inlineTypes('a = b')).not.toContain('highlight_open');
    expect(inlineTypes('==unclosed')).not.toContain('highlight_open');
    expect(inlineTypes('== spaced ==')).not.toContain('highlight_open');
    expect(inlineTypes('====')).not.toContain('highlight_open');
    expect(inlineTypes('===ambiguous===')).not.toContain('highlight_open');
  });

  it('leaves escaped delimiters literal', () => {
    expect(inlineTypes(String.raw`\==literal==`)).not.toContain(
      'highlight_open',
    );
  });
});
