import React, { useCallback, useState, useMemo, useEffect } from 'react';
import {
  Sidebar,
  ChevronRightIcon,
  ChevronDownIcon,
  ButtonIcon,
} from 'ui-components/index';
import { Link } from 'react-router-dom';
import { resolvePath } from 'ws-path';
import { HighlightText } from './HighlightText';
import { SearchResultItem } from './types';

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

  return (
    <>
      {results.map((r, i) => {
        return (
          <React.Fragment key={i}>
            <Sidebar.Row2
              titleClassName="text-sm font-bold"
              className={'search-result-note-match pl-1 pr-3 '}
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
                <Sidebar.Row2
                  key={j}
                  className={
                    'search-result-text-match ml-1 pl-3 rounded-sm ' +
                    (j === 0 ? 'mt-3' : 'mt-4')
                  }
                  titleClassName="text-sm "
                  hoverBgColorChange
                  item={{
                    uid: 'search-result-text-match-' + j,
                    title: (
                      <Link to={resolvePath(r.wsPath).locationPath}>
                        <HighlightText
                          highlightText={matchObj.match}
                        ></HighlightText>
                      </Link>
                    ),
                  }}
                ></Sidebar.Row2>
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
