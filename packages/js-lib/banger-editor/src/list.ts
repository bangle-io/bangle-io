import {
  listItemCanRenderTight,
  readListTokenMetadata,
  resolveListRunTightness,
  type TightListItemBlockKind,
} from '@bangle.io/markdown-syntax';
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
  NodeType,
  PMNode,
  PMSelection,
  ResolvedPos,
  Transaction,
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
  findCheckboxInListItem,
  findListsRange,
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
import {
  findParentNode,
  findParentNodeClosestToPos,
  getNodeType,
  insertNodeAdjacentToNode,
  type PluginContext,
} from './pm-utils';

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
        const checkbox = findCheckboxInListItem(dom);
        const isTask =
          attrs?.kind === LIST_KIND.TASK ||
          itemKind === LIST_KIND.TASK ||
          dom.hasAttribute('data-task-list-item') ||
          checkbox !== undefined;
        return {
          ...(attrs ?? {}),
          ...(isTask
            ? {
                kind: LIST_KIND.TASK,
                checked:
                  checkbox?.hasAttribute('checked') ??
                  (attrs?.checked === true ||
                    dom.hasAttribute('data-list-checked') ||
                    dom.hasAttribute('data-checked')),
              }
            : {}),
          listKind:
            kind === LIST_KIND.ORDERED || kind === LIST_KIND.BULLET
              ? kind
              : attrs?.kind === LIST_KIND.ORDERED ||
                  dom.parentElement?.tagName === 'OL'
                ? LIST_KIND.ORDERED
                : LIST_KIND.BULLET,
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
  keyInsertEmptyListAbove?: string | false;
  keyInsertEmptyListBelow?: string | false;
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
  // Mirrors the paragraph/heading/blockquote/code-block bindings so the
  // shortcut keeps working when the caret sits inside a list item.
  keyInsertEmptyListAbove: 'Mod-Shift-Enter',
  keyInsertEmptyListBelow: 'Mod-Enter',
  keyMoveListDown: 'Alt-ArrowDown',
  keyMoveListUp: 'Alt-ArrowUp',
  keyToggleBulletList: 'Mod-Shift-8',
  keyToggleOrderedList: 'Mod-Shift-9',
  keyToggleTaskList: 'Mod-Shift-7',
  keyToggleToggleList: 'Mod-Shift-6',
  keyUnwrapList: 'Shift-Mod-0',
  // Moved off `Mod-Enter` so insert-below behaves the same in every list item
  // instead of being swallowed by the checkbox toggle inside task lists.
  keyToggleTaskChecked: 'Alt-Enter',
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
    insertKeybindings: pluginInsertKeybindings(config),
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
      insertEmptyListAbove: insertEmptyListAbove(config),
      insertEmptyListBelow: insertEmptyListBelow(config),
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
          listKind: LIST_KIND.BULLET,
        }),
        wrappingListInputRule(/^(\d+)\.\s$/, {
          kind: LIST_KIND.ORDERED,
          listKind: LIST_KIND.ORDERED,
          order: 1,
        }),
        wrappingListInputRule(/^\s*\[([ xX])\]\s$/, ({ match }) => ({
          kind: LIST_KIND.TASK,
          checked: match[1]?.toLowerCase() === 'x',
        })),
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

/**
 * Registered below the default priority so a heading, blockquote or code block
 * inside a list item keeps handling insert-above/below itself, rather than the
 * winner depending on the order extensions happen to be registered in.
 *
 * A table binds only insert-below (`exitTableBelow`), so insert-above would
 * otherwise reach this keymap; `insertEmptySiblingList` declines any caret that
 * is not directly inside the item to keep the two directions consistent.
 */
function pluginInsertKeybindings(config: RequiredConfig) {
  return keybinding(
    [
      [config.keyInsertEmptyListAbove, insertEmptyListAbove(config)],
      [config.keyInsertEmptyListBelow, insertEmptyListBelow(config)],
    ],
    'list-insert',
    PRIORITY.listInsertKeymap,
  );
}

// COMMANDS
function toggleBulletList(_config: RequiredConfig): Command {
  return toggleList({
    kind: LIST_KIND.BULLET,
    listKind: LIST_KIND.BULLET,
  });
}

function toggleOrderedList(_config: RequiredConfig): Command {
  return toggleList({
    kind: LIST_KIND.ORDERED,
    listKind: LIST_KIND.ORDERED,
    order: 1,
  });
}

