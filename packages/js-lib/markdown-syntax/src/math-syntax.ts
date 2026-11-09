import type MarkdownIt from 'markdown-it';

const INLINE_DELIMITER = '$';
const DISPLAY_DELIMITER = '$$';

export type InlineMathMatch = {
  content: string;
  end: number;
  start: number;
};

type InlineMathScan = {
  match: InlineMathMatch | null;
  rejectedCloser: number | null;
};

/** Returns a conservative inline-math match beginning at `start`. */
export function parseInlineMathAt(
  source: string,
  start: number,
): InlineMathMatch | null {
  const result = scanInlineMathAt(source, start);
  if (!result.match || isRejectedFormerCloser(source, start)) {
    return null;
  }
  return result.match;
}

function scanInlineMathAt(source: string, start: number): InlineMathScan {
  if (
    source[start] !== INLINE_DELIMITER ||
    source[start + 1] === INLINE_DELIMITER ||
    source[start - 1] === INLINE_DELIMITER ||
    isEscaped(source, start) ||
    isWhitespace(source[start + 1])
  ) {
    return { match: null, rejectedCloser: null };
  }

  for (let pos = start + 1; pos < source.length; pos += 1) {
    const char = source[pos];
    if (char === '\n' || char === '\r') {
      return { match: null, rejectedCloser: null };
    }
    if (char !== INLINE_DELIMITER || isEscaped(source, pos)) {
      continue;
    }

    const previous = source[pos - 1];
    const next = source[pos + 1];
    if (
      isWhitespace(previous) ||
      next === INLINE_DELIMITER ||
      (next !== undefined && isAsciiDigit(next))
    ) {
      return { match: null, rejectedCloser: pos };
    }

    return {
      match: {
        content: source.slice(start + 1, pos),
        end: pos + 1,
        start,
      },
      rejectedCloser: null,
    };
  }
  return { match: null, rejectedCloser: null };
}

/** Finds an inline-math span whose closing delimiter is the end of `source`. */
export function findInlineMathAtEnd(source: string): InlineMathMatch | null {
  for (const match of analyzeInlineMath(source).values()) {
    if (match?.end === source.length) return match;
  }
  return null;
}

/**
 * Opt-in dollar-delimited math syntax shared by editor engines that support
 * editable TeX nodes. The rules deliberately decline ambiguous input so
 * enabling math never turns currency, escaped dollars, code, or an unclosed
 * fence into a destructive partial parse.
 */
