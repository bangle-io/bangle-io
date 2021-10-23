import { keyDisplayValue } from 'config';
import { ExtensionPaletteType } from 'extension-registry';
import React, { useCallback, useImperativeHandle, useMemo } from 'react';
import {
  ButtonIcon,
  FileDocumentIcon,
  SecondaryEditorIcon,
  UniversalPalette,
} from 'ui-components';
import { removeMdExtension } from 'utils';
import { useWorkspaceContext } from 'workspace-context';
import { resolvePath } from 'ws-path';
import { useFzfSearch, byLengthAsc } from 'fzf-search';
import { extensionName } from './config';

const emptyArray = [];
const FZF_SEARCH_LIMIT = 64;

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
    const { pushWsPath } = useWorkspaceContext();

    const { recent: recentWsPaths, other: otherWsPaths } =
      useSearchWsPaths(query);

    const items = useMemo(() => {
      const recentlyUsedItems = recentWsPaths.map((wsPath, i) => {
        let obj = createPaletteObject({
          wsPath,
          onClick: (e) => {
            e.stopPropagation();
            pushWsPath(wsPath, false, true);
            dismissPalette();
          },
        });

        if (i === 0) {
          (obj as any).rightNode = 'Recent';
        }
        return obj;
      });

      return [
        ...recentlyUsedItems,
        ...otherWsPaths.map((wsPath, i) => {
          let obj = createPaletteObject({
            wsPath,
            onClick: (e) => {
              e.stopPropagation();
              pushWsPath(wsPath, false, true);
              dismissPalette();
            },
          });

          if (i === 0 && recentlyUsedItems.length > 0) {
            (obj as any).showDividerAbove = true;
          }
          return obj;
        }),
      ];
    }, [otherWsPaths, recentWsPaths, pushWsPath, dismissPalette]);

    const onExecuteItem = useCallback(
      (getUid, sourceInfo) => {
        const uid = getUid(items);
        const item = items.find((item) => item.uid === uid);
        if (item) {
          pushWsPath(item.data.wsPath, sourceInfo.metaKey, sourceInfo.shiftKey);
        }
      },
      [pushWsPath, items],
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

export const notesPalette = {
  type: extensionName + '/notes',
  icon: <FileDocumentIcon />,
  identifierPrefix: '',
  placeholder: "Enter a file name or type '?' to see other palettes.",
  // match with any query
  parseRawQuery: (rawQuery) => rawQuery,
  ReactComponent: NotesPalette,
};

/**
 * Runs Fzf search on recent and all wsPaths.
 * @param query
 * @returns return.recent - filtered list of wsPath that were used recently
 *          return.other - filtered list of wsPath that match the filter and are not part of `.recent`.
 */
export function useSearchWsPaths(query: string) {
  const { noteWsPaths = emptyArray, recentWsPaths } = useWorkspaceContext();

  // We are doing the following
  // 1. use fzf to shortlist the notes
  // 2. use fzf to shortlist recently used notes
  // 3. Merge them and show in palette

  const recentFzfItems = useFzfSearch(recentWsPaths, query, {
    limit: FZF_SEARCH_LIMIT,
    selector: (item) => resolvePath(item).filePath,
    tiebreakers: [byLengthAsc],
  });

  const filteredFzfItems = useFzfSearch(noteWsPaths, query, {
    limit: FZF_SEARCH_LIMIT,
    selector: (item) => resolvePath(item).filePath,
    tiebreakers: [byLengthAsc],
  });

  const filteredRecentWsPaths = useMemo(() => {
    let wsPaths: string[];

    // fzf search messes up with the order. When query is empty
    // we want to preserve the order of recently used.
    if (query === '') {
      wsPaths = recentWsPaths;
    } else {
      wsPaths = recentFzfItems.map((fzfItem, i) => fzfItem.item);
    }

    return wsPaths;
  }, [recentFzfItems, recentWsPaths, query]);

  const filteredOtherWsPaths = useMemo(() => {
    const shownInRecentSet = new Set(filteredRecentWsPaths);
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
