import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';

/**
 * Token attribute carrying a list item's kind. Set on `list_item_open`
 * tokens (and, for `bullet`/`ordered`, on the enclosing `*_list_open`
 * token). This is the engine-neutral meaning of the syntax: both editor
 * engines' codecs read these attributes instead of re-deriving list
 * semantics themselves.
 */
export const LIST_KIND_ATTR = 'data-bangle-list-kind';

/** Token attribute carrying a task item's checked state (`'true'`/`'false'`). */
export const TASK_CHECKED_ATTR = 'data-bangle-task-checked';

export type ListKind = 'bullet' | 'ordered' | 'task';

/**
 * Task markers GFM recognizes at the very start of a list item's first
 * paragraph: `[ ]`, `[x]`, or `[X]`, either followed by a space or ending
 * the paragraph (an empty task). Anywhere else, `[ ]` is literal text.
 */
const TASK_MARKER = /^\[([ xX])\](?: |$)/;

/**
 * markdown-it plugin defining what list syntax *means* for every consumer
 * of the shared tokenizer: it stamps {@link LIST_KIND_ATTR} on list tokens
 * and detects GFM task items (`- [ ] …` / `- [x] …`), recording the checked
 * state in {@link TASK_CHECKED_ATTR} and removing the marker from the
 * item's inline content.
 *
 * Task detection has to run as a core rule *after* inline parsing — whether
 * `[ ]` is a checkbox or literal text depends on it sitting at the very
 * start of a list item's first paragraph, which the inline tokenizer alone
 * cannot know. Mutating the token stream there is the standard markdown-it
 * technique for GFM task lists (`markdown-it-task-lists` works the same
 * way). An escaped marker (`\[ ]`) never matches: the escape becomes a
 * `text_special` child, so the leading text child no longer starts with
 * `[`.
 *
 * Adapted from a prior in-house ProseMirror-stack plugin, minus behavior no
 * consumer ever read (a `tight` attribute that was always `"false"`, an
 * ordered-list `order` attribute both engines deliberately ignore, and an
 * HTML renderer override).
 */
export function listTokenizer(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'bangle-list-syntax', (state) => {
    const tokens = state.tokens;

    // Pass 1: stamp bullet/ordered kinds from the enclosing list.
    const kindStack: Array<'bullet' | 'ordered'> = [];
    for (const token of tokens) {
      switch (token.type) {
        case 'bullet_list_open':
        case 'ordered_list_open': {
          const kind = token.type === 'bullet_list_open' ? 'bullet' : 'ordered';
          kindStack.push(kind);
          token.attrSet(LIST_KIND_ATTR, kind);
          break;
        }
        case 'bullet_list_close':
        case 'ordered_list_close':
          kindStack.pop();
          break;
        case 'list_item_open': {
          const kind = kindStack[kindStack.length - 1];
          if (kind) token.attrSet(LIST_KIND_ATTR, kind);
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
      const match = TASK_MARKER.exec(first.content);
      if (!match) continue;

      item.attrSet(LIST_KIND_ATTR, 'task');
      item.attrSet(TASK_CHECKED_ATTR, match[1] === ' ' ? 'false' : 'true');

      // Remove the marker from both the child and the inline token's own
      // `content` so the stream stays self-consistent for any consumer.
      first.content = first.content.slice(match[0].length);
      inline.content = inline.content.slice(match[0].length);
      if (first.content === '') {
        inline.children?.shift();
      }
    }

    return false;
  });
}
