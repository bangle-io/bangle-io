import { readListTokenMetadata } from '@bangle.io/markdown-syntax';
import type { MarkdownSerializerState } from 'prosemirror-markdown';
import {
  type CollectionType,
  collection,
  keybinding,
  PRIORITY,
  setPriority,
} from './common';
import type {
  Command,
  DOMOutputSpec,
  EditorState,
  NodeSpec,
  PMNode,
} from './pm';
import {
  backspaceCommand,
  createDedentListCommand,
  createIndentListCommand,
  createListEventPlugin,
  createListRenderingPlugin,
  createListSpec,
  createMoveListCommand,
  createSafariInputMethodWorkaroundPlugin,
  createToggleListCommand,
  createUnwrapListCommand,
  DOMSerializer,
  defaultAttributesGetter,
  deleteCommand,
  enterCommand,
  inputRules,
  isListNode,
  isListType,
  type ListAttributes,
  ListDOMSerializer,
  type ListKind,
  listToDOM,
  Plugin,
  type Schema,
  unwrapListSlice,
  wrappingListInputRule,
} from './pm';
import { findParentNode, getNodeType, type PluginContext } from './pm-utils';

const LIST_KIND = {
  BULLET: 'bullet',
  ORDERED: 'ordered',
  TASK: 'task',
  TOGGLE: 'toggle',
} as const satisfies Record<string, ListKind>;

// Export the type for external use
export type ListKindType = (typeof LIST_KIND)[keyof typeof LIST_KIND];

type MarkdownListKind = 'bullet' | 'ordered';
type MarkdownListAttrs = ListAttributes & {
  kind: ListKindType;
  listKind: MarkdownListKind;
  tight: boolean;
};

type ListMarkdownSerializerState = MarkdownSerializerState & {
  [LIST_TIGHTNESS_CACHE]?: WeakMap<PMNode, readonly boolean[]>;
  flushClose(size?: number): void;
  inTightList: boolean;
};

const LIST_TIGHTNESS_CACHE = Symbol('listTightnessCache');

function isListMarkdownSerializerState(
  state: MarkdownSerializerState,
): state is ListMarkdownSerializerState {
  return (
    'inTightList' in state &&
    typeof state.inTightList === 'boolean' &&
    'flushClose' in state &&
    typeof state.flushClose === 'function'
  );
}

/**
 * Helper to read typed list attributes from a node
 * Returns null if the node is not a list node
 */
function readListAttrs(node?: PMNode): MarkdownListAttrs | null {
  if (!node || !isListNode(node)) {
    return null;
  }
  const { kind, checked, collapsed, order, listKind, tight } = node.attrs;
  return {
    kind,
    listKind:
      listKind === LIST_KIND.ORDERED || kind === LIST_KIND.ORDERED
        ? LIST_KIND.ORDERED
        : LIST_KIND.BULLET,
    tight: tight !== false,
    ...(kind === LIST_KIND.TASK ? { checked } : {}),
    ...(kind === LIST_KIND.TOGGLE ? { collapsed } : {}),
    ...(kind === LIST_KIND.ORDERED ? { order } : {}),
  };
}

function markdownListDomAttributes(
  node: PMNode,
): Record<string, string | undefined> {
  const attrs = readListAttrs(node);
  return {
    ...defaultAttributesGetter(node),
    'data-list-container-kind': attrs?.listKind,
    'data-list-tight': String(attrs?.tight ?? true),
  };
}

function markdownListToDOM(node: PMNode, nativeList = false): DOMOutputSpec {
  const output = listToDOM({
    node,
    nativeList,
    getAttributes: markdownListDomAttributes,
    ...(nativeList ? { getMarkers: () => null } : {}),
  });
  if (!nativeList) return output;
  if (!Array.isArray(output)) {
    throw new Error('Unexpected flat-list clipboard DOM output');
  }
  const attrs = readListAttrs(node);
  return [
    attrs?.listKind === LIST_KIND.ORDERED ? 'ol' : 'ul',
    ...output.slice(1),
  ];
}

function createMarkdownListSpec(): NodeSpec {
  const spec = createListSpec();
  return {
    ...spec,
    attrs: {
      ...spec.attrs,
      listKind: { default: null },
      tight: { default: true },
    },
    toDOM: markdownListToDOM,
    parseDOM: spec.parseDOM?.map((rule) => ({
      ...rule,
      getAttrs: (dom) => {
        const attrs = rule.getAttrs?.(dom);
        if (attrs === false) return false;
        if (typeof dom === 'string') return attrs ?? null;
        const kind = dom.getAttribute('data-list-container-kind');
        const itemKind = dom.getAttribute('data-list-kind');
        return {
          ...(attrs ?? {}),
          ...(itemKind === LIST_KIND.TASK
            ? {
                kind: LIST_KIND.TASK,
                checked: dom.hasAttribute('data-list-checked'),
              }
            : {}),
          ...(kind === LIST_KIND.ORDERED || kind === LIST_KIND.BULLET
            ? { listKind: kind }
            : {}),
          tight: dom.getAttribute('data-list-tight') !== 'false',
        };
      },
    })),
  };
}

