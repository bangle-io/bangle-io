import {
  markdownLoader,
  type PMNode,
  resolve,
  Schema,
  setupBase,
  setupBlockquote,
  setupCodeBlock,
  setupList,
  setupParagraph,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';

function createMarkdown() {
  const extensions = [
    setupBase(),
    setupParagraph(),
    setupBlockquote(),
    setupList(),
    setupCodeBlock(),
  ];
  const resolved = resolve(extensions);
  const schema = new Schema({ nodes: resolved.nodes, marks: resolved.marks });
  return markdownLoader(extensions, schema);
}

function findNodes(document: PMNode, typeName: string): PMNode[] {
  const nodes: PMNode[] = [];
  document.descendants((node) => {
    if (node.type.name === typeName) {
      nodes.push(node);
    }
    return true;
  });
  return nodes;
}

function expectEquivalentAfterSerialize(source: string) {
  const markdown = createMarkdown();
  const document = markdown.parser.parse(source);
  const serialized = markdown.serializer.serialize(document);
  const reparsed = markdown.parser.parse(serialized);

  expect(reparsed.toJSON()).toEqual(document.toJSON());
  return { document, serialized };
}

describe('code block Markdown', () => {
  it('round trips ordinary fenced code blocks with language info', () => {
    const source = '```js\nconsole.log("ok");\n```';
    const { document, serialized } = expectEquivalentAfterSerialize(source);
    const [codeBlock] = findNodes(document, 'code_block');

    expect(serialized).toBe(source);
    expect(codeBlock?.attrs.language).toBe('js');
    expect(codeBlock?.textContent).toBe('console.log("ok");');
  });

  it('preserves trailing blank lines inside fenced code blocks', () => {
    const source = '```js\nconsole.log("ok");\n\n\n```';
    const markdown = createMarkdown();
    const document = markdown.parser.parse(source);
    const serialized = markdown.serializer.serialize(document);
    const reparsed = markdown.parser.parse(serialized);
    const [codeBlock] = findNodes(document, 'code_block');

    expect(codeBlock?.textContent).toBe('console.log("ok");\n\n');
    expect(serialized).toBe(source);
    expect(reparsed.toJSON()).toEqual(document.toJSON());
  });

  it('keeps empty fenced code blocks compact', () => {
    const source = '```js\n```';
    const markdown = createMarkdown();
    const document = markdown.parser.parse(source);

    expect(markdown.serializer.serialize(document)).toBe(source);
  });

  it('parses indented code blocks as code without inventing language info', () => {
    const { document } = expectEquivalentAfterSerialize(
      '    indented code\n    - not a list item',
    );
    const [codeBlock] = findNodes(document, 'code_block');

    expect(codeBlock?.attrs.language).toBe('');
    expect(codeBlock?.textContent).toBe('indented code\n- not a list item');
  });

  it('serializes with a longer fence when code text contains backticks', () => {
    const { document, serialized } = expectEquivalentAfterSerialize(
      '~~~text\nA tilde fence can contain ``` without closing.\n~~~',
    );
    const [codeBlock] = findNodes(document, 'code_block');

    expect(codeBlock?.attrs.language).toBe('text');
    expect(serialized).toBe(
      '````text\nA tilde fence can contain ``` without closing.\n````',
    );
  });

  it('preserves nested-fence source as a single code block', () => {
    const { document, serialized } = expectEquivalentAfterSerialize(
      '````markdown\n```js\nconst nestedFence = true;\n```\n````',
    );
    const [codeBlock] = findNodes(document, 'code_block');

    expect(findNodes(document, 'code_block')).toHaveLength(1);
    expect(codeBlock?.attrs.language).toBe('markdown');
    expect(codeBlock?.textContent).toBe(
      '```js\nconst nestedFence = true;\n```',
    );
    expect(serialized).toBe(
      '````markdown\n```js\nconst nestedFence = true;\n```\n````',
    );
  });

  it('uses tilde fences when the info string contains a backtick', () => {
    const { document, serialized } = expectEquivalentAfterSerialize(
      '~~~lang`meta\nvalue\n~~~',
    );
    const [codeBlock] = findNodes(document, 'code_block');

    expect(codeBlock?.attrs.language).toBe('lang`meta');
    expect(serialized).toBe('~~~lang`meta\nvalue\n~~~');
  });

  it('parses fenced code blocks inside blockquotes', () => {
    const { document, serialized } = expectEquivalentAfterSerialize(
      '> ```js\n> quoted();\n> ```',
    );
    const [blockquote] = findNodes(document, 'blockquote');
    const [codeBlock] = findNodes(document, 'code_block');

    expect(blockquote).toBeDefined();
    expect(codeBlock?.attrs.language).toBe('js');
    expect(codeBlock?.textContent).toBe('quoted();');
    expect(serialized).toBe('> ```js\n> quoted();\n> ```');
  });

  it('parses fenced code blocks inside list items', () => {
    const { document, serialized } = expectEquivalentAfterSerialize(
      '- item\n\n  ```js\n  listed();\n  ```',
    );
    const [list] = findNodes(document, 'list');
    const [codeBlock] = findNodes(document, 'code_block');

    expect(list).toBeDefined();
    expect(codeBlock?.attrs.language).toBe('js');
    expect(codeBlock?.textContent).toBe('listed();');
    expect(serialized).toBe('- item\n\n  ```js\n  listed();\n  ```');
  });

  it('serializes fenced code blocks inside ordered list items with marker-width indentation', () => {
    const { document, serialized } = expectEquivalentAfterSerialize(
      '1. item\n\n   ```js\n   ordered();\n   ```',
    );
    const [list] = findNodes(document, 'list');
    const [codeBlock] = findNodes(document, 'code_block');

    expect(list).toBeDefined();
    expect(codeBlock?.attrs.language).toBe('js');
    expect(codeBlock?.textContent).toBe('ordered();');
    expect(serialized).toBe('1. item\n\n   ```js\n   ordered();\n   ```');
  });
});
