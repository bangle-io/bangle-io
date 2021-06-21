import React, {
  useEffect,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import { removeMdExtension } from 'utils/index';
import { resolvePath } from 'ws-path';

import {
  UniversalPalette,
  ButtonIcon,
  FileDocumentIcon,
  SecondaryEditorIcon,
  PaletteInfo,
  PaletteInfoItem,
} from 'ui-components/index';
import { useWorkspaceContext } from 'workspace-context/index';
import { extensionName } from './config';
import { keybindings, keyDisplayValue } from 'config/index';
import { useRecencyWatcher } from './hooks';

const emptyArray = [];

export const notesPalette = {
  type: extensionName + '/notes',
  icon: <PaletteIcon />,
  identifierPrefix: '',
  placeholder: "Enter a file name or type '?' to see other palettes.",
  keybinding: keybindings.toggleFilePalette.key,
  // match with any query
  parseRawQuery: (rawQuery) => rawQuery,
  ReactComponent: React.forwardRef(NotesPalette),
};
const storageKey = 'NotesPalette/1';

function NotesPalette({ query, dismissPalette, paletteItemProps }, ref) {
  const {
    pushWsPath,
    primaryWsPath,
    noteWsPaths = emptyArray,
  } = useWorkspaceContext();
  const { injectRecency, updateRecency } = useRecencyWatcher(storageKey);
  const items = useMemo(() => {
    const _items = injectRecency(
      noteWsPaths
        .map((wsPath) => {
          const { fileName, dirPath } = resolvePath(wsPath);
          return {
            uid: wsPath,
            title: removeMdExtension(fileName),
            extraInfo: dirPath,
            data: {
              wsPath,
            },
          };
        })
        .filter((obj) => strMatch(obj.title, query)),
    );

    return _items.slice(0, 100);
  }, [noteWsPaths, injectRecency, query]);

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

  useEffect(() => {
    // doing it this way, instead of inside `onExecuteItem`
    // so that we can monitor recency more widely, as there
    // are external ways to open a note.
    if (primaryWsPath) {
      updateRecency(primaryWsPath);
    }
  }, [updateRecency, primaryWsPath]);

  // Expose onExecuteItem for the parent to call it
  // If we dont do this clicking or entering will not work
  useImperativeHandle(
    ref,
    () => ({
      onExecuteItem,
    }),
    [onExecuteItem],
  );

  return (
    <>
      <UniversalPalette.MagicPaletteItemsContainer>
        {items.map((item) => {
          return (
            <UniversalPalette.MagicPaletteItem
              key={item.uid}
              items={items}
              title={item.title}
              extraInfo={item.extraInfo}
              showDividerAbove={item.showDividerAbove}
              uid={item.uid}
              isDisabled={item.disabled}
              rightIcons={item.rightIcons}
              {...paletteItemProps}
              rightHoverIcons={
                <ButtonIcon
                  hint={`Open in split screen`}
                  hintPos="left"
                  onClick={async (e) => {
                    e.stopPropagation();
                    pushWsPath(item.data.wsPath, false, true);
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
              }
            />
          );
        })}
      </UniversalPalette.MagicPaletteItemsContainer>
      <PaletteInfo>
        <PaletteInfoItem>use:</PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">↑↓</kbd> Navigate
        </PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">Enter</kbd> Open
        </PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">Shift-Enter</kbd> Open in side
        </PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">{keyDisplayValue('Mod')}-Enter</kbd> Open
          in new tab
        </PaletteInfoItem>
      </PaletteInfo>
    </>
  );
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}

function PaletteIcon() {
  return (
    <span className="pr-2 flex items-center">
      <FileDocumentIcon className="h-5 w-5" />
    </span>
  );
}
