// Portions adapted from prosemirror-markdown (MIT © Marijn Haverbeke).
// This is a port of `MarkdownParseState`/`tokenHandlers` from
// prosemirror-markdown's `from_markdown.ts` onto Wordgard's node model: PM's
// `NodeType.createAndFill(attrs, content, marks)` becomes
// `Plot.Tag.create(content)` (Wordgard's tag already carries `param` +
// `marks`), and PM's flat mark stack becomes a `Mark.Set` stack. Token-walk
// order, `noCloseToken` handling, `ignore`, and the default
// `softbreak -> addText(" ")` behavor are kept identical to PM's
// implementation.
import {
  Leaf,
  Mark,
  type Node,
  type Plot,
  type Schema,
} from '@bangle.io/wordgard-utils';
import type Token from 'markdown-it/lib/token.mjs';
import type { MarkdownSpec, TokenParseSpec } from './spec';

type StackFrame = {
  readonly tag: Plot.Tag | null;
  content: Node[];
  marks: Mark.Set;
};

function maybeMergeText(a: Node, b: Node): Node | undefined {
  if (
    a.isLeaf &&
    a.isText &&
    b.isLeaf &&
    b.isText &&
    typeof a.param === 'string' &&
    typeof b.param === 'string' &&
    Mark.sameSet(a.marks, b.marks)
  ) {
    return Leaf.text(a.param + b.param, a.marks);
  }
  return undefined;
}

/**
 * Tracks the running parse of a markdown-it token stream into a Wordgard
 * document: a stack of open plots (each with its own accumulated content and
 * active mark set), mirroring prosemirror-markdown's `MarkdownParseState`.
 */
class MarkdownParseState {
  private readonly stack: StackFrame[] = [
    { tag: null, content: [], marks: [] },
  ];

  constructor(
    private readonly schema: Schema,
    private readonly tokenHandlers: Readonly<
      Record<
        string,
        (
          state: MarkdownParseState,
          token: Token,
          tokens: readonly Token[],
          i: number,
        ) => void
      >
    >,
  ) {}

  private top(): StackFrame {
    const frame = this.stack[this.stack.length - 1];
    if (!frame) throw new Error('Markdown parse stack is empty');
    return frame;
  }

  /** The mark set currently active at the top of the parse stack. */
  get activeMarks(): Mark.Set {
    return this.top().marks;
  }

  push(node: Node): void {
    this.top().content.push(node);
  }

  /** Add text at the current position, using the currently active marks. */
  addText(text: string): void {
    if (!text) return;
    const top = this.top();
    const nodes = top.content;
    const last = nodes[nodes.length - 1];
    const node = Leaf.text(text, top.marks);
    const merged = last && maybeMergeText(last, node);
    if (merged) {
      nodes[nodes.length - 1] = merged;
    } else {
      nodes.push(node);
    }
  }

  /** Add the given mark(s) to the set of active marks. */
  openMark(mark: Mark): void {
    const top = this.top();
    top.marks = mark.addToSet(top.marks);
  }

  /** Remove the given mark type from the set of active marks. */
  closeMark(mark: Mark): void {
    const top = this.top();
    top.marks = mark.removeFromSet(top.marks);
  }

  parseTokens(tokens: readonly Token[]): void {
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (!tok) continue;
      const handler = this.tokenHandlers[tok.type];
      if (!handler) {
        throw new Error(
          `Token type \`${tok.type}\` not supported by Markdown parser`,
        );
      }
      handler(this, tok, tokens, i);
    }
  }

  /** Add one or more nodes at the current position. */
  addNode(node: Node | readonly Node[]): void {
    if (Array.isArray(node)) {
      for (const n of node) this.push(n);
    } else {
      this.push(node as Node);
    }
  }

  /** Open a new plot, subsequent content is added inside it. */
  openNode(tag: Plot.Tag): void {
    this.stack.push({ tag, content: [], marks: [] });
  }

  /**
   * Close and return the plot currently on top of the stack.
   *
   * Markdown constructs that Wordgard models as block-content plots
   * (`Blockquote`, `ListItem`) can legally be empty in Markdown (`>` with no
   * text, an empty `- ` item) even though their Wordgard plot type requires
   * at least one child. Rather than let that throw a `ValidationError` and
   * turn a load into a hard failure, fill with the schema's default block
   * (typically an empty paragraph) — the same recovery `schema.doc()` would
   * need to do internally, made explicit here so parsing never surfaces an
   * error for markup real Markdown allows.
   */
  closeNode(): Node {
    const info = this.stack.pop();
    if (!info?.tag) {
      throw new Error('No open plot to close');
    }
    const node =
      info.content.length === 0 && !info.tag.type.canBeEmpty
        ? this.schema.createAndFill(info.tag)
        : info.tag.create(info.content);
    this.push(node);
    return node;
  }

  /** Finish the parse, closing any still-open plots, and return the doc content. */
  finish(): readonly Node[] {
    while (this.stack.length > 1) {
      this.closeNode();
    }
    return this.top().content;
  }
}

