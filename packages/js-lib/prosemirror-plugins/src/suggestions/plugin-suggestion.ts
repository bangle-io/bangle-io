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
import {
  type MarkScanResult,
  clampRange,
  findFirstMarkPosition,
} from '../pm-utils/utils';

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

// for better performance we scan a range around the selection
const MARK_SCAN_RANGE_PADDING = 500;

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
            const [scanRangeStart, scanRangeEnd] = clampRange(
              state.selection.from - MARK_SCAN_RANGE_PADDING,
              state.selection.to + MARK_SCAN_RANGE_PADDING,
              state.doc.content.size,
            );
            const result = querySuggestionMarkTextContent(
              markName,
              state,
              scanRangeStart,
              scanRangeEnd,
            );
            if (!result) {
              return;
            }
            log?.debug('querytext', result?.text);

            if (
              suggestion?.markName === markName &&
              suggestion.text === result.text &&
              suggestion.position === result.start
            ) {
              return;
            }

            editorStore.set(state, $suggestion, {
              selectedIndex: suggestion?.selectedIndex ?? 0,
              markName,
              trigger,
              show: true,
              text: result.text ?? '',
              position: result.start,
              refresh: Date.now(),
              anchorEl: () => {
                if (view.isDestroyed) {
                  return null;
                }

                const [startPos, endPos] = clampRange(
                  result.start,
                  result.end,
                  view.state.doc.content.size,
                );

                const coordsStart = view.coordsAtPos(startPos);
                if (!coordsStart) {
                  return null;
                }
                const coordsEnd = view.coordsAtPos(endPos);
                if (!coordsEnd) {
                  return null;
                }

                const left = Math.min(coordsStart.left, coordsEnd.left);
                const top = Math.min(coordsStart.top, coordsEnd.top);
                const right = Math.max(
                  coordsStart.right ?? coordsStart.left,
                  coordsEnd.right ?? coordsEnd.left,
                );
                const bottom = Math.max(coordsStart.bottom, coordsEnd.bottom);
                const rect = new DOMRect(left, top, right - left, bottom - top);
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

/**
 * Returns the text content **within** the mark
 */
export function querySuggestionMarkTextContent(
  markName: string,
  state: EditorState,
  startPos: number,
  endPos: number,
): undefined | MarkScanResult {
  const { schema, doc } = state;
  const markType = schema.marks[markName];
  assertIsDefined(markType, `markType ${markName} not found`);

  const scan = findFirstMarkPosition(markType, doc, startPos, endPos);

  if (!scan) {
    return undefined;
  }

  return scan;
}