function toggleTaskList(_config: RequiredConfig): Command {
  return toggleList({
    kind: LIST_KIND.TASK,
    // `checked` is deliberately not set here. Forcing it to false cleared the
    // boxes of items that were already checked whenever a task list was
    // converted to another kind and back, so correcting a mis-click lost
    // state that undo would have kept. New task items still start unchecked
    // via the node spec's default.
    //
    // `listKind` is likewise left alone: an ordered container that becomes a
    // task list stays ordered, which Markdown writes as `1. [ ] item`.
  });
}

type ToggleListAttrs = ListAttributes & {
  kind: ListKindType;
  listKind?: MarkdownListKind;
};

function toggleList(targetAttrs: ToggleListAttrs): Command {
  const command = createToggleListCommand(targetAttrs);
  const targetListKind = targetAttrs.listKind;
  return (state, dispatch, view) => {
    // Only the marker is a whole-list property in Markdown, so only a marker
    // change converts the run. Task-ness is per item, which is why the task
    // toggle carries no `listKind` and always defers to the library command.
    if (targetListKind) {
      const positions = findSelectedListRun(state.selection);
      // Keep converting while any item still lacks the target marker. Once the
      // whole run matches, defer so a second press toggles the list off.
      const needsMarker = positions.some(
        (pos) => !hasMarker(state.doc.nodeAt(pos), targetListKind),
      );
      if (needsMarker) {
        if (dispatch) {
          const tr = state.tr;
          setRunMarker(tr, positions, targetListKind);
          dispatch(tr.scrollIntoView());
        }
        return true;
      }
    }

    return command(state, dispatch, view);
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
            if (sourceAttrs && source) {
              const positions = new Set([
                tr.mapping.map(source.pos, -1),
                ...(target ? [target.pos] : []),
              ]);
              for (const pos of positions) {
                const node = tr.doc.nodeAt(pos);
                const attrs = readListAttrs(node ?? undefined);
                if (!node || attrs?.kind !== sourceAttrs.kind) continue;
                tr.setNodeMarkup(pos, null, {
                  ...node.attrs,
                  listKind: sourceAttrs.listKind,
                  tight: sourceAttrs.tight,
                });
              }
            }
            dispatch(tr);
          }
        : undefined,
      view,
    );
  };
}

function indentList(_config: RequiredConfig): Command {
  const command = createIndentListCommand();
  return (state, dispatch, view) => {
    if (!dispatch) return command(state, undefined, view);

    const existingListNodes = new WeakSet<PMNode>();
    state.doc.descendants((node) => {
      if (isListNode(node)) existingListNodes.add(node);
    });

    return command(
      state,
      (tr) => {
        normalizeNewIndentationPlaceholders(tr, existingListNodes);
        dispatch(tr);
      },
      view,
    );
  };
}

function normalizeNewIndentationPlaceholders(
  tr: Transaction,
  existingListNodes: WeakSet<PMNode>,
) {
  // Flat-list copies item attrs onto list-only wrappers used for skipped
  // indentation levels. Only normalize wrappers created by this transaction.
  const positions: number[] = [];
  tr.doc.descendants((node, pos) => {
    const attrs = readListAttrs(node);
    if (
      attrs?.kind === LIST_KIND.TASK &&
      !existingListNodes.has(node) &&
      isListNode(node.firstChild)
    ) {
      positions.push(pos);
    }
  });

  for (const pos of positions) {
    const node = tr.doc.nodeAt(pos);
    const attrs = readListAttrs(node ?? undefined);
    if (!node || !attrs) continue;
    tr.setNodeMarkup(pos, null, {
      ...node.attrs,
      checked: false,
      kind: attrs.listKind,
      order: attrs.listKind === LIST_KIND.ORDERED ? 1 : null,
    });
  }
}

function dedentList(config: RequiredConfig): Command {
  const command = createDedentListCommand();
  return (state, dispatch, view) => {
    if (!dispatch) return command(state, undefined, view);

    const type = getNodeType(state.schema, config.listNodeName);
    const destinationAttrs = findDedentDestinationAttrs(state.selection, type);

    return command(
      state,
      destinationAttrs
        ? (tr) => {
            // Adopt the destination run's marker only. Taking its `kind` too
            // would rewrite a dedented task into a plain bullet and drop the
            // checkbox from the Markdown.
            const lifted = findListAtPos(tr.selection.$from, type);
            if (lifted) {
              setRunMarker(
                tr,
                [lifted.pos],
                destinationAttrs.listKind,
                destinationAttrs.tight,
              );
            }
            dispatch(tr);
          }
        : dispatch,
      view,
    );
  };
}

