import { findInlineMathAtEnd, mathTokenizer } from '@bangle.io/markdown-syntax';
import {
  insertMathCmd,
  MathView,
  makeBlockMathInputRule,
  mathPlugin,
  mathSchemaSpec,
  mathSelectPlugin,
  mathBackspaceCmd as upstreamMathBackspaceCmd,
} from '@benrbray/prosemirror-math';
import type { PluginSimple } from 'markdown-it';
import {
  type CollectionType,
  collection,
  keybinding,
  PRIORITY,
  setPluginPriority,
} from './common';
import {
  MATH_DISPLAY_NODE_NAME as DISPLAY_NAME,
  MATH_ESCAPED_DOLLAR_NODE_NAME as ESCAPED_DOLLAR_NAME,
  MATH_INLINE_NODE_NAME as INLINE_NAME,
  mathDisplayToMarkdown,
  mathEscapedDollarToMarkdown,
  mathInlineToMarkdown,
} from './math-markdown';
import type {
  Command,
  NodeSpec,
  NodeViewConstructor,
  PMNode,
  Schema,
  Slice,
} from './pm';
import {
  InputRule,
  inputRules,
  Mark,
  NodeSelection,
  Plugin,
  PluginKey,
  Selection,
  TextSelection,
} from './pm';
import { getNodeType } from './pm-utils';

// Tentative TeX must stay raw before every syntax and suggestion transformer.
const RAW_MATH_INPUT_PRIORITY = 150;

export type MathConfig = {
  /** Maximum KaTeX dimension in em. */
  maxSize?: number;
  /** Maximum number of KaTeX macro expansions per expression. */
  maxExpand?: number;
  /** Dollar-prefixed triggers that are owned by another editor extension. */
  reservedDollarTriggers?: readonly string[];
};

export type InsertMathOptions = {
  initialText?: string;
};

type RequiredConfig = Required<MathConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  maxSize: 20,
  maxExpand: 1000,
  reservedDollarTriggers: [],
};

/**
 * Editable inline and display TeX using the upstream nested ProseMirror
 * NodeView, with Bangle-owned Markdown, input, clipboard, and renderer limits.
 */
export function setupMath(userConfig: MathConfig = {}) {
  const config: RequiredConfig = { ...DEFAULT_CONFIG, ...userConfig };
  const nodes = {
    [INLINE_NAME]: mathNodeSpec(INLINE_NAME),
    [DISPLAY_NAME]: mathNodeSpec(DISPLAY_NAME),
    [ESCAPED_DOLLAR_NAME]: escapedDollarNodeSpec(),
  } satisfies Record<string, NodeSpec>;
  const tokenizerPlugins: PluginSimple[] = [mathTokenizer];

  return collection({
    id: 'math',
    nodes,
    plugin: {
      boundedMathViews: boundedMathViews(config),
      mathState: mathPlugin,
      mathSelection: mathSelectPlugin,
      rawInlineInput: rawInlineMathInput(config.reservedDollarTriggers),
      inputRules: mathInputRules(),
      keybindings: keybinding(
        { Backspace: mathBackspaceCmd() },
        'math',
        PRIORITY.high,
      ),
      clipboardText: setPluginPriority(
        new Plugin({
          props: { clipboardTextSerializer: serializeMathClipboardText },
        }),
        PRIORITY.high,
        'math-clipboard-text',
      ),
    },
    command: {
      insertInlineMath: insertMath(INLINE_NAME),
      insertDisplayMath: insertMath(DISPLAY_NAME),
    },
    markdown: markdown(tokenizerPlugins),
  });
}

function mathNodeSpec(
  name: typeof INLINE_NAME | typeof DISPLAY_NAME,
): NodeSpec {
  const upstream = mathSchemaSpec.nodes[name];
  return {
    ...upstream,
    marks: '',
    // Only rehydrate Bangle's own serialized node tags. The upstream aliases
    // for arbitrary MathML/Wikipedia HTML are intentionally out of scope and
    // can substitute fallback source when extraction fails.
    parseDOM: [
      {
        tag: name.replace('_', '-'),
        preserveWhitespace: 'full',
      },
    ],
  };
}

function escapedDollarNodeSpec(): NodeSpec {
  return {
    inline: true,
    group: 'inline',
    atom: true,
    marks: '',
    selectable: false,
    parseDOM: [{ tag: 'span[data-math-escaped-dollar]' }],
    toDOM: () => ['span', { 'data-math-escaped-dollar': '' }, '$'],
    leafText: () => '$',
  };
}

