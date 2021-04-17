import { dedupeArray, useLocalStorage, weakCache } from 'utils/index';
import {
  FILE_PALETTE_MAX_RECENT_FILES,
  FILE_PALETTE_MAX_FILES,
  keybindings,
} from 'config/index';

import React, { useCallback, useEffect } from 'react';
import {
  useGetCachedWorkspaceFiles,
  useWorkspacePath,
  resolvePath,
} from 'workspace/index';
import { FILE_PALETTE, PaletteTypeBase } from '../paletteTypes';
import {
  ButtonIcon,
  FileDocumentIcon,
  PaletteUI,
  SecondaryEditorIcon,
} from 'ui-components/index';
import { addBoldToTitle } from '../utils';
import { useRecordRecentWsPaths } from 'app/hooks';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

export class FilePalette extends PaletteTypeBase {
  static type = FILE_PALETTE;
  static identifierPrefix = '';
  static description = 'Search for a file name';
  static PaletteIcon = FileDocumentIcon;
  static UIComponent = FilePaletteUIComponent;
  static placeholder = "Enter a file name or type '?' to see other palettes.";
  static keybinding = keybindings.toggleFilePalette.key;

  // match with any query
  static parseRawQuery(rawQuery) {
    return rawQuery;
  }
}

function FilePaletteUIComponent({ paletteProps, query, dismissPalette }) {
  const { pushWsPath } = useWorkspacePath();
  let [files = [], refreshFiles] = useGetCachedWorkspaceFiles();
  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);
  const recentFiles = useRecordRecentWsPaths();

  files = dedupeArray([...recentFiles, ...files]);

  const onExecute = useCallback(
    (item, itemIndex, event) => {
      if (event.metaKey) {
        pushWsPath(item.data.wsPath, true);
      } else if (event.shiftKey) {
        pushWsPath(item.data.wsPath, false, true);
      } else {
        pushWsPath(item.data.wsPath);
      }
      dismissPalette();
    },
    [pushWsPath, dismissPalette],
  );

  const getResolvedItems = useCallback(
    ({ query }) => {
      const wsPaths = getItems({ query, files });

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
    },
    [onExecute, dismissPalette, pushWsPath, files],
  );

  return <PaletteUI items={getResolvedItems({ query })} {...paletteProps} />;
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
