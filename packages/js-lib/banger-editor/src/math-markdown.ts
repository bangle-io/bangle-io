import {
  findInlineMathAtEnd,
  parseInlineMathAt,
} from '@bangle.io/markdown-syntax';
import type { MarkdownSerializerState } from 'prosemirror-markdown';
import { createCodeFence } from './code-block';
import type { PMNode } from './pm';

export const MATH_INLINE_NODE_NAME = 'math_inline';
export const MATH_DISPLAY_NODE_NAME = 'math_display';
export const MATH_ESCAPED_DOLLAR_NODE_NAME = 'math_escaped_dollar';

export function mathInlineToMarkdown(
  state: MarkdownSerializerState,
  node: PMNode,
  parent: PMNode,
  index: number,
): void {
  const source = inlineMathMarkdownSource(
    state,
    node.textContent,
    parent,
    index,
  );
  if (source !== null) {
    state.write(source);
  } else if (node.textContent.length > 0) {
    writeLiteralMarkdown(state, `$${node.textContent}$`);
  }
}

export function mathDisplayToMarkdown(
  state: MarkdownSerializerState,
  node: PMNode,
): void {
  if (hasDisplayClosingLine(node.textContent)) {
    writeDisplayMathFallback(state, node);
  } else {
    state.write('$$\n');
    state.text(node.textContent, false);
    state.write('\n');
    state.write('$$');
  }
  state.closeBlock(node);
}

export function mathEscapedDollarToMarkdown(
  state: MarkdownSerializerState,
): void {
  state.write('\\$');
}

function inlineMathMarkdownSource(
  state: MarkdownSerializerState,
  content: string,
  parent: PMNode,
  index: number,
): string | null {
  if (content.length < 1) return null;
  const source = `$${content}$`;
  const parsed = parseInlineMathAt(source, 0);
  if (parsed?.end !== source.length || parsed.content !== content) return null;

  const linePrefix = serializedLinePrefix(state);
  if (linePrefix === null) return null;
  const contextualMatch = findInlineMathAtEnd(`${linePrefix}${source}`);
  if (
    contextualMatch?.start !== linePrefix.length ||
    contextualMatch.content !== content
  ) {
    return null;
  }

  const next = index + 1 < parent.childCount ? parent.child(index + 1) : null;
  return hasUnsafeInlineSuffix(next) ? null : source;
}

function serializedLinePrefix(state: MarkdownSerializerState): string | null {
  // `out` is internal upstream; decline math if that runtime contract changes.
  if (!('out' in state) || typeof state.out !== 'string') return null;
  const lineStart =
    Math.max(state.out.lastIndexOf('\n'), state.out.lastIndexOf('\r')) + 1;
  return state.out.slice(lineStart);
}

function hasUnsafeInlineSuffix(node: PMNode | null): boolean {
  if (!node) return false;
  if (node.type.name === MATH_INLINE_NODE_NAME) return true;
  if (!node.isText || node.marks.length > 0) return false;
  const first = node.text?.[0];
  return first === '$' || (first !== undefined && isAsciiDigit(first));
}

function hasDisplayClosingLine(content: string): boolean {
  return content.split(/\r\n?|\n/u).some((line) => line.trim() === '$$');
}

function writeDisplayMathFallback(
  state: MarkdownSerializerState,
  node: PMNode,
): void {
  const source = `$$\n${node.textContent}\n$$`;
  const fence = createCodeFence(source, '');
  state.write(`${fence}\n`);
  state.text(source, false);
  state.write('\n');
  state.write(fence);
}

function writeLiteralMarkdown(
  state: MarkdownSerializerState,
  content: string,
): void {
  const previous = state.options.escapeExtraCharacters;
  state.options.escapeExtraCharacters = previous
    ? new RegExp(`${previous.source}|\\$`, 'g')
    : /\$/g;
  try {
    const lines = content.split(/\r\n?|\n/u);
    lines.forEach((line, index) => {
      state.text(line);
      if (index + 1 < lines.length) state.write('\\\n');
    });
  } finally {
    state.options.escapeExtraCharacters = previous;
  }
}

function isAsciiDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}
