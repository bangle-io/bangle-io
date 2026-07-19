/**
 * The golden Markdown corpus: the cross-engine parity contract for the
 * ProseMirror and Wordgard editor engines (see `plans/011-wordgard-editor-w-migration.md`,
 * milestone M1).
 *
 * Every fixture asserts, for every engine listed in `fixture.engines`:
 *
 * 1. `serialize(parse(fixture.markdown)) === (fixture.canonical ?? fixture.markdown)`
 *    byte-for-byte, and
 * 2. the expected output is itself a fixed point:
 *    `serialize(parse(expected)) === expected`.
 *
 * Fixtures without `canonical` are written in the *canonical form* a
 * compliant engine emits — fixed points of the parse/serialize round trip,
 * including exact whitespace, escaping, and list indentation. Fixtures with
 * `canonical` document intentional, cross-engine-identical normalization
 * (e.g. `*em*` -> `_em_`): the input is legal Markdown that every engine
 * must rewrite to the same canonical bytes.
 *
 * Rules for extending this corpus:
 * - Every new editor construct (a new mark, node, or Markdown syntax) that
 *   ships in either engine must land with fixtures here that exercise it.
 * - A gate failure (an engine that cannot yet round-trip some construct)
 *   becomes a fixture first: add it with the engines that already pass in
 *   `engines`, and only add the missing engine once its round trip is proven
 *   byte-identical. Do not silently shrink coverage by leaving a construct
 *   out of the corpus.
 * - An input the engines normalize *identically* belongs here with
 *   `canonical` set, not excluded. Only constructs where the engines
 *   genuinely disagree (or never converge) stay out — leave a comment near
 *   the related fixtures explaining the divergence instead of adding a
 *   fixture that would fail.
 */
