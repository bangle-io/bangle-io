import { describe, expect, it } from 'vitest';
import { isMarkdownContentPreserved } from '../round-trip-check';
import { createProductionMarkdown } from './production-markdown-test-helpers';

function setup() {
  const markdown = createProductionMarkdown();
  return (source: string) => {
    const parsed = markdown.parser.parse(source);
    const parts: string[] = [];
    const collect = (attrs: Record<string, unknown> | undefined) => {
      if (!attrs) return;
      for (const value of Object.values(attrs)) {
        if (typeof value === 'string') parts.push(value);
      }
    };
    parsed.descendants((node) => {
      if (node.isText && node.text) parts.push(node.text);
      collect(node.attrs);
      for (const mark of node.marks) collect(mark.attrs);
      return true;
    });
    return {
      ok: isMarkdownContentPreserved(source, parts.join(' ')),
      payload: parts.join(' '),
      serialized: markdown.serializer.serialize(parsed),
    };
  };
}

describe('gate probe 2', () => {
  const cases: Array<[string, string]> = [
    ['used ref link', '[click here][docs]\n\n[docs]: https://example.com/page'],
    ['collapsed ref link', '[docs][]\n\n[docs]: https://example.com/page'],
    ['shortcut ref link', 'see [docs]\n\n[docs]: https://example.com/page'],
    ['image ref', '![diagram][img]\n\n[img]: https://example.com/d.png'],
    ['fence info extras', '```ts twoslash\nconst a = 1;\n```'],
    ['inline html kbd', 'press <kbd>Ctrl</kbd> now'],
    ['html block', '<div>hello block</div>'],
    ['angle autolink', '<https://example.com/path>'],
  ];
  for (const [name, src] of cases) {
    it(name, () => {
      const r = setup()(src);
      console.log(
        `CASE ${name}: ok=${r.ok} payload=${JSON.stringify(r.payload)} roundtrip=${JSON.stringify(r.serialized)}`,
      );
      expect(true).toBe(true);
    });
  }
});
