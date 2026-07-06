import { frontmatterTokenizer } from '@bangle.io/markdown-syntax';
import {
  type CollectionType,
  collection,
  keybinding,
  PRIORITY,
  setPluginPriority,
} from './common';
import type { Command, EditorState, NodeSpec } from './pm';
import { InputRule, inputRules, TextSelection } from './pm';
import { findParentNodeOfType, getNodeType } from './pm-utils';

export type FrontmatterConfig = {
  name?: string;
  // keys
  keyBackspace?: string | false;
  keyExit?: string | false;
  keyIndent?: string | false;
  keyMoveToNextBlock?: string | false;
  indentText?: string;
};

type RequiredConfig = Required<FrontmatterConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'frontmatter',
  keyBackspace: 'Backspace',
  keyExit: 'Enter',
  keyIndent: 'Tab',
  keyMoveToNextBlock: 'ArrowDown',
  indentText: '  ',
};

/**
 * A YAML frontmatter block. It shares the raw-text editing feel of a code
 * block (`code: true`, plain text content, no marks) but is deliberately its
 * own node type and NOT part of the `block` group: it is only valid where the
 * doc content expression explicitly allows it. Consumers must opt in by
 * widening the doc node, e.g. `setupBase({ docContent: 'frontmatter? block+' })`,
 * which lets the schema itself guarantee there is at most one frontmatter and
 * that it can only ever sit at the very top of the document.
 */
export function setupFrontmatter(userConfig?: FrontmatterConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const { name } = config;

  const nodes: Record<string, NodeSpec> = {
    [name]: {
      content: 'text*',
      marks: '',
      code: true,
      defining: true,
      // Keep Backspace/joins at the boundary from merging body text into the
      // metadata block.
      isolating: true,
      draggable: false,
      parseDOM: [
        {
          tag: 'pre[data-frontmatter]',
          preserveWhitespace: 'full',
          // Outrank the code block's plain `pre` rule.
          priority: 60,
        },
      ],
      toDOM: () => ['pre', { 'data-frontmatter': '' }, ['code', 0]],
    },
  };

  const plugin = {
    keybindings: pluginKeybindings(config),
    inputRules: pluginInputRules(config),
  };

  return collection({
    id: 'frontmatter',
    nodes,
    plugin,
    command: {
      deleteFrontmatter: deleteFrontmatter(config),
      insertFrontmatter: insertFrontmatter(config),
    },
    query: {
      hasFrontmatter: hasFrontmatter(config),
      isFrontmatterActive: isFrontmatterActive(config),
    },
    markdown: markdown(config),
  });
}

function pluginKeybindings(config: RequiredConfig) {
  return keybinding(
    [
      [config.keyBackspace, backspaceEmptyFrontmatter(config)],
      [config.keyExit, exitFrontmatter(config)],
      [config.keyIndent, indentFrontmatter(config)],
      [config.keyMoveToNextBlock, moveToBlockBelow(config)],
    ],
    'frontmatter',
    PRIORITY.high,
  );
}

/**
 * Typing `---` at the very start of an empty leading paragraph converts it
 * into a frontmatter block, matching what note apps with frontmatter support
 * do. Registered above the horizontal rule's identical input rule; anywhere
 * else in the document the rule declines so `---` keeps producing an hr.
 */
function pluginInputRules(config: RequiredConfig) {
  return setPluginPriority(
    inputRules({
      rules: [
        new InputRule(/^---$/, (state, _match, start, end) => {
          const type = getNodeType(state.schema, config.name);
          const $start = state.doc.resolve(start);
          if (
            // only a top-level paragraph that is the doc's first child
            $start.depth !== 1 ||
            $start.index(0) !== 0 ||
            // and contains nothing besides the typed dashes
            $start.parent.content.size !== end - start ||
            state.doc.firstChild?.type === type ||
            !state.doc.type.contentMatch.matchType(type)
          ) {
            return null;
          }

          const tr = state.tr.delete(start, end);
          tr.insert(0, type.create());
          return tr.setSelection(TextSelection.create(tr.doc, 1));
        }),
      ],
    }),
    PRIORITY.high,
    'frontmatter-input-rule',
  );
}

// COMMANDS

/**
 * Inserts an empty frontmatter block at the top of the document and puts the
 * cursor inside it. When the document already has one, no second block is
 * added — the cursor moves into the existing block instead.
 */
function insertFrontmatter(config: RequiredConfig): Command {
  return (state, dispatch) => {
    const type = getNodeType(state.schema, config.name);
    const first = state.doc.firstChild;

    if (first?.type === type) {
      if (dispatch) {
        dispatch(
          state.tr
            .setSelection(
              TextSelection.create(state.doc, 1 + first.content.size),
            )
            .scrollIntoView(),
        );
      }
      return true;
    }

    // The doc content expression must explicitly allow a leading frontmatter.
    if (!state.doc.type.contentMatch.matchType(type)) {
      return false;
    }

    if (dispatch) {
      const tr = state.tr.insert(0, type.create());
      dispatch(
        tr.setSelection(TextSelection.create(tr.doc, 1)).scrollIntoView(),
      );
    }
    return true;
  };
}

