import { dedupeArray, useKeybindings } from 'utils/index';
import {
  FILE_PALETTE_MAX_FILES,
  keybindings,
  keyDisplayValue,
} from 'config/index';

import React, { useRef, useMemo, useEffect } from 'react';
import {
  useListCachedNoteWsPaths,
  useWorkspacePath,
  resolvePath,
} from 'workspace/index';
import { FILE_PALETTE, PaletteTypeBase } from '../paletteTypes';
import {
  ButtonIcon,
  FileDocumentIcon,
  PaletteInfo,
  PaletteInfoItem,
  PaletteInput,
  PaletteItemsContainer,
  SecondaryEditorIcon,
  SidebarRow,
  usePaletteProps,
} from 'ui-components/index';
import { addBoldToTitle } from '../utils';
import { useRecordRecentWsPaths } from '../use-record-recent-ws-paths';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

export class FilePalette extends PaletteTypeBase {
  static type = FILE_PALETTE;
  static identifierPrefix = '';
  static description = 'Search for a file name';
  static UIComponent = FilePaletteUIComponent;
  static placeholder = "Enter a file name or type '?' to see other palettes.";
  static keybinding = keybindings.toggleFilePalette.key;

  // match with any query
  static parseRawQuery(rawQuery) {
    return rawQuery;
  }
}

const ActivePalette = FilePalette;

function FilePaletteUIComponent({
  query,
  dismissPalette,
  updateRawInputValue,
  rawInputValue,
}) {
  const { pushWsPath } = useWorkspacePath();
  const [currentFiles = [], refreshFiles] = useListCachedNoteWsPaths();
  const recentFiles = useRecordRecentWsPaths();

  const resolvedItems = useMemo(() => {
    const files = dedupeArray([...recentFiles, ...currentFiles]);

    const wsPaths = getItems({ query, files });

    const onExecute = (item, itemIndex, event) => {
      if (event.metaKey) {
        pushWsPath(item.data.wsPath, true);
      } else if (event.shiftKey) {
        pushWsPath(item.data.wsPath, false, true);
      } else {
        pushWsPath(item.data.wsPath);
      }
      dismissPalette();
    };

    return wsPaths.slice(0, FILE_PALETTE_MAX_FILES).map((wsPath) => {
      return {
        uid: wsPath,
        title: addBoldToTitle(resolvePath(wsPath).filePath, query),
        onExecute,
        data: { wsPath },
        rightHoverIcon: (
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
    });
  }, [pushWsPath, query, currentFiles, recentFiles, dismissPalette]);

  const updateCounterRef = useRef();
  const { getItemProps, inputProps } = usePaletteProps({
    onDismiss: dismissPalette,
    resolvedItems,
    value: rawInputValue,
    updateValue: updateRawInputValue,
    updateCounterRef,
  });

  useKeybindings(() => {
    return {
      [ActivePalette.keybinding]: () => {
        updateCounterRef.current?.((counter) => counter + 1);
      },
    };
  }, []);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  return (
    <>
      <PaletteInput
        placeholder={ActivePalette.placeholder}
        ref={useRef()}
        paletteIcon={
          <span className="pr-2 flex items-center">
            <FileDocumentIcon className="h-5 w-5" />
          </span>
        }
        {...inputProps}
      />
      <PaletteItemsContainer>
        {resolvedItems.map((item, i) => {
          return (
            <SidebarRow
              dataId={item.uid}
              className="palette-row"
              key={item.uid}
              title={item.title}
              rightHoverIcon={item.rightHoverIcon}
              rightIcon={
                <kbd className="whitespace-nowrap">{item.keybinding}</kbd>
              }
              {...getItemProps(item, i)}
            />
          );
        })}
      </PaletteItemsContainer>
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

function getItems({ query, files }) {
  if (!query) {
    return files;
  }
  return files.filter((file) => {
    const title = file;
    return strMatch(title, query);
  });
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
