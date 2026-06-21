import {
  markdownLoader,
  resolve,
  Schema,
  setupBase,
  setupLink,
  setupParagraph,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';

describe('Markdown link round trips', () => {
  it.each([
    ['[invalid](https://google%20com/)', 'https://google%20com/'],
    ['[relative](../other.md)', '../other.md'],
    ['[email](mailto:user@example.com)', 'mailto:user@example.com'],
  ])('preserves parseable link source %s', (source, href) => {
    const extensions = [setupBase(), setupParagraph(), setupLink()];
    const resolved = resolve(extensions);
    const schema = new Schema({
      nodes: resolved.nodes,
      marks: resolved.marks,
    });
    const markdown = markdownLoader(extensions, schema);
    const document = markdown.parser.parse(source);
    const link = document.firstChild?.firstChild?.marks.find(
      (mark) => mark.type.name === 'link',
    );

    expect(link?.attrs.href).toBe(href);
    expect(markdown.serializer.serialize(document)).toBe(source);
  });
});
