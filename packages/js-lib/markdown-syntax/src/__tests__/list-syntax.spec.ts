import type Token from 'markdown-it/lib/token.mjs';
import { describe, expect, it } from 'vitest';
import {
  LIST_KIND_ATTR,
  LIST_TIGHT_ATTR,
  readListTokenMetadata,
  TASK_CHECKED_ATTR,
} from '../list-syntax';
import { createBaseMarkdownTokenizer } from '../tokenizer';

function tokenize(markdown: string): Token[] {
  return createBaseMarkdownTokenizer().parse(markdown, {});
}

function listItems(tokens: Token[]): Token[] {
  return tokens.filter((tok) => tok.type === 'list_item_open');
}

function inlineContent(tokens: Token[]): string[] {
  return tokens.filter((tok) => tok.type === 'inline').map((t) => t.content);
}

describe('listTokenizer kinds', () => {
  it('stamps bullet kind on bullet lists and their items', () => {
    const tokens = tokenize('- one\n- two');
    const open = tokens.find((t) => t.type === 'bullet_list_open');
    expect(open?.attrGet(LIST_KIND_ATTR)).toBe('bullet');
    for (const item of listItems(tokens)) {
      expect(item.attrGet(LIST_KIND_ATTR)).toBe('bullet');
    }
  });

  it('stamps ordered kind on ordered lists and their items', () => {
    const tokens = tokenize('1. one\n2. two');
    const open = tokens.find((t) => t.type === 'ordered_list_open');
    expect(open?.attrGet(LIST_KIND_ATTR)).toBe('ordered');
    for (const item of listItems(tokens)) {
      expect(item.attrGet(LIST_KIND_ATTR)).toBe('ordered');
    }
  });

  it('stamps kinds correctly for nested lists of different kinds', () => {
    const tokens = tokenize('- outer\n\n  1. inner');
    const kinds = listItems(tokens).map((t) => t.attrGet(LIST_KIND_ATTR));
    expect(kinds).toEqual(['bullet', 'ordered']);
  });
});

describe('listTokenizer tightness', () => {
  it.each([
    ['tight bullet', '- one\n- two', true],
    ['loose bullet', '- one\n\n- two', false],
    ['tight ordered', '1. one\n2. two', true],
    ['loose ordered', '1. one\n\n2. two', false],
  ])('%s', (_name, markdown, tight) => {
    const tokens = tokenize(markdown);
    const open = tokens.find((token) => /_list_open$/.test(token.type));
    expect(open?.attrGet(LIST_TIGHT_ATTR)).toBe(String(tight));
    expect(listItems(tokens).map(readListTokenMetadata)).toEqual(
      Array.from({ length: 2 }, () => ({
        kind: markdown.startsWith('1.') ? 'ordered' : 'bullet',
        tight,
        taskChecked: null,
      })),
    );
  });

  it('keeps nested list tightness independent from its loose parent', () => {
    const tokens = tokenize('- outer\n\n  1. inner');
    expect(listItems(tokens).map(readListTokenMetadata)).toEqual([
      { kind: 'bullet', tight: false, taskChecked: null },
      { kind: 'ordered', tight: true, taskChecked: null },
    ]);
  });

  it('does not borrow tightness from a following list when an item only contains a nested list', () => {
    const tokens = tokenize(
      '- \n  - nested\n\nafter\n\n- loose one\n\n- loose two',
    );
    const metadata = listItems(tokens).map(readListTokenMetadata);
    expect(metadata.slice(0, 2)).toEqual([
      { kind: 'bullet', tight: true, taskChecked: null },
      { kind: 'bullet', tight: true, taskChecked: null },
    ]);
    expect(metadata.slice(2)).toEqual([
      { kind: 'bullet', tight: false, taskChecked: null },
      { kind: 'bullet', tight: false, taskChecked: null },
    ]);
  });

  it.each([
    ['tight blockquotes', '- > a\n- > b', true],
    ['loose blockquotes', '- > a\n\n- > b', false],
    ['tight fenced code', '- ```\n  a\n  ```\n- ```\n  b\n  ```', true],
    ['loose fenced code', '- ```\n  a\n  ```\n\n- ```\n  b\n  ```', false],
    ['tight nested-only items', '- \n  - a\n- \n  - b', true],
    ['loose nested-only items', '- \n  - a\n\n- \n  - b', false],
  ])('detects %s without direct paragraphs', (_name, markdown, tight) => {
    const [outer] = tokenize(markdown).filter(
      (token) => token.type === 'bullet_list_open' && token.level === 0,
    );
    expect(outer?.attrGet(LIST_TIGHT_ATTR)).toBe(String(tight));
  });
});

