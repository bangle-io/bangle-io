import { describe, expect, it } from 'vitest';
import {
  calloutTokenizer,
  readCalloutTokenMetadata,
  serializeCalloutMarker,
} from '../callout-syntax';
import { createBaseMarkdownTokenizer } from '../tokenizer';
import { wikiLinkTokenizer } from '../wiki-link-syntax';

function parse(source: string) {
  return createBaseMarkdownTokenizer()
    .use(wikiLinkTokenizer)
    .use(calloutTokenizer)
    .parse(source, {});
}

describe('calloutTokenizer', () => {
  it('moves a leading callout marker onto the blockquote token', () => {
    const tokens = parse('> [!note]\n> Body');
    expect(readCalloutTokenMetadata(tokens[0]?.meta)).toEqual({
      calloutType: 'note',
      markerOnOwnLine: true,
    });
    expect(tokens.find((token) => token.type === 'inline')?.content).toBe(
      'Body',
    );
  });

  it('keeps a same-line title and reparses inline content', () => {
    const tokens = parse('> [!warning] **Careful** [[Target]]');
    const inline = tokens.find((token) => token.type === 'inline');
    expect(inline?.content).toBe('**Careful** [[Target]]');
    expect(inline?.children?.map((token) => token.type)).toEqual([
      'text',
      'strong_open',
      'text',
      'strong_close',
      'text',
      'wiki_link',
    ]);
  });

  it('declines markers outside the first blockquote paragraph', () => {
    const tokens = parse('> Ordinary quote\n> [!note] later');
    expect(readCalloutTokenMetadata(tokens[0]?.meta)).toBeNull();
  });

  it.each([
    ['list', '> [!note]\n> - item', 'bullet_list_open'],
    ['heading', '> [!note]\n> # Heading', 'heading_open'],
    ['fenced code', '> [!note]\n> ```js\n> code\n> ```', 'fence'],
    ['nested quote', '> [!note]\n> > Nested', 'blockquote_open'],
  ])('removes the synthetic marker paragraph before an adjacent %s', (_label, source, expectedFirstChild) => {
    const tokens = parse(source);
    expect(tokens[1]?.type).toBe(expectedFirstChild);
  });

  it('keeps an intentional blank marker paragraph before separated content', () => {
    const tokens = parse('> [!note]\n>\n> Body');
    expect(tokens.slice(1, 5).map((token) => token.type)).toEqual([
      'paragraph_open',
      'inline',
      'paragraph_close',
      'paragraph_open',
    ]);
  });

  it('declines malformed and folding markers', () => {
    for (const source of [
      '> [!]',
      '> [!two words]',
      '> [!note]body',
      '> [!note]  two spaces',
      '> [!note]+ folded',
    ]) {
      expect(readCalloutTokenMetadata(parse(source)[0]?.meta)).toBeNull();
    }
  });
});

describe('serializeCalloutMarker', () => {
  it('accepts round-trippable types and rejects malformed values', () => {
    expect(serializeCalloutMarker('note')).toBe('[!note]');
    expect(serializeCalloutMarker('custom-type_2')).toBe('[!custom-type_2]');
    expect(serializeCalloutMarker('two words')).toBeNull();
    expect(serializeCalloutMarker('')).toBeNull();
  });
});
