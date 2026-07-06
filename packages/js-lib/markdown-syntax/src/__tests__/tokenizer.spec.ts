import { describe, expect, it } from 'vitest';
import { createBaseMarkdownTokenizer } from '../tokenizer';
import { wikiLinkTokenizer } from '../wiki-link-syntax';

type Token = ReturnType<
  ReturnType<typeof createBaseMarkdownTokenizer>['parse']
>[number];

function collectTokenTypes(tokens: readonly Token[]): string[] {
  const types: string[] = [];
  for (const token of tokens) {
    types.push(token.type);
    if (token.children) {
      types.push(...collectTokenTypes(token.children));
    }
  }
  return types;
}

describe('createBaseMarkdownTokenizer', () => {
  it('returns a fresh, independent instance on every call', () => {
    const a = createBaseMarkdownTokenizer();
    const b = createBaseMarkdownTokenizer();
    expect(a).not.toBe(b);

    // Mutating one instance must never leak into another — the reason each
    // consumer builds its own tokenizer rather than sharing a singleton.
    a.use(wikiLinkTokenizer);
    expect(collectTokenTypes(a.parse('[[x]]', {}))).toContain('wiki_link');
    expect(collectTokenTypes(b.parse('[[x]]', {}))).not.toContain('wiki_link');
  });

  it('enables GFM strikethrough', () => {
    const md = createBaseMarkdownTokenizer();
    const types = collectTokenTypes(md.parse('~~struck~~', {}));
    expect(types).toContain('s_open');
    expect(types).toContain('s_close');
  });

  it('disables raw HTML so it is never treated as markup', () => {
    const md = createBaseMarkdownTokenizer();
    const types = collectTokenTypes(md.parse('<div>hi</div>', {}));
    expect(types).not.toContain('html_block');
    expect(types).not.toContain('html_inline');
    expect(md.render('<b>x</b>')).toContain('&lt;b&gt;');
  });

  it('tokenizes CommonMark task-list items via the list plugin', () => {
    const md = createBaseMarkdownTokenizer();
    const types = collectTokenTypes(md.parse('- [ ] todo\n- [x] done', {}));
    expect(types).toContain('list_item_open');
  });
});