function createMarkdownListPlugins(
  schema: Schema,
  listNodeName: string,
): Plugin[] {
  const clipboardSerializer = new ListDOMSerializer(
    {
      ...DOMSerializer.nodesFromSchema(schema),
      [listNodeName]: (node) => markdownListToDOM(node, true),
    },
    DOMSerializer.marksFromSchema(schema),
  );
  return [
    createListEventPlugin(),
    createListRenderingPlugin(),
    new Plugin({
      props: {
        clipboardSerializer,
        transformCopied: unwrapListSlice,
      },
    }),
    createSafariInputMethodWorkaroundPlugin(),
  ];
}

type ListConfig = {
  listNodeName?: string;

  keyBackspaceList?: string | false;
  keyDedentList?: string | false;
  keyDeleteList?: string | false;
  keyIndentList?: string | false;
  keyMoveListDown?: string | false;
  keyMoveListUp?: string | false;
  keyToggleBulletList?: string | false;
  keyToggleOrderedList?: string | false;
  keyToggleTaskList?: string | false;
  keyToggleToggleList?: string | false;
  keyUnwrapList?: string | false;
  keyToggleTaskChecked?: string | false;
};

type RequiredConfig = Required<ListConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  listNodeName: 'list',
  keyBackspaceList: 'Backspace',
  keyDedentList: 'Shift-Tab',
  keyDeleteList: 'Delete',
  keyIndentList: 'Tab',
  keyMoveListDown: 'Alt-ArrowDown',
  keyMoveListUp: 'Alt-ArrowUp',
  keyToggleBulletList: 'Mod-Shift-8',
  keyToggleOrderedList: 'Mod-Shift-9',
  keyToggleTaskList: 'Mod-Shift-7',
  keyToggleToggleList: 'Mod-Shift-6',
  keyUnwrapList: 'Shift-Mod-0',
  keyToggleTaskChecked: 'Mod-Enter',
};

export function setupList(userConfig: Partial<ListConfig> = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const { listNodeName } = config;
  const nodeSpec = {
    [listNodeName]: setPriority(createMarkdownListSpec(), PRIORITY.listSpec),
  };

  const plugin = {
    inputRules: pluginInputRules(config),
    keybindings: pluginKeybindings(config),
    listPlugins: ({ schema }: PluginContext) =>
      createMarkdownListPlugins(schema, listNodeName),
  };

  return collection({
    id: listNodeName,
    nodes: nodeSpec,
    plugin,
    command: {
      dedentList: dedentList(config),
      indentList: indentList(config),
      moveListDown: moveListDown(config),
      moveListUp: moveListUp(config),
      toggleBulletList: toggleBulletList(config),
      toggleOrderedList: toggleOrderedList(config),
      toggleTaskList: toggleTaskList(config),
      toggleToggleList: toggleToggleList(config),
      unwrapList: unwrapList(config),
      toggleTaskChecked: toggleTaskChecked(config),
    },
    query: {
      isBulletListActive: isBulletListActive(config),
      isInsideList: isInsideList(config),
      isOrderedListActive: isOrderedListActive(config),
      isTaskListActive: isTaskListActive(config),
      isToggleListActive: isToggleListActive(config),
    },
    markdown: markdown(config),
  });
}

// PLUGINS
function pluginInputRules(_config: RequiredConfig) {
  return () => {
    return inputRules({
      rules: [
        wrappingListInputRule(/^\s*([-*])\s$/, {
          kind: LIST_KIND.BULLET,
        }),
        wrappingListInputRule(/^(\d+)\.\s$/, {
          kind: LIST_KIND.ORDERED,
          order: 1,
        }),
        wrappingListInputRule(/^\s*(\[([ |x])\])\s$/, {
          kind: LIST_KIND.TASK,
          checked: false,
        }),
        // wrappingListInputRule(/^\s*(>)\s$/, {
        //   kind: LIST_KIND.TOGGLE,
        //   collapsed: true,
        // }),
      ],
    });
  };
}

