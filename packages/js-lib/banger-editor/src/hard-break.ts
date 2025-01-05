import { type CollectionType, collection, keybinding } from './common';
import type { Command } from './pm';
import { exitCode } from './pm';
import { chainCommands } from './pm';
import type { NodeSpec } from './pm';
import type { DOMOutputSpec } from './pm';
import { getNodeType } from './pm-utils';

export type HardBreakConfig = {
  name?: string;
  // keys
  keyInsert?: string | false;
};

type RequiredConfig = Required<HardBreakConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'hard_break',
  keyInsert: 'Shift-Enter',
};

export function setupHardBreak(userConfig?: HardBreakConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const { name } = config;

  const nodes = {
    [name]: {
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [{ tag: 'br' }],
      toDOM: (): DOMOutputSpec => ['br'],
    } satisfies NodeSpec,
  };

  const plugin = {
    keybindings: pluginKeybindings(config),
  };

  return collection({
    id: 'hard-break',
    nodes,
    plugin,
    command: {
      insertHardBreak: insertHardBreak(config),
    },
    markdown: markdown(config),
  });
}

// PLUGINS
function pluginKeybindings(config: RequiredConfig) {
  return keybinding(
    [[config.keyInsert, insertHardBreak(config)]],
    'hard-break',
  );
}

// COMMANDS
function insertHardBreak(config: RequiredConfig): Command {
  // This command tries exitCode first, then fallback to inserting a hardBreak.
  const { name } = config;
  return (state, dispatch) => {
    const type = getNodeType(state.schema, name);
    return chainCommands(exitCode, (state, dispatch) => {
      if (dispatch) {
        dispatch(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
      }
      return true;
    })(state, dispatch);
  };
}

// MARKDOWN
function markdown(config: RequiredConfig): CollectionType['markdown'] {
  const { name } = config;
  return {
    nodes: {
      [name]: {
        toMarkdown(state, node, parent, index) {
          for (let i = index + 1; i < parent.childCount; i++) {
            if (parent.child(i).type !== node.type) {
              state.write('\\\n');
              return;
            }
          }
        },
        parseMarkdown: {
          // this is different from the `name` of the node, and dictated by markdown parser
          hardbreak: {
            node: config.name,
          },
        },
      },
    },
  };
}
