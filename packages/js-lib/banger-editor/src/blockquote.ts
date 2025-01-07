import { nodes as schemaBasicNodes } from 'prosemirror-schema-basic';
import { type CollectionType, collection, keybinding } from './common';
import type { Command, NodeSpec, NodeType, Schema } from './pm';
import { lift, wrapIn } from './pm';
import { inputRules, wrappingInputRule } from './pm';
import { findParentNodeOfType } from './pm-utils';
import {
  type KeyCode,
  type PluginContext,
  defaultGetParagraphNodeType,
  getNodeType,
  insertEmptyParagraphAboveNode,
  insertEmptyParagraphBelowNode,
  moveNode,
} from './pm-utils';

export type BlockquoteConfig = {
  name?: string;
  getParagraphNodeType?: (arg: Schema) => NodeType;
  // keys
  keyWrap?: KeyCode;
  keyToggle?: KeyCode;
  keyMoveUp?: KeyCode;
  keyMoveDown?: KeyCode;
  keyInsertEmptyParaAbove?: KeyCode;
  keyInsertEmptyParaBelow?: KeyCode;
};

type RequiredConfig = Required<BlockquoteConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'blockquote',
  getParagraphNodeType: defaultGetParagraphNodeType,
  keyWrap: false,
  keyToggle: false,
  keyMoveUp: 'Alt-ArrowUp',
  keyMoveDown: 'Alt-ArrowDown',
  keyInsertEmptyParaAbove: 'Mod-Shift-Enter',
  keyInsertEmptyParaBelow: 'Mod-Enter',
};

export function setupBlockquote(userConfig?: BlockquoteConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };
  const { name } = config;

  const nodes = {
    [name]: schemaBasicNodes.blockquote,
  } satisfies Record<string, NodeSpec>;

  const plugin = {
    inputRules: pluginInputRules(config),
    keybindings: pluginKeybindings(config),
  };

  const command = {
    wrapBlockquote: wrapBlockquote(config),
    insertBlockquote: insertBlockquote(config),
    toggleBlockquote: toggleBlockquote(config),
    moveBlockquoteUp: moveBlockquoteUp(config),
    moveBlockquoteDown: moveBlockquoteDown(config),
    insertEmptyParaAbove: insertEmptyParaAboveBlockquote(config),
    insertEmptyParaBelow: insertEmptyParaBelowBlockquote(config),
  };

  return collection({
    id: 'blockquote',
    nodes,
    plugin,
    command,
    query: {
      isBlockquoteActive: isBlockquoteActive(config),
    },
    markdown: markdown(config),
  });
}

// PLUGINS
function pluginInputRules(config: RequiredConfig) {
  const { name } = config;
  return ({ schema }: PluginContext) => {
    const node = schema.nodes[name];
    if (!node) {
      throw new Error(`Node ${name} not found in schema`);
    }
    return inputRules({
      rules: [wrappingInputRule(/^\s*>\s$/, node)],
    });
  };
}

function pluginKeybindings(config: RequiredConfig) {
  return () => {
    return keybinding(
      [
        [config.keyWrap, wrapBlockquote(config)],
        [config.keyToggle, toggleBlockquote(config)],
        [config.keyMoveUp, moveBlockquoteUp(config)],
        [config.keyMoveDown, moveBlockquoteDown(config)],
        [
          config.keyInsertEmptyParaAbove,
          insertEmptyParaAboveBlockquote(config),
        ],
        [
          config.keyInsertEmptyParaBelow,
          insertEmptyParaBelowBlockquote(config),
        ],
      ],
      'blockquote',
    );
  };
}

// COMMANDS
function wrapBlockquote(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    const type = getNodeType(state.schema, name);
    return wrapIn(type)(state, dispatch);
  };
}

function insertBlockquote(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    const type = getNodeType(state.schema, name);
    const node = type.createAndFill();
    if (!node) {
      return false;
    }

    dispatch?.(state.tr.replaceSelectionWith(node));
    return true;
  };
}

function toggleBlockquote(config: RequiredConfig): Command {
  return (state, dispatch) => {
    if (isBlockquoteActive(config)(state)) {
      return lift(state, dispatch);
    }
    return wrapBlockquote(config)(state, dispatch);
  };
}

function moveBlockquoteUp(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    const type = getNodeType(state.schema, name);
    return moveNode(type, 'UP')(state, dispatch);
  };
}

function moveBlockquoteDown(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    const type = getNodeType(state.schema, name);
    return moveNode(type, 'DOWN')(state, dispatch);
  };
}

function insertEmptyParaAboveBlockquote(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    const type = getNodeType(state.schema, name);
    return insertEmptyParagraphAboveNode(type, config.getParagraphNodeType)(
      state,
      dispatch,
    );
  };
}

function insertEmptyParaBelowBlockquote(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    const type = getNodeType(state.schema, name);
    return insertEmptyParagraphBelowNode(type, config.getParagraphNodeType)(
      state,
      dispatch,
    );
  };
}

// QUERIES
export function isBlockquoteActive(config: RequiredConfig): Command {
  const { name } = config;
  return (state) => {
    const type = getNodeType(state.schema, name);
    return Boolean(findParentNodeOfType(type)(state.selection));
  };
}

// MARKDOWN
function markdown(config: RequiredConfig): CollectionType['markdown'] {
  const { name } = config;
  return {
    nodes: {
      [name]: {
        toMarkdown: (state, node) => {
          state.wrapBlock('> ', null, node, () => state.renderContent(node));
        },
        parseMarkdown: {
          blockquote: {
            block: name,
          },
        },
      },
    },
  };
}
