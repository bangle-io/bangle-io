// Portions adapted from prosemirror-markdown (MIT © Marijn Haverbeke).
// This is a port of `MarkdownSerializerState` from prosemirror-markdown's
// `to_markdown.ts` onto Wordgard's node model: PM `Node` (block/inline,
// content walked with `forEach`) becomes Wordgard `Plot`/`Leaf` (content
// walked as a plain array), and PM node/mark `attrs` become Wordgard node
// `param` + `marks`. The escaping regexes, delimiter/whitespace-expulsion
// logic, and mixable-mark reordering are kept byte-identical to PM's
// implementation because the golden-corpus round-trip gate compares output
// byte-for-byte against the ProseMirror engine.
import {
  Leaf,
  LineBreak,
  type Mark,
  type Node,
  type Plot,
} from '@bangle.io/wordgard-utils';
import type { MarkMarkdownSpec } from './spec';

/** True for the node type this schema uses to represent hard line breaks. */
function isLineBreak(node: Node): boolean {
  return node.isLeaf && node.type === LineBreak.type;
}

/**
 * Tracks output-so-far and pending block delimiters while walking a Wordgard
 * document, and exposes the same primitive operations
 * (`write`/`text`/`esc`/`wrapBlock`/`closeBlock`/`renderInline`/...) that
 * prosemirror-markdown's node/mark `serialize` functions are written
 * against. Keeping these primitives identical is what lets the ported
 * per-construct serializers (headings, lists, marks, ...) reuse PM's exact
 * string-level conventions.
 */
export class MarkdownSerializerState {
  /** @internal */
  delim = '';
  /** Accumulated output. */
  out = '';
  /** @internal */
  closed: Node | null = null;
  /**
   * Set by the link mark's serializer while emitting the `<url>` autolink
   * form; the text serializer checks it to leave the URL unescaped (an
   * escaped `<https://x/\_file>` would corrupt the URL).
   */
  inAutolink: boolean | undefined = undefined;
  /** @internal */
  atBlockStart = false;
  /** @internal */
  inTightList = false;

  /**
   * Serialization nesting order per mark type (lower = outermost), taken
   * from the registration order of the mark specs. See
   * {@link serializationMarks} for why this exists.
   */
  private readonly markPrecedence: ReadonlyMap<Mark.Type, number>;

  constructor(
    private readonly marks: ReadonlyMap<
      Mark.Type,
      MarkMarkdownSpec['serialize']
    >,
    private readonly renderNode: (
      state: MarkdownSerializerState,
      node: Node,
      parent: Plot,
      index: number,
    ) => void,
  ) {
    this.markPrecedence = new Map(
      [...marks.keys()].map((type, index) => [type, index]),
    );
  }

  /** @internal */
  flushClose(size = 2): void {
    if (this.closed) {
      if (!this.atBlank()) this.out += '\n';
      if (size > 1) {
        let delimMin = this.delim;
        const trim = /\s+$/.exec(delimMin);
        if (trim)
          delimMin = delimMin.slice(0, delimMin.length - trim[0].length);
        for (let i = 1; i < size; i++) this.out += `${delimMin}\n`;
      }
      this.closed = null;
    }
  }

  /**
   * The marks of `node` that serialize as delimiter pairs, in nesting order
   * (outermost first).
   *
   * Two filters happen here. Non-spanning marks (`ImageAlt`, `LinkTitle`,
   * `WikiLinkLabel`, `CodeBlockLanguage`) are Wordgard's "attribute" marks —
   * metadata read directly by the owning node's own serializer (see
   * `default-specs.ts`), not delimiter pairs to open/close, so they are
   * dropped. The remaining spanning marks are then sorted by the mark specs'
   * registration order rather than Wordgard's own mark-set order: Wordgard
   * ranks its built-in marks `Link < Strikethrough < Emphasis < Strong <
   * Code`, nearly the reverse of the ProseMirror engine's schema order, and
   * serializing in that order emits broken Markdown for overlapping marks
   * (`**bold [link](x)**` would become `[**link**](x)** ...**`). Sorting by
   * spec registration order both fixes that and is what keeps this engine's
   * canonical output byte-identical to the ProseMirror engine's for
   * overlapping marks (e.g. `**_both_**`, never `_**both**_`).
   */
  serializationMarks(node: Node): Mark[] {
    const precedence = (mark: Mark): number =>
      this.markPrecedence.get(mark.type) ?? Number.MAX_SAFE_INTEGER;
    return node.marks
      .filter((mark) => mark.type.spanning)
      .sort((a, b) => precedence(a) - precedence(b));
  }

  private getMark(type: Mark.Type): MarkMarkdownSpec['serialize'] {
    const info = this.marks.get(type);
    if (!info) {
      throw new Error(
        `Mark type \`${type.name}\` not supported by Markdown renderer`,
      );
    }
    return info;
  }