function pluginKeybindings(config: RequiredConfig) {
  return keybinding(
    [
      ['Enter', enterListCommand(config)],
      [config.keyBackspaceList, backspaceCommand],
      ['Delete', deleteCommand],
      [config.keyDedentList, dedentList(config)],
      [config.keyIndentList, indentList(config)],
      [config.keyMoveListDown, moveListDown(config)],
      [config.keyMoveListUp, moveListUp(config)],
      [config.keyToggleBulletList, toggleBulletList(config)],
      [config.keyToggleOrderedList, toggleOrderedList(config)],
      [config.keyToggleTaskList, toggleTaskList(config)],
      [config.keyToggleToggleList, toggleToggleList(config)],
      [config.keyUnwrapList, unwrapList(config)],
      [config.keyToggleTaskChecked, toggleTaskChecked(config)],
    ],
    'list',
  );
}

// COMMANDS
function toggleBulletList(_config: RequiredConfig): Command {
  return (state, dispatch) => {
    return createToggleListCommand({
      kind: LIST_KIND.BULLET,
      listKind: LIST_KIND.BULLET,
    })(state, dispatch);
  };
}

function toggleOrderedList(_config: RequiredConfig): Command {
  return (state, dispatch) => {
    return createToggleListCommand({
      kind: LIST_KIND.ORDERED,
      listKind: LIST_KIND.ORDERED,
      order: 1,
    })(state, dispatch);
  };
}

function toggleTaskList(_config: RequiredConfig): Command {
  return (state, dispatch) => {
    return createToggleListCommand({
      kind: LIST_KIND.TASK,
      listKind: LIST_KIND.BULLET,
      checked: false,
    })(state, dispatch);
  };
}

// ignoring the toggle list for this task, but we keep the placeholder
function toggleToggleList(_config: RequiredConfig): Command {
  return (state, dispatch) => {
    return createToggleListCommand({
      kind: LIST_KIND.TOGGLE,
      collapsed: true,
    })(state, dispatch);
  };
}

function enterListCommand(config: RequiredConfig): Command {
  return (state, dispatch, view) => {
    const type = getNodeType(state.schema, config.listNodeName);
    const source = findParentNode(
      (node: PMNode) => isListNode(node) && node.type === type,
    )(state.selection);

    return enterCommand(
      state,
      dispatch
        ? (tr) => {
            const target = findParentNode(
              (node: PMNode) => isListNode(node) && node.type === type,
            )(tr.selection);
            const sourceAttrs = readListAttrs(source?.node);
            const targetAttrs = readListAttrs(target?.node);
            if (
              sourceAttrs &&
              target &&
              targetAttrs &&
              sourceAttrs.kind === targetAttrs.kind
            ) {
              tr.setNodeMarkup(target.pos, null, {
                ...target.node.attrs,
                listKind: sourceAttrs.listKind,
                tight: sourceAttrs.tight,
              });
            }
            dispatch(tr);
          }
        : undefined,
      view,
    );
  };
}

function indentList(_config: RequiredConfig): Command {
  return createIndentListCommand();
}

function dedentList(_config: RequiredConfig): Command {
  return createDedentListCommand();
}

function moveListUp(_config: RequiredConfig): Command {
  return createMoveListCommand('up');
}

function moveListDown(_config: RequiredConfig): Command {
  return createMoveListCommand('down');
}

function unwrapList(_config: RequiredConfig): Command {
  return createUnwrapListCommand();
}

function toggleTaskChecked(config: RequiredConfig): Command {
  return (state, dispatch) => {
    const { listNodeName } = config;

    const type = getNodeType(state.schema, listNodeName);
    const parent = findParentNode(
      (node: PMNode) => isListNode(node) && node.type === type,
    )(state.selection);

    if (!parent) {
      return false;
    }

    const attrs = readListAttrs(parent.node);

    // Only work if we're in a task list
    if (!attrs || attrs.kind !== LIST_KIND.TASK) {
      return false;
    }

    if (dispatch) {
      const tr = state.tr;
      const checked = !attrs.checked;
      tr.setNodeMarkup(parent.pos, null, { ...parent.node.attrs, checked });
      dispatch(tr);
    }

    return true;
  };
}

// QUERIES
function isBulletListActive(config: RequiredConfig) {
  return (state: EditorState) => {
    const { listNodeName } = config;
    const type = getNodeType(state.schema, listNodeName);
    const result = findParentNode(
      (node: PMNode) => isListNode(node) && node.type === type,
    )(state.selection);
    const attrs = result ? readListAttrs(result.node) : null;
    return Boolean(attrs?.kind === LIST_KIND.BULLET);
  };
}

function isOrderedListActive(config: RequiredConfig) {
  return (state: EditorState) => {
    const { listNodeName } = config;
    const type = getNodeType(state.schema, listNodeName);
    const result = findParentNode(
      (node: PMNode) => isListNode(node) && node.type === type,
    )(state.selection);
    const attrs = result ? readListAttrs(result.node) : null;
    return Boolean(attrs?.kind === LIST_KIND.ORDERED);
  };
}

