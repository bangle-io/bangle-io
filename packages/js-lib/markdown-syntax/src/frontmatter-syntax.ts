import type MarkdownIt from 'markdown-it';

/**
 * The fence line that opens and closes a frontmatter block. Only an exact,
 * unindented `---` counts — trailing characters, extra dashes, or indentation
 * mean the line is ordinary Markdown (thematic break, setext underline, …).
 */
const FRONTMATTER_FENCE = '---';

/**
 * markdown-it block plugin that tokenizes a YAML frontmatter block into a
 * single `frontmatter` token whose `content` is the raw text between the
 * fences.
 *
 * Frontmatter is only recognized when the document literally starts with a
 * `---` line and a closing `---` line exists somewhere below it. Anything
 * else — a missing closing fence, an indented fence, a `---` later in the
 * document, or inside a blockquote/list — declines so the source keeps its
 * ordinary CommonMark meaning (thematic break or setext heading). Declining
 * instead of guessing is what keeps parsing non-destructive: no input is ever
 * reinterpreted as frontmatter unless it unambiguously is one.
 */
export function frontmatterTokenizer(md: MarkdownIt): void {
  md.block.ruler.before(
    'table',
    'frontmatter',
    (state, startLine, endLine, silent) => {
      // Only the very first line of the document can open frontmatter. The
      // parentType/blkIndent checks keep `> ---` and list-nested content out.
      if (
        startLine !== 0 ||
        state.parentType !== 'root' ||
        state.blkIndent !== 0
      ) {
        return false;
      }
      if (!isFenceLine(state, startLine)) {
        return false;
      }

      let closingLine = -1;
      for (let line = startLine + 1; line < endLine; line++) {
        if (isFenceLine(state, line)) {
          closingLine = line;
          break;
        }
      }
      if (closingLine < 0) {
        return false;
      }
      if (silent) {
        return true;
      }

      const token = state.push('frontmatter', '', 0);
      token.content = state.getLines(startLine + 1, closingLine, 0, false);
      token.map = [startLine, closingLine + 1];
      token.markup = FRONTMATTER_FENCE;
      state.line = closingLine + 1;
      return true;
    },
  );
}

type StateBlock = Parameters<
  Parameters<MarkdownIt['block']['ruler']['before']>[2]
>[0];

function isFenceLine(state: StateBlock, line: number): boolean {
  if (state.tShift[line] !== 0) {
    return false;
  }
  const start = state.bMarks[line] ?? 0;
  const end = state.eMarks[line] ?? 0;
  return state.src.slice(start, end) === FRONTMATTER_FENCE;
}
