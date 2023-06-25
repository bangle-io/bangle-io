import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import { nsmApi2 } from '@bangle.io/api';
import { CorePalette } from '@bangle.io/constants';
import { byLengthAsc, useFzfSearch } from '@bangle.io/fzf-search';
import type { WsName, WsPath } from '@bangle.io/shared-types';
import type { PaletteOnExecuteItem } from '@bangle.io/ui-components';
import {
  ButtonIcon,
  FileDocumentIcon,
  SecondaryEditorIcon,
  UniversalPalette,
} from '@bangle.io/ui-components';
import { isAbortError, keyDisplayValue } from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';
import { removeExtension, resolvePath2 } from '@bangle.io/ws-path';

import type { ExtensionPaletteType } from './config';

const FZF_SEARCH_LIMIT = 64;
const RECENT_SHOW_LIMIT = 6;
const MAX_RECENTLY_USED_ITEMS = 3;
const MAX_RECENTLY_USED_ITEMS_NO_QUERY = 10;

const createPaletteObject = ({
  wsPath,
  onClick,
}: {
  wsPath: WsPath;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
  const { fileName, dirPath } = resolvePath2(wsPath);

  return {
    uid: wsPath,
    title: removeExtension(fileName),
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
    const { recent: recentWsPaths, other: otherWsPaths } =
      useSearchWsPaths(query);

    const items = useMemo(() => {
      const recentlyUsedItems = recentWsPaths.map((wsPath, i) => {
        let obj = createPaletteObject({
          wsPath,
          onClick: (e) => {
            e.stopPropagation();
            nsmApi2.workspace.pushSecondaryWsPath(wsPath);

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
              nsmApi2.workspace.pushSecondaryWsPath(wsPath);

              dismissPalette();
            },
          });

          if (i === 0 && recentlyUsedItems.length > 0) {
            (obj as any).showDividerAbove = true;
          }

          return obj;
        }),
      ];
    }, [otherWsPaths, recentWsPaths, query, dismissPalette]);

    const onExecuteItem = useCallback<PaletteOnExecuteItem>(
      (getUid, sourceInfo) => {
        const uid = getUid(items);
        const item = items.find((item) => item.uid === uid);

        if (item) {
          nsmApi2.workspace.pushWsPath(
            item.data.wsPath,
            sourceInfo.metaKey
              ? 'newTab'
              : sourceInfo.shiftKey
              ? 'secondary'
              : 'primary',
          );
        }
      },
      [items],
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
  type: CorePalette.Notes,
  icon: <FileDocumentIcon />,
  identifierPrefix: '',
  placeholder: "Enter a file name or type '?' to see other palettes.",
  // match with any query
  parseRawQuery: (rawQuery) => rawQuery,
  ReactComponent: NotesPalette,
};

const EMPTY_ARRAY: WsPath[] = [];
/**
 * Runs Fzf search on recent and all wsPaths.
 * @param query
 * @returns return.recent - filtered list of wsPath that were used recently
 *          return.other - filtered list of wsPath that match the filter and are not part of `.recent`.
 */
export function useSearchWsPaths(query: string) {
  const { recentWsPaths = EMPTY_ARRAY, wsName } =
    nsmApi2.workspace.useWorkspace();

  // We are doing the following
  // 1. use fzf to shortlist the notes
  // 2. use fzf to shortlist recently used notes
  // 3. Merge them and show in palette

  const recentFzfItems = useFzfSearch(recentWsPaths, query, {
    limit: FZF_SEARCH_LIMIT,
    selector: (item) => resolvePath2(item).filePath,
    tiebreakers: [byLengthAsc],
  });

  const filteredFzfItems = useSearchNotePaths(query, wsName);

  const filteredRecentWsPaths = useMemo(() => {
    let wsPaths: WsPath[];

    // fzf search messes up with the order. When query is empty
    // we want to preserve the order of recently used.
    if (query === '') {
      wsPaths = recentWsPaths;
    } else {
      wsPaths = recentFzfItems
        .map((fzfItem, i) => fzfItem.item)
        .slice(0, RECENT_SHOW_LIMIT);
    }

    return wsPaths;
  }, [recentFzfItems, recentWsPaths, query]);

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

function useSearchNotePaths(query: string, wsName: WsName | undefined) {
  const [result, updateResult] = useState<
    | Awaited<
        ReturnType<typeof naukarProxy.abortable.abortableFzfSearchNoteWsPaths>
      >
    | undefined
  >(undefined);

  useEffect(() => {
    const controller = new AbortController();
    let destroyed = false;

    if (wsName) {
      naukarProxy.abortable
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
