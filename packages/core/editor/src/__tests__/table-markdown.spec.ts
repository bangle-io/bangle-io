import {
  markdownLoader,
  resolve,
  Schema,
  setupBase,
  setupBold,
  setupCode,
  setupImage,
  setupItalic,
  setupLink,
  setupParagraph,
  setupTable,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, test } from 'vitest';

describe('table markdown', () => {
  test('parses and serializes pipe table markdown', () => {
    const extensions = {
      base: setupBase(),
      bold: setupBold(),
      code: setupCode(),
      image: setupImage(),
      italic: setupItalic(),
      link: setupLink(),
      paragraph: setupParagraph(),
      table: setupTable(),
    };

    const resolved = resolve(extensions, false, true);
    const schema = new Schema({
      topNode: 'doc',
      nodes: resolved.nodes,
      marks: resolved.marks,
    });
    const markdown = markdownLoader([...Object.values(extensions)], schema);
    (
      markdown.parser as unknown as {
        tokenizer?: { enable: (name: string) => unknown };
      }
    ).tokenizer?.enable?.('table');

    const source = [
      '| sarah | key | note |',
      '| ----- | --- | ---- |',
      '| value | data | test |',
    ].join('\n');

    const doc = markdown.parser.parse(source);
    const serialized = markdown.serializer.serialize(doc);

    expect(doc.firstChild?.type.name).toBe('table');
    expect(serialized).toContain('| sarah | key | note |');
    expect(serialized).toContain('| ----- | ----- | ----- |');
    expect(serialized).toContain('| value | data | test |');
  });

  test('serializes inline Markdown inside table cells', () => {
    const extensions = {
      base: setupBase(),
      bold: setupBold(),
      code: setupCode(),
      image: setupImage(),
      italic: setupItalic(),
      link: setupLink(),
      paragraph: setupParagraph(),
      table: setupTable(),
    };

    const resolved = resolve(extensions, false, true);
    const schema = new Schema({
      topNode: 'doc',
      nodes: resolved.nodes,
      marks: resolved.marks,
    });
    const markdown = markdownLoader([...Object.values(extensions)], schema);
    (
      markdown.parser as unknown as {
        tokenizer?: { enable: (name: string) => unknown };
      }
    ).tokenizer?.enable?.('table');

    const source = [
      '| format | link | image |',
      '| ------ | ---- | ----- |',
      '| **bold** _em_ `code` a \\| b | [site](https://example.com) | ![alt](img.png) |',
    ].join('\n');

    const doc = markdown.parser.parse(source);
    const serialized = markdown.serializer.serialize(doc);

    expect(serialized).toContain(
      '| **bold** _em_ `code` a \\| b | [site](https://example.com) | ![alt](img.png) |',
    );
  });
});
