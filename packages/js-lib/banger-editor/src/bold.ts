import { keybinding } from './common';
import { type CollectionType, collection } from './common';
import { toggleMark } from './pm';
import { inputRules } from './pm';
import type { MarkSpec } from './pm';
import type { Command, EditorState } from './pm';
import {
  type PluginContext,
  getMarkType,
  isMarkActiveInSelection,
  markInputRule,
  markPastePlugin,
} from './pm-utils';

export type BoldConfig = {
  name?: string;
  keyToggle?: string | false;
};

type RequiredConfig = Required<BoldConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'bold',
  keyToggle: 'Mod-b',
};

export function setupBold(userConfig: BoldConfig = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };
  const { name } = config;

  const marks: Record<string, MarkSpec> = {
    [name]: {
      parseDOM: [
        { tag: 'strong' },
        {
          tag: 'b',
          getAttrs: (node) => node.style.fontWeight !== 'normal' && null,
        },
        {
          style: 'font-weight',
          getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null,
        },
      ],
      toDOM: () => ['strong', 0] as const,
    },
  };

  const plugin = {
    inputRules: pluginInputRules(config),
    pasteRules1: pluginPasteRules1(config),
    pasteRules2: pluginPasteRules2(config),
    keybindings: pluginKeybindings(config),
  };

  return collection({
    id: 'bold',
    marks,
    plugin,
    command: {
      toggleBold: toggleBold(config),
    },
    query: {
      isBoldActive: isBoldActive(config),
    },
    markdown: markdown(config),
  });
}

// PLUGINS
function pluginInputRules(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    const type = getMarkType(schema, config.name);

    return inputRules({
      rules: [
        markInputRule(/(?:^|\s)((?:\*\*)((?:[^*]+))(?:\*\*))$/, type),
        markInputRule(/(?:^|\s)((?:__)((?:[^__]+))(?:__))$/, type),
      ],
    });
  };
}

function pluginPasteRules1(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    const type = getMarkType(schema, config.name);
    return markPastePlugin(/(?:^|\s)((?:\*\*)((?:[^*]+))(?:\*\*))/g, type);
  };
}

function pluginPasteRules2(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    const type = getMarkType(schema, config.name);
    return markPastePlugin(/(?:^|\s)((?:__)((?:[^__]+))(?:__))/g, type);
  };
}

function pluginKeybindings(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    const type = getMarkType(schema, config.name);
    return keybinding([[config.keyToggle, toggleMark(type)]], 'bold');
  };
}

// COMMAND
function toggleBold(config: RequiredConfig): Command {
  return (state, dispatch) => {
    const markType = getMarkType(state.schema, config.name);

    return toggleMark(markType)(state, dispatch);
  };
}

// QUERY
function isBoldActive(config: RequiredConfig) {
  return (state: EditorState) => {
    const markType = getMarkType(state.schema, config.name);

    return isMarkActiveInSelection(markType, state);
  };
}

// MARKDOWN
function markdown(config: RequiredConfig): CollectionType['markdown'] {
  const { name } = config;
  return {
    marks: {
      [name]: {
        toMarkdown: {
          open: '**',
          close: '**',
          mixable: true,
          expelEnclosingWhitespace: true,
        },
        parseMarkdown: { strong: { mark: name } },
      },
    },
  };
}
