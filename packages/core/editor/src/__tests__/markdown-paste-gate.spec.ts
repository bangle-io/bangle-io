import { describe, expect, it } from 'vitest';
import { isMarkdownContentPreserved } from '../round-trip-check';
import { createProductionMarkdown } from './production-markdown-test-helpers';

// The paste path must accept Markdown that merely normalizes and refuse only
// Markdown whose content the parser drops. A byte comparison conflates the two
// and rejected most Markdown copied from anywhere else.
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
    return isMarkdownContentPreserved(source, parts.join(' '));
  };
}

describe('Markdown paste content gate', () => {
  const accepted = [
    ['emphasis delimiter', '*italic text*'],
    ['strong delimiter', '__bold text__'],
    ['bullet marker', '* bullet one\n* bullet two'],
    ['plus bullet', '+ plus bullet'],
    ['paren ordered', '1) paren ordered'],
    ['setext heading', 'Setext Heading\n=============='],
    ['extra heading space', '#  extra space heading'],
    ['closed ATX heading', '# ATX closed heading #'],
    ['hard wrapped paragraph', 'para one\nhard wrapped continuation'],
    ['indented code block', '    indented code block'],
    ['uppercase task', '- [X] uppercase task'],
    ['plain paragraph', 'plain paragraph'],
    ['inline link with title', '[visible](https://example.com "the title")'],
    ['fenced code with language', '```js\nconst a = 1;\n```'],
  ] as const;

  for (const [name, source] of accepted) {
    it(`accepts ${name}`, () => {
      expect(setup()(source)).toBe(true);
    });
  }

  it('refuses a dropped link reference definition', () => {
    // The definition and the missing label vanish from the document, so this
    // paste really would discard what the user copied.
    expect(setup()('[visible][missing]\n\n[unused]: https://example.com')).toBe(
      false,
    );
  });
});
