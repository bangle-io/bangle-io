import { type CollectionType, collection, keybinding } from './common';
import type { Command, EditorState, NodeSpec, NodeType, Schema } from './pm';
import { setBlockType } from './pm';
import { inputRules, textblockTypeInputRule } from './pm';
import { findParentNodeOfType } from './pm-utils';
import { insertEmptyParagraphBelowNode } from './pm-utils';
import {
  type PluginContext,
  defaultGetParagraphNodeType,
  getNodeType,
} from './pm-utils';

export type CodeBlockConfig = {
  name?: string;
  getParagraphNodeType?: (arg: Schema) => NodeType;
  // keys
  keyToCodeBlock?: string | false;
  keyExit?: string | false;
};

type RequiredConfig = Required<CodeBlockConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'code_block',
  getParagraphNodeType: defaultGetParagraphNodeType,
  keyToCodeBlock: 'Mod-\\\\',
  keyExit: 'Enter',
};

export function setupCodeBlock(userConfig?: CodeBlockConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const { name } = config;

  const nodes: Record<string, NodeSpec> = {
    [name]: {
      attrs: {
        language: { default: '' },
      },
      content: 'text*',
      marks: '',
      group: 'block',
      code: true,
      defining: true,
      draggable: false,
      parseDOM: [
        {
          tag: 'pre',
          preserveWhitespace: 'full',
          getAttrs: (dom: HTMLElement) => ({
            language: dom.getAttribute('data-language') || '',
          }),
        },
      ],
      toDOM: (node) => [
        'pre',
        { 'data-language': node.attrs.language },
        ['code', 0],
      ],
    },
  };

  const plugin = {
    inputRules: pluginInputRules(config),
    keybindings: pluginKeybindings(config),
  };

  return collection({
    id: 'code-block',
    nodes,
    plugin,
    command: {
      toggleCodeBlock: toggleCodeBlock(config),
    },
    query: {
      isCodeBlockActive: isCodeBlockActive(config),
    },
    markdown: markdown(config),
  });
}

// PLUGINS
function pluginInputRules(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    const { name } = config;
    const type = getNodeType(schema, name);
    return inputRules({
      rules: [textblockTypeInputRule(/^```$/, type)],
    });
  };
}

function pluginKeybindings(config: RequiredConfig) {
  return keybinding([[config.keyExit, exitCodeBlock(config)]], 'code-block');
}

// COMMANDS
function exitCodeBlock(config: RequiredConfig): Command {
  return (state, dispatch) => {
    const { selection } = state;
    const { name, getParagraphNodeType } = config;
    const codeBlockType = getNodeType(state.schema, name);
    const { $from, from, empty } = selection;
    const node = findParentNodeOfType(codeBlockType)(state.selection);

    // Must have empty selection inside a code block
    if (!empty || !node) {
      return false;
    }

    if (dispatch) {
      const isAtEnd = from === $from.end(node.depth);
      const isAtStart = from === node.start;
      const lastNode =
        isAtEnd && !isAtStart
          ? $from.doc.nodeAt(
              // gives the last position inside node
              $from.end(node.depth) - 1,
            )
          : null;

      const breakNode =
        lastNode?.isText &&
        lastNode.textContent[lastNode.textContent.length - 1] === '\n';

      if (isAtEnd && !isAtStart && breakNode) {
        // Case 1: User presses enter and the previous inline node is a hard break, and the line is empty
        insertEmptyParagraphBelowNode(codeBlockType, getParagraphNodeType)(
          state,
          dispatch,
        );
        return true;
      }
      if (isAtStart && isAtEnd) {
        // Case 2: User presses enter and the entire text in the code block is empty
        insertEmptyParagraphBelowNode(codeBlockType, getParagraphNodeType)(
          state,
          dispatch,
        );
        return true;
      }
    }

    return false;
  };
}

function toggleCodeBlock(config: RequiredConfig): Command {
  return (state, dispatch) => {
    const { name } = config;
    const codeBlockType = getNodeType(state.schema, name);
    const paraType = config.getParagraphNodeType(state.schema);

    if (isCodeBlockActive(config)(state)) {
      return setBlockType(paraType)(state, dispatch);
    }
    return setBlockType(codeBlockType)(state, dispatch);
  };
}

// QUERY
function isCodeBlockActive(config: RequiredConfig) {
  return (state: EditorState) => {
    const { name } = config;
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
        toMarkdown(state, node) {
          state.write(`\`\`\`${node.attrs.language || ''}\n`);
          state.text(node.textContent, false);
          state.ensureNewLine();
          state.write('```');
          state.closeBlock(node);
        },
        parseMarkdown: {
          code_block: { block: name, noCloseToken: true },
          fence: {
            block: name,
            getAttrs: (tok) => ({ language: tok.info || '' }),
            noCloseToken: true,
          },
        },
      },
    },
  };
}
