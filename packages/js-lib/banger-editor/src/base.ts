import { nodes as schemaBasicNodes } from 'prosemirror-schema-basic';
import { keybinding } from './common';
import { type CollectionType, collection, setPriority } from './common';
import { PRIORITY } from './common';
import type { Command, NodeSpec } from './pm';
import { baseKeymap } from './pm';
import { undoInputRule } from './pm';
import { safeInsert } from './pm-utils';

export type BaseConfig = {
  nameDoc?: string;
  nameText?: string;
  /**
   * Let user undo input rule by pressing backspace.
   * @default true
   */
  backspaceToUndoInputRule?: boolean;
  /**
   * Let user undo input rule by pressing this key.
   * @default 'Mod-z'
   */
  keyUndoInputRule?: string | false;
  /**
   * Prevent Tab key from moving focus out of the editor.
   * When true, Tab and Shift-Tab keys will be handled by the editor
   * and won't bubble to the browser (only if no other keymap handles them).
   * @default true
   */
  trapTabKey?: boolean;
};

type RequiredConfig = Required<BaseConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  nameDoc: 'doc',
  nameText: 'text',
  backspaceToUndoInputRule: true,
  keyUndoInputRule: 'Mod-z',
  trapTabKey: true,
};

export function setupBase(userConfig?: BaseConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const { nameDoc, nameText } = config;

  const nodes = {
    [nameDoc]: setPriority(schemaBasicNodes.doc, PRIORITY.baseSpec),
    [nameText]: setPriority(schemaBasicNodes.text, PRIORITY.baseSpec),
  } satisfies Record<string, NodeSpec>;

  const plugin = {
    baseKeymap: keybinding(baseKeymap, 'baseKeymap', PRIORITY.baseKeymap),
    undoInputRule: () =>
      keybinding(
        [
          [
            config.backspaceToUndoInputRule ? 'Backspace' : false,
            undoInputRule,
          ],
          [config.keyUndoInputRule, undoInputRule],
        ],
        'backspaceToUndoInputRule',
        PRIORITY.baseUndoInputRuleKey,
      ),
    trapTabKey: keybinding(
      {
        Tab: trapTabCommand(config),
        'Shift-Tab': trapTabCommand(config),
      },
      'trapTabKey',
      // Use the lowest priority so this only runs after all other plugins
      PRIORITY.baseKeymap,
    ),
  };

  const command = {
    insertText: insertText(),
  };

  return collection({
    id: 'base',
    nodes,
    plugin,
    command,
    markdown: markdown(config),
  });
}

// COMMANDS
export function insertText() {
  return ({ text }: { text?: string } = {}): Command =>
    (state, dispatch) => {
      if (text) {
        const node = state.schema.text(text);
        dispatch?.(safeInsert(node)(state.tr));
      }
      return true;
    };
}

/**
 * Command to trap Tab key in the editor.
 * Simply returns true to indicate we've handled the key, preventing it from bubbling up.
 */
function trapTabCommand(config: RequiredConfig): Command {
  return () => {
    if (config.trapTabKey) {
      return true;
    }
    return false;
  };
}

// MARKDOWN
function markdown(_config: RequiredConfig): CollectionType['markdown'] {
  return {
    nodes: {
      text: {
        toMarkdown(state, node) {
          state.text(node.text ?? '');
        },
      },
    },
  };
}
