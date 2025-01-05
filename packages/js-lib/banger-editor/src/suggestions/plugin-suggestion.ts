import { Fragment, type MarkType, PMNode } from '../pm';
import {
  type Command,
  type EditorState,
  Plugin,
  PluginKey,
  Selection,
} from '../pm';

import type { Logger } from '../common';
import { getMarkType } from '../pm-utils';
import {
  type MarkScanResult,
  clampRange,
  findFirstMarkPosition,
  isTextSelection,
  safeInsert,
} from '../pm-utils';
import { store } from '../store';

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

export const $suggestion = store.atom<Suggestion | undefined>();

export const $suggestionUi = store.atom<
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
  return new Plugin({
    key: new PluginKey(`suggestion-${markName}`),
    view: (view) => {
      const handleScrollOrResize = () => {
        const suggestion = store.get(view.state, $suggestion);
        if (suggestion) {
          store.set(view.state, $suggestion, {
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

          const markType = getMarkType(state.schema, markName);

          if (
            lastState.doc.eq(state.doc) &&
            state.selection.eq(lastState.selection)
          ) {
            logger?.debug(
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
            logger?.debug('suggestion:mark was active mark removed');
            removeSuggestMark({
              markName,
              selection: lastState.selection,
            })(state, view.dispatch, view);
            return;
          }

          // Clear the mark if the trigger is deleted but the marked text remains
          if (isMarkActive && !doesQueryHaveTrigger(state, markType, trigger)) {
            logger?.debug('suggestion:trigger deleted but marked text remains');
            removeSuggestMark({
              markName,
              selection: state.selection,
            })(state, view.dispatch, view);
            return;
          }

          const suggestion = store.get(state, $suggestion);
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
            logger?.debug('querytext', result?.text);

            if (
              suggestion?.markName === markName &&
              suggestion.text === result.text &&
              suggestion.position === result.start
            ) {
              return;
            }

            store.set(state, $suggestion, {
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
              store.set(state, $suggestion, undefined);
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
    const markType = getMarkType(schema, markName);

    if (!isTextSelection(selection)) {
      return false;
    }

    const queryMark = findFirstMarkPosition(
      markType,
      state.doc,
      selection.from - 1,
      selection.to,
    );

    store.set(state, $suggestion, undefined);

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
  const markType = getMarkType(schema, markName);

  const scan = findFirstMarkPosition(markType, doc, startPos, endPos);

  if (!scan) {
    return undefined;
  }

  return scan;
}

export type ReplacementContent = string | PMNode | Fragment;

export function replaceSuggestMarkWith({
  markName,
  content,
  focus = true,
}: {
  markName: string;
  content?: ReplacementContent;
  focus?: boolean;
}): Command {
  return (state, dispatch, view) => {
    const { schema } = state;
    const markType = getMarkType(schema, markName);

    const suggestion = store.get(state, $suggestion);
    if (!suggestion) {
      return false;
    }

    const [scanRangeStart, scanRangeEnd] = clampRange(
      state.selection.from - MARK_SCAN_RANGE_PADDING,
      state.selection.to + MARK_SCAN_RANGE_PADDING,
      state.doc.content.size,
    );

    const queryMark = findFirstMarkPosition(
      markType,
      state.doc,
      scanRangeStart,
      scanRangeEnd,
    );

    if (!queryMark) {
      return false;
    }

    let tr = state.tr.removeStoredMark(markType);

    // If no content is provided, simply remove the mark text
    if (!content) {
      tr = tr.delete(queryMark.start, queryMark.end);
      dispatch?.(tr);
      return true;
    }

    try {
      if (typeof content === 'string') {
        tr = tr.replaceWith(
          queryMark.start,
          queryMark.end,
          schema.text(content),
        );
      } else if (content instanceof Fragment) {
        tr = tr.replaceWith(queryMark.start, queryMark.end, content);
      } else if (content instanceof PMNode) {
        if (content.isText) {
          tr = tr.replaceWith(queryMark.start, queryMark.end, content);
        } else if (content.isBlock) {
          tr = safeInsert(content)(tr);
        } else if (content.isInline) {
          const fragment = Fragment.fromArray([content, schema.text(' ')]);
          tr = tr.replaceWith(queryMark.start, queryMark.end, fragment);
        }
      } else {
        console.warn('Unknown content type, skipping replacement');
        return false;
      }

      const pos = tr.mapping.map(
        queryMark.start + (content instanceof Fragment ? content.size : 1),
      );
      tr = tr.setSelection(Selection.near(tr.doc.resolve(pos)));

      if (dispatch) {
        if (focus && view && typeof view.focus === 'function') {
          view.focus();
        }
        dispatch(tr);
      }

      return true;
    } catch (error) {
      console.error('Error replacing suggestion mark:', error);
      return false;
    }
  };
}