function isTaskListActive(config: RequiredConfig) {
  return (state: EditorState) => {
    const { listNodeName } = config;
    const type = getNodeType(state.schema, listNodeName);
    const result = findParentNode(
      (node: PMNode) => isListNode(node) && node.type === type,
    )(state.selection);
    const attrs = result ? readListAttrs(result.node) : null;
    return Boolean(attrs?.kind === LIST_KIND.TASK);
  };
}

function isToggleListActive(config: RequiredConfig) {
  return (state: EditorState) => {
    const { listNodeName } = config;
    const type = getNodeType(state.schema, listNodeName);
    const result = findParentNode(
      (node: PMNode) => isListNode(node) && node.type === type,
    )(state.selection);
    const attrs = result ? readListAttrs(result.node) : null;
    return Boolean(attrs?.kind === LIST_KIND.TOGGLE);
  };
}

function isInsideList(config: RequiredConfig) {
  return (state: EditorState) => {
    const { listNodeName } = config;
    const type = getNodeType(state.schema, listNodeName);
    return isListType(type);
  };
}

/**
 * Provides ProseMirror's parse and serialize handling for bullet, ordered,
 * and task lists. Toggle list is ignored in the parse/serialize logic.
 */
function markdown(config: RequiredConfig): CollectionType['markdown'] {
  const { listNodeName } = config;
  return {
    nodes: {
      [listNodeName]: {
        // For serialization:
        toMarkdown: (state, node, parent, index) => {
          flatListToMarkdown(state, node, parent ?? null, index ?? 0);
        },
        // For parsing:
        parseMarkdown: {
          bullet_list: {
            ignore: true,
          },
          ordered_list: {
            ignore: true,
          },
          list_item: {
            block: listNodeName,
            getAttrs: (tok) => {
              const { kind, taskChecked, tight } = readListTokenMetadata(tok);
              if (taskChecked !== null) {
                return {
                  kind: LIST_KIND.TASK,
                  listKind: kind,
                  checked: taskChecked,
                  tight,
                };
              }
              return { kind, listKind: kind, tight };
            },
          },
        },
      },
    },
  };
}

function flatListToMarkdown(
  state: MarkdownSerializerState,
  node: PMNode,
  parent: PMNode | null,
  index: number,
) {
  if (!isListMarkdownSerializerState(state)) {
    throw new Error('Markdown serializer does not support list tightness');
  }
  const attrs = readListAttrs(node);
  if (!attrs) return;
  const tight = listRunIsTight(state, node, parent, index);
  if (
    state.inTightList ||
    (tight && previousSiblingIsSameList(parent, index, attrs.listKind))
  ) {
    state.flushClose(1);
  }

  const containerMarker = attrs.listKind === LIST_KIND.ORDERED ? '1.' : '-';
  const marker =
    attrs.kind === LIST_KIND.TASK
      ? `${containerMarker} [${attrs.checked ? 'x' : ' '}]`
      : containerMarker;
  const firstDelim = `${marker} `;
  const continuationDelim = ' '.repeat(containerMarker.length + 1);
  const previousTight = state.inTightList;
  state.inTightList = tight;
  state.wrapBlock(continuationDelim, firstDelim, node, () => {
    if (isListNode(node.firstChild)) state.ensureNewLine();
    state.renderContent(node);
  });
  state.inTightList = previousTight;
}

function previousSiblingIsSameList(
  parent: PMNode | null,
  index: number,
  kind: MarkdownListKind,
): boolean {
  if (!parent || index === 0) return false;
  return readListAttrs(parent.child(index - 1))?.listKind === kind;
}

function listRunIsTight(
  state: ListMarkdownSerializerState,
  node: PMNode,
  parent: PMNode | null,
  index: number,
): boolean {
  if (!parent) return readListAttrs(node)?.tight ?? true;
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
  return tightness[index] ?? true;
}

function listTightnessByChild(parent: PMNode): readonly boolean[] {
  const result = Array.from({ length: parent.childCount }, () => true);
  for (let start = 0; start < parent.childCount; ) {
    const first = readListAttrs(parent.child(start));
    if (!first) {
      start++;
      continue;
    }
    let end = start + 1;
    let tight = first.tight;
    while (end < parent.childCount) {
      const attrs = readListAttrs(parent.child(end));
      if (attrs?.listKind !== first.listKind) break;
      tight = tight && attrs.tight;
      end++;
    }
    result.fill(tight, start, end);
    start = end;
  }
  return result;
}
