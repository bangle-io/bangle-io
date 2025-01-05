import { collection } from '../common';
import type { Logger } from '../common';
import type { Selection } from '../pm';
import { inputRules } from '../pm';
import { triggerInputRule } from './input-rule';
import { suggestionKeymap } from './keymap';
import {
  type ReplacementContent,
  pluginSuggestion,
  removeSuggestMark,
  replaceSuggestMarkWith,
} from './plugin-suggestion';
import { suggestionsMark } from './suggestions-mark';

export * from './plugin-suggestion';
export * from './suggestions-mark';
export * from './keymap';
export * from './input-rule';

export type SuggestionConfig = {
  markName: string;
  trigger: string;
  markClassName: string;
  logger?: Logger;
};

export function setupSuggestions(config: SuggestionConfig) {
  const marks = {
    [config.markName]: suggestionsMark({
      markName: config.markName,
      className: config.markClassName,
      trigger: config.trigger,
    }),
  };

  const plugin = {
    inputRules: inputRules({ rules: [triggerInputRule(config)] }),
    keybindings: suggestionKeymap(),
    suggestion: pluginSuggestion(config),
  };

  return collection({
    id: 'suggestions',
    marks,
    plugin,
    command: {
      replaceSuggestMarkWith: ({
        content,
        focus,
      }: {
        content?: ReplacementContent;
        focus?: boolean;
      }) => {
        return replaceSuggestMarkWith({
          markName: config.markName,
          content,
          focus,
        });
      },
      removeSuggestMark: (selection: Selection) => {
        return removeSuggestMark({
          markName: config.markName,
          selection,
        });
      },
    },
    markdown: {
      marks: {
        [config.markName]: {
          toMarkdown: {
            open: () => '',
            close: () => '',
          },
        },
      },
    },
  });
}
