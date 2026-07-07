import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';

/**
 * Opt-in markdown-it plugin defining what GFM pipe tables *mean* for every
 * consumer that supports them. Not part of
 * {@link createBaseMarkdownTokenizer}: an engine must not receive table
 * tokens before it has table handling, or a note containing a table would
 * fail to parse outright — engines opt in with `.use(tableTokenizer)` the
 * same way they opt into {@link wikiLinkTokenizer}. The ProseMirror engine
 * consumes this today; the Wordgard engine adopts it when table parity
 * lands (plan 011, M3).
 *
 * Beyond enabling markdown-it's `table` rule, this converts literal `<br>`
 * text inside table cells into `hardbreak` tokens: GFM cells hold line
 * breaks as literal `<br>`, and the tokenizer runs with html disabled, so
 * `<br>` arrives as plain text. The conversion is scoped to cells so `<br>`
 * text in normal paragraphs keeps round-tripping as text.
 *
 * The rule must run before `text_join`: at that point escaped (`\<br>`) and
 * entity (`&lt;br&gt;`) forms are still separate `text_special` tokens, so
 * matching only `text` tokens converts exactly the raw occurrences and
 * leaves intentional literals alone.
 */
export function tableTokenizer(md: MarkdownIt): void {
  md.enable('table');
  md.core.ruler.before('text_join', 'bangle-table-cell-br', (state) => {
    let cellDepth = 0;
    for (const token of state.tokens) {
      if (token.type === 'th_open' || token.type === 'td_open') {
        cellDepth++;
      } else if (token.type === 'th_close' || token.type === 'td_close') {
        cellDepth--;
      } else if (cellDepth > 0 && token.type === 'inline' && token.children) {
        token.children = splitBrIntoHardbreaks(token.children, state.Token);
      }
    }
    return false;
  });
}

const CELL_BR_RE = /<br\s*\/?>/i;

function splitBrIntoHardbreaks(
  children: Token[],
  TokenCtor: new (type: string, tag: string, nesting: 0) => Token,
): Token[] {
  const result: Token[] = [];
  for (const child of children) {
    if (child.type !== 'text' || !CELL_BR_RE.test(child.content)) {
      result.push(child);
      continue;
    }
    const parts = child.content.split(new RegExp(CELL_BR_RE.source, 'gi'));
    parts.forEach((part, index) => {
      if (part) {
        const text = new TokenCtor('text', '', 0);
        text.content = part;
        text.level = child.level;
        result.push(text);
      }
      if (index < parts.length - 1) {
        const br = new TokenCtor('hardbreak', 'br', 0);
        br.level = child.level;
        result.push(br);
      }
    });
  }
  return result;
}
