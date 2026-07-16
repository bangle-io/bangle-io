import { parseInlineMathAt } from '@bangle.io/markdown-syntax';
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
  const source = inlineMathMarkdownSource(node.textContent, parent, index);
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

function inlineMathMarkdownSource(
  content: string,
  parent: PMNode,
  index: number,
): string | null {
  if (content.length < 1) return null;
  const source = `$${content}$`;
  const parsed = parseInlineMathAt(source, 0);
  if (parsed?.end !== source.length || parsed.content !== content) return null;

  const previous = index > 0 ? parent.child(index - 1) : null;
  const next = index + 1 < parent.childCount ? parent.child(index + 1) : null;
  return hasUnsafeInlinePrefix(previous) || hasUnsafeInlineSuffix(next)
    ? null
    : source;
}

function hasUnsafeInlinePrefix(node: PMNode | null): boolean {
  if (!node) return false;
  if (
    node.type.name === MATH_INLINE_NODE_NAME ||
    node.type.name === MATH_ESCAPED_DOLLAR_NODE_NAME
  ) {
    return true;
  }
  if (!node.isText || node.marks.length > 0) return false;
  const text = node.text ?? '';
  if (text.endsWith('$')) return true;
  let backslashes = 0;
  for (
    let position = text.length - 1;
    position >= 0 && text[position] === '\\';
    position -= 1
  ) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function hasUnsafeInlineSuffix(node: PMNode | null): boolean {
  if (!node) return false;
  if (node.type.name === MATH_INLINE_NODE_NAME) return true;
  if (!node.isText || node.marks.length > 0) return false;
  const first = node.text?.[0];
  return first === '$' || (first !== undefined && isAsciiDigit(first));
}

function hasDisplayClosingLine(content: string): boolean {
  return content.split(/\r\n?|\n/u).some((line) => line.trimEnd() === '$$');
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
