import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import { keyDisplayValue } from '@bangle.io/config';
import { ExtensionPaletteType } from '@bangle.io/extension-registry';
import { byLengthAsc, useFzfSearch } from '@bangle.io/fzf-search';
import { naukarWorkerProxy } from '@bangle.io/naukar-proxy';
import type { UnPromisify } from '@bangle.io/shared-types';
import {
  ButtonIcon,
  FileDocumentIcon,
  SecondaryEditorIcon,
  UniversalPalette,
} from '@bangle.io/ui-components';
import { isAbortError, removeMdExtension } from '@bangle.io/utils';
import { pushWsPath, useWorkspaceContext } from '@bangle.io/workspace-context';
import { resolvePath } from '@bangle.io/ws-path';

import { extensionName } from './config';

const FZF_SEARCH_LIMIT = 64;
const RECENT_SHOW_LIMIT = 6;
const MAX_RECENTLY_USED_ITEMS = 3;
const MAX_RECENTLY_USED_ITEMS_NO_QUERY = 10;

const createPaletteObject = ({ wsPath, onClick }) => {
  const { fileName, dirPath } = resolvePath(wsPath);
  return {
    uid: wsPath,
    title: removeMdExtension(fileName),
    rightNode: undefined,
    showDividerAbove: false,
    extraInfo: dirPath,
    data: {
      wsPath,
    },
    rightHoverNode: (
      <ButtonIcon
        hint={`Open in split screen`}
        hintPos="left"
        onClick={onClick}
      >
        <SecondaryEditorIcon
          style={{
            height: 18,
            width: 18,
          }}
        />
      </ButtonIcon>
    ),
  };
};
const NotesPalette: ExtensionPaletteType['ReactComponent'] = React.forwardRef(
  ({ query, dismissPalette, onSelect, getActivePaletteItem }, ref) => {
    const { bangleStore } = useWorkspaceContext();

    const { recent: recentWsPaths, other: otherWsPaths } =
      useSearchWsPaths(query);

    const items = useMemo(() => {
      const recentlyUsedItems = recentWsPaths.map((wsPath, i) => {
        let obj = createPaletteObject({
          wsPath,
          onClick: (e) => {
            e.stopPropagation();
            pushWsPath(
              wsPath,
              false,
              true,
            )(bangleStore.state, bangleStore.dispatch);
            dismissPalette();
          },
        });

        if (i === 0) {
          (obj as any).rightNode = 'Recent';
        }
        return obj;
      });

      return [
        ...recentlyUsedItems.slice(
          0,
          query ? MAX_RECENTLY_USED_ITEMS : MAX_RECENTLY_USED_ITEMS_NO_QUERY,
        ),
        ...otherWsPaths.map((wsPath, i) => {
          let obj = createPaletteObject({
            wsPath,
            onClick: (e) => {
              e.stopPropagation();
              pushWsPath(
                wsPath,
                false,
                true,
              )(bangleStore.state, bangleStore.dispatch);
              dismissPalette();
            },
          });

          if (i === 0 && recentlyUsedItems.length > 0) {
            (obj as any).showDividerAbove = true;
          }
          return obj;
        }),
      ];
    }, [otherWsPaths, recentWsPaths, query, bangleStore, dismissPalette]);

    const onExecuteItem = useCallback(
      (getUid, sourceInfo) => {
        const uid = getUid(items);
        const item = items.find((item) => item.uid === uid);
        if (item) {
          pushWsPath(
            item.data.wsPath,
            sourceInfo.metaKey,
            sourceInfo.shiftKey,
          )(bangleStore.state, bangleStore.dispatch);
        }
      },
      [bangleStore, items],
    );

    // Expose onExecuteItem for the parent to call it
    // If we dont do this clicking or entering will not work
    useImperativeHandle(
      ref,
      () => ({
        onExecuteItem,
      }),
      [onExecuteItem],
    );

    const activeItem = getActivePaletteItem(items);
    return (
      <>
        <UniversalPalette.PaletteItemsContainer>
          {items.map((item) => {
            return (
              <UniversalPalette.PaletteItemUI
                key={item.uid}
                item={item}
                onClick={onSelect}
                isActive={activeItem === item}
              />
            );
          })}
        </UniversalPalette.PaletteItemsContainer>
        <UniversalPalette.PaletteInfo>
          <UniversalPalette.PaletteInfoItem>
            use:
          </UniversalPalette.PaletteInfoItem>
          <UniversalPalette.PaletteInfoItem>
            <kbd className="font-normal">↑↓</kbd> Navigate
          </UniversalPalette.PaletteInfoItem>
          <UniversalPalette.PaletteInfoItem>
            <kbd className="font-normal">Enter</kbd> Open
          </UniversalPalette.PaletteInfoItem>
          <UniversalPalette.PaletteInfoItem>
            <kbd className="font-normal">Shift-Enter</kbd> Open in side
          </UniversalPalette.PaletteInfoItem>
          <UniversalPalette.PaletteInfoItem>
            <kbd className="font-normal">{keyDisplayValue('Mod')}-Enter</kbd>{' '}
            Open in new tab
          </UniversalPalette.PaletteInfoItem>
        </UniversalPalette.PaletteInfo>
      </>
    );
  },
);

