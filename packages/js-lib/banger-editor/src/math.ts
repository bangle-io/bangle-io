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
  NodeSelection,
  Plugin,
  Selection,
  TextSelection,
} from './pm';
import { getNodeType } from './pm-utils';

const INLINE_NAME = 'math_inline';
const DISPLAY_NAME = 'math_display';
const ESCAPED_DOLLAR_NAME = 'math_escaped_dollar';

export type MathConfig = {
  /** Maximum KaTeX dimension in em. */
  maxSize?: number;
  /** Maximum number of KaTeX macro expansions per expression. */
  maxExpand?: number;
};

export type InsertMathOptions = {
  initialText?: string;
};

type RequiredConfig = Required<MathConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  maxSize: 20,
  maxExpand: 1000,
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
  const upstreamDestroy = mathView.destroy.bind(mathView);
  mathView.destroy = () => {
    mathView.dom.removeEventListener('keydown', handleKeyDown, true);
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
    const inlineType = getNodeType(schema, INLINE_NAME);
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
        new InputRule(/\$$/, (state, match, _start, end) => {
          const { $from } = state.selection;
          if (
            $from.parent.type.spec.code ||
            $from.marks().some((mark) => mark.type.spec.code)
          ) {
            return null;
          }
          // Keep text offsets aligned with ProseMirror positions: inline leaf
          // nodes have size one regardless of their leaf text. A newline also
          // prevents a delimiter pair from consuming an intervening atom.
          const textBefore =
            $from.parent.textBetween(0, $from.parentOffset, null, () => '\n') +
            match[0];
          const math = findInlineMathAtEnd(textBefore);
          if (!math) return null;
          const from = $from.start() + math.start;

          return state.tr.replaceWith(
            from,
            end,
            inlineType.create(null, schema.text(math.content)),
          );
        }),
        makeBlockMathInputRule(/^\$\$\s$/, displayType),
      ],
    });
  };
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
        toMarkdown(state, node) {
          state.write(`$${node.textContent}$`);
        },
      },
      [ESCAPED_DOLLAR_NAME]: {
        parseMarkdown: {
          math_escaped_dollar: { node: ESCAPED_DOLLAR_NAME },
        },
        toMarkdown(state) {
          state.write('\\$');
        },
      },
      [DISPLAY_NAME]: {
        parseMarkdown: {
          math_display: { block: DISPLAY_NAME, noCloseToken: true },
        },
        toMarkdown(state, node) {
          state.write('$$\n');
          state.text(node.textContent, false);
          state.write('\n');
          state.write('$$');
          state.closeBlock(node);
        },
      },
    },
  };
}

/** Plain-text clipboard serialization with portable math delimiters. */
export function serializeMathClipboardText(slice: Slice): string {
  let text = '';
  let firstBlock = true;
  const from = 0;
  const to = slice.content.size;

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

function mathClipboardNodeText(node: PMNode): string | null {
  if (node.type.name === INLINE_NAME) {
    return `$${node.textContent}$`;
  }
  if (node.type.name === DISPLAY_NAME) {
    return `$$\n${node.textContent}\n$$`;
  }
  return null;
}