/**
 * The sibling items a marker change has to cover: every item the selection
 * touches, widened to the neighbours that already share the selection's marker,
 * because Markdown writes those as a single list.
 *
 * The range itself comes from the list library, so a selection that starts and
 * ends at different nesting depths, runs backwards, or selects a whole node all
 * resolve to the same set of siblings.
 */
function findSelectedListRun(selection: PMSelection): number[] {
  const range = findListsRange(selection.$from, selection.$to);
  if (!range) return [];

  const { parent, depth } = range;
  const listKind = readListAttrs(parent.child(range.startIndex))?.listKind;
  if (!listKind) return [];

  let startIndex = range.startIndex;
  let endIndex = range.endIndex;
  while (startIndex > 0 && hasMarker(parent.child(startIndex - 1), listKind)) {
    startIndex--;
  }
  while (
    endIndex < parent.childCount &&
    hasMarker(parent.child(endIndex), listKind)
  ) {
    endIndex++;
  }

  return Array.from({ length: endIndex - startIndex }, (_, offset) =>
    range.$from.posAtIndex(startIndex + offset, depth),
  );
}

function findDedentDestinationAttrs(
  selection: PMSelection,
  type: NodeType,
): MarkdownListAttrs | null {
  const source = findListAtPos(selection.$from, type);
  const endSource = findListAtPos(selection.$to, type);
  // A range can lift items to different destination depths, each with its own
  // list kind. The single-item caret workflow has one unambiguous destination.
  if (!source || source.node !== endSource?.node) return null;

  // Only the item's own parent, never a further ancestor. Nesting always puts a
  // list directly inside a list, so anything else in between (a blockquote, say)
  // means the lift lands somewhere this marker does not describe.
  const parent = selection.$from.node(source.depth - 1);
  return parent.type === type ? readListAttrs(parent) : null;
}

function findListAtPos($pos: ResolvedPos, type: NodeType) {
  return findParentNodeClosestToPos(
    $pos,
    (node: PMNode) => node.type === type && isListNode(node),
  );
}

function hasMarker(
  node: PMNode | null | undefined,
  listKind: MarkdownListKind,
): boolean {
  return readListAttrs(node ?? undefined)?.listKind === listKind;
}

/**
 * Rewrites only the container marker of the given items.
 *
 * `kind` has to follow the marker for plain bullet/ordered items. It is what
 * `readListAttrs` derives the marker from, and what the list library renders
 * from, so leaving it behind would show a bullet while serializing `1.`.
 *
 * A task or toggle item keeps its own `kind`, so its checkbox survives the
 * change and Markdown writes the combination the user asked for, `1. [x] item`.
 *
 * `order` is always cleared: the run renumbers itself, Markdown always emits
 * `1.`, and only a run's first item can carry an explicit start.
 */
function setRunMarker(
  tr: Transaction,
  positions: readonly number[],
  listKind: MarkdownListKind,
  tight?: boolean,
) {
  for (const pos of positions) {
    const node = tr.doc.nodeAt(pos);
    const attrs = readListAttrs(node ?? undefined);
    if (!node || !attrs) continue;
    const isPlainMarker =
      attrs.kind === LIST_KIND.BULLET || attrs.kind === LIST_KIND.ORDERED;
    tr.setNodeMarkup(pos, null, {
      ...node.attrs,
      listKind,
      ...(isPlainMarker ? { kind: listKind } : {}),
      order: null,
      ...(tight === undefined ? {} : { tight }),
    });
  }
}

function insertEmptyListAbove(config: RequiredConfig): Command {
  return insertEmptySiblingList(config, 'above');
}

function insertEmptyListBelow(config: RequiredConfig): Command {
  return insertEmptySiblingList(config, 'below');
}

/**
 * Adds an empty item next to the caret's item, matching the run's marker so the
 * surrounding Markdown list is not split into two lists.
 *
 * Item-specific state is deliberately not inherited: a fresh item starts
 * unchecked and expanded, and carries no explicit `order` so the run keeps
 * numbering itself.
 */
