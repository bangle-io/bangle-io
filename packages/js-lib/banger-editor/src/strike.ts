import { type CollectionType, collection, keybinding } from './common';
import { toggleMark } from './pm';
import { inputRules } from './pm';
import type { MarkSpec, Schema } from './pm';
import type { Command, EditorState } from './pm';
import {
  getMarkType,
  isMarkActiveInSelection,
  markInputRule,
  markPastePlugin,
} from './pm-utils';

export type StrikeConfig = {
  name?: string;
  // keys
  keyToggle?: string | false;
};

type RequiredConfig = Required<StrikeConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'strike',
  keyToggle: 'Mod-d',
};

export function setupStrike(userConfig?: StrikeConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const { name } = config;

  const marks = {
    [name]: {
      parseDOM: [
        {
          tag: 's',
        },
        {
          tag: 'del',
        },
        {
          tag: 'strike',
        },
        {
          style: 'text-decoration',
          getAttrs: (node) => (node === 'line-through' ? {} : false),
        },
      ],
      toDOM: (): ['s', 0] => ['s', 0],
    } satisfies MarkSpec,
  };

  const plugin = {
    keybindings: pluginKeybindings(config),
    inputRules: pluginInputRules(config),
    pasteRules: pluginPasteRules(config),
  };

  return collection({
    id: 'strike',
    marks,
    plugin,
    command: {
      toggleStrike: toggleStrike(config),
    },
    query: {
      isStrikeActive: isStrikeActive(config),
    },
    markdown: markdown(config),
  });
}

// PLUGINS
function pluginKeybindings(config: RequiredConfig) {
  return keybinding([[config.keyToggle, toggleStrike(config)]], 'strike');
}

function pluginInputRules(config: RequiredConfig) {
  return ({ schema }: { schema: Schema }) => {
    const type = getMarkType(schema, config.name);
    return inputRules({
      rules: [markInputRule(/(?:^|\s)((?:~~)((?:[^~]+))(?:~~))$/, type)],
    });
  };
}

function pluginPasteRules(config: RequiredConfig) {
  return ({ schema }: { schema: Schema }) => {
    const type = getMarkType(schema, config.name);
    return markPastePlugin(/(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g, type);
  };
}

// COMMANDS
function toggleStrike(config: RequiredConfig): Command {
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
function isStrikeActive(config: RequiredConfig) {
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
          open: '~~',
          close: '~~',
          mixable: true,
          expelEnclosingWhitespace: true,
        },
        parseMarkdown: {
          s: { mark: 'strike' },
        },
      },
    },
  };
}
