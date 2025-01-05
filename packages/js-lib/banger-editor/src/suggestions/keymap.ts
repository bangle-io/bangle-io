import { keybinding } from '../common';
import { PRIORITY } from '../common';
import { store } from '../store';
import {
  $suggestion,
  $suggestionUi,
  removeSuggestMark,
} from './plugin-suggestion';

export const suggestionKeymap = () =>
  keybinding(
    [
      [
        'Escape',
        (state, dispatch, view) => {
          const suggestion = store.get(state, $suggestion);
          if (suggestion) {
            return removeSuggestMark({
              markName: suggestion.markName,
              selection: state.selection,
            })(state, dispatch, view);
          }
          return false;
        },
      ],
      [
        'ArrowDown',
        (state) => {
          const suggestion = store.get(state, $suggestion);
          if (suggestion) {
            store.set(state, $suggestion, {
              ...suggestion,
              selectedIndex: suggestion.selectedIndex + 1,
            });
            return true;
          }
          return false;
        },
      ],
      [
        'ArrowUp',
        (state) => {
          const suggestion = store.get(state, $suggestion);
          if (suggestion) {
            store.set(state, $suggestion, {
              ...suggestion,
              selectedIndex: suggestion.selectedIndex - 1,
            });
            return true;
          }
          return false;
        },
      ],
      [
        'Enter',
        (state) => {
          const suggestion = store.get(state, $suggestion);
          if (suggestion) {
            const ui = store.get(state, $suggestionUi);
            const onSelect = ui[suggestion.markName]?.onSelect;
            if (onSelect) {
              onSelect(suggestion);
              return true;
            }
          }
          return false;
        },
      ],
    ],
    'suggestion',
    PRIORITY.suggestionKey,
  );