function insertEmptySiblingList(
  config: RequiredConfig,
  side: 'above' | 'below',
): Command {
  return (state, dispatch, view) => {
    const type = getNodeType(state.schema, config.listNodeName);
    return insertNodeAdjacentToNode(type, side, (found, { selection }) => {
      // Only claim the key for a block the item directly contains. A caret
      // inside a table cell (or any other nested structure) belongs to that
      // structure, so leaking through to here would yank the caret out of it
      // into a brand new item. Declining keeps such a caret behaving the same
      // as it does in a table outside a list.
      if (selection.$from.depth !== found.depth + 1) return null;

      const attrs = readListAttrs(found.node);
      if (!attrs) return null;
      return type.createAndFill({
        ...found.node.attrs,
        // Normalized rather than copied raw: an item that never carried an
        // explicit `listKind` still hands the sibling the marker it renders
        // with, the same repair `enterListCommand` applies.
        listKind: attrs.listKind,
        tight: attrs.tight,
        checked: false,
        collapsed: false,
        order: null,
      });
    })(state, dispatch, view);
  };
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
  const sameList = previousSiblingIsSameList(parent, index, attrs.listKind);
  if ((state.inTightList && !sameList) || (tight && sameList)) {
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
    const firstChildIndex = firstRenderedListItemChild(node, attrs);
    const firstChild = node.maybeChild(firstChildIndex);
    const firstKind = firstChild ? listItemBlockKind(firstChild) : null;
    const taskStartsWithBlock =
      attrs.kind === LIST_KIND.TASK &&
      firstKind !== null &&
      firstKind !== 'paragraph';
    if (taskStartsWithBlock) {
      // The checkbox is an implicit empty paragraph before the actual block.
      state.closeBlock(node);
      state.flushClose(tight ? 1 : 2);
    } else if (isListNode(firstChild) || firstKind === 'thematic-break') {
      state.ensureNewLine();
    }
    let renderedChildCount = 0;
    node.forEach((child, _offset, childIndex) => {
      if (childIndex < firstChildIndex) return;
      // Nested list serializers own their run's tightness independently.
      if (renderedChildCount > 0 && tight && !isListNode(child)) {
        state.flushClose(1);
      }
      state.render(child, node, childIndex);
      renderedChildCount++;
    });
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
  if (!parent) {
    const attrs = readListAttrs(node);
    return attrs ? attrs.tight && flatListItemCanRenderTight(node) : true;
  }
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
  return resolveListRunTightness(
    Array.from({ length: parent.childCount }, (_, index) => {
      const child = parent.child(index);
      const attrs = readListAttrs(child);
      return attrs
        ? {
            kind: attrs.listKind,
            tight: attrs.tight && flatListItemCanRenderTight(child),
          }
        : null;
    }),
  );
}

function flatListItemCanRenderTight(node: PMNode): boolean {
  const attrs = readListAttrs(node);
  const firstChildIndex = attrs ? firstRenderedListItemChild(node, attrs) : 0;
  for (let index = firstChildIndex + 1; index < node.childCount; index++) {
    const child = node.child(index);
    if (isListNode(child) && listMarkerIsHidden(child)) return false;
  }
  const blocks = listItemBlockKinds(node, firstChildIndex);
  if (attrs?.kind === LIST_KIND.TASK && blocks[0] !== 'paragraph') {
    blocks.unshift('paragraph');
  }
  return listItemCanRenderTight(blocks);
}

function listMarkerIsHidden(node: PMNode): boolean {
  return isListNode(node.firstChild);
}

function firstRenderedListItemChild(
  node: PMNode,
  attrs: MarkdownListAttrs,
): number {
  if (attrs.kind === LIST_KIND.TASK) return 0;
  let index = 0;
  while (
    index < node.childCount - 1 &&
    node.child(index).type.name === 'paragraph' &&
    node.child(index).content.size === 0
  ) {
    index++;
  }
  return index;
}

function listItemBlockKinds(
  node: PMNode,
  startIndex: number,
): TightListItemBlockKind[] {
  const blocks: TightListItemBlockKind[] = [];
  node.forEach((child, _offset, index) => {
    if (index >= startIndex) blocks.push(listItemBlockKind(child));
  });
  return blocks;
}

function listItemBlockKind(node: PMNode): TightListItemBlockKind {
  if (isListNode(node)) return 'list';
  switch (node.type.name) {
    case 'paragraph':
      return 'paragraph';
    case 'blockquote':
      return 'blockquote';
    case 'horizontalRule':
      return 'thematic-break';
    case 'table':
      return 'table';
    case 'code_block':
    case 'heading':
    case 'math_display':
      return 'self-terminating';
    default:
      return 'unknown';
  }
}
