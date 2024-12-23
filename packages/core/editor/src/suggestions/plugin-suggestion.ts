import { assertIsDefined } from '@bangle.io/base-utils';
import type { Logger } from '@bangle.io/logger';
import {
  Fragment,
  type MarkType,
  type ProseMirrorNode,
  type Schema,
  Slice,
} from '@prosekit/pm/model';
import {
  type Command,
  type EditorState,
  Plugin,
  type Selection,
} from '@prosekit/pm/state';

import { atom } from 'jotai';
import { isTextSelection } from 'prosekit/core';
import { editorStore } from '../pm-utils/atom';
import { findFirstMarkPosition } from '../pm-utils/utils';

export const $suggestion = atom<
  | undefined
  | {
      markName: string;
      trigger: string;
      show: boolean;
      text: string;
      position: number;
      coordsAtPos: () => undefined | { top: number; left: number };
    }
>();

// TODO current if the query is /sdsd /s dasdlkasd and the user moves out the second subquery is selected
export function pluginSuggestion({
  markName,
  trigger,
  logger,
}: {
  markName: string;
  trigger: string;
  logger?: Logger;
}) {
  const log = logger?.child(`pluginSuggestion[${markName}]`);
  return new Plugin({
    view: (e) => {
      editorStore.sub(e.state, $suggestion, () => {
        log?.debug('suggestion:sub', editorStore.get(e.state, $suggestion));
      });
      return {
        update: (view, lastState) => {
          const { state } = view;
          if (lastState === state) {
            return;
          }

          const markType = state.schema.marks[markName];
          assertIsDefined(markType, `markType ${markName} not found`);

          const querytext = querySuggestionMarkTextContent(markName, state);

          log?.debug('querytext', querytext);

          if (
            lastState.doc.eq(state.doc) &&
            state.selection.eq(lastState.selection)
          ) {
            log?.debug(
              'suggestion:selection and doc not changed',
              state.selection.toJSON(),
              lastState.selection.toJSON(),
            );
            return;
          }

          const wasMarkActive = isMarkActiveAtSelection(lastState, markType);
          const isMarkActive = isMarkActiveAtSelection(state, markType);

          // Remove the mark if the user has moved to a different place
          if (!isMarkActive && wasMarkActive) {
            log?.debug('suggestion:mark was active mark removed');
            removeSuggestMark({
              markName,
              selection: lastState.selection,
            })(state, view.dispatch, view);
            return;
          }

          // Clear the mark if the trigger is deleted but the marked text remains
          if (isMarkActive && !doesQueryHaveTrigger(state, markType, trigger)) {
            log?.debug('suggestion:trigger deleted but marked text remains');
            removeSuggestMark({
              markName,
              selection: state.selection,
            })(state, view.dispatch, view);
            return;
          }

          const suggestion = editorStore.get(state, $suggestion);
          if (isMarkActive) {
            const result = querySuggestionMarkTextContent(markName, state);
            if (!result) {
              return;
            }

            const { text, startPosition } = result;

            if (
              suggestion?.markName === markName &&
              suggestion.text === text &&
              suggestion.position === startPosition
            ) {
              return;
            }

            editorStore.set(state, $suggestion, {
              markName,
              trigger,
              show: true,
              text,
              position: startPosition,
              coordsAtPos: () => {
                if (view.isDestroyed) {
                  return undefined;
                }
                const pos = view.coordsAtPos(startPosition);

                console.log('view.nodeDOM', view.nodeDOM(startPosition));
                console.log('view.nodeDOM', pos);
                return {
                  left: pos?.left,
                  top: pos?.bottom,
                };
              },
            });
          } else {
            if (suggestion !== undefined) {
              editorStore.set(state, $suggestion, undefined);
            }
          }
        },
      };
    },
  });
}

function isMarkActiveAtSelection(state: EditorState, markType: MarkType) {
  const { from, to } = state.selection;
  if (!isTextSelection(state.selection)) {
    return false;
  }
  const clampedFrom = Math.max(0, from - 1);
  return state.doc.rangeHasMark(clampedFrom, to, markType);
}

function doesQueryHaveTrigger(
  state: EditorState,
  markType: MarkType,
  trigger: string,
) {
  const { nodeBefore } = state.selection.$from;

  // nodeBefore in a new line (a new paragraph) is null
  if (!nodeBefore) {
    return false;
  }

  const suggestMark = markType.isInSet(nodeBefore.marks || []);

  // suggestMark is undefined if you delete the trigger while keeping the rest of the query alive
  if (!suggestMark) {
    return false;
  }

  const textContent = nodeBefore.textContent || '';
  return textContent.includes(trigger);
}

export function removeSuggestMark({
  markName,
  selection,
}: {
  markName: string;
  selection: Selection;
}): Command {
  return (state, dispatch, _view) => {
    const { schema } = state;
    const markType = schema.marks[markName];
    assertIsDefined(markType, `markType ${markName} not found`);

    if (!isTextSelection(selection)) {
      return false;
    }

    const queryMark = findFirstMarkPosition(
      markType,
      state.doc,
      selection.from - 1,
      selection.to,
    );

    editorStore.set(state, $suggestion, undefined);

    const { start, end } = queryMark;
    if (
      start === -1 &&
      state.storedMarks &&
      markType.isInSet(state.storedMarks)
    ) {
      if (dispatch) {
        dispatch(state.tr.removeStoredMark(markType));
      }
      return true;
    }

    if (start === -1) {
      return false;
    }

    dispatch?.(
      state.tr
        .removeMark(start, end, markType)
        // stored marks are marks which will be carried forward to whatever
        // the user types next, like if current mark
        // is bold, new input continues being bold
        .removeStoredMark(markType)
        // This helps us avoid the case:
        // when a user deleted the trigger/ in '<suggest_mark>/something</suggest_mark>'
        // and then performs undo.
        // If we do not hide this from history, command z will bring
        // us in the state of `<suggest_mark>something<suggest_mark>` without the trigger `/`
        // and seeing this state `tooltipActivatePlugin` plugin will dispatch a new command removing
        // the mark, hence never allowing the user to command z.
        .setMeta('addToHistory', false),
    );
    return true;
  };
}

export function querySuggestionMarkTextContent(
  markName: string,
  state: EditorState,
): undefined | { text: string; startPosition: number } {
  const { schema, doc } = state;
  const markType = schema.marks[markName];
  assertIsDefined(markType, `markType ${markName} not found`);

  let suggestionText = '';
  let withinMark = false;

  let startPosition = -1;

  doc.descendants((node, pos) => {
    if (node.marks.some((mark) => mark.type === markType)) {
      startPosition = pos;
      withinMark = true;
      suggestionText += node.textContent;
    } else if (withinMark) {
      // Encountered a break in the mark, stop further processing
      return false;
    }

    return undefined;
  });

  if (startPosition === -1) {
    return undefined;
  }

  return {
    text: suggestionText,
    startPosition: startPosition,
  };
}
