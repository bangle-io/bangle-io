import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { NodeSelection, Selection } from '@bangle.dev/pm';

import { useNsmSlice } from '@bangle.io/bangle-store-context';
import { NoteLink } from '@bangle.io/contextual-ui-components';
import type { SearchMatch, SearchResultItem } from '@bangle.io/search-pm-node';
import { nsmEditorManagerSlice } from '@bangle.io/slice-editor-manager';
import { changeSidebar, useUIManagerContext } from '@bangle.io/slice-ui';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import {
  ButtonIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Sidebar,
} from '@bangle.io/ui-components';
import { cx, safeRequestAnimationFrame, usePrevious } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

import { HighlightText } from './HighlightText';

function useCollapseMarker(
  results: SearchResultItem[],
  // collapses all results if counter is greater than zero integer
  // increment its value to retrigger the collapse
  collapseAllCounter: number,
) {
  const [cache, updateCache] = useState(new Set());

  const onClicks = useMemo(
    () =>
      results.map((r) => {
        const onClick = () => {
          updateCache((c) => {
            const s = new Set(c);

            if (s.has(r)) {
              s.delete(r);
            } else {
              s.add(r);
            }

            return s;
          });
        };

        return onClick;
      }),
    [results],
  );
  const isCollapsed = useCallback(
    (r) => {
      return cache.has(r);
    },
    [cache],
  );

  useEffect(() => {
    if (collapseAllCounter > 0) {
      updateCache(() => {
        return new Set(results);
      });
    }
  }, [collapseAllCounter, results]);

  return { onClicks, isCollapsed };
}

export function SearchResults({
  results,
  collapseAllCounter,
}: {
  collapseAllCounter: number;
  results: SearchResultItem[];
}) {
  const { onClicks, isCollapsed } = useCollapseMarker(
    results,
    collapseAllCounter,
  );
  const [{ primaryEditor }] = useNsmSlice(nsmEditorManagerSlice);

  const {
    openedWsPaths: { primaryWsPath },
  } = useWorkspaceContext();
  const { widescreen, bangleStore } = useUIManagerContext();
  const [currentlyClicked, updateCurrentlyClicked] = useState<null | {
    wsPath: string;
    match: SearchMatch;
    matchIndex: number;
  }>();

  useEffect(() => {
    let cancelled = false;

    if (currentlyClicked && primaryWsPath === currentlyClicked.wsPath) {
      // TODO this is a mess, we need a better api to know when the editor is ready
      setTimeout(() => {
        safeRequestAnimationFrame(() => {
          const editor = primaryEditor;

          if (cancelled || !editor || editor.destroyed) {
            return;
          }
          editor.focusView();
          const { dispatch, state } = editor.view;
          let tr = state.tr;

          if (currentlyClicked.match.parentPos >= tr.doc.content.size) {
            tr = tr.setSelection(Selection.atEnd(tr.doc));
          } else {
            // The following is a hack which solves the purpose
            // to grab the users attention. It is not great but
            // it was easy to implement. In future we can move to a
            // a more formal less hacky way to grab attention that
            // doesn't involve messing with selections.
            // its Working :-
            //  - show a node selection .. ends up drawing a big rectangle
            //    outline on parent node
            //  - after some time set a text selection clearing the rectangle

            const parentNode = tr.doc.nodeAt(currentlyClicked.match.parentPos);

            if (parentNode) {
              tr = tr.setSelection(
                NodeSelection.create(tr.doc, currentlyClicked.match.parentPos),
              );
            }
            setTimeout(() => {
              if (!editor.destroyed) {
                const { dispatch, state } = editor.view;
                const tr = state.tr;
                dispatch(
                  tr.setSelection(
                    Selection.near(
                      tr.doc.resolve(currentlyClicked.match.parentPos),
                    ),
                  ),
                );
              }
            }, 300);
          }
          try {
            dispatch(tr.scrollIntoView());
          } catch (error) {
            // ignore because of a bug where a user edits a note and clicks on the already searched
            // resulting in dom error
          }

          updateCurrentlyClicked(null);
        });
      }, 50);
    }

    return () => {
      cancelled = true;
    };
  }, [currentlyClicked, primaryWsPath, primaryEditor]);

  // cannot used currently clicked because it gets set to null
  // right after focusing
  const prevClicked = usePrevious(currentlyClicked);

  return (
    <>
      {results.map((r, i) => {
        return (
          <React.Fragment key={i}>
            <Sidebar.Row2
              titleClassName="text-sm font-bold"
              className={cx(
                `B-search-notes_search-result-note-match pl-1 pr-3  select-none`,
                primaryWsPath === r.uid && 'BU_active',
              )}
              extraInfoClassName="text-sm"
              extraInfoOnNewLine
              onClick={onClicks[i]}
              item={{
                uid: 'search-notes-result-' + i,
                showDividerAbove: false,
                title: resolvePath(r.uid).fileNameWithoutExt,
                extraInfo: resolvePath(r.uid).dirPath,
                leftNode: (
                  <ButtonIcon>
                    {isCollapsed(r) ? (
                      <ChevronRightIcon style={IconStyle} />
                    ) : (
                      <ChevronDownIcon style={IconStyle} />
                    )}
                  </ButtonIcon>
                ),
                rightNode: (
                  <ButtonIcon className="text-xs font-semibold">
                    {r.matches.length}
                  </ButtonIcon>
                ),
                rightHoverNode: (
                  <ButtonIcon className="text-xs font-semibold">
                    {r.matches.length}
                  </ButtonIcon>
                ),
              }}
            />
            {!isCollapsed(r) &&
              r.matches.map((matchObj, j) => {
                return (
                  <NoteLink
                    wsPath={r.uid}
                    className={cx(
                      'rounded-sm block B-search-notes_search-result-text-match ',
                      primaryWsPath === r.uid &&
                        prevClicked?.matchIndex === j &&
                        'B-search-notes_previously-clicked',
                      j === 0 ? 'mt-3' : 'mt-4',
                      j === r.matches.length - 1
                        ? 'pb-4 border-b-1 border-colorNeutralBorder'
                        : '',
                    )}
                    onClick={() => {
                      // if not in a widescreen close the sidebar
                      // after click
                      if (!widescreen) {
                        changeSidebar(null)(
                          bangleStore.state,
                          bangleStore.dispatch,
                        );
                      } else if (primaryEditor && !primaryEditor.destroyed) {
                        updateCurrentlyClicked({
                          wsPath: r.uid,
                          match: matchObj,
                          matchIndex: j,
                        });
                      }
                    }}
                    key={j}
                  >
                    <Sidebar.Row2
                      className="pl-3"
                      titleClassName="text-sm "
                      item={{
                        uid: 'search-result-text-match-' + j,
                        title: (
                          <HighlightText
                            highlightText={matchObj.match}
                          ></HighlightText>
                        ),
                      }}
                    ></Sidebar.Row2>
                  </NoteLink>
                );
              })}
          </React.Fragment>
        );
      })}
    </>
  );
}

const IconStyle = {
  height: 16,
  width: 16,
};
