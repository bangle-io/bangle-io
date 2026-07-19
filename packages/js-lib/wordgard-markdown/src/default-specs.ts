// Portions adapted from prosemirror-markdown (MIT © Marijn Haverbeke).
// The per-construct string conventions below (heading `#` prefixes, fence
// backtick-length adaptation, hard-break lookahead, list indentation, the
// autolink heuristic, adaptive inline-code backticks, ...) are ported from
// `@bangle.io/banger-editor`'s ProseMirror markdown specs (which themselves
// port prosemirror-markdown), onto Wordgard's plot/leaf/mark model. Byte
// parity with the ProseMirror engine's output is the whole point of this
// file — see the package-level round-trip corpus.
import {
  escapeMarkdownLineStart,
  listItemCanRenderTight,
  readListTokenMetadata,
  resolveListRunTightness,
  serializeWikiLinkAttrs,
  type TightListItemBlockKind,
  type WikiLinkAttrs,
} from '@bangle.io/markdown-syntax';
import {
  Blockquote,
  BulletList,
  Code,
  CodeBlock,
  CodeBlockLanguage,
  Emphasis,
  Frontmatter,
  Heading,
  HorizontalRule,
  Image,
  ImageAlt,
  ImageTitle,
  Leaf,
  LineBreak,
  Link,
  LinkTitle,
  ListItem,
  ListTight,
  type Mark,
  type Node,
  OrderedList,
  Paragraph,
  type Plot,
  Strikethrough,
  Strong,
  TaskItem,
  WikiLink,
  WikiLinkLabel,
} from '@bangle.io/wordgard-utils';
import type Token from 'markdown-it/lib/token.mjs';
import type { MarkdownSpec, MarkMarkdownSpec, NodeMarkdownSpec } from './spec';
import type { MarkdownSerializerState } from './state';

/**
 * Quote helper for link/image titles, matching `banger-editor`'s local
 * `quote()` (deliberately not prosemirror-markdown's `""`/`''`/`()`
 * fallback chain) — this is the byte-parity target since the ProseMirror
 * engine's own markdown specs define and use this exact function for
 * titles.
 */
function quote(str: string): string {
  const wrap = str.includes('"') ? "'" : '"';
  return wrap + str + wrap;
}

// ---------------------------------------------------------------------------
// Paragraph
// ---------------------------------------------------------------------------

const paragraphSpec: NodeMarkdownSpec = {
  node: Paragraph,
  parse: {
    paragraph: { block: Paragraph },
  },
  serialize(state, node) {
    assertPlot(node, 'paragraph');
    // Inline state tracks block starts, but not new lines after a hard break.
    // Infer the latter from output so typed block syntax stays literal.
    const originalEsc = state.esc;
    state.esc = (text, startOfLine = false) => {
      const atLineStart = startOfLine || state.out.endsWith(`\n${state.delim}`);
      const escaped = originalEsc.call(state, text, atLineStart);
      return atLineStart ? escapeMarkdownLineStart(escaped) : escaped;
    };
    try {
      state.renderInline(node);
    } finally {
      state.esc = originalEsc;
    }
    state.closeBlock(node);
  },
};

// ---------------------------------------------------------------------------
// Heading
// ---------------------------------------------------------------------------

function parseHeadingLevel(tok: Token): number {
  const level = Number.parseInt(tok.tag.slice(1), 10);
  return Number.isNaN(level) ? 1 : level;
}

const headingSpec: NodeMarkdownSpec = {
  node: Heading,
  parse: {
    heading: { block: (tok) => Heading.of(parseHeadingLevel(tok)) },
  },
  serialize(state, node) {
    assertPlot(node, 'heading');
    const level = node.tag.is(Heading) ? node.tag.param : 1;
    state.write(`${state.repeat('#', level)} `);
    // banger-editor's heading calls `renderInline(node)` with the default
    // `fromBlockStart = true`, so start-of-line constructs at the head of a
    // heading's text get escaped (`## 1\. x`) — byte parity requires the
    // same here, even though prosemirror-markdown's own heading passes
    // `false`.
    state.renderInline(node);
    state.closeBlock(node);
  },
};

// ---------------------------------------------------------------------------
// Blockquote
// ---------------------------------------------------------------------------