export function mathTokenizer(md: MarkdownIt): void {
  const inlineAnalysisCache = new WeakMap<
    InlineRule,
    { matches: ReadonlyMap<number, InlineMathMatch>; source: string }
  >();

  md.inline.ruler.before('escape', 'math_escaped_dollar', (state, silent) => {
    const start = state.pos;
    // Let Markdown-it canonicalize an isolated `\$` as ordinary text. Keep a
    // dedicated atom only when removing the escape could pair two dollars.
    if (
      state.src[start] !== '\\' ||
      state.src[start + 1] !== INLINE_DELIMITER ||
      isEscaped(state.src, start) ||
      !lineHasAnotherDollar(state.src, start + 1)
    ) {
      return false;
    }
    if (!silent) {
      const token = state.push('math_escaped_dollar', '', 0);
      token.content = INLINE_DELIMITER;
      token.markup = '\\$';
    }
    state.pos = start + 2;
    return true;
  });

  md.inline.ruler.before('escape', 'math_inline', (state, silent) => {
    const start = state.pos;
    const source = state.src.slice(0, state.posMax);
    let analysis = inlineAnalysisCache.get(state);
    if (!analysis || analysis.source !== source) {
      analysis = { matches: analyzeInlineMath(source), source };
      inlineAnalysisCache.set(state, analysis);
    }
    const match = analysis.matches.get(start);
    if (!match) {
      return false;
    }

    if (!silent) {
      const token = state.push('math_inline', '', 0);
      token.content = match.content;
      token.markup = INLINE_DELIMITER;
    }
    state.pos = match.end;
    return true;
  });

  md.block.ruler.before(
    'fence',
    'math_display',
    (state, startLine, endLine, silent) => {
      if ((state.sCount[startLine] ?? 0) - state.blkIndent >= 4) {
        return false;
      }

      const opening = lineContent(state, startLine).trimEnd();
      if (!opening.startsWith(DISPLAY_DELIMITER)) {
        return false;
      }

      const singleLine = singleLineDisplayContent(opening);
      if (singleLine !== null) {
        if (silent) {
          return true;
        }
        pushDisplayToken(state, startLine, startLine + 1, singleLine);
        state.line = startLine + 1;
        return true;
      }

      if (opening !== DISPLAY_DELIMITER) {
        return false;
      }

      let closingLine = -1;
      for (let line = startLine + 1; line < endLine; line += 1) {
        if (lineContent(state, line).trimEnd() === DISPLAY_DELIMITER) {
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

      const content = state.getLines(
        startLine + 1,
        closingLine,
        state.blkIndent,
        true,
      );
      pushDisplayToken(state, startLine, closingLine + 1, content);
      state.line = closingLine + 1;
      return true;
    },
    { alt: ['paragraph', 'reference', 'blockquote', 'list'] },
  );
}

type BlockRule = Parameters<
  Parameters<MarkdownIt['block']['ruler']['before']>[2]
>[0];

type InlineRule = Parameters<
  Parameters<MarkdownIt['inline']['ruler']['before']>[2]
>[0];

function lineContent(state: BlockRule, line: number): string {
  const start = (state.bMarks[line] ?? 0) + (state.tShift[line] ?? 0);
  const end = state.eMarks[line] ?? start;
  return state.src.slice(start, end);
}

function singleLineDisplayContent(line: string): string | null {
  if (
    line.length <= DISPLAY_DELIMITER.length * 2 ||
    !line.endsWith(DISPLAY_DELIMITER)
  ) {
    return null;
  }
  const content = line.slice(
    DISPLAY_DELIMITER.length,
    -DISPLAY_DELIMITER.length,
  );
  if (content.trim().length < 1) return null;
  for (let pos = 0; pos < content.length; pos += 1) {
    if (content[pos] === INLINE_DELIMITER && !isEscaped(content, pos)) {
      return null;
    }
  }
  return content;
}

function pushDisplayToken(
  state: BlockRule,
  startLine: number,
  endLine: number,
  content: string,
): void {
  const token = state.push('math_display', '', 0);
  token.content = content;
  token.map = [startLine, endLine];
  token.markup = DISPLAY_DELIMITER;
}

function isWhitespace(char: string | undefined): boolean {
  return char === undefined || /\s/u.test(char);
}

function isAsciiDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

function lineHasAnotherDollar(source: string, position: number): boolean {
  const lineStart =
    Math.max(
      source.lastIndexOf('\n', position - 1),
      source.lastIndexOf('\r', position - 1),
    ) + 1;
  const nextLineFeed = source.indexOf('\n', position + 1);
  const nextCarriageReturn = source.indexOf('\r', position + 1);
  const lineEnd = Math.min(
    nextLineFeed < 0 ? source.length : nextLineFeed,
    nextCarriageReturn < 0 ? source.length : nextCarriageReturn,
  );
  return (
    source.slice(lineStart, position).includes(INLINE_DELIMITER) ||
    source.slice(position + 1, lineEnd).includes(INLINE_DELIMITER)
  );
}

function analyzeInlineMath(
  source: string,
): ReadonlyMap<number, InlineMathMatch> {
  const matches = new Map<number, InlineMathMatch>();
  const rejectedClosers = new Set<number>();

  for (let pos = 0; pos < source.length; pos += 1) {
    if (
      source[pos] !== INLINE_DELIMITER ||
      rejectedClosers.has(pos) ||
      isEscaped(source, pos)
    ) {
      continue;
    }
    const result = scanInlineMathAt(source, pos);
    if (result.rejectedCloser !== null) {
      rejectedClosers.add(result.rejectedCloser);
    }
    if (result.match) {
      matches.set(pos, result.match);
      pos = result.match.end - 1;
    }
  }
  return matches;
}

function isRejectedFormerCloser(source: string, position: number): boolean {
  const lineStart =
    Math.max(
      source.lastIndexOf('\n', position - 1),
      source.lastIndexOf('\r', position - 1),
    ) + 1;
  const rejectedClosers = new Set<number>();

  for (let pos = lineStart; pos < position; pos += 1) {
    if (
      source[pos] !== INLINE_DELIMITER ||
      rejectedClosers.has(pos) ||
      isEscaped(source, pos)
    ) {
      continue;
    }
    const result = scanInlineMathAt(source, pos);
    if (result.rejectedCloser !== null) {
      rejectedClosers.add(result.rejectedCloser);
    }
    if (result.match && result.match.end <= position) {
      pos = result.match.end - 1;
    }
  }
  return rejectedClosers.has(position);
}

function isEscaped(source: string, position: number): boolean {
  let backslashes = 0;
  for (let pos = position - 1; pos >= 0 && source[pos] === '\\'; pos -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}