export type MarkdownCorpusFixture = {
  name: string;
  markdown: string;
  /**
   * Expected serialization when it differs from `markdown` (an intentional
   * normalization). Must itself round-trip byte-identically. Omit for
   * fixtures already written in canonical form.
   */
  canonical?: string;
  /** Which engines must satisfy this fixture's contract today. */
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
  {
    name: 'soft line break normalizes to a space',
    markdown: 'foo\nbar',
    canonical: 'foo bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'extra blank lines between paragraphs collapse',
    markdown: 'para one\n\n\n\npara two',
    canonical: 'para one\n\npara two',
    engines: BOTH_ENGINES,
  },
  {
    name: 'leading paragraph indentation is dropped',
    markdown: '   leading spaces',
    canonical: 'leading spaces',
    engines: BOTH_ENGINES,
  },
  {
    name: 'HTML entities decode to their character',
    markdown: '&amp; entity',
    canonical: '& entity',
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
  {
    name: 'setext heading normalizes to ATX',
    markdown: 'setext\n======',
    canonical: '# setext',
    engines: BOTH_ENGINES,
  },
  {
    name: 'setext level-2 heading normalizes to ATX',
    markdown: 'setext two\n----------',
    canonical: '## setext two',
    engines: BOTH_ENGINES,
  },
  {
    name: 'closing hashes on an ATX heading are dropped',
    markdown: '# heading with trailing hash #',
    canonical: '# heading with trailing hash',
    engines: BOTH_ENGINES,
  },
  {
    name: 'tab after heading marker normalizes to a space',
    markdown: '#\ttab after hash',
    canonical: '# tab after hash',
    engines: BOTH_ENGINES,
  },
  {
    name: 'heading inside a list item',
    markdown: '- # Foo',
    engines: BOTH_ENGINES,
  },
  {
    name: 'heading inside a blockquote',
    markdown: '> ## heading in quote',
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
  {
    name: 'star emphasis normalizes to underscore',
    markdown: '*asterisk emphasis*',
    canonical: '_asterisk emphasis_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'underscore strong normalizes to asterisks',
    markdown: '__underscore strong__',
    canonical: '**underscore strong**',
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
  // Overlapping-mark delimiter nesting is rank-driven and must match across
  // engines: strong outside italic, strike outside italic, strong outside
  // strike. The `canonical` fixtures pin the normalization of the other
  // nesting order.
  {
    name: 'fully overlapping bold and italic',
    markdown: '**_bold italic_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'italic-outside-bold normalizes to bold-outside-italic',
    markdown: '_**both**_',
    canonical: '**_both_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'fully overlapping bold and strike',
    markdown: '**~~bold strike~~**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'fully overlapping strike and italic',
    markdown: '~~_strike italic_~~',
    engines: BOTH_ENGINES,
  },
  {
    name: 'italic-outside-strike normalizes to strike-outside-italic',
    markdown: '_~~both~~_',
    canonical: '~~_both_~~',
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
  {
    name: 'code mark content is not escaped',
    markdown: 'foo`*`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'whitespace-only code span',
    markdown: 'Three spaces: ` `',
    engines: BOTH_ENGINES,
  },
  // A code span INSIDE another mark used to be excluded here: the PM
  // engine's `code` mark once carried `excludes: '_'`, which stripped the
  // surrounding link/bold/italic mark during Markdown parsing (a real
  // data-loss bug — `[`code` text](url)` lost its link). The exclusion was
  // removed and the code mark now ranks last in the schema (innermost on
  // serialize), so both engines preserve these combinations byte-for-byte.
  {
    name: 'bold containing a code span',
    markdown: '**bold `code` bold**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'italic containing a code span',
    markdown: '_italic `code`_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'strike containing a code span',
    markdown: '~~strike `code`~~',
    engines: BOTH_ENGINES,
  },
  {
    name: 'code span covered entirely by bold',
    markdown: '**`code`**',
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
    name: 'escaped leading plus is not a bullet',
    markdown: '\\+ not a list',
    engines: BOTH_ENGINES,
  },
  {
    name: 'escaped leading angle bracket is not a blockquote',
    markdown: '\\> not a quote',
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
  {
    name: 'escaped ordered-list marker is not a list',
    markdown: '1\\. foo',
    engines: BOTH_ENGINES,
  },
  {
    name: 'escaped ordered-list marker inside a list item',
    markdown: '- 1\\. hi\n\n- x',
    engines: BOTH_ENGINES,
  },
  {
    name: 'list-marker-like text mid-paragraph is not escaped',
    markdown: '123 [0. com](https://x)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'number followed by dot without a space is not escaped',
    markdown: '1.2kg',
    engines: BOTH_ENGINES,
  },
  {
    name: 'underscores at word boundaries stay escaped',
    markdown: '\\_abc\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'underscores surrounded by non-word characters stay escaped',
    markdown: '/\\_abc\\_)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'intraword underscore is not escaped',
    markdown: 'abc_def',
    engines: BOTH_ENGINES,
  },
  {
    name: 'intraword underscore run is not escaped',
    markdown: 'abc___def',
    engines: BOTH_ENGINES,
  },
  {
    name: 'escaped intraword underscore drops its now-redundant escape',
    markdown: 'file\\_name',
    canonical: 'file_name',
    engines: BOTH_ENGINES,
  },
  {
    name: 'hashtag-like text is not escaped',
    markdown: '#hashtag',
    engines: BOTH_ENGINES,
  },
  {
    name: 'more than six hashes is not a heading',
    markdown: '#######',
    engines: BOTH_ENGINES,
  },
  {
    name: 'escaped heading marker before unicode space',
    markdown: '\\#　こんにちは',
    engines: BOTH_ENGINES,
  },
  {
    name: 'escaped ATX heading marker with text',
    markdown: '\\### text',
    engines: BOTH_ENGINES,
  },
  {
    name: 'escaped ATX heading marker at end of line',
    markdown: '\\###',
    engines: BOTH_ENGINES,
  },
  {
    name: 'plus runs are not a list or rule',
    markdown: '+++',
    engines: BOTH_ENGINES,
  },
  {
    name: 'tildes around text are escaped, not strikethrough',
    markdown: '~single tilde~',
    canonical: '\\~single tilde\\~',
    engines: BOTH_ENGINES,
  },
  {
    name: 'em-dash-like run mid-sentence is untouched',
    markdown: 'em dash --- text',
    engines: BOTH_ENGINES,
  },
  // An escaped backtick placed *inside* an already-open code span
  // (e.g. `` `code with \` backslash` ``) is not stable: the parser treats
  // the backslash as literal code content, but the serializer must then
  // re-escape the span's closing backtick, changing the byte length on
  // serialize. Excluded.
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
    name: 'link with single-quoted title keeps its quoting style',
    markdown: '[a](x.html \'title "quoted"\')',
    engines: BOTH_ENGINES,
  },
  {
    name: 'autolink',
    markdown: '<https://example.com/>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'autolink with characters the escaper would otherwise touch',
    markdown: '<https://example.com/_file/#~anchor>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'autolink inside emphasis',
    markdown: 'Link to _<https://example.com/_file>_ here',
    engines: BOTH_ENGINES,
  },
  {
    name: 'autolink inside bold',
    markdown: '**<https://example.com/~x>**',
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
  {
    name: 'link inside bold text',
    markdown: '**[link](https://x) is bold**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'exclamation mark before a link stays escaped',
    markdown: '\\![text](https://x)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'link href with balanced parentheses',
    markdown: '[l](https://x/(a))',
    engines: BOTH_ENGINES,
  },
  {
    name: 'bare URL in text is not autolinked',
    markdown: 'https://bare-url.example.com',
    engines: BOTH_ENGINES,
  },
  {
    name: 'reference link resolves to an inline link',
    markdown: '[ref link][1]\n\n[1]: https://example.com',
    canonical: '[ref link](https://example.com)',
    engines: BOTH_ENGINES,
  },
  // A link with an empty label (`[](x)`) parses to a link mark over zero
  // text nodes in both engines and serializes to an empty string — the href
  // is lost. Both engines agree, but that agreement is data loss, so it is
  // documented here rather than blessed as a fixture.
  {
    // Regression: the PM engine's `code` mark used to exclude all other
    // marks, so the link mark was silently dropped at parse time and this
    // serialized to just '`web-code` #53575'.
    name: 'link whose text starts with a code span',
    markdown: '[`web-code` #53575](https://google.com)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'link whose text is exactly one code span',
    markdown: '[`only-code`](https://example.com)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'link text mixing plain, bold, and code runs',
    markdown: 'a [link **with `code` bold**](https://x.com) tail',
    engines: BOTH_ENGINES,
  },
  // A link whose text carries a nested mark run (`[link _foo **bar**_](x)`)
  // now stays a single link in BOTH engines (the PM engine's link mark is
  // mixable, matching Wordgard), and both serialize it byte-identically. It
  // is still excluded because the shared output does not converge in one
  // pass: rank-driven nesting splits the italic around the bold run
  // (`_foo _**_bar_**`), whose dangling `_` after a space re-parses as
  // literal text, so pass two escapes it (`\_foo \_**_bar_**`) and the
  // italic on "foo " is lost. Same bytes from both engines at every pass —
  // an engine-shared normalization quirk, not a parity gap.

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
  {
    name: 'image with empty alt',
    markdown: '![](empty-alt.png)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'image alt containing an escaped bracket',
    markdown: '![a\\]b](x.png)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'image between marked text runs',
    markdown: 'a **b** ![i](x.png) c',
    engines: BOTH_ENGINES,
  },
  {
    name: 'image carrying a bold mark',
    markdown: '**![i](x.png)**',
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
  {
    name: 'blockquote containing a nested list',
    markdown: '> - a\n>\n>   - b',
    engines: BOTH_ENGINES,
  },
  {
    name: 'blockquote containing a code block',
    markdown: '> ```\n> code\n> ```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'empty blockquote keeps a marker line',
    markdown: '>',
    canonical: '> ',
    engines: BOTH_ENGINES,
  },

  // --- Bullet lists -------------------------------------------------------
  {
    name: 'tight bullet list remains tight',
    markdown: '- one\n- two',
    engines: BOTH_ENGINES,
  },
  {
    name: 'loose bullet list remains loose',
    markdown: '- one\n\n- two',
    engines: BOTH_ENGINES,
  },
  {
    name: 'nested bullet list, three levels',
    markdown: '- level0\n  - level1\n    - level2',
    engines: BOTH_ENGINES,
  },
  {
    name: 'bullet list item with a second paragraph',
    markdown: '- item one\n\n  more text in same item\n\n- item two',
    engines: BOTH_ENGINES,
  },
  {
    name: 'bullet list items carrying inline marks',
    markdown: '- **bold item**\n- _italic item_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'empty bullet list item keeps its marker',
    markdown: '- ',
    engines: BOTH_ENGINES,
  },
  {
    name: 'star bullet normalizes to dash',
    markdown: '* star bullet',
    canonical: '- star bullet',
    engines: BOTH_ENGINES,
  },
  {
    name: 'plus bullet normalizes to dash',
    markdown: '+ plus bullet',
    canonical: '- plus bullet',
    engines: BOTH_ENGINES,
  },
  {
    name: 'wide bullet marker spacing normalizes to one space',
    markdown: '-   wide marker spacing',
    canonical: '- wide marker spacing',
    engines: BOTH_ENGINES,
  },

  // --- Ordered lists -------------------------------------------------------
  {
    name: 'ordered list, canonical "1." markers',
    markdown: '1. item one\n1. item two\n1. item three',
    engines: BOTH_ENGINES,
  },
  {
    name: 'ordered list numbering normalizes to "1." markers',
    markdown: '3. third\n4. fourth',
    canonical: '1. third\n1. fourth',
    engines: BOTH_ENGINES,
  },
  {
    name: 'paren ordered marker normalizes to dot',
    markdown: '1) paren ordered',
    canonical: '1. paren ordered',
    engines: BOTH_ENGINES,
  },
  {
    name: 'ordered list item with a continuation paragraph',
    markdown: '1. one\n\n   two',
    engines: BOTH_ENGINES,
  },
  {
    name: 'nested mixed lists use the ordered marker width',
    markdown: '1. outer\n   1. nested\n      - deep',
    engines: BOTH_ENGINES,
  },
  {
    name: 'multi-digit ordered marker normalizes without promoting its child',
    markdown: '10. outer\n    - nested',
    canonical: '1. outer\n   - nested',
    engines: BOTH_ENGINES,
  },
  {
    name: 'list item whose only child is a nested list keeps its structure',
    markdown: '- \n  - nested only',
    engines: BOTH_ENGINES,
  },
  {
    name: 'loose list with blockquote-only items remains loose',
    markdown: '- > a\n\n- > b',
    engines: BOTH_ENGINES,
  },
  {
    name: 'loose list with fenced-code-only items remains loose',
    markdown: '- ```\n  a\n  ```\n\n- ```\n  b\n  ```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'loose list with nested-list-only items remains loose',
    markdown: '- \n  - a\n\n- \n  - b',
    engines: BOTH_ENGINES,
  },
  {
    name: 'tight bullet parent keeps a loose nested bullet list',
    markdown: '- outer\n  - nested one\n\n  - nested two',
    engines: BOTH_ENGINES,
  },
  {
    name: 'tight bullet parent keeps a loose nested ordered list',
    markdown: '- outer\n  1. nested one\n\n  2. nested two',
    canonical: '- outer\n  1. nested one\n\n  1. nested two',
    engines: BOTH_ENGINES,
  },
  {
    name: 'tight ordered parent keeps a loose nested task list',
    markdown: '1. outer\n   - [ ] nested one\n\n   - [x] nested two',
    engines: BOTH_ENGINES,
  },

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
    name: 'uppercase checked marker normalizes to lowercase',
    markdown: '- [X] uppercase checked',
    canonical: '- [x] uppercase checked',
    engines: BOTH_ENGINES,
  },
  {
    name: 'nested task list',
    markdown: '- [ ] task one\n  - [x] nested task',
    engines: BOTH_ENGINES,
  },
  {
    name: 'task list item mixed with a plain bullet item',
    markdown: '- [ ] task\n- plain item',
    engines: BOTH_ENGINES,
  },
  {
    name: 'task list item with inline marks',
    markdown: '- [x] task **bold**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'task item containing a link',
    markdown: '- [ ] [a link](https://x)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'empty unchecked task keeps its marker',
    markdown: '- [ ]',
    canonical: '- [ ] ',
    engines: BOTH_ENGINES,
  },
  {
    name: 'empty checked task keeps its marker',
    markdown: '- [x]',
    canonical: '- [x] ',
    engines: BOTH_ENGINES,
  },
  {
    name: 'task marker inside an ordered list keeps the ordered container',
    markdown: '1. [ ] task marker in ordered list',
    engines: BOTH_ENGINES,
  },
  {
    name: 'ordered container can mix task and plain items',
    markdown: '1. [ ] task\n2. plain item',
    canonical: '1. [ ] task\n1. plain item',
    engines: BOTH_ENGINES,
  },
  {
    name: 'nested ordered tasks use the ordered marker width',
    markdown: '1. [x] outer\n   1. [ ] inner',
    engines: BOTH_ENGINES,
  },
  {
    name: 'tab after a bullet task marker normalizes to a space',
    markdown: '- [ ]\ttab task',
    canonical: '- [ ] tab task',
    engines: BOTH_ENGINES,
  },
  {
    name: 'tab after an ordered task marker normalizes to a space',
    markdown: '1. [x]\ttab task',
    canonical: '1. [x] tab task',
    engines: BOTH_ENGINES,
  },
  {
    name: 'bracket without a following space is not a task marker',
    markdown: '- [ ]no space after bracket',
    canonical: '- \\[ \\]no space after bracket',
    engines: BOTH_ENGINES,
  },
  {
    name: 'checkbox-like text next to emphasis is not a task marker',
    markdown: '- [ ]**bold**',
    canonical: '- \\[ \\]**bold**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'checkbox-like text next to a link is not a task marker',
    markdown: '- [x][link](https://x)',
    canonical: '- \\[x\\][link](https://x)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'checkbox-like text next to inline code is not a task marker',
    markdown: '- [ ]`code`',
    canonical: '- \\[ \\]`code`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'task content on the following line normalizes in one pass',
    markdown: '- [ ]\n  continued task',
    canonical: '- [ ] continued task',
    engines: BOTH_ENGINES,
  },
  {
    name: 'bracket past the start of the item is not a task marker',
    markdown: '- a [ ] mid-item marker',
    canonical: '- a \\[ \\] mid-item marker',
    engines: BOTH_ENGINES,
  },
  {
    name: 'non-checkbox bracket content is not a task marker',
    markdown: '- [y] not a checkbox',
    canonical: '- \\[y\\] not a checkbox',
    engines: BOTH_ENGINES,
  },
  {
    name: 'escaped bracket is never a task marker',
    markdown: '- \\[ ] escaped bracket',
    canonical: '- \\[ \\] escaped bracket',
    engines: BOTH_ENGINES,
  },
  {
    name: 'task item continuation uses the structural bullet width',
    markdown: '- [x] task\n\n  continuation',
    engines: BOTH_ENGINES,
  },
  {
    name: 'list item containing a blockquote remains nested',
    markdown: '- quote\n\n  > nested quote',
    engines: BOTH_ENGINES,
  },
  {
    name: 'list item containing fenced code remains nested',
    markdown: '- ```js\n  x()\n  ```',
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
  {
    name: 'indented code block normalizes to a fenced block',
    markdown: '    indented code',
    canonical: '```\nindented code\n```',
    engines: BOTH_ENGINES,
  },

  // --- Horizontal rule ---------------------------------------------------
  // A `---` on the FIRST line of a document is a frontmatter fence, so a
  // doc-leading thematic break must serialize with a different marker
  // (`***`) to survive re-parsing; anywhere else the canonical marker is
  // `---`.
  {
    name: 'thematic break after content keeps dashes',
    markdown: 'before\n\n---\n\nafter',
    engines: BOTH_ENGINES,
  },
  {
    name: 'doc-leading thematic break uses stars',
    markdown: '***',
    engines: BOTH_ENGINES,
  },
  {
    name: 'doc-leading dash thematic break normalizes to stars',
    markdown: '---',
    canonical: '***',
    engines: BOTH_ENGINES,
  },
  {
    name: 'doc-leading underscore thematic break normalizes to stars',
    markdown: '___',
    canonical: '***',
    engines: BOTH_ENGINES,
  },
  {
    name: 'doc-leading spaced thematic break normalizes to stars',
    markdown: '- - -',
    canonical: '***',
    engines: BOTH_ENGINES,
  },

  // --- Frontmatter ---------------------------------------------------------
  {
    name: 'frontmatter with body',
    markdown: '---\ntitle: Hello\ntags:\n  - a\n---\n\n# Heading',
    engines: BOTH_ENGINES,
  },
  {
    name: 'frontmatter alone',
    markdown: '---\ntitle: x\n---',
    engines: BOTH_ENGINES,
  },
  {
    name: 'empty frontmatter',
    markdown: '---\n---',
    engines: BOTH_ENGINES,
  },
  {
    name: 'YAML document-end closing fence normalizes to dashes',
    markdown: '---\ntitle: x\n...\n\nbody',
    canonical: '---\ntitle: x\n---\n\nbody',
    engines: BOTH_ENGINES,
  },
  {
    // No closing fence means it is NOT frontmatter: the `---` keeps its
    // thematic-break meaning (and, being doc-leading, normalizes to `***`).
    name: 'unclosed frontmatter fence stays a thematic break',
    markdown: '---\ntitle: x',
    canonical: '***\n\ntitle: x',
    engines: BOTH_ENGINES,
  },
  {
    name: 'dashes fence later in the document is not frontmatter',
    markdown: 'text\n\n---\n\nmore: text',
    engines: BOTH_ENGINES,
  },

  // --- Hard breaks and soft breaks -----------------------------------------
  // A hard break serializes as a trailing backslash + newline. Soft line
  // breaks (a single `\n` inside a paragraph) normalize to a single space on
  // serialize (see the 'soft line break normalizes to a space' fixture), so
  // canonical fixtures must never contain a bare `\n` inside a paragraph.
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
  {
    name: 'two-space hard break normalizes to backslash form',
    markdown: 'a  \nb',
    canonical: 'a\\\nb',
    engines: BOTH_ENGINES,
  },
  {
    name: 'hard break inside emphasis',
    markdown: '_foo\\\nbar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'hard break directly after a bold run',
    markdown: '**foo**\\\nbar',
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
