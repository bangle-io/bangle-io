import { type CollectionType, collection, keybinding } from './common';
import { toggleMark } from './pm';
import type { Command, EditorState } from './pm';
import { isMarkActiveInSelection } from './pm-utils';

export type UnderlineConfig = {
  name?: string;
  // keys
  keyToggle?: string | false;
};

type RequiredConfig = Required<UnderlineConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'underline',
  keyToggle: 'Mod-u',
};

export function setupUnderline(userConfig?: UnderlineConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const { name } = config;

  const plugin = {
    keybindings: pluginKeybindings(config),
  };

  return collection({
    id: 'underline',
    marks: {
      [name]: {
        // TODO: Not sure how to handle parseDOM and toDOM
        parseDOM: [
          {
            tag: 'u',
          },
          {
            style: 'text-decoration',
            getAttrs: (node) => (node === 'underline' ? {} : false),
          },
        ],
        toDOM: (): ['u', 0] => ['u', 0],
      },
    },
    plugin,
    command: {
      toggleUnderline: toggleUnderline(config),
    },
    query: {
      isUnderlineActive: isUnderlineActive(config),
    },
    markdown: markdown(config),
  });
}

// PLUGINS
function pluginKeybindings(config: RequiredConfig) {
  return keybinding([[config.keyToggle, toggleUnderline(config)]], 'underline');
}

// COMMANDS
function toggleUnderline(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch, _view) => {
    const markType = state.schema.marks[name];
    if (!markType) {
      return false;
    }

    return toggleMark(markType)(state, dispatch);
  };
}

function isUnderlineActive(config: RequiredConfig) {
  const { name } = config;
  return (state: EditorState) => {
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
    // TODO underline is not a real thing in markdown, what is the best option here?
    // I know this is cheating, but underlines are confusing
    // this moves them italic
    marks: {
      [name]: {
        toMarkdown: {
          open: '_',
          close: '_',
          mixable: true,
          expelEnclosingWhitespace: true,
        },
      },
    },
  };
}