function boundedMathViews(config: RequiredConfig): Plugin {
  const mathPluginKey = mathPlugin.spec.key;
  if (!mathPluginKey) {
    throw new Error('The upstream math plugin must expose its PluginKey');
  }

  const createView =
    (displayMode: boolean): NodeViewConstructor =>
    (node, view, getPos) => {
      const mathView = new MathView(
        node,
        view,
        getPos,
        {
          katexOptions: {
            displayMode,
            globalGroup: true,
            macros: mathPlugin.getState(view.state)?.macros ?? {},
            maxExpand: config.maxExpand,
            maxSize: config.maxSize,
            throwOnError: false,
            trust: false,
          },
        },
        mathPluginKey,
      );
      mathView.dom.dataset.bangleMathView = '';
      installMathViewSafeguards(mathView, view, getPos, displayMode);
      return mathView;
    };

  return setPluginPriority(
    new Plugin({
      props: {
        nodeViews: {
          [INLINE_NAME]: createView(false),
          [DISPLAY_NAME]: createView(true),
        },
      },
    }),
    PRIORITY.high,
    'bounded-math-views',
  );
}

function installMathViewSafeguards(
  mathView: MathView,
  outerView: Parameters<NodeViewConstructor>[1],
  getPos: Parameters<NodeViewConstructor>[2],
  displayMode: boolean,
): void {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (handleCtrlBackspace(event, mathView, outerView, getPos)) return;
    if (!displayMode) return;
    const direction = displayExitDirection(event, mathView.dom);
    if (direction === null) return;

    const nodePos = getPos();
    if (nodePos === undefined) return;
    const currentNode = outerView.state.doc.nodeAt(nodePos);
    if (currentNode?.type.name !== DISPLAY_NAME) return;
    const targetPos = direction < 0 ? nodePos : nodePos + currentNode.nodeSize;
    let tr = outerView.state.tr;
    let selection = Selection.near(tr.doc.resolve(targetPos), direction);
    const isOutsideNode =
      direction < 0
        ? selection.to <= nodePos
        : selection.from >= nodePos + currentNode.nodeSize;
    if (!isOutsideNode || !selection.$from.parent.inlineContent) {
      const $node = tr.doc.resolve(nodePos);
      const insertIndex = $node.index() + (direction > 0 ? 1 : 0);
      const defaultType = $node.parent.contentMatchAt(insertIndex).defaultType;
      const textblock = defaultType?.isTextblock
        ? defaultType.createAndFill()
        : null;
      if (!textblock) return;
      tr = tr.insert(targetPos, textblock);
      selection = TextSelection.create(tr.doc, targetPos + 1);
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    // Move focus before the outer selection change destroys the nested view.
    // This avoids leaving Firefox's IME composition target attached to a
    // detached contenteditable when exiting display math.
    outerView.focus();
    outerView.dispatch(tr.setSelection(selection).scrollIntoView());
    if (/\bFirefox\//u.test(navigator.userAgent)) {
      const focusBridge = document.createElement('button');
      focusBridge.type = 'button';
      focusBridge.tabIndex = -1;
      focusBridge.setAttribute('aria-hidden', 'true');
      focusBridge.style.cssText =
        'position:fixed;inset:0 auto auto 0;width:1px;height:1px;opacity:0;pointer-events:none';
      document.body.append(focusBridge);
      focusBridge.focus();
      focusBridge.remove();
    }
    outerView.focus();
  };
  mathView.dom.addEventListener('keydown', handleKeyDown, true);
  const handlePaste = (event: ClipboardEvent) => {
    const clipboard = event.clipboardData;
    if (!clipboard || !Array.from(clipboard.types).includes('text/plain')) {
      return;
    }
    const source = mathView.dom.querySelector<HTMLElement>(
      '.math-src .ProseMirror',
    );
    const offsets = source ? sourceSelectionOffsets(source) : null;
    const nodePos = getPos();
    if (!offsets || nodePos === undefined) return;
    const currentNode = outerView.state.doc.nodeAt(nodePos);
    if (
      !currentNode?.type.name.startsWith('math_') ||
      offsets.to > currentNode.content.size
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    const text = clipboard.getData('text/plain').replace(/\r\n?/gu, '\n');
    outerView.dispatch(
      outerView.state.tr.insertText(
        text,
        nodePos + 1 + offsets.from,
        nodePos + 1 + offsets.to,
      ),
    );
  };
  mathView.dom.addEventListener('paste', handlePaste, true);
  const upstreamDestroy = mathView.destroy.bind(mathView);
  mathView.destroy = () => {
    mathView.dom.removeEventListener('keydown', handleKeyDown, true);
    mathView.dom.removeEventListener('paste', handlePaste, true);
    upstreamDestroy();
  };
}

function handleCtrlBackspace(
  event: KeyboardEvent,
  mathView: MathView,
  outerView: Parameters<NodeViewConstructor>[1],
  getPos: Parameters<NodeViewConstructor>[2],
): boolean {
  if (
    event.isComposing ||
    event.key !== 'Backspace' ||
    !event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return false;
  }
  const source = mathView.dom.querySelector<HTMLElement>(
    '.math-src .ProseMirror',
  );
  const offsets = source ? sourceSelectionOffsets(source) : null;
  const nodePos = getPos();
  if (!offsets || nodePos === undefined) return false;
  const currentNode = outerView.state.doc.nodeAt(nodePos);
  if (!currentNode?.type.name.startsWith('math_')) return false;

  let { from, to } = offsets;
  if (from === to) {
    const word = /\S+\s*$/u.exec(currentNode.textContent.slice(0, from));
    if (word) from = word.index;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  if (from < to) {
    outerView.dispatch(
      outerView.state.tr.delete(nodePos + 1 + from, nodePos + 1 + to),
    );
  }
  return true;
}

function displayExitDirection(
  event: KeyboardEvent,
  mathDom: HTMLElement,
): -1 | 1 | null {
  if (event.isComposing) return null;
  if (
    event.key === 'Enter' &&
    event.ctrlKey &&
    !event.altKey &&
    !event.metaKey
  ) {
    return 1;
  }
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return null;
  }

  const direction =
    event.key === 'ArrowLeft' || event.key === 'ArrowUp'
      ? -1
      : event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : null;
  if (direction === null) return null;
  const source = mathDom.querySelector<HTMLElement>('.math-src .ProseMirror');
  if (!source) return null;
  const offsets = sourceSelectionOffsets(source);
  if (!offsets || offsets.from !== offsets.to) return null;
  const offset = offsets.from;
  const length = source.textContent?.length ?? 0;
  return direction < 0
    ? offset === 0
      ? -1
      : null
    : offset === length
      ? 1
      : null;
}

function sourceSelectionOffsets(
  source: HTMLElement,
): { from: number; to: number } | null {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount < 1) return null;
  const selected = selection.getRangeAt(0);
  if (
    !source.contains(selected.startContainer) ||
    !source.contains(selected.endContainer)
  ) {
    return null;
  }
  const offsetAt = (container: Node, offset: number) => {
    const range = document.createRange();
    range.selectNodeContents(source);
    range.setEnd(container, offset);
    return range.toString().length;
  };
  return {
    from: offsetAt(selected.startContainer, selected.startOffset),
    to: offsetAt(selected.endContainer, selected.endOffset),
  };
}

