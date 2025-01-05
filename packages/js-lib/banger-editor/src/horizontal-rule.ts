import { type CollectionType, collection, keybinding } from './common';
import type { Command, NodeType } from './pm';
import { InputRule, inputRules } from './pm';
import type { NodeSpec, Schema } from './pm';
import { safeInsert } from './pm-utils';
import {
  type PluginContext,
  defaultGetParagraphNodeType,
  getNodeType,
} from './pm-utils';

export type HorizontalRuleConfig = {
  name?: string;
  markdownShortcut?: boolean;
  getParagraphNodeType: (schema: Schema) => NodeType;
  keyInsert?: string | false;
};

type RequiredConfig = Required<HorizontalRuleConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'horizontalRule',
  markdownShortcut: true,
  getParagraphNodeType: defaultGetParagraphNodeType,
  keyInsert: 'Mod-Shift-h',
};

export function setupHorizontalRule(userConfig?: HorizontalRuleConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const { name } = config;

  const nodes = {
    [name]: {
      group: 'block',
      parseDOM: [{ tag: 'hr' }],
      toDOM: () => ['hr'],
    } satisfies NodeSpec,
  };

  const plugin = {
    inputRules: pluginInputRules(config),
    keybindings: pluginKeybindings(config),
  };

  return collection({
    id: 'horizontal_rule',
    nodes,
    plugin,
    command: {
      insertHorizontalRule: insertHorizontalRule(config),
    },
    markdown: markdown(config),
  });
}

// PLUGINS
function pluginInputRules(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    const { name, markdownShortcut } = config;
    if (!markdownShortcut) {
      return null;
    }

    const type = getNodeType(schema, name);

    return inputRules({
      rules: [
        new InputRule(
          /^(?:---|___\s|\*\*\*\s)$/,
          (state, match, start, end) => {
            if (!match[0]) {
              return null;
            }
            const tr = state.tr.replaceWith(
              start - 1,
              end,
              type.createChecked(),
            );
            // Find the paragraph that contains the "---" shortcut text, we need
            // it below for deciding whether to insert a new paragraph after the
            // hr.
            const $para = state.doc.resolve(start);

            let insertParaAfter = false;
            if ($para.end() !== end) {
              // if the paragraph has more characters, e.g. "---abc", then no
              // need to insert a new paragraph
              insertParaAfter = false;
            } else if ($para.after() === $para.end(-1)) {
              // if the paragraph is the last child of its parent, then insert a
              // new paragraph
              insertParaAfter = true;
            } else {
              // biome-ignore lint/style/noNonNullAssertion: <explanation>
              const nextNode = state.doc.resolve($para.after()).nodeAfter!;
              // if the next node is a hr, then insert a new paragraph
              insertParaAfter = nextNode.type === type;
            }
            return insertParaAfter
              ? safeInsert(
                  config.getParagraphNodeType(state.schema).createChecked(),
                  tr.mapping.map($para.after()),
                )(tr)
              : tr;
          },
        ),
      ],
    });
  };
}

function pluginKeybindings(config: RequiredConfig) {
  return keybinding(
    [[config.keyInsert, insertHorizontalRule(config)]],
    'horizontal-rule',
  );
}

// COMMANDS
function insertHorizontalRule(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    const type = getNodeType(state.schema, name);
    const { $from } = state.selection;
    const pos = $from.end();

    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const tr = safeInsert(type.createAndFill()!, pos)(state.tr);
    if (tr) {
      dispatch?.(tr);
      return true;
    }

    return false;
  };
}

// MARKDOWN
function markdown(config: RequiredConfig): CollectionType['markdown'] {
  const { name } = config;
  return {
    nodes: {
      [name]: {
        toMarkdown: (state, node) => {
          state.write(node.attrs.markup || '---');
          state.closeBlock(node);
        },
        parseMarkdown: {
          hr: {
            node: name,
          },
        },
      },
    },
  };
}