function withoutTrailingNewline(str: string): string {
  return str.endsWith('\n') ? str.slice(0, -1) : str;
}

function isNoCloseToken(spec: TokenParseSpec, type: string): boolean {
  return (
    ('noCloseToken' in spec && spec.noCloseToken === true) ||
    type === 'code_inline' ||
    type === 'code_block' ||
    type === 'fence'
  );
}

type TokenHandler = (
  state: MarkdownParseState,
  token: Token,
  tokens: readonly Token[],
  i: number,
) => void;

function resolveBlockTag(
  spec: Extract<TokenParseSpec, { block: unknown }>,
  token: Token,
): Plot.Tag {
  return typeof spec.block === 'function' ? spec.block(token) : spec.block;
}

/**
 * Builds the markdown-it token type -> handler map from a set of
 * {@link MarkdownSpec}s, one handler per token type across all specs. This
 * is the parse-side counterpart of the serializer's per-type dispatch table.
 */
function buildTokenHandlers(
  specs: readonly MarkdownSpec[],
): Record<string, TokenHandler> {
  const handlers: Record<string, TokenHandler> = Object.create(null);

  const register = (type: string, handler: TokenHandler): void => {
    if (handlers[type]) {
      throw new Error(
        `Token type \`${type}\` is registered by more than one MarkdownSpec`,
      );
    }
    handlers[type] = handler;
  };

  for (const spec of specs) {
    for (const [type, tokenSpec] of Object.entries(spec.parse)) {
      if ('block' in tokenSpec) {
        if (isNoCloseToken(tokenSpec, type)) {
          register(type, (state, tok) => {
            state.openNode(resolveBlockTag(tokenSpec, tok));
            state.addText(withoutTrailingNewline(tok.content));
            state.closeNode();
          });
        } else {
          register(`${type}_open`, (state, tok) =>
            state.openNode(resolveBlockTag(tokenSpec, tok)),
          );
          register(`${type}_close`, (state) => {
            state.closeNode();
          });
        }
      } else if ('node' in tokenSpec) {
        register(type, (state, tok) => {
          state.addNode(tokenSpec.node(tok, state.activeMarks));
        });
      } else if ('mark' in tokenSpec) {
        if (isNoCloseToken(tokenSpec, type)) {
          register(type, (state, tok) => {
            const marks = tokenSpec.mark(tok);
            for (const mark of marks) state.openMark(mark);
            state.addText(withoutTrailingNewline(tok.content));
            for (const mark of marks) state.closeMark(mark);
          });
        } else {
          // The `_close` token carries no attributes (e.g. `link_close` has
          // no href/title), so re-running `spec.mark(closeToken)` cannot
          // reconstruct what `_open` added — a titled link would leak its
          // `LinkTitle` mark past the close. Instead, remember exactly which
          // marks each `_open` produced and close those. markdown-it
          // guarantees balanced open/close pairs per token type, and the
          // handler map (with this stack) is built fresh for every parse.
          const opened: (readonly Mark[])[] = [];
          register(`${type}_open`, (state, tok) => {
            const marks = tokenSpec.mark(tok);
            opened.push(marks);
            for (const mark of marks) state.openMark(mark);
          });
          register(`${type}_close`, (state) => {
            const marks = opened.pop();
            if (!marks) {
              throw new Error(`Unbalanced \`${type}_close\` token`);
            }
            for (const mark of marks) state.closeMark(mark);
          });
        }
      } else if ('ignore' in tokenSpec) {
        if (isNoCloseToken(tokenSpec, type)) {
          register(type, () => {});
        } else {
          register(`${type}_open`, () => {});
          register(`${type}_close`, () => {});
        }
      }
    }
  }

  handlers.text = (state, tok) => state.addText(tok.content);
  handlers.inline = (state, tok) => state.parseTokens(tok.children ?? []);
  if (!handlers.softbreak) {
    handlers.softbreak = (state) => state.addText(' ');
  }

  return handlers;
}

/**
 * Parses a markdown-it token stream into a Wordgard document, per the given
 * specs. Throws for token types with no registered handler, matching
 * prosemirror-markdown's default (non-lenient) behavior — this is what
 * makes an unsupported construct in a note fail loudly instead of silently
 * dropping content.
 */
export function parseTokens(
  schema: Schema,
  specs: readonly MarkdownSpec[],
  tokens: readonly Token[],
): readonly Node[] {
  const handlers = buildTokenHandlers(specs);
  const state = new MarkdownParseState(schema, handlers);
  state.parseTokens(tokens);
  return state.finish();
}
