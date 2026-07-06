import type { Mark, Node, Plot } from '@bangle.io/wordgard-utils';
import type Token from 'markdown-it/lib/token.mjs';
import type { MarkdownSerializerState } from './state';

/**
 * Reference to whatever a {@link NodeMarkdownSpec} describes: either a
 * parameterized type (`Plot.Type<P>`/`Leaf.Type<P>`) or a singleton tag (a
 * parameter-less `Plot.Tag`/`Leaf`, e.g. `HorizontalRule`). Specs are keyed
 * by this object (never by string name) so the codec never has to guess a
 * schema element's name back from Wordgard; `Node.Type.get` resolves either
 * shape to the same canonical `Node.Type` for map lookups.
 */
export type NodeTypeRef = Node.Type.Ref<unknown>;

/**
 * Mirrors {@link NodeTypeRef} for marks: a `Mark.Type<P>` or a singleton
 * `Mark<null>` (e.g. `Strong`).
 */
export type MarkTypeRef = Mark.Type<unknown> | Mark<unknown>;

/**
 * Describes how one markdown-it token type feeds the parser. This mirrors
 * prosemirror-markdown's `ParseSpec` kinds one-for-one so the port of
 * `MarkdownParseState` (see `src/parser.ts`) can stay a faithful translation:
 *
 * - `block`: token comes in `_open`/`_close` pairs (unless `noCloseToken`)
 *   and wraps a plot. `tag` may be a fixed plot tag/type or a function of
 *   the opening token (e.g. heading level, code fence language).
 * - `node`: token maps to a leaf, or (rarely) more than one sibling node —
 *   the array form lets a single token expand into several document nodes.
 * - `mark`: token wraps its content in one or more marks. The array return
 *   is what lets `link_open` add both `Link` and `LinkTitle` from one token.
 * - `ignore`: token contributes no node/mark of its own (its children, if
 *   any, are still walked) — used for PM-flat-list tokens whose structure
 *   the nested Wordgard list model gets for free from token nesting.
 */
export type TokenParseSpec =
  | {
      readonly block: Plot.Tag | ((token: Token) => Plot.Tag);
      readonly noCloseToken?: boolean;
    }
  | {
      readonly node: (token: Token, marks: Mark.Set) => Node | readonly Node[];
    }
  | {
      readonly mark: (token: Token) => readonly Mark[];
    }
  | {
      readonly ignore: true;
    };

/**
 * Serializer + parser pairing for one Wordgard plot or leaf type. Keyed by
 * the `node` field (a type or singleton tag object, per the plan's "specs
 * are keyed by the type object" rule) so `createMarkdownCodec` can build its
 * serializer dispatch table with `===` identity instead of fragile string
 * names, matching how Wordgard schemas are themselves type-object based.
 */
export interface NodeMarkdownSpec {
  readonly node: NodeTypeRef;
  /** Keyed by markdown-it token type (e.g. `"heading"`, `"fence"`). */
  readonly parse: Readonly<Record<string, TokenParseSpec>>;
  readonly serialize: (
    state: MarkdownSerializerState,
    node: Node,
    parent: Plot,
    index: number,
  ) => void;
}

/**
 * Serializer + parser pairing for one Wordgard mark type. `serialize.open`/
 * `close` may be a fixed delimiter string or computed per-occurrence (e.g.
 * the adaptive inline-code backticks, or the link mark's autolink form) —
 * ported verbatim from prosemirror-markdown's `MarkSerializerSpec`.
 */
export interface MarkMarkdownSpec {
  readonly mark: MarkTypeRef;
  readonly parse: Readonly<Record<string, TokenParseSpec>>;
  readonly serialize: {
    readonly open:
      | string
      | ((
          state: MarkdownSerializerState,
          mark: Mark,
          parent: Plot,
          index: number,
        ) => string);
    readonly close:
      | string
      | ((
          state: MarkdownSerializerState,
          mark: Mark,
          parent: Plot,
          index: number,
        ) => string);
    /**
     * Whether this mark's open/close order relative to other mixable marks
     * may be reordered to match already-open marks (e.g. `**bold _both_**`
     * vs `*a **b***`). See `MarkdownSerializerState.renderInline`.
     */
    readonly mixable?: boolean;
    /**
     * CommonMark forbids whitespace just inside emphasis-like delimiters
     * (`** bold **` is not valid emphasis). When set, leading/trailing
     * whitespace is moved outside the mark's delimiters at serialize time.
     */
    readonly expelEnclosingWhitespace?: boolean;
    /**
     * Set to `false` for marks whose content must not be escaped (inline
     * code): the mark becomes the innermost/highest-precedence mark on the
     * node, and its text is written raw.
     */
    readonly escape?: boolean;
  };
}

/** Either kind of markdown spec, as accepted by `createMarkdownCodec`. */
export type MarkdownSpec = NodeMarkdownSpec | MarkMarkdownSpec;

export function isNodeMarkdownSpec(
  spec: MarkdownSpec,
): spec is NodeMarkdownSpec {
  return 'node' in spec;
}

export function isMarkMarkdownSpec(
  spec: MarkdownSpec,
): spec is MarkMarkdownSpec {
  return 'mark' in spec;
}
