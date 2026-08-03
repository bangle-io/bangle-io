import { highlightTokenizer } from '@bangle.io/markdown-syntax';
import { type CollectionType, collection } from './common';
import type { Command, EditorState, MarkSpec, Schema } from './pm';
import { inputRules, toggleMark } from './pm';
import {
  getMarkType,
  isMarkActiveInSelection,
  markInputRule,
  markPastePlugin,
} from './pm-utils';

export type HighlightConfig = {
  name?: string;
};

type RequiredConfig = Required<HighlightConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'highlight',
};

export function setupHighlight(userConfig?: HighlightConfig) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const { name } = config;

  return collection({
    id: 'highlight',
    marks: {
      [name]: {
        parseDOM: [{ tag: 'mark' }],
        toDOM: (): ['mark', 0] => ['mark', 0],
      } satisfies MarkSpec,
    },
    plugin: {
      inputRules: pluginInputRules(config),
      pasteRules: pluginPasteRules(config),
    },
    command: {
      toggleHighlight: toggleHighlight(config),
    },
    query: {
      isHighlightActive: isHighlightActive(config),
    },
    markdown: markdown(config),
  });
}

function pluginInputRules(config: RequiredConfig) {
  return ({ schema }: { schema: Schema }) => {
    const type = getMarkType(schema, config.name);
    return inputRules({
      rules: [
        markInputRule(
          /(?:^|\s)((?:==)((?:[^=\s](?:[^=]*[^=\s])?))(?:==))$/,
          type,
        ),
      ],
    });
  };
}

function pluginPasteRules(config: RequiredConfig) {
  return ({ schema }: { schema: Schema }) => {
    const type = getMarkType(schema, config.name);
    return markPastePlugin(
      /(?:^|\s)((?:==)((?:[^=\s](?:[^=]*[^=\s])?))(?:==))/g,
      type,
    );
  };
}

function toggleHighlight(config: RequiredConfig): Command {
  return (state, dispatch) => {
    const markType = state.schema.marks[config.name];
    return markType ? toggleMark(markType)(state, dispatch) : false;
  };
}

function isHighlightActive(config: RequiredConfig) {
  return (state: EditorState) => {
    const markType = state.schema.marks[config.name];
    return markType ? isMarkActiveInSelection(markType, state) : false;
  };
}

function markdown(config: RequiredConfig): CollectionType['markdown'] {
  return {
    tokenizerPlugins: [highlightTokenizer],
    marks: {
      [config.name]: {
        toMarkdown: {
          open: '==',
          close: '==',
          mixable: true,
          expelEnclosingWhitespace: true,
        },
        parseMarkdown: {
          highlight: { mark: config.name },
        },
      },
    },
  };
}
