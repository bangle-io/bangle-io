import type Token from 'markdown-it/lib/token.mjs';
import { describe, expect, it } from 'vitest';
import { tableTokenizer } from '../table-syntax';
import { createBaseMarkdownTokenizer } from '../tokenizer';

const TABLE_MD = '| a | b |\n| --- | --- |\n| c | d |';

function types(tokens: Token[]): string[] {
  return tokens.map((t) => t.type);
}

describe('tableTokenizer', () => {
  it('is opt-in: the base tokenizer produces no table tokens', () => {
    // Load-bearing for the Wordgard engine until M3: if the base tokenizer
    // ever emits table tokens, every engine without table handling turns a
    // note containing a table into a parse failure.
    const tokens = createBaseMarkdownTokenizer().parse(TABLE_MD, {});
    expect(types(tokens).some((t) => t.startsWith('table'))).toBe(false);
    expect(types(tokens)).toContain('paragraph_open');
  });

  it('produces table tokens when enabled', () => {
    const tokens = createBaseMarkdownTokenizer()
      .use(tableTokenizer)
      .parse(TABLE_MD, {});
    for (const type of ['table_open', 'thead_open', 'th_open', 'td_open']) {
      expect(types(tokens)).toContain(type);
    }
  });

  it('converts literal <br> inside cells to hardbreak tokens', () => {
    const tokens = createBaseMarkdownTokenizer()
      .use(tableTokenizer)
      .parse('| a<br>b |\n| --- |\n| c<br/>d |', {});
    const cellInlines = tokens.filter((t) => t.type === 'inline');
    const kinds = cellInlines.map((t) =>
      (t.children ?? []).map((c) => `${c.type}:${c.content}`).join(','),
    );
    expect(kinds).toContain('text:a,hardbreak:,text:b');
    expect(kinds).toContain('text:c,hardbreak:,text:d');
  });

  it('leaves <br> outside table cells as plain text', () => {
    const tokens = createBaseMarkdownTokenizer()
      .use(tableTokenizer)
      .parse('para with <br> text', {});
    const inline = tokens.find((t) => t.type === 'inline');
    expect(inline?.children?.some((c) => c.type === 'hardbreak')).toBe(false);
    expect(inline?.content).toBe('para with <br> text');
  });

  it('does not convert escaped or entity <br> forms inside cells', () => {
    // `\<br>` and `&lt;br&gt;` arrive as text_special tokens at the time
    // the rule runs (before text_join), so only raw `<br>` text converts.
    const tokens = createBaseMarkdownTokenizer()
      .use(tableTokenizer)
      .parse('| a\\<br>b | c&lt;br&gt;d |\n| --- | --- |', {});
    const cellInlines = tokens.filter((t) => t.type === 'inline');
    for (const inline of cellInlines) {
      expect(inline.children?.some((c) => c.type === 'hardbreak')).toBe(false);
    }
  });
});
