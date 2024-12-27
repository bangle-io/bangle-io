import type { Logger } from '@bangle.io/logger';
import type { MarkType } from '@prosekit/pm/model';
import {
  type Command,
  type EditorState,
  Plugin,
  type Selection,
} from '@prosekit/pm/state';

import { assertIsDefined } from '@bangle.io/mini-js-utils';
import { atom } from 'jotai';
import { isTextSelection } from 'prosekit/core';
import { editorStore } from '../pm-utils/store';
import { findFirstMarkPosition } from '../pm-utils/utils';

export type Suggestion = {
  markName: string;
  trigger: string;
  show: boolean;
  text: string;
  position: number;
  refresh: number;
  anchorEl: () => VirtualElement | null;
  selectedIndex: number;
};

export const $suggestion = atom<Suggestion | undefined>();

export const $suggestionUi = atom<
  Record<string, { onSelect: (selected: Suggestion) => void }>
>({});

/**
 * A minimal "virtual element" interface that floating-ui expects
 * (using only getBoundingClientRect).
 */
export interface VirtualElement {
  getBoundingClientRect(): DOMRect;
}

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
    view: (view) => {
      const handleScrollOrResize = () => {
        const suggestion = editorStore.get(view.state, $suggestion);
        if (suggestion) {
          editorStore.set(view.state, $suggestion, {
            ...suggestion,
            refresh: Date.now(),
          });
        }
      };

      let rafId: number | null = null;
      const handleScrollOrResizeWithRaf = () => {
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            handleScrollOrResize();
            rafId = null;
          });
        }
      };

      window.addEventListener('scroll', handleScrollOrResizeWithRaf, {
        passive: true,
      });
      window.addEventListener('resize', handleScrollOrResizeWithRaf, {
        passive: true,
      });

      return {
        destroy: () => {
          window.removeEventListener('scroll', handleScrollOrResizeWithRaf);
          window.removeEventListener('resize', handleScrollOrResizeWithRaf);
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
          }
        },
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
              selectedIndex: suggestion?.selectedIndex ?? 0,
              markName,
              trigger,
              show: true,
              text,
              position: startPosition,
              refresh: Date.now(),
              anchorEl: () => {
                if (view.isDestroyed) {
                  return null;
                }

                const coords = view.coordsAtPos(startPosition);
                if (!coords) {
                  return null;
                }

                // Return a virtual element with getBoundingClientRect
                const rect = new DOMRect(coords.left, coords.bottom, 0, 0);
                const virtualEl: VirtualElement = {
                  getBoundingClientRect: () => rect,
                };
                return virtualEl;
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

    if (
      !queryMark &&
      state.storedMarks &&
      markType.isInSet(state.storedMarks)
    ) {
      dispatch?.(
        state.tr.removeStoredMark(markType).setMeta('addToHistory', false),
      );
      return true;
    }

    if (!queryMark) {
      return false;
    }

    dispatch?.(
      state.tr
        .removeMark(queryMark.start, queryMark.end, markType)
        .removeStoredMark(markType)
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
      if (!withinMark) {
        startPosition = pos;
      }
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
