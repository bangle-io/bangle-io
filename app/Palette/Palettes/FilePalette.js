import { useCallback } from 'react';
import {
  useGetWorkspaceFiles,
  useWorkspacePath,
} from 'bangle-io/app/workspace/workspace-hooks';
import { resolvePath } from 'bangle-io/app/workspace/path-helpers';
import { FILE_PALETTE } from '../paletteTypes';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

/**
 * We return a function which accepts query and paletteType,
 * this allows us to lazily render items and control the filtering
 * on our end. This function will be then passed to PaletteUI which
 * will call it with right params whenever it needs to show a list of
 * items.
 * Dont forget to read docs at PaletteUI
 */
export function useFilePalette() {
  const { pushWsPath } = useWorkspacePath();
  const [files] = useGetWorkspaceFiles();
  const onExecute = useCallback(
    (item, itemIndex, event) => {
      if (event.metaKey) {
        pushWsPath(item.data.wsPath, true);
      } else if (event.shiftKey) {
        pushWsPath(item.data.wsPath, false, true);
      } else {
        pushWsPath(item.data.wsPath);
      }
      return true;
    },
    [pushWsPath],
  );

  const result = useCallback(
    ({ query, paletteType }) => {
      if (paletteType !== FILE_PALETTE) {
        return null;
      }
      const wsPaths = getItems({ query, files });

      return wsPaths.map((wsPath) => {
        return {
          uid: wsPath,
          title: resolvePath(wsPath).filePath,
          onExecute,
          data: { wsPath },
        };
      });
    },
    [onExecute, files],
  );

  return result;
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
