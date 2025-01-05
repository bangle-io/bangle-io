import type { Command, EditorState, PMNode } from './pm';

import type { MarkdownSerializerState } from 'prosemirror-markdown';
import {
  type CollectionType,
  PRIORITY,
  collection,
  keybinding,
  setPriority,
} from './common';
import {
  type ListAttributes,
  type ListKind,
  backspaceCommand,
  createDedentListCommand,
  createIndentListCommand,
  createListPlugins,
  createListSpec,
  createMoveListCommand,
  createToggleListCommand,
  createUnwrapListCommand,
  deleteCommand,
  enterCommand,
  isListNode,
  isListType,
  wrappingListInputRule,
} from './pm';
import { inputRules } from './pm';
import { type PluginContext, findParentNode, getNodeType } from './pm-utils';

const LIST_KIND = {
  BULLET: 'bullet',
  ORDERED: 'ordered',
  TASK: 'task',
  TOGGLE: 'toggle',
} as const satisfies Record<string, ListKind>;

// Export the type for external use
export type ListKindType = (typeof LIST_KIND)[keyof typeof LIST_KIND];

/**
 * Helper to read typed list attributes from a node
 * Returns null if the node is not a list node
 */
function readListAttrs(
  node?: PMNode,
): (ListAttributes & { kind: ListKindType }) | null {
  if (!node || !isListNode(node)) {
    return null;
  }
  const { kind, checked, collapsed, order } = node.attrs;
  return {
    kind,
    ...(kind === LIST_KIND.TASK ? { checked } : {}),
    ...(kind === LIST_KIND.TOGGLE ? { collapsed } : {}),
    ...(kind === LIST_KIND.ORDERED ? { order } : {}),
  };
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
    [listNodeName]: setPriority(createListSpec(), PRIORITY.listSpec),
  };

  const plugin = {
    inputRules: pluginInputRules(config),
    keybindings: pluginKeybindings(config),
    listPlugins: ({ schema }: PluginContext) => createListPlugins({ schema }),
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
      ['Enter', enterCommand],
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
    return createToggleListCommand({ kind: LIST_KIND.BULLET })(state, dispatch);
  };
}

function toggleOrderedList(_config: RequiredConfig): Command {
  return (state, dispatch) => {
    return createToggleListCommand({ kind: LIST_KIND.ORDERED, order: 1 })(
      state,
      dispatch,
    );
  };
}

function toggleTaskList(_config: RequiredConfig): Command {
  return (state, dispatch) => {
    return createToggleListCommand({ kind: LIST_KIND.TASK, checked: false })(
      state,
      dispatch,
    );
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
          flatListToMarkdown(state, node, parent ?? null, index ?? 0, 0, true);
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
              const kind = tok.attrGet('data-bangle-list-kind');
              if (kind === LIST_KIND.TASK) {
                const isChecked =
                  tok.attrGet('data-bangle-task-checked') === 'true';
                return { kind: LIST_KIND.TASK, checked: isChecked };
              }
              if (kind === 'ordered') {
                return { kind: LIST_KIND.ORDERED };
              }

              return { kind: LIST_KIND.BULLET };
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
  level = 0,
  tight = false,
) {
  // 1) Possibly add a blank line before this item, depending on tight & previous sibling
  maybeAddBlankLine(state, node, parent, index, level, tight);

  // 2) Determine bullet/marker
  let marker = '-';
  const attrs = readListAttrs(node);
  if (attrs?.kind === LIST_KIND.ORDERED) {
    marker = '1.';
  } else if (attrs?.kind === LIST_KIND.TASK) {
    marker = attrs.checked ? '- [x]' : '- [ ]';
  }

  // 3) Indentation grows with nesting level.
  //    level=0 => ""; level=1 => "  "; etc.
  const baseIndent = '  '.repeat(level);

  // 4) Wrap each list(...) node as one item.
  //    "wrapBlock" will prefix the first line with (firstDelim) and subsequent lines with (delim).
  //    That ensures correct indentation for multiline content inside this item.
  state.wrapBlock(
    baseIndent, // delim => subsequent lines
    `${baseIndent + marker} `, // firstDelim => first line
    node,
    () => {
      // Render normal (non-list) children inside this item
      node.forEach((child, childOffset) => {
        if (child.type.name !== node.type.name) {
          state.render(child, node, childOffset);
        }
      });
    },
  );

  node.forEach((child, childOffset) => {
    if (child.type.name === node.type.name) {
      flatListToMarkdown(state, child, node, childOffset, level + 1, tight);
    }
  });
}

function maybeAddBlankLine(
  state: MarkdownSerializerState,
  node: PMNode,
  parent: PMNode | null,
  index: number,
  level: number,
  tight: boolean,
) {
  // 1) If we're "tight," skip extra blank lines altogether
  if (tight) return;

  // 2) If there's no parent or we're in nested lists (level > 0),
  //    you may choose not to add blank lines. Adjust as you like.
  if (!parent || level > 0) return;

  // 3) If this is the first child in the parent, no previous sibling => no blank line
  if (index === 0) return;

  // 4) Retrieve the *previous* sibling
  const prevSibling = parent.child(index - 1);

  // 5) Decide if we want a blank line. For example:
  //    Insert a blank line if it's a "separate block"
  if (isSeparateBlock(prevSibling, node)) {
    // "flushClose(1)" ensures exactly one blank line,
    // "flushClose(2)" can produce 2 blank lines, etc.
    // Adjust to match your styling preference.
    (state as any).flushClose(1);
  }
}

/**
 * Custom logic to decide if we consider two siblings "separate blocks."
 * You can expand or replace this with checks for paragraph, blockquote,
 * or any other condition where you want a blank line between siblings.
 */
function isSeparateBlock(prevNode: PMNode, currentNode: PMNode): boolean {
  // Example: if they're different node types, treat them as separate blocks
  return prevNode.type.name !== currentNode.type.name;
}
