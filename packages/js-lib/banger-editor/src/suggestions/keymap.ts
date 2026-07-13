import { keybinding, PRIORITY } from '../common';
import { getMarkType } from '../pm-utils';
import { store } from '../store';
import {
  $suggestion,
  $suggestions,
  $suggestionUi,
  removeSuggestMark,
  replaceSuggestMarkWith,
  updateSuggestionForView,
} from './plugin-suggestion';

export const suggestionKeymap = () =>
  keybinding(
    [
      [
        'Escape',
        (state, dispatch, view) => {
          const suggestion = view
            ? store.get(state, $suggestions).get(view)
            : store.get(state, $suggestion);
          if (suggestion) {
            // A synthetic trigger (opened programmatically, e.g. via the
            // "+" block button) was never typed, so Escape must remove the
            // trigger text too; a typed trigger stays in the document.
            const markType = getMarkType(state.schema, suggestion.markName);
            const activeMark = state.selection.$from
              .marks()
              .find((mark) => mark.type === markType);
            if (activeMark?.attrs.synthetic) {
              return replaceSuggestMarkWith({
                markName: suggestion.markName,
                content: '',
              })(state, dispatch, view);
            }
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
        (state, _dispatch, view) => {
          // During IME composition arrow keys navigate the composition
          // candidates, not the menu.
          if (!view || view.composing) return false;
          const suggestions = store.get(state, $suggestions);
          const suggestion = suggestions.get(view);
          if (suggestion) {
            const optionCount =
              store.get(state, $suggestionUi).get(view)?.[suggestion.markName]
                ?.optionCount ?? Number.POSITIVE_INFINITY;
            const selectedIndex = Math.min(
              suggestion.selectedIndex + 1,
              Math.max(0, optionCount - 1),
            );
            updateSuggestionForView(
              state,
              view,
              suggestion.markName,
              (current) => ({
                ...current,
                selectedIndex,
              }),
            );
            return true;
          }
          return false;
        },
      ],
      [
        'ArrowUp',
        (state, _dispatch, view) => {
          if (!view || view.composing) return false;
          const suggestions = store.get(state, $suggestions);
          const suggestion = suggestions.get(view);
          if (suggestion) {
            updateSuggestionForView(
              state,
              view,
              suggestion.markName,
              (current) => ({
                ...current,
                selectedIndex: Math.max(0, current.selectedIndex - 1),
              }),
            );
            return true;
          }
          return false;
        },
      ],
      [
        'Enter',
        (state, _dispatch, view) => {
          // Enter confirming an IME composition (Japanese, Chinese, Korean)
          // must never select the highlighted menu item.
          if (!view || view.composing) return false;
          const suggestion = store.get(state, $suggestions).get(view);
          if (suggestion) {
            const ui = store.get(state, $suggestionUi).get(view);
            const onSelect = ui?.[suggestion.markName]?.onSelect;
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
