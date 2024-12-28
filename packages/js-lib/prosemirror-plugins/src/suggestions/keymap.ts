import type { Command } from '@prosekit/pm/state';
import { editorStore } from '../pm-utils/store';
import {
  $suggestion,
  $suggestionUi,
  removeSuggestMark,
  replaceSuggestMarkWith,
} from './plugin-suggestion';

export const suggestionKeymap = () =>
  ({
    Escape: (state, dispatch, view) => {
      const suggestion = editorStore.get(state, $suggestion);
      if (suggestion) {
        return removeSuggestMark({
          markName: suggestion.markName,
          selection: state.selection,
        })(state, dispatch, view);
      }
      return false;
    },
    ArrowDown: (state) => {
      const suggestion = editorStore.get(state, $suggestion);
      if (suggestion) {
        editorStore.set(state, $suggestion, {
          ...suggestion,
          selectedIndex: suggestion.selectedIndex + 1,
        });
        return true;
      }
      return false;
    },
    ArrowUp: (state) => {
      const suggestion = editorStore.get(state, $suggestion);
      if (suggestion) {
        editorStore.set(state, $suggestion, {
          ...suggestion,
          selectedIndex: suggestion.selectedIndex - 1,
        });
        return true;
      }
      return false;
    },
    Enter: (state) => {
      const suggestion = editorStore.get(state, $suggestion);
      if (suggestion) {
        const ui = editorStore.get(state, $suggestionUi);
        const onSelect = ui[suggestion.markName]?.onSelect;
        if (onSelect) {
          onSelect(suggestion);
          return true;
        }
      }
      return false;
    },
  }) satisfies Record<string, Command>;