const blockquoteSpec: NodeMarkdownSpec = {
  node: Blockquote,
  parse: {
    blockquote: { block: Blockquote },
  },
  serialize(state, node) {
    assertPlot(node, 'blockquote');
    state.wrapBlock('> ', null, node, () => state.renderContent(node));
  },
};

// ---------------------------------------------------------------------------
// Horizontal rule
// ---------------------------------------------------------------------------

const horizontalRuleSpec: NodeMarkdownSpec = {
  node: HorizontalRule,
  parse: {
    hr: { node: () => HorizontalRule },
  },
  serialize(state, node, parent, index) {
    // A `---` on the first line of a document is a frontmatter fence, so a
    // doc-leading rule must use a different thematic-break marker to
    // survive a parse round trip — mirroring the ProseMirror engine's
    // horizontal-rule serializer byte for byte.
    const isDocStart = parent.isDoc && index === 0;
    state.write(isDocStart ? '***' : '---');
    state.closeBlock(node);
  },
};

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

const frontmatterSpec: NodeMarkdownSpec = {
  node: Frontmatter,
  parse: {
    frontmatter: { block: Frontmatter, noCloseToken: true },
  },
  serialize(state, node) {
    assertPlot(node, 'frontmatter');
    const text = node.textContent();
    state.write('---\n');
    if (text) {
      state.write(text);
      state.write('\n');
    }
    state.write('---');
    state.closeBlock(node);
  },
};

// ---------------------------------------------------------------------------
// Hard break
// ---------------------------------------------------------------------------

const hardBreakSpec: NodeMarkdownSpec = {
  node: LineBreak,
  parse: {
    hardbreak: { node: (_tok, marks) => LineBreak.withMarks(marks) },
  },
  serialize(state, node, parent, index) {
    for (let i = index + 1; i < parent.content.length; i++) {
      const sibling = parent.content[i];
      if (!sibling || sibling.tag.type !== node.tag.type) {
        state.write('\\\n');
        return;
      }
    }
  },
};

// ---------------------------------------------------------------------------
// Code block
// ---------------------------------------------------------------------------