  /**
   * Render a block, prefixing each line with `delim` and the first line
   * with `firstDelim`. `node` is the node that gets closed at the end of
   * the block.
   */
  wrapBlock(
    delim: string,
    firstDelim: string | null,
    node: Node,
    f: () => void,
  ): void {
    const old = this.delim;
    this.write(firstDelim ?? delim);
    this.delim += delim;
    f();
    this.delim = old;
    this.closeBlock(node);
  }

  /** @internal */
  atBlank(): boolean {
    return /(^|\n)$/.test(this.out);
  }

  /** Ensure the current content ends with a newline. */
  ensureNewLine(): void {
    if (!this.atBlank()) this.out += '\n';
  }

  /**
   * Prepare the state for writing output (closing closed blocks, adding
   * delimiters), and then optionally add unescaped content.
   */
  write(content?: string): void {
    this.flushClose();
    if (this.delim && this.atBlank()) this.out += this.delim;
    if (content) this.out += content;
  }

  /** Close the block for the given node. */
  closeBlock(node: Node): void {
    this.closed = node;
  }

  /** Add text to the document, escaping it unless `shouldEscape` is `false`. */
  text(input: string, shouldEscape = true): void {
    const lines = input.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      this.write();
      // Escape exclamation marks in front of links.
      if (!shouldEscape && line[0] === '[' && /(^|[^\\])!$/.test(this.out)) {
        this.out = `${this.out.slice(0, this.out.length - 1)}\\!`;
      }
      this.out += shouldEscape ? this.esc(line, this.atBlockStart) : line;
      if (i !== lines.length - 1) this.out += '\n';
    }
  }

  /** Render the given node as a block. */
  render(node: Node, parent: Plot, index: number): void {
    this.renderNode(this, node, parent, index);
  }

  /** Render the contents of `parent` as block nodes. */
  renderContent(parent: Plot): void {
    for (let i = 0; i < parent.content.length; i++) {
      const node = parent.content[i];
      if (node) this.render(node, parent, i);
    }
  }

  /** Render the contents of `parent` as inline content. */
  renderInline(parent: Plot, fromBlockStart = true): void {
    this.atBlockStart = fromBlockStart;
    const active: Mark[] = [];
    let trailing = '';
    const content = parent.content;

    const progress = (nodeIn: Node | null, index: number): void => {
      let node = nodeIn;
      let marks: Mark[] = node ? this.serializationMarks(node) : [];

      // Marks are never left open across a hard break unless they also
      // cover the very next node (and that next node has non-whitespace
      // text, or isn't text at all) — otherwise a mark's closing delimiter
      // would land right after `\` + newline, which markdown-it would not
      // parse back as still being inside the mark.
      if (node && isLineBreak(node)) {
        marks = marks.filter((mark) => {
          if (index + 1 === content.length) return false;
          const next = content[index + 1];
          if (!next) return false;
          const nextText = textOf(next);
          return (
            isMarkInSet(mark, next.marks) &&
            (nextText === null || /\S/.test(nextText))
          );
        });
      }

      let leading = trailing;
      trailing = '';

      // Expel leading whitespace from marks that request it.
      const textBefore = node && textOf(node);
      if (
        textBefore !== null &&
        marks.some((mark) => {
          const info = this.getMark(mark.type);
          return info.expelEnclosingWhitespace && !isMarkInSet(mark, active);
        })
      ) {
        const match = /^(\s*)([\s\S]*)$/m.exec(textBefore);
        const lead = match?.[1] ?? '';
        const rest = match?.[2] ?? '';
        if (lead) {
          leading += lead;
          node = rest ? Leaf.text(rest, node?.marks) : null;
          if (!node) marks = active;
        }
      }

      // Expel trailing whitespace from marks that request it.
      const textAfter = node && textOf(node);
      if (
        textAfter !== null &&
        marks.some((mark) => {
          const info = this.getMark(mark.type);
          return (
            info.expelEnclosingWhitespace &&
            !this.isMarkAhead(content, index + 1, mark)
          );
        })
      ) {
        const match = /^([\s\S]*?)(\s*)$/m.exec(textAfter);
        const rest = match?.[1] ?? '';
        const trail = match?.[2] ?? '';
        if (trail) {
          trailing = trail;
          node = rest ? Leaf.text(rest, node?.marks) : null;
          if (!node) marks = active;
        }
      }

      const inner = marks.length ? marks[marks.length - 1] : null;
      const noEsc = inner ? this.getMark(inner.type).escape === false : false;
      const len = marks.length - (noEsc ? 1 : 0);

      // Reorder mixable marks so their order matches `active` where possible.
      outer: for (let i = 0; i < len; i++) {
        const mark = marks[i];
        if (!mark || !this.getMark(mark.type).mixable) break;
        for (let j = 0; j < active.length; j++) {
          const other = active[j];
          if (!other || !this.getMark(other.type).mixable) break;
          if (mark.eq(other)) {
            if (i > j) {
              marks = marks
                .slice(0, j)
                .concat(mark)
                .concat(marks.slice(j, i))
                .concat(marks.slice(i + 1, len));
            } else if (j > i) {
              marks = marks
                .slice(0, i)
                .concat(marks.slice(i + 1, j))
                .concat(mark)
                .concat(marks.slice(j, len));
            }
            continue outer;
          }
        }
      }

      // Find the unchanged prefix of the active mark set.
      let keep = 0;
      while (
        keep < Math.min(active.length, len) &&
        marks[keep] &&
        active[keep] &&
        marks[keep]?.eq(active[keep] as Mark)
      ) {
        keep++;
      }

      // Close marks that need to be closed.
      while (keep < active.length) {
        const popped = active.pop();
        if (popped)
          this.text(this.markString(popped, false, parent, index), false);
      }

      // Output previously expelled trailing whitespace outside the marks.
      if (leading) this.text(leading);

      if (node) {
        // Open marks that need to be opened.
        while (active.length < len) {
          const add = marks[active.length];
          if (!add) break;
          active.push(add);
          this.text(this.markString(add, true, parent, index), false);
          this.atBlockStart = false;
        }

        const innerText = textOf(node);
        if (noEsc && inner && innerText !== null) {
          this.text(
            this.markString(inner, true, parent, index) +
              innerText +
              this.markString(inner, false, parent, index + 1),
            false,
          );
        } else {
          this.render(node, parent, index);
        }
        this.atBlockStart = false;
      }

      if (node && textOf(node) !== null && node.length > 0) {
        this.atBlockStart = false;
      }
    };

    for (let i = 0; i < content.length; i++) {
      progress(content[i] ?? null, i);
    }
    progress(null, content.length);
    this.atBlockStart = false;
  }

  /**
   * Escape a string so it can safely appear in Markdown content. When
   * `startOfLine` is true, also escape constructs that are only special at
   * the start of a line (bullets, headings, ordered-list markers).
   */
  esc(str: string, startOfLine = false): string {
    let out = str.replace(/[`*\\~[\]_]/g, (m, i: number) =>
      m === '_' &&
      i > 0 &&
      i + 1 < str.length &&
      /\w/.test(str[i - 1] ?? '') &&
      /\w/.test(str[i + 1] ?? '')
        ? m
        : `\\${m}`,
    );
    if (startOfLine) {
      out = out
        .replace(/^(\+[ ]|[-*>])/, '\\$&')
        .replace(/^(\s*)(#{1,6})(\s|$)/, '$1\\$2$3')
        .replace(/^(\s*\d+)\.\s/, '$1\\. ');
    }
    return out;
  }

  /** Repeat `str` `n` times. */
  repeat(str: string, n: number): string {
    let out = '';
    for (let i = 0; i < n; i++) out += str;
    return out;
  }

  /** Get the markdown string for a given opening or closing mark. */
  markString(mark: Mark, open: boolean, parent: Plot, index: number): string {
    const info = this.getMark(mark.type);
    const value = open ? info.open : info.close;
    return typeof value === 'string' ? value : value(this, mark, parent, index);
  }

  /** @internal */
  isMarkAhead(content: readonly Node[], index: number, mark: Mark): boolean {
    // Skip over hard breaks, same as PM: whether a mark is "ahead" of a
    // break shouldn't depend on the break itself carrying the mark.
    let i = index;
    for (;;) {
      const next = content[i];
      if (!next) return false;
      if (!isLineBreak(next)) return isMarkInSet(mark, next.marks);
      i++;
    }
  }
}

function isMarkInSet(mark: Mark, set: Mark.Set): boolean {
  return set.some((m) => m.eq(mark));
}

/**
 * Returns a text leaf's string content, or `null` for anything else (plots,
 * non-text leaves). `Node.isText` is a plain boolean on the shared node
 * interface (not a type-narrowing discriminant), so this centralizes the
 * "is this actually a text leaf" check in one place that also narrows to a
 * concrete `string` for callers, mirroring PM's `node.isText` + `node.text!`.
 */
function textOf(node: Node): string | null {
  if (!node.isLeaf || !node.isText) return null;
  // `Leaf.Text`'s param is documented as the leaf's string content; `isText`
  // is a runtime check (not a type-level discriminant on `Param`), so this
  // is the one place that needs to trust that invariant.
  return typeof node.param === 'string' ? node.param : null;
}
