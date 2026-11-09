import { keybinding, PRIORITY } from '../common';
import type { EditorView } from '../pm';
import { store } from '../store';
import {
  $suggestion,
  $suggestions,
  $suggestionUi,
  removeSuggestMark,
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
            // removeSuggestMark keeps typed trigger text but deletes
            // synthetic (programmatically opened) triggers entirely.
            const handled = removeSuggestMark({
              markName: suggestion.markName,
              selection: state.selection,
            })(state, dispatch, view);
            if (handled && view) {
              resyncDOMCursor(view);
            }
            return handled;
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

/**
 * Removing a suggestion mark unwraps the text node that owns the browser
 * selection. Safari can leave its native caret associated with that old DOM
 * shape even though ProseMirror's selection is unchanged. Its next native
 * Option-Backspace then inserts a paragraph instead of deleting backward.
 * Explicitly collapsing the DOM selection onto the current document node
 * keeps the browser and editor selections aligned after Escape.
 */
function resyncDOMCursor(view: EditorView) {
  if (!view.hasFocus() || !view.state.selection.empty) {
    return;
  }
  const { node, offset } = view.domAtPos(view.state.selection.head);
  view.dom.ownerDocument.getSelection()?.collapse(node, offset);
}
