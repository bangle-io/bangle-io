import { describe, expect, it } from 'vitest';
import { createBaseMarkdownTokenizer } from '../tokenizer';
import {
  parseWikiLinkContent,
  serializeWikiLinkAttrs,
  type WikiLinkAttrs,
  wikiLinkTokenizer,
} from '../wiki-link-syntax';

type Token = ReturnType<
  ReturnType<typeof createBaseMarkdownTokenizer>['parse']
>[number];

function collectWikiLinks(source: string): WikiLinkAttrs[] {
  const md = createBaseMarkdownTokenizer().use(wikiLinkTokenizer);
  const found: WikiLinkAttrs[] = [];
  const walk = (tokens: readonly Token[]) => {
    for (const token of tokens) {
      if (token.type === 'wiki_link') {
        found.push(token.meta as WikiLinkAttrs);
      }
      if (token.children) {
        walk(token.children);
      }
    }
  };
  walk(md.parse(source, {}));
  return found;
}

describe('parseWikiLinkContent', () => {
  it('parses a bare target', () => {
    expect(parseWikiLinkContent('target')).toEqual({
      target: 'target',
      label: null,
    });
  });

  it('splits on the first pipe and keeps later pipes in the label', () => {
    expect(parseWikiLinkContent('foo|bar')).toEqual({
      target: 'foo',
      label: 'bar',
    });
    expect(parseWikiLinkContent('foo|bar|baz')).toEqual({
      target: 'foo',
      label: 'bar|baz',
    });
  });

  it('rejects content that could not round-trip', () => {
    expect(parseWikiLinkContent('')).toBeNull();
    expect(parseWikiLinkContent('foo[bar')).toBeNull();
    expect(parseWikiLinkContent('foo]bar')).toBeNull();
    expect(parseWikiLinkContent('foo\nbar')).toBeNull();
    expect(parseWikiLinkContent('foo|bar]baz')).toBeNull();
  });
});

describe('serializeWikiLinkAttrs', () => {
  it('serializes targets and labels back to markup', () => {
    expect(serializeWikiLinkAttrs({ target: 'foo', label: null })).toBe(
      '[[foo]]',
    );
    expect(serializeWikiLinkAttrs({ target: 'foo', label: 'bar' })).toBe(
      '[[foo|bar]]',
    );
  });

  it('round-trips through the parser', () => {
    for (const attrs of [
      { target: 'foo', label: null },
      { target: 'foo', label: 'bar|baz' },
      { target: '日本語', label: '表示名' },
    ] satisfies WikiLinkAttrs[]) {
      const markup = serializeWikiLinkAttrs(attrs);
      expect(markup).not.toBeNull();
      expect(parseWikiLinkContent((markup as string).slice(2, -2))).toEqual(
        attrs,
      );
    }
  });

  it('returns null for attributes that cannot form valid markup', () => {
    expect(serializeWikiLinkAttrs({ target: '', label: null })).toBeNull();
    expect(serializeWikiLinkAttrs({ target: 'a]b', label: null })).toBeNull();
  });
});

describe('wikiLinkTokenizer', () => {
  it('tokenizes bare and labelled wiki links', () => {
    expect(collectWikiLinks('[[target]]')).toEqual([
      { target: 'target', label: null },
    ]);
    expect(collectWikiLinks('[[target|label]]')).toEqual([
      { target: 'target', label: 'label' },
    ]);
  });

  it('tokenizes wiki links embedded in surrounding text', () => {
    expect(collectWikiLinks('before[[bangle.io]]after')).toEqual([
      { target: 'bangle.io', label: null },
    ]);
    expect(collectWikiLinks('[[One]] and [[Two|Second]]')).toEqual([
      { target: 'One', label: null },
      { target: 'Two', label: 'Second' },
    ]);
  });

  it('does not treat an escaped construct as a wiki link', () => {
    expect(collectWikiLinks(String.raw`\[[target]]`)).toEqual([]);
  });

  it('declines unbalanced or nested brackets', () => {
    expect(collectWikiLinks('[[unterminated')).toEqual([]);
    expect(collectWikiLinks('[[a[[b]]')).toEqual([]);
  });

  it('does not fire inside an ordinary markdown link', () => {
    expect(collectWikiLinks('[text]([[not-a-wiki-link]])')).toEqual([]);
  });
});
