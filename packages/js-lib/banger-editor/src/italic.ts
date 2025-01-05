import { keybinding } from './common';
import { type CollectionType, collection } from './common/collection';
import type { MarkSpec } from './pm';
import { toggleMark } from './pm';
import { inputRules } from './pm';
import type { Command, EditorState } from './pm';
import {
  type PluginContext,
  getMarkType,
  isMarkActiveInSelection,
  markInputRule,
  markPastePlugin,
} from './pm-utils';

export type ItalicConfig = {
  name?: string;
  // keys
  keyToggle?: string | false;
  // Controls whether pasting text with *text* or _text_ patterns will be converted to italic.
  enablePasteRules?: boolean;
};

type RequiredConfig = Required<ItalicConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'italic',
  keyToggle: 'Mod-i',
  enablePasteRules: true,
};

export function setupItalic(userConfig?: ItalicConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const { name } = config;

  const marks = {
    [name]: {
      parseDOM: [
        {
          tag: 'i',
          getAttrs: (node) => node.style.fontStyle !== 'normal' && null,
        },
        {
          tag: 'em',
        },
        { style: 'font-style=italic' },
        {
          style: 'font-style=normal',
          clearMark: (m) => m.type.name === name,
        },
      ],
      toDOM: (): ['em', 0] => ['em', 0],
    } satisfies MarkSpec,
  };

  const plugin = {
    keybindings: pluginKeybindings(config),
    inputRules: pluginInputRules(config),
    pluginPasteRules1: pluginPasteRules1(config),
    pluginPasteRules2: pluginPasteRules2(config),
  };

  return collection({
    id: 'italic',
    marks,
    plugin,
    command: {
      toggleItalic: toggleItalic(config),
    },
    query: {
      isItalicActive: isItalicActive(config),
    },
    markdown: markdown(config),
  });
}

// PLUGINS
function pluginKeybindings(config: RequiredConfig) {
  return () => {
    return keybinding([[config.keyToggle, toggleItalic(config)]], 'italic');
  };
}

function pluginInputRules(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    const type = getMarkType(schema, config.name);
    return inputRules({
      rules: [
        markInputRule(/(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/, type),
        markInputRule(/(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/, type),
      ],
    });
  };
}

function pluginPasteRules1(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    if (!config.enablePasteRules) {
      return null;
    }
    const type = getMarkType(schema, config.name);
    return markPastePlugin(/_([^_]+)_/g, type);
  };
}

function pluginPasteRules2(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    if (!config.enablePasteRules) {
      return null;
    }
    const type = getMarkType(schema, config.name);
    return markPastePlugin(/\*([^*]+)\*/g, type);
  };
}

// COMMANDS
function toggleItalic(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch, _view) => {
    const markType = state.schema.marks[name];
    if (!markType) {
      return false;
    }

    return toggleMark(markType)(state, dispatch);
  };
}

// QUERY
function isItalicActive(config: RequiredConfig) {
  return (state: EditorState) => {
    const { name } = config;
    const markType = state.schema.marks[name];
    if (!markType) {
      return false;
    }

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
          open: '_',
          close: '_',
          mixable: true,
          expelEnclosingWhitespace: true,
        },
        parseMarkdown: {
          em: { mark: 'italic' },
        },
      },
    },
  };
}