describe('listTokenizer task detection', () => {
  it.each([
    ['unchecked', '- [ ] todo', 'false'],
    ['checked lowercase', '- [x] done', 'true'],
    ['checked uppercase', '- [X] done', 'true'],
  ])('detects a %s task and strips the marker', (_name, md, checked) => {
    const tokens = tokenize(md);
    const [item] = listItems(tokens);
    expect(item?.attrGet(LIST_KIND_ATTR)).toBe('bullet');
    expect(item?.attrGet(TASK_CHECKED_ATTR)).toBe(checked);
    // The marker must be gone from BOTH the child tokens and the inline
    // token's own content — a stale `content` would leak the marker to any
    // consumer that reads it (e.g. an indexer).
    const inline = tokens.find((t) => t.type === 'inline');
    expect(inline?.content.startsWith('[')).toBe(false);
    expect(inline?.children?.[0]?.content.startsWith('[')).toBe(false);
  });

  it('detects an empty task (`- [ ]` with no trailing text)', () => {
    for (const md of ['- [ ]', '- [x]', '- [ ] ']) {
      const tokens = tokenize(md);
      const [item] = listItems(tokens);
      expect(item?.attrGet(LIST_KIND_ATTR)).toBe('bullet');
      expect(inlineContent(tokens)).toEqual(['']);
      // The now-empty text child is removed, not left as an empty token.
      const inline = tokens.find((t) => t.type === 'inline');
      expect(inline?.children?.length ?? 0).toBe(0);
    }
  });

  it('detects tasks inside ordered lists (GFM allows `1. [ ] x`)', () => {
    const tokens = tokenize('1. [ ] task');
    const [item] = listItems(tokens);
    expect(item?.attrGet(LIST_KIND_ATTR)).toBe('ordered');
    expect(item?.attrGet(TASK_CHECKED_ATTR)).toBe('false');
  });

  it.each([
    ['bullet', '- [ ]\ttab task', 'bullet', 'false'],
    ['ordered', '1. [x]\ttab task', 'ordered', 'true'],
  ])('detects a tab-separated %s task', (_name, markdown, kind, checked) => {
    const tokens = tokenize(markdown);
    const [item] = listItems(tokens);
    expect(item?.attrGet(LIST_KIND_ATTR)).toBe(kind);
    expect(item?.attrGet(TASK_CHECKED_ATTR)).toBe(checked);
    expect(inlineContent(tokens)).toEqual(['tab task']);
  });

  it('keeps following inline structure intact when stripping the marker', () => {
    const tokens = tokenize('- [x] **bold** and [a link](https://x)');
    const inline = tokens.find((t) => t.type === 'inline');
    expect(inline?.children?.some((c) => c.type === 'strong_open')).toBe(true);
    expect(inline?.children?.some((c) => c.type === 'link_open')).toBe(true);
  });

  it.each([
    ['no space after bracket', '- [ ]no'],
    ['marker not at item start', '- a [ ] b'],
    ['non-checkbox bracket content', '- [y] no'],
    ['escaped bracket', '- \\[ ] no'],
    ['marker outside a list', '[ ] not in a list'],
  ])('does not treat %s as a task', (_name, md) => {
    const tokens = tokenize(md);
    for (const item of listItems(tokens)) {
      expect(item.attrGet(LIST_KIND_ATTR)).not.toBe('task');
      expect(item.attrGet(TASK_CHECKED_ATTR)).toBeNull();
    }
  });

  it('does not treat a task marker below the first paragraph as a task', () => {
    const tokens = tokenize('- first paragraph\n\n  [ ] second paragraph');
    const [item] = listItems(tokens);
    expect(item?.attrGet(LIST_KIND_ATTR)).toBe('bullet');
    expect(inlineContent(tokens)).toEqual([
      'first paragraph',
      '[ ] second paragraph',
    ]);
  });
});