/**
 * Deletes the document's frontmatter block, content and all. The selection
 * maps to the start of the remaining body.
 */
function deleteFrontmatter(config: RequiredConfig): Command {
  return (state, dispatch) => {
    const type = getNodeType(state.schema, config.name);
    const first = state.doc.firstChild;
    if (first?.type !== type) {
      return false;
    }

    if (dispatch) {
      dispatch(state.tr.delete(0, first.nodeSize).scrollIntoView());
    }
    return true;
  };
}

/**
 * Backspace at the start of an empty frontmatter removes the whole block, so
 * an unwanted insert is one keypress to undo.
 */
function backspaceEmptyFrontmatter(config: RequiredConfig): Command {
  return (state, dispatch) => {
    const { selection } = state;
    if (!selection.empty) {
      return false;
    }

    const type = getNodeType(state.schema, config.name);
    const node = findParentNodeOfType(type)(selection);
    if (!node || selection.from !== node.start || node.node.content.size > 0) {
      return false;
    }

    if (dispatch) {
      dispatch(
        state.tr
          .delete(node.pos, node.pos + node.node.nodeSize)
          .scrollIntoView(),
      );
    }
    return true;
  };
}

/**
 * Pressing Enter twice at the end of the block exits into the body: the
 * trailing blank line is removed and the cursor lands in the next block
 * (which always exists — the doc requires `block+` after the frontmatter).
 */
function exitFrontmatter(config: RequiredConfig): Command {
  return (state, dispatch) => {
    const { selection } = state;
    if (!selection.empty) {
      return false;
    }

    const type = getNodeType(state.schema, config.name);
    const node = findParentNodeOfType(type)(selection);
    if (!node) {
      return false;
    }

    const endPos = node.start + node.node.content.size;
    if (selection.from !== endPos || !node.node.textContent.endsWith('\n')) {
      return false;
    }

    if (dispatch) {
      const tr = state.tr.delete(endPos - 1, endPos);
      const afterNode = tr.doc.resolve(node.pos + node.node.nodeSize - 1);
      dispatch(
        tr.setSelection(TextSelection.near(afterNode, 1)).scrollIntoView(),
      );
    }
    return true;
  };
}

/**
 * ArrowDown from the last line moves the cursor into the block below. The
 * browser's native caret movement out of a `pre` is unreliable, so the jump
 * is explicit — same reason the code block binds its own ArrowDown.
 */
function moveToBlockBelow(config: RequiredConfig): Command {
  return (state, dispatch) => {
    const { selection } = state;
    if (!selection.empty) {
      return false;
    }

    const type = getNodeType(state.schema, config.name);
    const node = findParentNodeOfType(type)(selection);
    if (!node) {
      return false;
    }

    const { $from, from } = selection;
    const textAfterCursor = $from.parent.textBetween(
      $from.parentOffset,
      $from.parent.content.size,
    );
    const isAtEnd = from === node.start + node.node.content.size;
    const isOnLastLine = !textAfterCursor.includes('\n');
    if (!isAtEnd && !isOnLastLine) {
      return false;
    }

    if (dispatch) {
      const afterPos = state.doc.resolve(node.pos + node.node.nodeSize);
      dispatch(
        state.tr.setSelection(TextSelection.near(afterPos, 1)).scrollIntoView(),
      );
    }
    return true;
  };
}

function indentFrontmatter(config: RequiredConfig): Command {
  return (state, dispatch) => {
    const { selection } = state;
    if (!selection.empty) {
      return false;
    }

    const type = getNodeType(state.schema, config.name);
    if (!findParentNodeOfType(type)(selection)) {
      return false;
    }

    if (dispatch) {
      dispatch(state.tr.insertText(config.indentText).scrollIntoView());
    }
    return true;
  };
}

// QUERY
function hasFrontmatter(config: RequiredConfig) {
  return (state: EditorState) => {
    const type = getNodeType(state.schema, config.name);
    return state.doc.firstChild?.type === type;
  };
}

function isFrontmatterActive(config: RequiredConfig) {
  return (state: EditorState) => {
    const type = getNodeType(state.schema, config.name);
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
          state.write('---\n');
          if (node.textContent) {
            state.write(node.textContent);
            state.write('\n');
          }
          state.write('---');
          state.closeBlock(node);
        },
        parseMarkdown: {
          frontmatter: { block: name, noCloseToken: true },
        },
      },
    },
    tokenizerPlugins: [frontmatterTokenizer],
  };
}
