import {
  type Command,
  type EditorState,
  type NodeSpec,
  type NodeType,
  type PMNode,
  type Schema,
  setBlockType,
} from './pm';

import { type CollectionType, collection, isMac, keybinding } from './common';
import { inputRules, textblockTypeInputRule } from './pm';
import { findParentNodeOfType } from './pm-utils';
import {
  type KeyCode,
  type PluginContext,
  defaultGetParagraphNodeType,
  getNodeType,
  insertEmptyParagraphAboveNode,
  insertEmptyParagraphBelowNode,
  jumpToEndOfNode,
  jumpToStartOfNode,
  moveNode,
} from './pm-utils';

export type HeadingConfig = {
  name?: string;
  levels?: number[];
  getParagraphNodeType?: (arg: Schema) => NodeType;
  // keys
  keyToH1?: KeyCode;
  keyToH2?: KeyCode;
  keyToH3?: KeyCode;
  keyToH4?: KeyCode;
  keyToH5?: KeyCode;
  keyToH6?: KeyCode;
  keyMoveDown?: KeyCode;
  keyMoveUp?: KeyCode;
  keyEmptyCopy?: KeyCode;
  keyEmptyCut?: KeyCode;
  keyInsertEmptyParaAbove?: KeyCode;
  keyInsertEmptyParaBelow?: KeyCode;
  keyToggleCollapse?: KeyCode;
  keyJumpToStartOfHeading?: KeyCode;
  keyJumpToEndOfHeading?: KeyCode;
};

type RequiredConfig = Required<HeadingConfig> & {
  levels: NonNullable<Required<HeadingConfig>['levels']>;
};

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'heading',
  levels: [1, 2, 3, 4, 5, 6],
  getParagraphNodeType: defaultGetParagraphNodeType,
  keyToH1: isMac ? 'Mod-Alt-1' : 'Shift-Ctrl-1',
  keyToH2: isMac ? 'Mod-Alt-2' : 'Shift-Ctrl-2',
  keyToH3: isMac ? 'Mod-Alt-3' : 'Shift-Ctrl-3',
  keyToH4: false,
  keyToH5: false,
  keyToH6: false,
  keyMoveDown: 'Alt-ArrowDown',
  keyMoveUp: 'Alt-ArrowUp',
  keyEmptyCopy: false,
  keyEmptyCut: false,
  keyInsertEmptyParaAbove: 'Mod-Shift-Enter',
  keyInsertEmptyParaBelow: 'Mod-Enter',
  keyToggleCollapse: false,
  // TODO base keymap already handles these, it possible doesnt handle inline nodes (need to check)
  keyJumpToStartOfHeading: false,
  keyJumpToEndOfHeading: false,
};

export function setupHeading(userConfig?: HeadingConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  } as RequiredConfig;

  const { name } = config;

  const nodes: Record<string, NodeSpec> = {
    [name]: {
      attrs: {
        level: {
          default: 1,
        },
        collapseContent: {
          default: null,
        },
      },
      content: 'inline*',
      group: 'block',
      defining: true,
      draggable: false,
      parseDOM: config.levels.map((level) => {
        return {
          tag: `h${level}`,
          getAttrs: (dom: HTMLElement) => {
            const result = { level: parseLevel(level) };
            const attrs = dom.getAttribute('data-bangle-attrs');

            if (!attrs) {
              return result;
            }

            const obj = JSON.parse(attrs);

            return Object.assign({}, result, obj);
          },
        };
      }),
      toDOM: (node: PMNode) => {
        const result: any = [`h${node.attrs.level}`, {}, 0];

        if (node.attrs.collapseContent) {
          result[1]['data-bangle-attrs'] = JSON.stringify({
            collapseContent: node.attrs.collapseContent,
          });
          result[1].class = 'bangle-heading-collapsed';
        }

        return result;
      },
    },
  };

  const plugin = {
    inputRules: pluginInputRules(config),
    keybindings: pluginKeybindings(config),
  };

  return collection({
    id: 'heading',
    nodes,
    plugin,
    command: {
      toggleHeading: toggleHeading(config),
      insertEmptyParaAbove: insertEmptyParaAboveHeading(config),
      insertEmptyParaBelow: insertEmptyParaBelowHeading(config),
    },
    query: {
      isHeadingActive: isHeadingActive(config),
      isInsideHeading: isInsideHeading(config),
    },
    markdown: markdown(config),
  });
}

// PLUGINS
function pluginInputRules(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    const { name, levels } = config;
    const type = getNodeType(schema, name);
    return inputRules({
      rules: levels.map((level: number) =>
        textblockTypeInputRule(
          new RegExp(`^(#{1,${level}})\\s$`),
          type,
          () => ({
            level,
          }),
        ),
      ),
    });
  };
}

function pluginKeybindings(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    const { name, levels } = config;
    const type = getNodeType(schema, name);

    const levelBindings = levels.map(
      (level: number): [string | false, Command] => [
        (config as any)[`keyToH${level}`] ?? false,
        setBlockType(type, { level }),
      ],
    );

    return keybinding(
      [
        ...levelBindings,
        [config.keyMoveUp, moveNode(type, 'UP')],
        [config.keyMoveDown, moveNode(type, 'DOWN')],
        [config.keyJumpToStartOfHeading, jumpToStartOfNode(type)],
        [config.keyJumpToEndOfHeading, jumpToEndOfNode(type)],
        [config.keyInsertEmptyParaAbove, insertEmptyParaAboveHeading(config)],
        [config.keyInsertEmptyParaBelow, insertEmptyParaBelowHeading(config)],
      ],
      'heading',
    );
  };
}

const parseLevel = (levelStr: string | number) => {
  const level = Number.parseInt(levelStr as string, 10);
  return Number.isNaN(level) ? undefined : level;
};

// COMMANDS
function toggleHeading(config: RequiredConfig) {
  return (level?: number): Command => {
    return (state, dispatch) => {
      const { name } = config;
      if (isHeadingActive(config)(state, level)) {
        const para = config.getParagraphNodeType(state.schema);
        return setBlockType(para)(state, dispatch);
      }
      return setBlockType(getNodeType(state.schema, name), { level })(
        state,
        dispatch,
      );
    };
  };
}

function insertEmptyParaAboveHeading(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    const type = getNodeType(state.schema, name);
    return insertEmptyParagraphAboveNode(type, config.getParagraphNodeType)(
      state,
      dispatch,
    );
  };
}

function insertEmptyParaBelowHeading(config: RequiredConfig): Command {
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
function isInsideHeading(config: RequiredConfig) {
  return (state: EditorState) => {
    const { name } = config;
    const type = getNodeType(state.schema, name);
    return findParentNodeOfType(type)(state.selection);
  };
}

function isHeadingActive(config: RequiredConfig) {
  return (state: EditorState, level?: number) => {
    const { name } = config;
    const match = findParentNodeOfType(getNodeType(state.schema, name))(
      state.selection,
    );
    if (!match) {
      return false;
    }
    const { node } = match;
    if (level == null) {
      return true;
    }
    return node.attrs.level === level;
  };
}

// MARKDOWN
function markdown(config: RequiredConfig): CollectionType['markdown'] {
  return {
    nodes: {
      [config.name]: {
        toMarkdown(state, node: PMNode) {
          state.write(`${state.repeat('#', node.attrs.level)} `);
          state.renderInline(node);
          state.closeBlock(node);
        },
        parseMarkdown: {
          heading: {
            block: config.name,
            getAttrs: (tok) => {
              return { level: parseLevel(tok.tag.slice(1)) };
            },
          },
        },
      },
    },
  };
}
