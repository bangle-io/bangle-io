/**
 * The golden Markdown corpus: the cross-engine parity contract for the
 * ProseMirror and Wordgard editor engines (see `plans/011-wordgard-editor-w-migration.md`,
 * milestone M1).
 *
 * Every fixture below is written in the *canonical form* a compliant engine
 * emits: `serialize(parse(fixture.markdown)) === fixture.markdown` must hold
 * for byte identity for every engine listed in `fixture.engines`. Fixtures are
 * not meant to be "valid-looking" Markdown; they are fixed points of the
 * parse/serialize round trip, including exact whitespace, escaping, and list
 * indentation.
 *
 * Rules for extending this corpus:
 * - Every new editor construct (a new mark, node, or Markdown syntax) that
 *   ships in either engine must land with fixtures here that exercise it.
 * - A gate failure (an engine that cannot yet round-trip some construct)
 *   becomes a fixture first: add it with the engines that already pass in
 *   `engines`, and only add the missing engine once its round trip is proven
 *   byte-identical. Do not silently shrink coverage by leaving a construct
 *   out of the corpus.
 * - If a construct empirically has NO stable fixed point in an engine today
 *   (parsing it never reproduces the same bytes, e.g. because the engine
 *   normalizes it further on every parse/serialize pass), it does not belong
 *   in the corpus as a fixture. Leave it out and explain why in a comment
 *   near the related fixtures instead of adding a fixture that would fail.
 */
export type MarkdownCorpusFixture = {
  name: string;
  markdown: string;
  /** Which engines must round-trip this fixture byte-identically today. */
  engines: ReadonlyArray<'prosemirror' | 'wordgard'>;
};

const BOTH_ENGINES: ReadonlyArray<'prosemirror' | 'wordgard'> = [
  'prosemirror',
  'wordgard',
];

// GFM tables are not implemented in the Wordgard engine yet; table parity
// lands in M3. Flagging these as `['prosemirror']` keeps the parity worklist
// visible instead of silently shrinking coverage once wordgard adds tables.
const PROSEMIRROR_ONLY: ReadonlyArray<'prosemirror' | 'wordgard'> = [
  'prosemirror',
];