export const notesPalette: ExtensionPaletteType = {
  type: extensionName + '/notes',
  icon: <FileDocumentIcon />,
  identifierPrefix: '',
  placeholder: "Enter a file name or type '?' to see other palettes.",
  // match with any query
  parseRawQuery: (rawQuery) => rawQuery,
  ReactComponent: NotesPalette,
};

const EMPTY_ARRAY = [];
/**
 * Runs Fzf search on recent and all wsPaths.
 * @param query
 * @returns return.recent - filtered list of wsPath that were used recently
 *          return.other - filtered list of wsPath that match the filter and are not part of `.recent`.
 */
export function useSearchWsPaths(query: string) {
  const { recentlyUsedWsPaths = EMPTY_ARRAY, wsName } = useWorkspaceContext();

  // We are doing the following
  // 1. use fzf to shortlist the notes
  // 2. use fzf to shortlist recently used notes
  // 3. Merge them and show in palette

  const recentFzfItems = useFzfSearch(recentlyUsedWsPaths, query, {
    limit: FZF_SEARCH_LIMIT,
    selector: (item) => resolvePath(item).filePath,
    tiebreakers: [byLengthAsc],
  });

  const filteredFzfItems = useSearchNotePaths(query, wsName);

  const filteredRecentWsPaths = useMemo(() => {
    let wsPaths: string[];

    // fzf search messes up with the order. When query is empty
    // we want to preserve the order of recently used.
    if (query === '') {
      wsPaths = recentlyUsedWsPaths;
    } else {
      wsPaths = recentFzfItems
        .map((fzfItem, i) => fzfItem.item)
        .slice(0, RECENT_SHOW_LIMIT);
    }

    return wsPaths;
  }, [recentFzfItems, recentlyUsedWsPaths, query]);

  const filteredOtherWsPaths = useMemo(() => {
    const shownInRecentSet = new Set(filteredRecentWsPaths);
    if (!filteredFzfItems) {
      return [];
    }
    return filteredFzfItems
      .filter((r) => !shownInRecentSet.has(r.item))
      .map((fzfItem, i) => {
        const wsPath = fzfItem.item;
        return wsPath;
      });
  }, [filteredFzfItems, filteredRecentWsPaths]);

  return {
    recent: filteredRecentWsPaths,
    other: filteredOtherWsPaths,
  };
}

function useSearchNotePaths(query: string, wsName: string | undefined) {
  const [result, updateResult] = useState<
    | UnPromisify<
        ReturnType<typeof naukarWorkerProxy.abortableFzfSearchNoteWsPaths>
      >
    | undefined
  >(undefined);

  useEffect(() => {
    const controller = new AbortController();
    let destroyed = false;
    if (wsName) {
      naukarWorkerProxy
        .abortableFzfSearchNoteWsPaths(
          controller.signal,
          wsName,
          query,
          FZF_SEARCH_LIMIT,
        )
        .then((res) => {
          if (destroyed) {
            return;
          }
          updateResult(res);
        })
        .catch((error) => {
          if (isAbortError(error)) {
            return;
          }
          throw error;
        });
    }
    return () => {
      destroyed = true;
      controller.abort();
    };
  }, [query, wsName]);

  return result;
}
