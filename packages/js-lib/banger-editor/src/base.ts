import { nodes as schemaBasicNodes } from 'prosemirror-schema-basic';
import {
  type CollectionType,
  collection,
  keybinding,
  PRIORITY,
  setPriority,
} from './common';
import type { Command, NodeSpec } from './pm';
import { baseKeymap, undoInputRule } from './pm';
import { safeInsert } from './pm-utils';

export type BaseConfig = {
  nameDoc?: string;
  nameText?: string;
  /**
   * Content expression for the top-level doc node. Override it to allow
   * nodes that live outside the `block` group, e.g.
   * `'frontmatter? block+'` to permit a single leading frontmatter block.
   * @default 'block+'
   */
  docContent?: string;
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
   * Forward Tab still reaches focusable editor chrome rendered inside the
   * contenteditable, so embedded controls remain keyboard accessible.
   * @default true
   */
  trapTabKey?: boolean;
};

type RequiredConfig = Required<BaseConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  nameDoc: 'doc',
  nameText: 'text',
  docContent: 'block+',
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
    [nameDoc]: setPriority(
      { ...schemaBasicNodes.doc, content: config.docContent },
      PRIORITY.baseSpec,
    ),
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
        Tab: trapTabCommand(config, { enterEditorChrome: true }),
        'Shift-Tab': trapTabCommand(config, { enterEditorChrome: false }),
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
function trapTabCommand(
  config: RequiredConfig,
  { enterEditorChrome }: { enterEditorChrome: boolean },
): Command {
  return (_state, _dispatch, view) => {
    if (!config.trapTabKey) {
      return false;
    }
    if (
      enterEditorChrome &&
      view !== undefined &&
      view.dom.ownerDocument.activeElement === view.dom &&
      hasFocusableEditorChrome(view.dom)
    ) {
      // Let the browser perform its native sequential-focus step from the
      // contenteditable root into the first embedded editor control.
      return false;
    }
    return true;
  };
}

function hasFocusableEditorChrome(editor: HTMLElement): boolean {
  return [...editor.querySelectorAll<HTMLElement>('[data-editor-chrome]')].some(
    (chrome) =>
      [
        ...chrome.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, a[href], [tabindex]',
        ),
      ].some(
        (control) =>
          control.tabIndex >= 0 &&
          !control.hasAttribute('disabled') &&
          control.getAttribute('aria-disabled') !== 'true',
      ),
  );
}

// MARKDOWN
function markdown(_config: RequiredConfig): CollectionType['markdown'] {
  return {
    nodes: {
      text: {
        toMarkdown(state, node) {
          // Text inside an autolink (`<https://…>`) must be written raw:
          // escaping would inject backslashes into the URL itself
          // (`<https://x/\_file>`). The link mark's serializer sets
          // `inAutolink` (same protocol as prosemirror-markdown's default
          // serializer; the field is @internal and stripped from the
          // published typings, hence the widening cast — same pattern as
          // table-markdown.ts's SerializerInternals).
          const { inAutolink } = state as typeof state & {
            inAutolink?: boolean;
          };
          state.text(node.text ?? '', !inAutolink);
        },
      },
    },
  };
}
