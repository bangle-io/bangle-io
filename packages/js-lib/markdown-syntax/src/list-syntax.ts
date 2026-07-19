import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';

/**
 * Token attribute carrying the enclosing list container's kind. Set on both
 * `list_item_open` and the enclosing `*_list_open` token. Task checked state
 * is intentionally separate: GFM permits task items in ordered containers.
 */
export const LIST_KIND_ATTR = 'data-bangle-list-kind';

/** Token attribute carrying list tightness (`'true'`/`'false'`). */
export const LIST_TIGHT_ATTR = 'data-bangle-list-tight';

/** Token attribute carrying a task item's checked state (`'true'`/`'false'`). */
export const TASK_CHECKED_ATTR = 'data-bangle-task-checked';

export type ListKind = 'bullet' | 'ordered';

export type ListTokenMetadata = {
  readonly kind: ListKind;
  readonly tight: boolean;
  readonly taskChecked: boolean | null;
};

/**
 * Task markers GFM recognizes at the very start of a list item's first
 * paragraph: `[ ]`, `[x]`, or `[X]`, followed by whitespace or ending the
 * paragraph (an empty task). Anywhere else, `[ ]` is literal text.
 */
const TASK_MARKER = /^\[([ xX])\](?:\s+|$)/u;

function stripInlinePrefix(inline: Token, prefix: string): boolean {
  const children = inline.children;
  const first = children?.[0];
  const marker = prefix.slice(0, 3);
  if (
    !children ||
    first?.type !== 'text' ||
    !first.content.startsWith(marker)
  ) {
    return false;
  }
  first.content = first.content.slice(marker.length);
  if (first.content === '') children.shift();

  let remaining = prefix.slice(marker.length);
  while (remaining !== '') {
    const child = children[0];
    if (!child) return false;
    if (child.type === 'softbreak' || child.type === 'hardbreak') {
      const newline = remaining.indexOf('\n');
      if (newline === -1) return false;
      children.shift();
      remaining = remaining.slice(newline + 1);
      continue;
    }
    if (child.type !== 'text') return false;
    let consumed = 0;
    while (
      consumed < remaining.length &&
      child.content[consumed] === remaining[consumed]
    ) {
      consumed++;
    }
    if (consumed === 0) return false;
    child.content = child.content.slice(consumed);
    remaining = remaining.slice(consumed);
    if (child.content === '') children.shift();
  }
  inline.content = inline.content.slice(prefix.length);
  return true;
}

/**
 * Read the engine-neutral list metadata stamped by {@link listTokenizer}.
 */
export function readListTokenMetadata(token: Token): ListTokenMetadata {
  return {
    kind: token.attrGet(LIST_KIND_ATTR) === 'ordered' ? 'ordered' : 'bullet',
    tight: token.attrGet(LIST_TIGHT_ATTR) !== 'false',
    taskChecked:
      token.attrGet(TASK_CHECKED_ATTR) === null
        ? null
        : token.attrGet(TASK_CHECKED_ATTR) === 'true',
  };
}

function listIsTight(
  tokens: readonly Token[],
  openIndex: number,
  sourceLines: readonly string[],
): boolean {
  const open = tokens[openIndex];
  if (!open) return true;

  const paragraphLevel = open.level + 2;
  const itemLevel = open.level + 1;
  const closeType = open.type.replace(/_open$/, '_close');
  let currentItemLevel: number | null = null;
  let hasDirectChild = false;
  let hasDirectItem = false;
  for (let i = openIndex + 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token || token.level < open.level) break;
    if (token.type === closeType && token.level === open.level) return true;
    if (token.type === 'paragraph_open' && token.level === paragraphLevel) {
      return token.hidden;
    }
    if (token.type === 'list_item_open' && token.level === itemLevel) {
      if (hasDirectItem && startsAfterBlankLine(token, sourceLines)) {
        return false;
      }
      hasDirectItem = true;
      currentItemLevel = token.level;
      hasDirectChild = false;
      continue;
    }
    if (token.type === 'list_item_close' && token.level === itemLevel) {
      currentItemLevel = null;
      continue;
    }
    if (
      currentItemLevel !== null &&
      token.level === currentItemLevel + 1 &&
      token.nesting !== -1 &&
      token.map
    ) {
      if (hasDirectChild && startsAfterBlankLine(token, sourceLines)) {
        return false;
      }
      hasDirectChild = true;
    }
  }
  return true;
}

function startsAfterBlankLine(
  token: Token,
  sourceLines: readonly string[],
): boolean {
  const startLine = token.map?.[0];
  return (
    startLine !== undefined &&
    startLine > 0 &&
    /^[ \t]*$/.test(sourceLines[startLine - 1] ?? '')
  );
}

/**
 * markdown-it plugin defining what list syntax *means* for every consumer
 * of the shared tokenizer: it stamps container kind and tightness on list
 * tokens and detects GFM task items (`- [ ] …` / `- [x] …`), recording the
 * checked state separately and removing the marker from inline content.
 *
 * Task detection has to run as a core rule *after* inline parsing — whether
 * `[ ]` is a checkbox or literal text depends on it sitting at the very
 * start of a list item's first paragraph, which the inline tokenizer alone
 * cannot know. Mutating the token stream there is the standard markdown-it
 * technique for GFM task lists (`markdown-it-task-lists` works the same
 * way). An escaped marker (`\[ ]`) never matches because the inline token's
 * source content retains the leading backslash.
 *
 * Tightness comes from markdown-it's hidden paragraph tokens, which already
 * encode CommonMark's list looseness rules, rather than from source spacing.
 */
export function listTokenizer(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'bangle-list-syntax', (state) => {
    const tokens = state.tokens;
    const sourceLines = state.src.split(/\r?\n/);

    // Pass 1: stamp bullet/ordered kinds from the enclosing list.
    const listStack: Array<{ kind: ListKind; tight: boolean }> = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;
      switch (token.type) {
        case 'bullet_list_open':
        case 'ordered_list_open': {
          const kind = token.type === 'bullet_list_open' ? 'bullet' : 'ordered';
          const tight = listIsTight(tokens, i, sourceLines);
          listStack.push({ kind, tight });
          token.attrSet(LIST_KIND_ATTR, kind);
          token.attrSet(LIST_TIGHT_ATTR, String(tight));
          break;
        }
        case 'bullet_list_close':
        case 'ordered_list_close':
          listStack.pop();
          break;
        case 'list_item_open': {
          const list = listStack[listStack.length - 1];
          if (list) {
            token.attrSet(LIST_KIND_ATTR, list.kind);
            token.attrSet(LIST_TIGHT_ATTR, String(list.tight));
          }
          break;
        }
        default:
          break;
      }
    }

    // Pass 2: upgrade items whose first paragraph starts with a task
    // marker. The token shape is always `list_item_open`, `paragraph_open`,
    // `inline`; an item that starts with any other block cannot be a task.
    for (let i = 2; i < tokens.length; i++) {
      const inline = tokens[i];
      const paragraph = tokens[i - 1];
      const item = tokens[i - 2];
      if (
        !inline ||
        inline.type !== 'inline' ||
        paragraph?.type !== 'paragraph_open' ||
        item?.type !== 'list_item_open'
      ) {
        continue;
      }
      const first = inline.children?.[0];
      if (!first || first.type !== 'text') continue;
      const match = TASK_MARKER.exec(inline.content);
      if (!match || !stripInlinePrefix(inline, match[0])) continue;

      item.attrSet(TASK_CHECKED_ATTR, match[1] === ' ' ? 'false' : 'true');
    }

    return false;
  });
}
