import { describe, expect, it } from 'vitest';
import {
  documentPayload,
  isMarkdownContentPreserved,
} from '../round-trip-check';
import { createProductionMarkdown } from './production-markdown-test-helpers';

// The paste path must accept Markdown that merely normalizes and refuse only
// Markdown whose content the parser drops. A byte comparison conflates the two
// and rejected most Markdown copied from anywhere else.
function setup() {
  const markdown = createProductionMarkdown();
  // Uses the production payload collector, so the gate cannot be tested
  // against a shape the app no longer produces.
  return (source: string) =>
    isMarkdownContentPreserved(
      source,
      documentPayload(markdown.parser.parse(source)),
    );
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
    // The list number is never stored on the node — the serializer always
    // writes "1." — so a two-digit marker exists only in the source.
    [
      'ordered list past item nine',
      [
        '1. alpha',
        '2. bravo',
        '3. charlie',
        '4. delta',
        '5. echo',
        '6. foxtrot',
        '7. golf',
        '8. hotel',
        '9. india',
        '10. juliett',
      ].join('\n'),
    ],
    ['two-digit ordered marker', '12. twelfth item'],
    // Entities decode to punctuation, so their spelling is gone by design.
    ['named entity', 'fish &amp; chips'],
    ['numeric entity', '&#169; notice text'],
    // A resolved reference link keeps its content: the label is syntax, and
    // the definition reappears as the link's href.
    [
      'reference-style link',
      '[click here][docs]\n\n[docs]: https://example.com/page',
    ],
    [
      'reference-style image',
      '![diagram][img]\n\n[img]: https://example.com/d.png',
    ],
    ['collapsed reference link', '[docs][]\n\n[docs]: https://example.com/p'],
    ['shortcut reference link', '[docs]\n\n[docs]: https://example.com/p'],
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
