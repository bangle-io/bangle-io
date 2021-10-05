import { Selection } from '@bangle.dev/pm';
import { useEditorManagerContext } from 'editor-manager-context';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ButtonIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Sidebar,
} from 'ui-components';
import { resolvePath } from 'ws-path';
import { HighlightText } from './HighlightText';
import { SearchMatch, SearchResultItem } from '../constants';
import { NoteLink } from 'contextual-ui-components';
import { useWorkspaceContext } from 'workspace-context';

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
  const { primaryEditor } = useEditorManagerContext();
  const { primaryWsPath } = useWorkspaceContext();
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
        requestAnimationFrame(() => {
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
            tr = tr.setSelection(
              Selection.near(tr.doc.resolve(currentlyClicked.match.parentPos)),
            );
          }

          dispatch(tr.scrollIntoView());
          updateCurrentlyClicked(null);
        });
      }, 50);
    }

    return () => {
      cancelled = true;
    };
  }, [currentlyClicked, primaryWsPath, primaryEditor]);
  return (
    <>
      {results.map((r, i) => {
        return (
          <React.Fragment key={i}>
            <Sidebar.Row2
              titleClassName="text-sm font-bold"
              className={'search-result-note-match pl-1 pr-3  select-none'}
              extraInfoClassName="ml-1 text-sm"
              onClick={onClicks[i]}
              item={{
                uid: 'search-notes-result-' + i,
                showDividerAbove: false,
                title: resolvePath(r.wsPath).fileName,
                extraInfo: resolvePath(r.wsPath).dirPath,
                leftNode: (
                  <ButtonIcon
                    onClick={async (e) => {
                      e.stopPropagation();
                    }}
                  >
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
              r.matches.map((matchObj, j) => (
                <NoteLink
                  wsPath={r.wsPath}
                  onClick={() => {
                    if (primaryEditor && primaryEditor.destroyed !== true) {
                      updateCurrentlyClicked({
                        wsPath: r.wsPath,
                        match: matchObj,
                        matchIndex: j,
                      });
                    }
                  }}
                  key={j}
                >
                  <Sidebar.Row2
                    className={
                      'search-result-text-match ml-1 pl-3 rounded-sm ' +
                      (j === 0 ? 'mt-3' : 'mt-4')
                    }
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
              ))}
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