function mathInputRules() {
  return ({ schema }: { schema: Schema }) => {
    const displayType = getNodeType(schema, DISPLAY_NAME);
    return inputRules({
      rules: [
        new InputRule(/\\\$$/, (state, _match, start, end) => {
          const { $from } = state.selection;
          if (
            $from.parent.type.spec.code ||
            $from.marks().some((mark) => mark.type.spec.code)
          ) {
            return null;
          }
          return state.tr.replaceWith(
            start,
            end,
            getNodeType(schema, ESCAPED_DOLLAR_NAME).create(),
          );
        }),
        makeBlockMathInputRule(/^\$\$\s$/, displayType),
      ],
    });
  };
}

function rawInlineMathInput(reservedDollarTriggers: readonly string[]) {
  return ({ schema }: { schema: Schema }) => {
    type ActiveTentativeMath = { from: number; to: number };
    const key = new PluginKey<ActiveTentativeMath | null>(
      'raw-inline-math-input',
    );

    return setPluginPriority(
      new Plugin({
        key,
        state: {
          init: (): ActiveTentativeMath | null => null,
          apply(tr, active) {
            const next = tr.getMeta(key) as
              | ActiveTentativeMath
              | null
              | undefined;
            if (next !== undefined) return next;
            return tr.docChanged || tr.selectionSet ? null : active;
          },
        },
        props: {
          handleTextInput(view, from, to, text) {
            const $from = view.state.doc.resolve(from);
            const $to = view.state.doc.resolve(to);
            if (
              !$from.sameParent($to) ||
              !$from.parent.inlineContent ||
              $from.parent.type.spec.code ||
              $from.marks().some((mark) => mark.type.spec.code)
            ) {
              return false;
            }

            const previous = from === to ? $from.nodeBefore : null;
            const insertionMarks = view.state.storedMarks ?? $from.marks();
            const sameMarks = previous
              ? Mark.sameSet(previous.marks, insertionMarks)
              : false;
            if (
              previous?.type.name === INLINE_NAME &&
              sameMarks &&
              /^(?:\$|[0-9])/u.test(text)
            ) {
              // A following digit cannot legally follow an inline closing
              // delimiter, and another dollar would make the boundary `$$`.
              // Restore raw source before the stored Markdown becomes
              // structurally different from what the user typed.
              view.dispatch(
                view.state.tr.replaceWith(
                  from - previous.nodeSize,
                  to,
                  schema.text(
                    `$${previous.textContent}$${text}`,
                    previous.marks,
                  ),
                ),
              );
              return true;
            }

            // Existing inline nodes are hard math boundaries. The flattened
            // prefix preserves their full ProseMirror size so a source offset
            // always maps back to the same document offset.
            const sourceBefore = inlineInputSource(
              $from.parent,
              $from.parentOffset,
            );
            if (!sourceBefore.includes('$') && !text.includes('$')) {
              return false;
            }
            const pendingBefore = findTentativeInlineMath(sourceBefore);
            const sourceAfter = sourceBefore + text;
            if (
              reservedDollarTriggers.some((trigger) =>
                sourceAfter.endsWith(trigger),
              )
            ) {
              // Let the registered suggestion extension consume its complete
              // trigger. Math still owns the prefix, so no syntax transformer
              // can rewrite it while the trigger is being typed.
              return false;
            }
            const completed = findInlineMathAtEnd(sourceAfter);
            const pendingAfter = findTentativeInlineMath(sourceAfter);
            if (!pendingBefore && !completed && !pendingAfter) {
              return false;
            }

            const active = key.getState(view.state);
            const pendingStart = pendingBefore
              ? $from.start() + pendingBefore.start
              : null;
            const ownsPending =
              pendingStart !== null &&
              active?.from === pendingStart &&
              active.to === from;
            if (pendingBefore && !completed && !ownsPending) {
              // Only the typing session that began the unfinished expression
              // may suppress other input rules. Clicking after pre-existing
              // `$word` prose must leave suggestions and formatting active.
              return false;
            }

            let tr = view.state.tr.insertText(text, from, to);
            if (completed) {
              const node = getNodeType(schema, INLINE_NAME).create(
                null,
                schema.text(completed.content),
              );
              tr = tr.replaceWith(
                $from.start() + completed.start,
                from + text.length,
                node,
              );
            }
            const nextActive = pendingAfter
              ? {
                  from: $from.start() + pendingAfter.start,
                  to: from + text.length,
                }
              : null;
            view.dispatch(tr.setMeta(key, nextActive));
            return true;
          },
        },
      }),
      RAW_MATH_INPUT_PRIORITY,
      'raw-inline-math-input',
    );
  };
}