export const MARKDOWN_CORPUS: readonly MarkdownCorpusFixture[] = [
  // --- Plain text -----------------------------------------------------
  {
    name: 'empty document',
    markdown: '',
    engines: BOTH_ENGINES,
  },
  {
    name: 'plain paragraph',
    markdown: 'Hello world',
    engines: BOTH_ENGINES,
  },
  {
    name: 'multiple paragraphs',
    markdown: 'Paragraph one.\n\nParagraph two.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'unicode text',
    markdown: 'Unicode: café naïve 日本語 😀',
    engines: BOTH_ENGINES,
  },

  // --- Headings ---------------------------------------------------------
  {
    name: 'heading level 1',
    markdown: '# Heading 1',
    engines: BOTH_ENGINES,
  },
  {
    name: 'heading level 2',
    markdown: '## Heading 2',
    engines: BOTH_ENGINES,
  },
  {
    name: 'heading level 3',
    markdown: '### Heading 3',
    engines: BOTH_ENGINES,
  },
  {
    name: 'heading level 4',
    markdown: '#### Heading 4',
    engines: BOTH_ENGINES,
  },
  {
    name: 'heading level 5',
    markdown: '##### Heading 5',
    engines: BOTH_ENGINES,
  },
  {
    name: 'heading level 6',
    markdown: '###### Heading 6',
    engines: BOTH_ENGINES,
  },
  {
    name: 'heading with inline marks',
    markdown: '# Heading with **bold** and _italic_',
    engines: BOTH_ENGINES,
  },
  {
    // The PM engine's heading serializer renders inline content with
    // start-of-line escaping active (banger-editor passes renderInline's
    // default `fromBlockStart = true`), so heading text that begins with an
    // ordered-list-like marker keeps its escape.
    name: 'heading text starting with an ordered-list marker stays escaped',
    markdown: '## 1\\. not a list',
    engines: BOTH_ENGINES,
  },

  // --- Marks: bold, italic, strike, code, combinations -------------------
  {
    name: 'bold',
    markdown: '**bold text**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'italic',
    markdown: '_italic text_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'strike',
    markdown: '~~strike text~~',
    engines: BOTH_ENGINES,
  },
  {
    name: 'inline code',
    markdown: '`inline code`',
    engines: BOTH_ENGINES,
  },
  // A code span whose content itself contains a backtick (double-backtick
  // fence, e.g. ``` ``code containing ` backtick`` ```) is NOT a stable
  // fixed point in the PM engine: the serializer inserts padding spaces
  // next to the inner backtick on serialize (`` `` code containing ` `` ``
  // backtick `` ``, with added leading/trailing spaces inside the fence) to
  // keep the span from closing early, so `serialize(parse(x)) !== x` on the
  // very first pass. Excluded rather than included as a failing fixture.
  {
    name: 'bold containing italic',
    markdown: '**bold _and italic_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'bold italic strike code combined in one paragraph',
    markdown: '**bold**, _italic_, ~~strike~~, and `code`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'mark adjacent to punctuation with no surrounding space',
    markdown: 'word**bold**word',
    engines: BOTH_ENGINES,
  },

  // --- Escaped constructs that must not be reinterpreted -----------------
  {
    name: 'escaped literal asterisks are not emphasis',
    markdown: '\\*not bold\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'escaped literal brackets are not a link',
    markdown: 'Escaped bracket \\[not a link\\]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'escaped leading hash is not a heading',
    markdown: '\\# not a heading',
    engines: BOTH_ENGINES,
  },
  {
    name: 'escaped leading dash is not a bullet',
    markdown: '\\- not a bullet',
    engines: BOTH_ENGINES,
  },
  {
    name: 'trailing double backslash stays a literal backslash',
    markdown: 'Trailing backslash literal \\\\',
    engines: BOTH_ENGINES,
  },
  {
    name: 'literal asterisk surrounded by spaces is not emphasis',
    markdown: 'literal asterisk in text 5 \\* 3',
    engines: BOTH_ENGINES,
  },
  {
    name: 'hash mid-line is not a heading marker',
    markdown: '# Escaped hash mid text is fine # not heading',
    engines: BOTH_ENGINES,
  },
  // `\_` inside a word (e.g. `file\_name`) is NOT a stable fixed point: `_`
  // mid-word is never emphasis under CommonMark's intraword-underscore rule,
  // so the serializer's escaper drops the now-unnecessary backslash on
  // serialize, producing `file_name`. Excluded rather than included as a
  // fixture that would fail `serialize(parse(x)) === x`.
  //
  // Similarly, an escaped backtick placed *inside* an already-open code span
  // (e.g. `` `code with \` backslash` ``) is not stable: the parser treats
  // the backslash as literal code content, but the serializer must then
  // re-escape the span's closing backtick, changing the byte length on
  // serialize. Excluded for the same reason.
  //
  // `\1.` at a line start (escaping an ordered-list marker) is also not
  // stable: markdown-it's escape handling doubles the backslash on
  // serialize (`\\1.`). Excluded.

  // --- Links --------------------------------------------------------------
  {
    name: 'standard link',
    markdown: '[a link](https://example.com)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'link with title',
    markdown: '[a link](https://example.com "a title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'autolink',
    markdown: '<https://example.com/>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'relative link',
    markdown: '[relative](../other.md)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'mailto link',
    markdown: '[email](mailto:user@example.com)',
    engines: BOTH_ENGINES,
  },

  // --- Images ---------------------------------------------------------------
  {
    name: 'image',
    markdown: '![alt text](./image.png)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'image with title',
    markdown: '![alt text](./image.png "a title")',
    engines: BOTH_ENGINES,
  },

  // --- Blockquotes ------------------------------------------------------
  {
    name: 'simple blockquote',
    markdown: '> a simple quote',
    engines: BOTH_ENGINES,
  },
  {
    name: 'multi-paragraph blockquote',
    markdown: '> line one\n>\n> line two',
    engines: BOTH_ENGINES,
  },
  {
    name: 'nested blockquote',
    markdown: '> > nested quote',
    engines: BOTH_ENGINES,
  },
  {
    name: 'blockquote containing a list',
    markdown: '> - item one\n>\n> - item two',
    engines: BOTH_ENGINES,
  },

  // --- Bullet lists -------------------------------------------------------
  // The PM serializer always renders lists TIGHT at the item level (see
  // `packages/js-lib/banger-editor/src/list.ts`'s `toMarkdown`, which calls
  // `flatListToMarkdown` with `tight` hardcoded to `true`), but a blank line
  // still separates top-level sibling items because each item's trailing
  // paragraph closes its own block. So the canonical, stable form for
  // sibling top-level list items has a blank line between them; this is
  // NOT "loose list" Markdown semantics reappearing, it is simply how the
  // block serializer closes each item. Verified empirically against
  // `packages/core/editor/src/__tests__/copy-selection-markdown.spec.ts`.
  {
    name: 'flat bullet list, two items',
    markdown: '- one\n\n- two',
    engines: BOTH_ENGINES,
  },
  {
    name: 'nested bullet list, three levels',
    markdown: '- level0\n\n  - level1\n\n    - level2',
    engines: BOTH_ENGINES,
  },
  {
    name: 'bullet list item with a second paragraph',
    markdown: '- item one\n\n  more text in same item\n\n- item two',
    engines: BOTH_ENGINES,
  },
  {
    name: 'bullet list items carrying inline marks',
    markdown: '- **bold item**\n\n- _italic item_',
    engines: BOTH_ENGINES,
  },

  // --- Ordered lists -------------------------------------------------------
  // The PM serializer normalizes every ordered-list marker to the literal
  // `1.` regardless of the source numbering or the node's `order` attribute
  // (see `flatListToMarkdown` in list.ts: `marker = '1.'`, unconditionally).
  // Canonical fixtures must therefore use `1.` for every item; a fixture
  // using `1. / 2. / 3.` would not be a fixed point.
  {
    name: 'ordered list, canonical "1." markers',
    markdown: '1. item one\n\n1. item two\n\n1. item three',
    engines: BOTH_ENGINES,
  },

  // A list nested under an ORDERED item does NOT survive round-trip: the
  // serializer indents nested content by exactly 2 spaces per level
  // regardless of the parent marker's width (`'  '.repeat(level)`), but a
  // 2-space indent under a 3-character `1. ` marker does not parse back as
  // nested content under CommonMark's list-item content-indent rule. Empirically:
  //   input:  "1. item\n\n  - nested under ordered"
  //   output: "1. item\n\n- nested under ordered"   (promoted to a sibling
  //           top-level list, not nested)
  // This is a known PM engine quirk, not a corpus gap; left out of the
  // corpus rather than included as a failing fixture.

  // --- Task lists ----------------------------------------------------------
  {
    name: 'task list, unchecked',
    markdown: '- [ ] unchecked task',
    engines: BOTH_ENGINES,
  },
  {
    name: 'task list, checked',
    markdown: '- [x] checked task',
    engines: BOTH_ENGINES,
  },
  {
    name: 'nested task list',
    markdown: '- [ ] task one\n\n  - [x] nested task',
    engines: BOTH_ENGINES,
  },
  {
    name: 'task list item mixed with a plain bullet item',
    markdown: '- [ ] task\n\n- plain item',
    engines: BOTH_ENGINES,
  },

  // --- Code blocks -----------------------------------------------------
  {
    name: 'fenced code block with language',
    markdown: '```js\nconsole.log("ok");\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'fenced code block without language',
    markdown: '```\nno language\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'empty fenced code block',
    markdown: '```js\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'fenced code block containing markdown-like text',
    markdown: '```md\n# not a heading\n- not a list\n**not bold**\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'fenced code block containing backticks, uses a longer fence',
    markdown: '````markdown\n```js\nconst nestedFence = true;\n```\n````',
    engines: BOTH_ENGINES,
  },
  // Indented (4-space) code blocks are not a stable fixed point: the PM
  // parser accepts them as `code_block` on parse, but the serializer's only
  // `code_block` output form is a fenced block, so the canonical/stable form
  // is the fenced one above, not the indented source. An indented-code-block
  // *input* string is therefore never returned unchanged by `serialize`.

  // --- Horizontal rule ---------------------------------------------------
  // All three CommonMark thematic-break markers (`---`, `***`, `___`)
  // normalize to `---` on first serialize UNLESS the parser attaches the
  // original `markup` attr, which it does — so `---` is the only stable
  // fixed point to include; `***`/`___` still parse fine but do not
  // round-trip byte-identically on this corpus's first pass because the
  // fixture must already equal its own serialization.
  {
    name: 'horizontal rule',
    markdown: '---',
    engines: BOTH_ENGINES,
  },

  // --- Hard breaks and soft breaks -----------------------------------------
  // A hard break serializes as a trailing backslash + newline. Soft line
  // breaks (a single `\n` inside a paragraph) normalize to a single space on
  // serialize, so canonical fixtures must never contain a bare `\n` inside a
  // paragraph — every multi-line paragraph fixture in this corpus either
  // uses `\n\n` (a real paragraph break) or `\\\n` (an explicit hard break).
  {
    name: 'hard break inside a paragraph',
    markdown: 'line one\\\nline two',
    engines: BOTH_ENGINES,
  },
  {
    name: 'multiple hard breaks in one paragraph',
    markdown: 'a\\\nb\\\nc',
    engines: BOTH_ENGINES,
  },

  // --- Wiki links --------------------------------------------------------
  {
    name: 'wiki link, bare target',
    markdown: '[[target]]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'wiki link with label',
    markdown: '[[target|label]]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'wiki link with unicode target and label',
    markdown: 'Unicode [[日本語|表示名]]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'wiki link adjacent to surrounding text with no space',
    markdown: 'before[[bangle.io]]after',
    engines: BOTH_ENGINES,
  },
  {
    name: 'wiki links inside bold and italic marks',
    markdown: '**bold [[target]]** and _italic [[target|label]]_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'wiki link inside a bullet list item',
    markdown: '- item [[target]]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'wiki link inside an ordered list item',
    markdown: '1. item [[target|label]]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'wiki link inside a task list item',
    markdown: '- [ ] task [[target]]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'escaped wiki syntax is not reinterpreted as a link',
    markdown: String.raw`\[\[target\]\] and \\[[actual]]`,
    engines: BOTH_ENGINES,
  },

  // --- GFM tables (prosemirror only until M3) -----------------------------
  {
    name: 'simple table',
    markdown: '| Name | Status |\n| --- | --- |\n| Alpha | Done |',
    engines: PROSEMIRROR_ONLY,
  },
  {
    name: 'table with column alignment',
    markdown:
      '| Left | Center | Right | None |\n| :--- | :---: | ---: | --- |\n| a | b | c | d |',
    engines: PROSEMIRROR_ONLY,
  },
  {
    name: 'table with inline marks in cells',
    markdown: '| _em_ and **strong** |\n| --- |\n| plain |',
    engines: PROSEMIRROR_ONLY,
  },
  {
    name: 'table between paragraphs',
    markdown: 'before\n\n| a |\n| --- |\n| b |\n\nafter',
    engines: PROSEMIRROR_ONLY,
  },

  // --- Raw / unsupported constructs ---------------------------------------
  // The tokenizer runs with `html: false`, so raw HTML tags are never parsed
  // as HTML nodes; they fall through as plain inline/block text. Both forms
  // below are empirically byte-stable, so they are included; this documents
  // that HTML is inert text under the current engine rather than dropped.
  {
    name: 'raw HTML tag round-trips as inert text',
    markdown: '<div>x</div>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'HTML comment round-trips as inert text',
    markdown: '<!-- comment -->',
    engines: BOTH_ENGINES,
  },
];
