import type MarkdownIt from 'markdown-it';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';
import type Token from 'markdown-it/lib/token.mjs';

const EQUALS_MARKER = '='.charCodeAt(0);

/**
 * Opt-in `==highlight==` syntax.
 *
 * This uses markdown-it's delimiter engine so highlight composes with links
 * and other inline marks instead of swallowing their source as plain text.
 * A single or unmatched `=` is left untouched.
 */
export function highlightTokenizer(md: MarkdownIt): void {
  md.inline.ruler.before('strikethrough', 'highlight', (state, silent) => {
    if (silent || state.src.charCodeAt(state.pos) !== EQUALS_MARKER) {
      return false;
    }

    const scanned = state.scanDelims(state.pos, true);
    // Only the exact two-character delimiter is supported. Declining longer
    // runs avoids manufacturing empty or overlapping marks from `====`.
    if (
      scanned.length !== 2 ||
      state.src[state.pos - 1] === '=' ||
      state.src[state.pos + 2] === '='
    ) {
      return false;
    }

    const token = state.push('text', '', 0);
    token.content = '==';
    state.delimiters.push({
      marker: EQUALS_MARKER,
      length: 0,
      token: state.tokens.length - 1,
      end: -1,
      // Unlike emphasis, highlight is allowed next to punctuation and inside
      // a word. This also keeps serializer-produced nesting such as
      // `==**wo**==rd` semantic on reload.
      open: !isWhitespace(state.src[state.pos + scanned.length]),
      close: !isWhitespace(state.src[state.pos - 1]),
    });

    state.pos += scanned.length;
    return true;
  });

  md.inline.ruler2.before('strikethrough', 'highlight', (state) => {
    processHighlightDelimiters(state.tokens, state.delimiters);
    for (const metadata of state.tokens_meta) {
      if (metadata) {
        processHighlightDelimiters(state.tokens, metadata.delimiters);
      }
    }
    return true;
  });
}

function isWhitespace(character: string | undefined): boolean {
  return character === undefined || /\s/u.test(character);
}

function processHighlightDelimiters(
  tokens: readonly Token[],
  delimiters: StateInline['delimiters'],
): void {
  for (const opener of delimiters) {
    if (opener.marker !== EQUALS_MARKER || opener.end < 0) {
      continue;
    }

    const closer = delimiters[opener.end];
    const openToken = tokens[opener.token];
    const closeToken = closer ? tokens[closer.token] : undefined;
    if (!openToken || !closeToken) {
      continue;
    }

    openToken.type = 'highlight_open';
    openToken.tag = 'mark';
    openToken.nesting = 1;
    openToken.markup = '==';
    openToken.content = '';

    closeToken.type = 'highlight_close';
    closeToken.tag = 'mark';
    closeToken.nesting = -1;
    closeToken.markup = '==';
    closeToken.content = '';
  }
}