function longestFenceMarkerRun(text: string, marker: '`' | '~'): number {
  let longest = 0;
  let current = 0;
  for (const char of text) {
    if (char === marker) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function createCodeFence(text: string, info: string): string {
  const marker = info.includes('`') ? '~' : '`';
  const longestRun = longestFenceMarkerRun(text, marker);
  return marker.repeat(Math.max(3, longestRun + 1));
}

const codeBlockSpec: NodeMarkdownSpec = {
  node: CodeBlock,
  parse: {
    code_block: {
      block: () => CodeBlock,
      noCloseToken: true,
    },
    fence: {
      block: (tok) => {
        const language = tok.info || '';
        return language
          ? CodeBlock.withMarks([CodeBlockLanguage.of(language)])
          : CodeBlock;
      },
      noCloseToken: true,
    },
  },
  serialize(state, node) {
    assertPlot(node, 'code_block');
    const language = node.mark(CodeBlockLanguage) ?? '';
    const text = node.textContent();
    const fence = createCodeFence(text, language);
    state.write(`${fence}${language}\n`);
    // `text`, not `write`: multi-line content must re-apply the block
    // delimiter (`> `, list indentation) at every line, which `write` only
    // does for the first line.
    state.text(text, false);
    // Unconditional (not `ensureNewLine`) to stay byte-identical to the
    // ProseMirror engine: content ending in a newline holds a trailing
    // blank code line, and `ensureNewLine` would swallow it.
    if (text) {
      state.write('\n');
    }
    state.write(fence);
    state.closeBlock(node);
  },
};

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

/**
 * The full alt text of an `image` token. markdown-it splits the alt into
 * multiple child tokens when it contains escapes (`![a\]b](x)` becomes
 * `text "a"`, `text_special "]"`, `text "b"`) or inline markup, so joining
 * every child's content is required for fidelity. (prosemirror-markdown
 * reads only `children[0].content` and silently truncates such alt text.)
 */
function imageAlt(tok: Token): string {
  return (tok.children ?? []).map((child) => child.content).join('');
}

const imageSpec: NodeMarkdownSpec = {
  node: Image,
  parse: {
    image: {
      // Merge `ImageAlt`/`ImageTitle` (attribute marks private to this
      // leaf) into the currently-active spanning marks, rather than
      // replacing them — an image typed inside `**bold**` must stay bold.
      node: (tok, marks) => {
        const src = tok.attrGet('src') ?? '';
        const title = tok.attrGet('title');
        const alt = imageAlt(tok);
        let withAttrs = marks;
        if (alt) withAttrs = ImageAlt.of(alt).addToSet(withAttrs);
        if (title) withAttrs = ImageTitle.of(title).addToSet(withAttrs);
        return Image.of(src, withAttrs);
      },
    },
  },
  serialize(state, node) {
    assertLeaf(node, 'image');
    if (!node.is(Image)) throw new Error('Expected an `image` leaf');
    const alt = node.mark(ImageAlt) ?? '';
    const title = node.mark(ImageTitle);
    const text = state.esc(alt);
    const url = state.esc(node.param) + (title ? ` ${quote(title)}` : '');
    state.write(`![${text}](${url})`);
  },
};

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const textSpec: NodeMarkdownSpec = {
  node: Leaf.Text,
  parse: {
    // `text` and `inline` are handled directly by the parser (`parser.ts`),
    // not through a spec — a text leaf never arrives via its own markdown-it
    // token type the way block/mark specs do.
  },
  serialize(state, node) {
    assertLeaf(node, 'text');
    if (typeof node.param !== 'string') throw new Error('Expected a text leaf');
    // Inside an autolink the URL is written raw — see
    // `MarkdownSerializerState.inAutolink`.
    state.text(node.param, !state.inAutolink);
  },
};

// ---------------------------------------------------------------------------
// Lists — Wordgard keeps its built-in nested list model. The wrapper owns the
// bullet/ordered marker and list tightness; TaskItem owns only checked state.
// ---------------------------------------------------------------------------

function listItemMarker(node: Plot, parentIsOrdered: boolean): string {
  const container = parentIsOrdered ? '1.' : '-';
  if (!node.tag.is(TaskItem)) return container;
  return `${container} [${node.tag.param ? 'x' : ' '}]`;
}

function serializeListItem(
  state: MarkdownSerializerState,
  node: Plot,
  marker: string,
  continuationWidth: number,
): void {
  const firstDelim = `${marker} `;
  const continuationDelim = ' '.repeat(continuationWidth);
  state.wrapBlock(continuationDelim, firstDelim, node, () => {
    const firstIndex = firstRenderedListItemChild(node);
    const first = node.content[firstIndex];
    const firstKind = first ? wordgardListItemBlockKind(first) : null;
    const taskStartsWithBlock =
      node.tag.is(TaskItem) && firstKind !== null && firstKind !== 'paragraph';
    if (taskStartsWithBlock) {
      state.closeBlock(node);
      state.flushClose(state.inTightList ? 1 : 2);
    } else if (
      (first?.isPlot &&
        (first.tag.is(BulletList.type) || first.tag.is(OrderedList))) ||
      firstKind === 'thematic-break'
    ) {
      state.ensureNewLine();
    }
    let renderedChildCount = 0;
    for (let i = firstIndex; i < node.content.length; i++) {
      const child = node.content[i];
      if (!child) continue;
      // Nested list serializers own their run's tightness independently.
      if (
        renderedChildCount > 0 &&
        state.inTightList &&
        listContainerKind(child) === null
      ) {
        state.flushClose(1);
      }
      state.render(child, node, i);
      renderedChildCount++;
    }
  });
}

function firstRenderedListItemChild(node: Plot): number {
  if (node.tag.is(TaskItem)) return 0;
  let index = 0;
  while (index < node.content.length - 1) {
    const child = node.content[index];
    if (
      !child?.isPlot ||
      !child.tag.is(Paragraph.type) ||
      child.content.length > 0
    ) {
      break;
    }
    index++;
  }
  return index;
}

function listIsTight(node: Plot): boolean {
  return node.mark(ListTight) ?? true;
}

const LIST_TIGHTNESS_CACHE = Symbol('listTightnessCache');

type ListMarkdownSerializerState = MarkdownSerializerState & {
  [LIST_TIGHTNESS_CACHE]?: WeakMap<Plot, readonly boolean[]>;
};

type ListContainerKind = 'bullet' | 'ordered';

function listContainerKind(node: Node | undefined): ListContainerKind | null {
  if (!node?.isPlot) return null;
  if (node.tag.is(OrderedList)) return 'ordered';
  return node.tag.is(BulletList.type) ? 'bullet' : null;
}

function listTightnessByChild(parent: Plot): readonly boolean[] {
  return resolveListRunTightness(
    parent.content.map((node) => {
      const kind = listContainerKind(node);
      return kind && node?.isPlot
        ? {
            kind,
            tight: listIsTight(node) && listCanRenderTight(node),
          }
        : null;
    }),
  );
}

function listCanRenderTight(node: Plot): boolean {
  return node.content.every((item) => {
    if (!item.isPlot) return false;
    const blocks = item.content
      .slice(firstRenderedListItemChild(item))
      .map(wordgardListItemBlockKind);
    if (item.tag.is(TaskItem) && blocks[0] !== 'paragraph') {
      blocks.unshift('paragraph');
    }
    return listItemCanRenderTight(blocks);
  });
}

function wordgardListItemBlockKind(node: Node): TightListItemBlockKind {
  if (node.is(HorizontalRule.type)) return 'thematic-break';
  if (!node.isPlot) return 'unknown';
  if (node.tag.is(Paragraph.type)) return 'paragraph';
  if (node.tag.is(Blockquote.type)) return 'blockquote';
  if (node.tag.is(BulletList.type) || node.tag.is(OrderedList)) return 'list';
  if (node.tag.is(CodeBlock.type) || node.tag.is(Heading)) {
    return 'self-terminating';
  }
  return 'unknown';
}

function listRunIsTight(
  state: ListMarkdownSerializerState,
  node: Plot,
  parent: Plot,
  index: number,
): boolean {
  let cache = state[LIST_TIGHTNESS_CACHE];
  if (!cache) {
    cache = new WeakMap();
    state[LIST_TIGHTNESS_CACHE] = cache;
  }
  let tightness = cache.get(parent);
  if (!tightness) {
    tightness = listTightnessByChild(parent);
    cache.set(parent, tightness);
  }
  return tightness[index] ?? (listIsTight(node) && listCanRenderTight(node));
}

function serializeList(
  state: MarkdownSerializerState,
  node: Plot,
  parent: Plot,
  index: number,
): void {
  const parentIsOrdered = node.tag.is(OrderedList);
  const kind = parentIsOrdered ? 'ordered' : 'bullet';
  const tight = listRunIsTight(state, node, parent, index);
  const sameList = listContainerKind(parent.content[index - 1]) === kind;
  if ((state.inTightList && !sameList) || (tight && sameList)) {
    state.flushClose(1);
  }
  const previousTight = state.inTightList;
  state.inTightList = tight;
  for (let i = 0; i < node.content.length; i++) {
    const child = node.content[i];
    if (!child?.isPlot) continue;
    if (i > 0 && tight) state.flushClose(1);
    serializeListItem(
      state,
      child,
      listItemMarker(child, parentIsOrdered),
      parentIsOrdered ? 3 : 2,
    );
  }
  state.inTightList = previousTight;
}

function listTagMarks(tok: Token): Mark.Set {
  return readListTokenMetadata(tok).tight ? [] : [ListTight.of(false)];
}

const bulletListSpec: NodeMarkdownSpec = {
  node: BulletList,
  parse: {
    bullet_list: {
      block: (tok) => BulletList.withMarks(listTagMarks(tok)),
    },
  },
  serialize(state, node, parent, index) {
    assertPlot(node, 'bullet_list');
    serializeList(state, node, parent, index);
  },
};

const orderedListSpec: NodeMarkdownSpec = {
  node: OrderedList,
  parse: {
    ordered_list: {
      block: (tok) => OrderedList.of(1, listTagMarks(tok)),
    },
  },
  serialize(state, node, parent, index) {
    assertPlot(node, 'ordered_list');
    serializeList(state, node, parent, index);
  },
};

const listItemSpec: NodeMarkdownSpec = {
  node: ListItem,
  parse: {
    list_item: {
      block: (tok) => {
        const { taskChecked } = readListTokenMetadata(tok);
        if (taskChecked !== null) {
          return TaskItem.of(taskChecked);
        }
        return ListItem;
      },
    },
  },
  serialize() {
    // Never reached directly: `serializeList`/`serializeListItem` render
    // list items as part of their parent list's own serializer, the same
    // way `renderList`'s per-item callback owns rendering in PM. The spec
    // still needs to exist so `TaskItem`/`ListItem` have a registered
    // Markdown identity (e.g. for schema completeness checks).
    throw new Error(
      'list_item should be serialized by its parent list, not directly',
    );
  },
};

const taskItemSpec: NodeMarkdownSpec = {
  node: TaskItem,
  parse: {},
  serialize: listItemSpec.serialize,
};

// ---------------------------------------------------------------------------
// Marks: bold / italic / strike / code
// ---------------------------------------------------------------------------

const strongSpec: MarkMarkdownSpec = {
  mark: Strong,
  parse: {
    strong: { mark: () => [Strong] },
  },
  serialize: {
    open: '**',
    close: '**',
    mixable: true,
    expelEnclosingWhitespace: true,
  },
};

const emphasisSpec: MarkMarkdownSpec = {
  mark: Emphasis,
  parse: {
    em: { mark: () => [Emphasis] },
  },
  serialize: {
    open: '_',
    close: '_',
    mixable: true,
    expelEnclosingWhitespace: true,
  },
};

const strikethroughSpec: MarkMarkdownSpec = {
  mark: Strikethrough,
  parse: {
    s: { mark: () => [Strikethrough] },
  },
  serialize: {
    open: '~~',
    close: '~~',
    mixable: true,
    expelEnclosingWhitespace: true,
  },
};

function backticksFor(node: Node | undefined, side: number): string {
  const param = node?.isLeaf ? node.param : undefined;
  const text = typeof param === 'string' ? param : '';
  const ticks = /`+/g;
  let len = 0;
  let m: RegExpExecArray | null = ticks.exec(text);
  while (m) {
    len = Math.max(len, m[0].length);
    m = ticks.exec(text);
  }
  let result = len > 0 && side > 0 ? ' `' : '`';
  for (let i = 0; i < len; i++) result += '`';
  if (len > 0 && side < 0) result += ' ';
  return result;
}

const codeSpec: MarkMarkdownSpec = {
  mark: Code,
  parse: {
    code_inline: { mark: () => [Code], noCloseToken: true },
  },
  serialize: {
    open: (_state, _mark, parent, index) =>
      backticksFor(parent.content[index], -1),
    close: (_state, _mark, parent, index) =>
      backticksFor(parent.content[index - 1], 1),
    escape: false,
  },
};

// ---------------------------------------------------------------------------
// Link
// ---------------------------------------------------------------------------

/**
 * Mirrors `link/link.ts`'s `isPlainURL(link, parent, index, side)`: a link
 * mark serializes to the `<href>` autolink form only when it has no title,
 * its href looks like a URL, and it exactly and solely covers one
 * plain-text run adjacent to `index` on the given side.
 *
 * "Solely covers" is the innermost check: the link must be the innermost
 * mark rendered around the text, otherwise another mark's delimiters would
 * end up inside the `<...>`. The ProseMirror engine checks
 * `content.marks[last] === link` (its schema ranks link innermost); the
 * equivalent here is the last entry of the state's serialization-ordered
 * spanning marks, since Wordgard's own mark-set order differs from the
 * order marks are rendered in.
 */
function isPlainUrl(
  state: MarkdownSerializerState,
  link: Mark,
  parent: Plot,
  index: number,
  side: number,
): boolean {
  const href = typeof link.value === 'string' ? link.value : '';
  const title = titleOnNode(parent.content[index + (side < 0 ? -1 : 0)]);
  if (title || !/^\w+:/.test(href)) return false;

  const contentIndex = index + (side < 0 ? -1 : 0);
  const nextIndex = index + (side < 0 ? -2 : 1);
  if (contentIndex < 0 || contentIndex >= parent.content.length) return false;
  const content = parent.content[contentIndex];
  if (
    !content ||
    !content.isLeaf ||
    !content.isText ||
    content.param !== href
  ) {
    return false;
  }
  const renderedMarks = state.serializationMarks(content);
  const innermost = renderedMarks[renderedMarks.length - 1];
  if (!innermost?.eq(link)) return false;
  if (index === (side < 0 ? 1 : parent.content.length - 1)) return true;

  if (nextIndex < 0 || nextIndex >= parent.content.length) return false;
  const next = parent.content[nextIndex];
  return !next?.marks.some((m) => m.eq(link));
}

function titleOnNode(node: Node | undefined): string | undefined {
  return node?.mark(LinkTitle);
}

const linkSpec: MarkMarkdownSpec = {
  mark: Link,
  parse: {
    link: {
      mark: (tok) => {
        const href = tok.attrGet('href') ?? '';
        const title = tok.attrGet('title');
        return [Link.of(href), ...(title ? [LinkTitle.of(title)] : [])];
      },
    },
  },
  serialize: {
    open: (state, mark, parent, index) => {
      state.inAutolink = isPlainUrl(state, mark, parent, index, 1);
      return state.inAutolink ? '<' : '[';
    },
    close: (state, mark, parent, index) => {
      state.inAutolink = undefined;
      if (isPlainUrl(state, mark, parent, index, -1)) return '>';
      const href = typeof mark.value === 'string' ? mark.value : '';
      const title = titleOnNode(parent.content[index - 1]);
      const titleAttr = title ? ` ${quote(title)}` : '';
      return `](${state.esc(href)}${titleAttr})`;
    },
    // Without `mixable`, a mark that opens inside a link
    // (`[link _foo **bar**_](x)`) forces the serializer to close and reopen
    // the link around it, splitting one link into several — output that is
    // not even a fixed point of the round trip. The ProseMirror engine's
    // link mark is mixable for the same reason (see banger-editor's
    // `link/link.ts`); every shared golden-corpus fixture serializes
    // byte-identically in both engines.
    mixable: true,
  },
};

// ---------------------------------------------------------------------------
// Wiki link
// ---------------------------------------------------------------------------

function asWikiLinkAttrs(meta: unknown): WikiLinkAttrs | null {
  if (
    typeof meta === 'object' &&
    meta !== null &&
    'target' in meta &&
    typeof (meta as { target: unknown }).target === 'string'
  ) {
    const label = (meta as { label?: unknown }).label;
    return {
      target: (meta as { target: string }).target,
      label: typeof label === 'string' ? label : null,
    };
  }
  return null;
}

function wikiLinkText(attrs: WikiLinkAttrs): string {
  return serializeWikiLinkAttrs(attrs) ?? attrs.label ?? attrs.target;
}

const wikiLinkSpec: NodeMarkdownSpec = {
  node: WikiLink,
  parse: {
    wiki_link: {
      // `marks` carries the currently-active spanning marks (e.g. a `[[..]]`
      // typed inside `**bold**`) — merge in `WikiLinkLabel`, an attribute
      // mark private to this leaf, rather than replacing them.
      node: (tok, marks) => {
        const attrs = asWikiLinkAttrs(tok.meta);
        if (!attrs) {
          throw new Error('wiki_link token missing valid WikiLinkAttrs meta');
        }
        const withLabel =
          attrs.label !== null
            ? WikiLinkLabel.of(attrs.label).addToSet(marks)
            : marks;
        return WikiLink.of(attrs.target, withLabel);
      },
    },
  },
  serialize(state, node) {
    assertLeaf(node, 'wiki_link');
    if (!node.is(WikiLink)) throw new Error('Expected a `wiki_link` leaf');
    const label = node.mark(WikiLinkLabel) ?? null;
    const attrs: WikiLinkAttrs = { target: node.param, label };
    state.text(wikiLinkText(attrs), false);
  },
};

// ---------------------------------------------------------------------------

function assertPlot(node: Node, name: string): asserts node is Plot {
  if (!node.isPlot) throw new Error(`Expected a plot for \`${name}\``);
}

function assertLeaf(node: Node, name: string): asserts node is Leaf {
  if (!node.isLeaf) throw new Error(`Expected a leaf for \`${name}\``);
}

// The relative order of MARK specs is load-bearing: it defines the
// serialization nesting order for overlapping marks (outermost first — see
// `MarkdownSerializerState.serializationMarks`). This order matches the
// ProseMirror engine's schema mark order (bold, strike, italic, link), so
// both engines emit the same bytes for text carrying several marks, with
// `Code` last because a non-escaping mark must always be innermost.
export const defaultMarkdownSpecs: readonly MarkdownSpec[] = [
  paragraphSpec,
  headingSpec,
  blockquoteSpec,
  horizontalRuleSpec,
  frontmatterSpec,
  hardBreakSpec,
  codeBlockSpec,
  imageSpec,
  textSpec,
  bulletListSpec,
  orderedListSpec,
  listItemSpec,
  taskItemSpec,
  wikiLinkSpec,
  strongSpec,
  strikethroughSpec,
  emphasisSpec,
  linkSpec,
  codeSpec,
];
