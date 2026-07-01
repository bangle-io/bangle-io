import { type CollectionType, collection, keybinding } from './common';
import type { Command, EditorState, NodeSpec, NodeType, Schema } from './pm';
import { chainCommands, inputRules, setBlockType, TextSelection } from './pm';
import {
  defaultGetParagraphNodeType,
  findParentNodeOfType,
  getNodeType,
  insertEmptyParagraphAboveNode,
  insertEmptyParagraphBelowNode,
  type PluginContext,
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
  keyToCodeBlock: 'Mod-\\',
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
function pluginInputRules(_config: RequiredConfig) {
  return (_: PluginContext) => {
    return inputRules({
      rules: [],
    });
  };
}

function pluginKeybindings(config: RequiredConfig) {
  const convertCommand = convertFenceToCodeBlock(config);
  const exitCommand = exitCodeBlock(config);
  const keys: Array<[string | false, Command]> = [
    [config.keyToCodeBlock, toggleCodeBlock(config)],
    [
      'Enter',
      config.keyExit === 'Enter'
        ? chainCommands(convertCommand, exitCommand)
        : convertCommand,
    ],
    ['ArrowUp', moveOrInsertBoundaryParagraph(config, 'up')],
    ['ArrowDown', moveOrInsertBoundaryParagraph(config, 'down')],
  ];

  if (config.keyExit && config.keyExit !== 'Enter') {
    keys.push([config.keyExit, exitCommand]);
  }

  return keybinding(keys, 'code-block');
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

    const isAtEnd = from === $from.end(node.depth);
    const isAtStart = from === node.start;

    if (isAtEnd && node.node.textContent.endsWith('\n\n')) {
      if (dispatch) {
        const paragraph = getParagraphNodeType(state.schema).createAndFill();
        if (!paragraph) {
          return false;
        }

        const tr = state.tr.delete(from - 2, from);
        const insertPos = tr.mapping.map(node.pos + node.node.nodeSize, -1);
        tr.insert(insertPos, paragraph);
        tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
        dispatch(tr.scrollIntoView());
      }
      return true;
    }

    if (isAtStart && isAtEnd) {
      // Empty code blocks should not trap the cursor.
      return insertEmptyParagraphBelowNode(codeBlockType, getParagraphNodeType)(
        state,
        dispatch,
      );
    }

    return false;
  };
}

function moveOrInsertBoundaryParagraph(
  config: RequiredConfig,
  direction: 'up' | 'down',
): Command {
  return (state, dispatch, view) => {
    const { selection } = state;
    if (!selection.empty) {
      return false;
    }

    const codeBlockType = getNodeType(state.schema, config.name);
    const node = findParentNodeOfType(codeBlockType)(selection);
    if (!node) {
      return false;
    }

    const { $from, from } = selection;
    const isAtStart = from === node.start;
    const isAtEnd = from === $from.end(node.depth);
    const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset);
    const textAfterCursor = $from.parent.textBetween(
      $from.parentOffset,
      $from.parent.content.size,
    );
    const isOnFirstLine = !textBeforeCursor.includes('\n');
    const isOnLastLine = !textAfterCursor.includes('\n');
    const isAtBoundary =
      direction === 'up'
        ? isAtStart || isOnFirstLine || Boolean(view?.endOfTextblock('up'))
        : isAtEnd || isOnLastLine || Boolean(view?.endOfTextblock('down'));
    const parentDepth = node.depth - 1;
    const parent = $from.node(parentDepth);
    const index = $from.index(parentDepth);
    const isFirstChild = index === 0;
    const isLastChild = index === parent.childCount - 1;

    if (direction === 'up' && isAtBoundary) {
      if (!isFirstChild) {
        const previous = parent.child(index - 1);
        if (previous.isTextblock) {
          if (dispatch) {
            const previousPos = node.pos - previous.nodeSize;
            dispatch(
              state.tr
                .setSelection(
                  TextSelection.create(
                    state.doc,
                    previousPos + 1 + previous.content.size,
                  ),
                )
                .scrollIntoView(),
            );
          }
          return true;
        }
      }

      return insertEmptyParagraphAboveNode(
        codeBlockType,
        config.getParagraphNodeType,
      )(state, dispatch);
    }

    if (direction === 'down' && isAtBoundary) {
      if (!isLastChild) {
        const next = parent.child(index + 1);
        if (next.isTextblock) {
          if (dispatch) {
            const nextPos = node.pos + node.node.nodeSize;
            dispatch(
              state.tr
                .setSelection(TextSelection.create(state.doc, nextPos + 1))
                .scrollIntoView(),
            );
          }
          return true;
        }
      }

      return insertEmptyParagraphBelowNode(
        codeBlockType,
        config.getParagraphNodeType,
      )(state, dispatch);
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

function convertFenceToCodeBlock(config: RequiredConfig): Command {
  return (state, dispatch) => {
    const { selection } = state;
    if (!selection.empty) {
      return false;
    }

    const { $from } = selection;
    const paragraphType = config.getParagraphNodeType(state.schema);

    if ($from.parent.type !== paragraphType || selection.from !== $from.end()) {
      return false;
    }

    const text = $from.parent.textContent;
    const match = text.match(/^```(?:([A-Za-z0-9_+-]+))?$/);
    if (!match) {
      return false;
    }

    if (dispatch) {
      const codeBlockType = getNodeType(state.schema, config.name);
      const language = match[1] || '';
      const from = $from.start();
      const to = $from.end();
      const tr = state.tr
        .setBlockType(from, to, codeBlockType, { language })
        .delete(from, to);

      dispatch(tr.scrollIntoView());
    }

    return true;
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
