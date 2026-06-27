import {
  markdownLoader,
  parseWikiLinkContent,
  resolve,
  Schema,
  setupBase,
  setupBold,
  setupCode,
  setupCodeBlock,
  setupImage,
  setupItalic,
  setupLink,
  setupList,
  setupParagraph,
  setupWikiLink,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';

function createMarkdown() {
  const extensions = [
    setupBase(),
    setupParagraph(),
    setupList(),
    setupBold(),
    setupItalic(),
    setupLink(),
    setupImage(),
    setupCode(),
    setupCodeBlock(),
    setupWikiLink(),
  ];
  const resolved = resolve(extensions);
  const schema = new Schema({ nodes: resolved.nodes, marks: resolved.marks });
  return markdownLoader(extensions, schema);
}

describe('wiki-link Markdown', () => {
  it.each([
    '[[target]]',
    '[[target|label]]',
    '[[ target | label with | pipes ]]',
    'before[[bangle.io]]after',
    'Unicode [[日本語|表示名]]',
    '[[One]] and [[Two|Second]]',
    '- item [[target]]',
    '1. item [[target|label]]',
    '- [ ] task [[target]]',
    '**bold [[target]]** and _italic [[target|label]]_',
    '[ordinary link](./target.md) and [[target]]',
    '![image](./image.png) and [[target]]',
  ])('round trips %s without normalization', (source) => {
    const markdown = createMarkdown();
    const document = markdown.parser.parse(source);
    expect(markdown.serializer.serialize(document)).toBe(source);
  });

  it('does not reinterpret escaped wiki syntax as a wiki link', () => {
    const markdown = createMarkdown();
    const source = String.raw`\[[target]] and \\[[actual]]`;
    const document = markdown.parser.parse(source);
    const wikiLinks: string[] = [];
    document.descendants((node) => {
      if (node.type.name === 'wiki_link') wikiLinks.push(node.attrs.target);
    });

    expect(wikiLinks).toEqual(['actual']);
    const serialized = markdown.serializer.serialize(document);
    expect(serialized).toBe(String.raw`\[\[target\]\] and \\[[actual]]`);
    const reparsed = markdown.parser.parse(serialized);
    const reparsedWikiLinks: string[] = [];
    reparsed.descendants((node) => {
      if (node.type.name === 'wiki_link') {
        reparsedWikiLinks.push(node.attrs.target);
      }
    });
    expect(reparsedWikiLinks).toEqual(['actual']);
  });

  it('uses the same attr parser for unresolved picker input and Markdown syntax', () => {
    expect(parseWikiLinkContent('foo|bar|baz')).toEqual({
      target: 'foo',
      label: 'bar|baz',
    });
    expect(parseWikiLinkContent('foo|bar')).toEqual({
      target: 'foo',
      label: 'bar',
    });
    expect(parseWikiLinkContent('foo[bar')).toBeNull();
  });

  it('preserves explicit labels equal to their target', () => {
    const markdown = createMarkdown();
    const document = markdown.parser.parse('[[same|same]]');
    const node = document.firstChild?.firstChild;
    expect(node?.attrs).toMatchObject({ target: 'same', label: 'same' });
    expect(markdown.serializer.serialize(document)).toBe('[[same|same]]');
  });

  it.each([
    '`[[inline]]`',
    '```md\n[[fenced]]\n```',
    '[[incomplete',
    '[[]]',
    '[[nested [[target]]]]',
    '[[multi\nline]]',
  ])('does not parse malformed or code syntax: %s', (source) => {
    const markdown = createMarkdown();
    const document = markdown.parser.parse(source);
    let hasWikiLink = false;
    document.descendants((node) => {
      if (node.type.name === 'wiki_link') hasWikiLink = true;
    });
    expect(hasWikiLink).toBe(false);
  });
});