function findTentativeInlineMath(source: string) {
  const probe = findInlineMathAtEnd(`${source}x$`);
  if (!probe?.content.endsWith('x')) return null;
  const typedContent = probe.content.slice(0, -1);
  // An unmatched dollar followed by a digit is much more likely to be
  // currency than unfinished TeX. Do not claim the rest of the paragraph;
  // a complete `$5$` still converts when its real closer is typed.
  const first = typedContent[0];
  return first !== undefined && isAsciiDigit(first) ? null : probe;
}

function isAsciiDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

function inlineInputSource(parent: PMNode, end: number): string {
  let source = '';
  parent.forEach((node, offset) => {
    if (offset >= end) return;
    const length = Math.min(node.nodeSize, end - offset);
    source += node.isText
      ? (node.text?.slice(0, length) ?? '')
      : '\n'.repeat(length);
  });
  return source;
}

function insertMath(name: typeof INLINE_NAME | typeof DISPLAY_NAME) {
  return ({ initialText = '' }: InsertMathOptions = {}): Command =>
    (state, dispatch, view) => {
      const type = getNodeType(state.schema, name);
      const { $from } = state.selection;
      if (
        name === DISPLAY_NAME &&
        state.selection.empty &&
        $from.parent.isTextblock &&
        $from.parent.content.size === 0 &&
        $from.depth >= 1
      ) {
        const parentDepth = $from.depth - 1;
        const index = $from.index(parentDepth);
        if ($from.node(parentDepth).canReplaceWith(index, index + 1, type)) {
          if (dispatch) {
            const nodePos = $from.before($from.depth);
            const content = initialText
              ? state.schema.text(initialText)
              : undefined;
            const tr = state.tr.replaceWith(
              nodePos,
              nodePos + $from.parent.nodeSize,
              type.create(null, content),
            );
            dispatch(
              tr
                .setSelection(NodeSelection.create(tr.doc, nodePos))
                .scrollIntoView(),
            );
          }
          return true;
        }
      }
      return insertMathCmd(type, initialText)(state, dispatch, view);
    };
}

