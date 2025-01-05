import {
  type Command,
  type DOMOutputSpec,
  type EditorState,
  type Schema,
  setBlockType,
} from './pm';
import {
  copyEmptyCommand,
  cutEmptyCommand,
  filterCommand,
  insertEmptyParagraphAboveNode,
  insertEmptyParagraphBelowNode,
  jumpToEndOfNode,
  jumpToStartOfNode,
  moveNode,
  parentHasDirectParentOfType,
} from './pm-utils';

import {
  type CollectionType,
  collection,
  isMac,
  keybinding,
  setPriority,
} from './common';
import { PRIORITY } from './common';
import type { NodeSpec } from './pm';
import { findParentNodeOfType } from './pm-utils';
import { type KeyCode, getNodeType } from './pm-utils';

export type ParagraphConfig = {
  name?: string;
  // keys
  keyMoveUp?: KeyCode;
  keyMoveDown?: KeyCode;
  keyEmptyCopy?: KeyCode;
  keyEmptyCut?: KeyCode;
  keyInsertEmptyParaAbove?: KeyCode;
  keyInsertEmptyParaBelow?: KeyCode;
  keyJumpToStartOfParagraph?: KeyCode;
  keyJumpToEndOfParagraph?: KeyCode;
  keyConvertToParagraph?: KeyCode;
};

type RequiredConfig = Required<ParagraphConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'paragraph',
  keyMoveUp: 'Alt-ArrowUp',
  keyMoveDown: 'Alt-ArrowDown',
  keyEmptyCopy: 'Mod-c',
  keyEmptyCut: 'Mod-x',
  keyInsertEmptyParaAbove: 'Mod-Shift-Enter',
  keyInsertEmptyParaBelow: 'Mod-Enter',
  keyJumpToStartOfParagraph: isMac ? 'Ctrl-a' : 'Ctrl-Home',
  keyJumpToEndOfParagraph: isMac ? 'Ctrl-e' : 'Ctrl-End',
  keyConvertToParagraph: isMac ? 'Mod-Alt-0' : 'Ctrl-Shift-0',
};

export function setupParagraph(userConfig?: ParagraphConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  } as RequiredConfig;

  const { name } = config;

  const nodes: Record<string, NodeSpec> = {
    [name]: setPriority(
      {
        content: 'inline*',
        group: 'block',
        draggable: false,
        parseDOM: [
          {
            tag: 'p',
          },
        ],
        toDOM: (): DOMOutputSpec => ['p', 0],
      },
      PRIORITY.paragraphSpec,
    ),
  };

  const plugin = {
    keybindings: pluginKeybindings(config),
  };

  return collection({
    id: 'paragraph',
    nodes,
    plugin,
    command: {
      convertToParagraph: convertToParagraph(config),
      insertEmptyParagraphAbove: cmdInsertEmptyParagraphAbove(config),
      insertEmptyParagraphBelow: cmdInsertEmptyParagraphBelow(config),
      jumpToStartOfParagraph: jumpToStartOfParagraph(config),
      jumpToEndOfParagraph: jumpToEndOfParagraph(config),
    },
    query: {
      isParagraph: isParagraph(config),
      isTopLevelParagraph: isTopLevelParagraph(config),
    },
    markdown: markdown(config),
  });
}

// PLUGINS
function pluginKeybindings(config: RequiredConfig) {
  return ({ schema }: { schema: Schema }) => {
    const { name } = config;
    const type = getNodeType(schema, name);
    const isTopLevel = parentHasDirectParentOfType(type, schema.topNodeType);

    return keybinding(
      [
        [config.keyConvertToParagraph, convertToParagraph(config)],
        [config.keyMoveUp, filterCommand(isTopLevel, moveNode(type, 'UP'))],
        [config.keyMoveDown, filterCommand(isTopLevel, moveNode(type, 'DOWN'))],
        [config.keyJumpToStartOfParagraph, jumpToStartOfNode(type)],
        [config.keyJumpToEndOfParagraph, jumpToEndOfNode(type)],
        [
          config.keyEmptyCopy,
          filterCommand(isTopLevel, copyEmptyCommand(type)),
        ],
        [config.keyEmptyCut, filterCommand(isTopLevel, cutEmptyCommand(type))],
        [
          config.keyInsertEmptyParaAbove,
          filterCommand(isTopLevel, cmdInsertEmptyParagraphAbove(config)),
        ],
        [
          config.keyInsertEmptyParaBelow,
          filterCommand(isTopLevel, cmdInsertEmptyParagraphBelow(config)),
        ],
      ],
      'paragraph',
    );
  };
}

// COMMANDS
function convertToParagraph(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    if (isParagraph(config)(state)) {
      return false;
    }
    return setBlockType(getNodeType(state.schema, name))(state, dispatch);
  };
}

function cmdInsertEmptyParagraphAbove(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch, view) => {
    const type = getNodeType(state.schema, name);
    return filterCommand(
      parentHasDirectParentOfType(type, state.schema.topNodeType),
      insertEmptyParagraphAboveNode(type, () =>
        getNodeType(state.schema, name),
      ),
    )(state, dispatch, view);
  };
}

function cmdInsertEmptyParagraphBelow(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch, view) => {
    const type = getNodeType(state.schema, name);
    return filterCommand(
      parentHasDirectParentOfType(type, state.schema.topNodeType),
      insertEmptyParagraphBelowNode(type, () =>
        getNodeType(state.schema, name),
      ),
    )(state, dispatch, view);
  };
}

function jumpToStartOfParagraph(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    const type = getNodeType(state.schema, name);
    return jumpToStartOfNode(type)(state, dispatch);
  };
}

function jumpToEndOfParagraph(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    const type = getNodeType(state.schema, name);
    return jumpToEndOfNode(type)(state, dispatch);
  };
}

// QUERY
function isParagraph(config: RequiredConfig) {
  return (state: EditorState) => {
    const { name } = config;
    const type = getNodeType(state.schema, name);
    return Boolean(findParentNodeOfType(type)(state.selection));
  };
}

function isTopLevelParagraph(config: RequiredConfig) {
  return (state: EditorState) => {
    const { name } = config;
    const type = getNodeType(state.schema, name);
    return parentHasDirectParentOfType(type, state.schema.topNodeType)(state);
  };
}

// MARKDOWN
function markdown(config: RequiredConfig): CollectionType['markdown'] {
  // Potential improvement: Might want to handle paragraphs that are empty vs. paragraphs with content differently in markdown.
  const { name } = config;
  return {
    nodes: {
      [name]: {
        toMarkdown(state, node) {
          state.renderInline(node);
          state.closeBlock(node);
        },
        parseMarkdown: {
          paragraph: {
            block: name,
          },
        },
      },
    },
  };
}
