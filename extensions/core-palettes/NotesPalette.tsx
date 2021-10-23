import { keyDisplayValue } from 'config';
import { ExtensionPaletteType } from 'extension-registry';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import {
  ButtonIcon,
  FileDocumentIcon,
  SecondaryEditorIcon,
  UniversalPalette,
} from 'ui-components';
import { removeMdExtension } from 'utils';
import { useWorkspaceContext } from 'workspace-context';
import { resolvePath } from 'ws-path';
import { extensionName } from './config';
import { useFzfSearch, byLengthAsc } from 'fzf-search';

const emptyArray = [];

const NotesPalette: ExtensionPaletteType['ReactComponent'] = React.forwardRef(
  ({ query, dismissPalette, onSelect, getActivePaletteItem }, ref) => {
    const {
      pushWsPath,
      noteWsPaths = emptyArray,
      recentWsPaths,
    } = useWorkspaceContext();

    let filteredNotes = useFzfSearch(noteWsPaths, query, {
      limit: 64,
      selector: (item) => resolvePath(item).filePath,
      tiebreakers: [byLengthAsc],
    });

    const items = useMemo(() => {
      const createObject = ({ wsPath }) => {
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
              onClick={async (e) => {
                e.stopPropagation();
                pushWsPath(wsPath, false, true);
                dismissPalette();
              }}
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

      let recentItems: any = [];
      let recentFilteredWsPaths;
      if (query === '') {
        recentFilteredWsPaths = new Set(recentWsPaths);

        recentItems = [...recentWsPaths].map((wsPath, i) => {
          let obj = createObject({ wsPath });
          if (i === 0) {
            (obj as any).rightNode = 'Recent';
          }
          return obj;
        });
      }

      const _items = filteredNotes
        .filter((r) => !recentFilteredWsPaths?.has(r.item))
        .map((item, i) => {
          const wsPath = item.item;
          let obj = createObject({ wsPath });

          if (i === 0 && recentFilteredWsPaths?.size > 0) {
            (obj as any).showDividerAbove = true;
          }

          return obj;
        });

      return [...recentItems, ..._items];
    }, [filteredNotes, recentWsPaths, query, pushWsPath, dismissPalette]);

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