function mathBackspaceCmd(): Command {
  return (state, dispatch, view) => {
    if (upstreamMathBackspaceCmd(state, dispatch, view)) {
      return true;
    }

    const { $from } = state.selection;
    if (!state.selection.empty || $from.parentOffset !== 0 || $from.depth < 1) {
      return false;
    }
    const siblingDepth = $from.depth - 1;
    const siblingIndex = $from.index(siblingDepth);
    if (siblingIndex < 1) return false;
    const previous = $from.node(siblingDepth).child(siblingIndex - 1);
    if (previous.type !== getNodeType(state.schema, DISPLAY_NAME)) {
      return false;
    }

    if (dispatch) {
      const currentNodePos = $from.before($from.depth);
      dispatch(
        state.tr.setSelection(
          NodeSelection.create(state.doc, currentNodePos - previous.nodeSize),
        ),
      );
    }
    return true;
  };
}

function markdown(
  tokenizerPlugins: PluginSimple[],
): CollectionType['markdown'] {
  return {
    tokenizerPlugins,
    nodes: {
      [INLINE_NAME]: {
        // `block` is the prosemirror-markdown parse spec that creates a node
        // containing token.content; `node` would create an empty leaf node.
        parseMarkdown: {
          math_inline: { block: INLINE_NAME, noCloseToken: true },
        },
        toMarkdown: mathInlineToMarkdown,
      },
      [ESCAPED_DOLLAR_NAME]: {
        parseMarkdown: {
          math_escaped_dollar: { node: ESCAPED_DOLLAR_NAME },
        },
        toMarkdown: mathEscapedDollarToMarkdown,
      },
      [DISPLAY_NAME]: {
        parseMarkdown: {
          math_display: { block: DISPLAY_NAME, noCloseToken: true },
        },
        toMarkdown: mathDisplayToMarkdown,
      },
    },
  };
}

/** Plain-text clipboard serialization with portable math delimiters. */
export function serializeMathClipboardText(slice: Slice): string {
  const from = 0;
  const to = slice.content.size;
  if (!sliceContainsMath(slice)) {
    return slice.content.textBetween(from, to, '\n\n');
  }

  let text = '';
  let firstBlock = true;

  slice.content.nodesBetween(from, to, (node, pos) => {
    const mathText = mathClipboardNodeText(node);
    const nodeText =
      mathText ??
      (node.isText
        ? (node.text?.slice(Math.max(from, pos) - pos, to - pos) ?? '')
        : node.isLeaf
          ? (node.type.spec.leafText?.(node) ?? '')
          : '');

    if (node.isBlock && (node.isTextblock || node.type.name === DISPLAY_NAME)) {
      if (firstBlock) firstBlock = false;
      else text += '\n\n';
    }
    text += nodeText;
    return mathText === null;
  });
  return text;
}

function sliceContainsMath(slice: Slice): boolean {
  let containsMath = false;
  slice.content.nodesBetween(0, slice.content.size, (node) => {
    if (node.type.name === INLINE_NAME || node.type.name === DISPLAY_NAME) {
      containsMath = true;
    }
    return !containsMath;
  });
  return containsMath;
}

function mathClipboardNodeText(node: PMNode): string | null {
  if (node.type.name === INLINE_NAME) {
    return `$${node.textContent}$`;
  }
  if (node.type.name === DISPLAY_NAME) {
    return `$$\n${node.textContent}\n$$`;
  }
  return null;
}
