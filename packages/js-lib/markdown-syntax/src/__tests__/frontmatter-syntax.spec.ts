import { describe, expect, it } from 'vitest';
import { frontmatterTokenizer } from '../frontmatter-syntax';
import { createBaseMarkdownTokenizer } from '../tokenizer';

type Token = ReturnType<
  ReturnType<typeof createBaseMarkdownTokenizer>['parse']
>[number];

function parse(source: string): Token[] {
  return createBaseMarkdownTokenizer()
    .use(frontmatterTokenizer)
    .parse(source, {});
}

function frontmatterTokens(source: string): Token[] {
  return parse(source).filter((token) => token.type === 'frontmatter');
}

describe('frontmatterTokenizer', () => {
  it('tokenizes a document-leading frontmatter block', () => {
    const tokens = frontmatterTokens('---\ntitle: Hello\ntags: [a, b]\n---\n');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.content).toBe('title: Hello\ntags: [a, b]');
    expect(tokens[0]?.map).toEqual([0, 4]);
  });

  it('keeps parsing the rest of the document after the block', () => {
    const types = parse('---\ntitle: x\n---\n\n# Heading\n').map(
      (token) => token.type,
    );
    expect(types[0]).toBe('frontmatter');
    expect(types).toContain('heading_open');
  });

  it('tokenizes an empty frontmatter block', () => {
    const tokens = frontmatterTokens('---\n---\n');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.content).toBe('');
  });

  it('preserves blank lines inside the block', () => {
    const tokens = frontmatterTokens('---\ntitle: x\n\ndescription: y\n---\n');
    expect(tokens[0]?.content).toBe('title: x\n\ndescription: y');
  });

  it('declines without a closing fence so a lone --- stays a thematic break', () => {
    const types = parse('---\ntitle: x\n').map((token) => token.type);
    expect(types).not.toContain('frontmatter');
    expect(types).toContain('hr');
  });

  it('declines when the document does not start with the fence', () => {
    expect(frontmatterTokens('\n---\ntitle: x\n---\n')).toHaveLength(0);
    expect(frontmatterTokens('intro\n\n---\ntitle: x\n---\n')).toHaveLength(0);
  });

  it('declines indented or decorated fences', () => {
    expect(frontmatterTokens(' ---\ntitle: x\n---\n')).toHaveLength(0);
    expect(frontmatterTokens('----\ntitle: x\n----\n')).toHaveLength(0);
    expect(frontmatterTokens('--- yaml\ntitle: x\n---\n')).toHaveLength(0);
  });

  it('requires the closing fence to be exact, skipping decorated lines', () => {
    const tokens = frontmatterTokens('---\na: ----\nb: --- x\n---\n');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.content).toBe('a: ----\nb: --- x');
  });

  it('never fires inside a blockquote', () => {
    expect(frontmatterTokens('> ---\n> title: x\n> ---\n')).toHaveLength(0);
  });

  it('leaves later --- lines to their CommonMark meaning', () => {
    const types = parse('---\ntitle: x\n---\n\nbody\n\n---\n').map(
      (token) => token.type,
    );
    expect(types.filter((type) => type === 'frontmatter')).toHaveLength(1);
    expect(types).toContain('hr');
  });
});
