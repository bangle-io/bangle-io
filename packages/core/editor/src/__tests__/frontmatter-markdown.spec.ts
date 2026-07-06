import {
  markdownLoader,
  type PMNode,
  resolve,
  Schema,
  setupBase,
  setupCodeBlock,
  setupFrontmatter,
  setupHeading,
  setupHorizontalRule,
  setupParagraph,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';

function createMarkdown() {
  const extensions = [
    setupBase({ docContent: 'frontmatter? block+' }),
    setupParagraph(),
    setupHeading(),
    setupHorizontalRule(),
    setupCodeBlock(),
    setupFrontmatter(),
  ];
  const resolved = resolve(extensions);
  const schema = new Schema({ nodes: resolved.nodes, marks: resolved.marks });
  return { schema, ...markdownLoader(extensions, schema) };
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

describe('frontmatter Markdown', () => {
  it('round trips a document-leading frontmatter block', () => {
    const source = '---\ntitle: Hello\ntags:\n  - a\n---\n\n# Heading\n\nbody';
    const { document, serialized } = expectEquivalentAfterSerialize(source);
    const [frontmatter] = findNodes(document, 'frontmatter');

    expect(serialized).toBe(source);
    expect(document.firstChild?.type.name).toBe('frontmatter');
    expect(frontmatter?.textContent).toBe('title: Hello\ntags:\n  - a');
  });

  it('round trips an empty frontmatter block', () => {
    const source = '---\n---\n\nbody';
    const { document, serialized } = expectEquivalentAfterSerialize(source);

    expect(serialized).toBe(source);
    expect(findNodes(document, 'frontmatter')[0]?.textContent).toBe('');
  });

  it('parses a frontmatter-only document into frontmatter plus an empty paragraph', () => {
    const markdown = createMarkdown();
    const document = markdown.parser.parse('---\ntitle: x\n---');

    expect(document.childCount).toBe(2);
    expect(document.firstChild?.type.name).toBe('frontmatter');
    expect(document.lastChild?.type.name).toBe('paragraph');
    expectEquivalentAfterSerialize('---\ntitle: x\n---');
  });

  it('preserves blank lines inside the YAML content', () => {
    const source = '---\ntitle: x\n\ndescription: y\n---\n\nbody';
    const { document, serialized } = expectEquivalentAfterSerialize(source);

    expect(serialized).toBe(source);
    expect(findNodes(document, 'frontmatter')[0]?.textContent).toBe(
      'title: x\n\ndescription: y',
    );
  });

  it('leaves a mid-document --- as a horizontal rule', () => {
    const source = 'intro\n\n---\n\nbody';
    const { document } = expectEquivalentAfterSerialize(source);

    expect(findNodes(document, 'frontmatter')).toHaveLength(0);
    expect(findNodes(document, 'horizontalRule')).toHaveLength(1);
  });

  it('keeps a document-leading horizontal rule an hr by serializing it as ***', () => {
    // `---\n\nbody` has no closing fence, so it parses as an hr — and must
    // keep meaning an hr after a serialize/parse round trip.
    const source = '---\n\nbody';
    const { document, serialized } = expectEquivalentAfterSerialize(source);

    expect(findNodes(document, 'frontmatter')).toHaveLength(0);
    expect(serialized).toBe('***\n\nbody');
  });

  it('does not confuse fenced code containing --- lines with frontmatter', () => {
    const source = '```\n---\ntitle: x\n---\n```';
    const { document, serialized } = expectEquivalentAfterSerialize(source);

    expect(serialized).toBe(source);
    expect(findNodes(document, 'frontmatter')).toHaveLength(0);
    expect(findNodes(document, 'code_block')[0]?.textContent).toBe(
      '---\ntitle: x\n---',
    );
  });

  it('intentionally drops a blank line before the closing fence', () => {
    // Trailing blank lines carry no YAML meaning; normalizing them away keeps
    // the serialized form canonical. The reparse stays equivalent.
    const { serialized } = expectEquivalentAfterSerialize(
      '---\ntitle: x\n\n---\n\nbody',
    );
    expect(serialized).toBe('---\ntitle: x\n---\n\nbody');
  });

  it('visibly re-scopes frontmatter when its content contains a fence line', () => {
    // A literal `---` line typed inside the block closes the frontmatter at
    // serialization time. This is intentional, non-destructive normalization:
    // every character survives; only the structure is re-scoped on reparse.
    const markdown = createMarkdown();
    const frontmatterType = markdown.schema.nodes.frontmatter;
    const docType = markdown.schema.nodes.doc;
    const paragraphType = markdown.schema.nodes.paragraph;
    if (!frontmatterType || !docType || !paragraphType) {
      throw new Error('expected schema nodes');
    }

    const document = docType.createChecked(null, [
      frontmatterType.create(null, markdown.schema.text('a: 1\n---\nb: 2')),
      paragraphType.createChecked(null, markdown.schema.text('body')),
    ]);

    const serialized = markdown.serializer.serialize(document);
    expect(serialized).toBe('---\na: 1\n---\nb: 2\n---\n\nbody');

    const reparsed = markdown.parser.parse(serialized);
    expect(findNodes(reparsed, 'frontmatter')[0]?.textContent).toBe('a: 1');
    expect(reparsed.textContent).toContain('b: 2');
    expect(reparsed.textContent).toContain('body');
  });
});
