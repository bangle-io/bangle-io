import { dedupeArray, useLocalStorage, weakCache } from 'utils/index';
import {
  FILE_PALETTE_MAX_RECENT_FILES,
  FILE_PALETTE_MAX_FILES,
} from 'config/index';

import { useCallback, useEffect } from 'react';
import {
  useGetWorkspaceFiles,
  useWorkspacePath,
  resolvePath,
} from 'workspace/index';
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
export function useFilePalette({ paletteType }) {
  const { pushWsPath } = useWorkspacePath();

  let [files, refreshFiles] = useGetWorkspaceFiles();

  // update files whenever palette is opened
  useEffect(() => {
    refreshFiles();
  }, [refreshFiles, paletteType]);

  const recentFiles = useRecordRecentWsPaths2(files);
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

      return wsPaths.slice(0, FILE_PALETTE_MAX_FILES).map((wsPath) => {
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

const storagePrefix = 'useRecordRecentWsPaths-0.969';

export function useRecordRecentWsPaths2(files) {
  const { wsName, wsPath } = useWorkspacePath();
  let [recentWsPaths, updateRecentWsPaths] = useLocalStorage(
    'useRecordRecentWsPaths2-XihLD' + wsName,
    [],
  );

  useEffect(() => {
    if (wsPath) {
      updateRecentWsPaths((array) => dedupeArray([wsPath, ...array]));
    }
  }, [updateRecentWsPaths, wsPath]);

  useEffect(() => {
    // TODO empty files can mean things havent loaded yet
    //  but it can also mean the workspace has no file. So
    // this will cause bugs.
    if (files.length === 0) {
      return;
    }
    // rectify if a file in recent no longer exists
    const filesSet = cachedFileSet(files);
    if (recentWsPaths.some((f) => !filesSet.has(f))) {
      updateRecentWsPaths(recentWsPaths.filter((f) => filesSet.has(f)));
    }
  }, [files, updateRecentWsPaths, recentWsPaths]);

  return recentWsPaths;
}

function useRecordRecentWsPaths(files) {
  const { wsName, wsPath } = useWorkspacePath();

  let [recentWsPaths, updateRecentWsPaths] = useLocalStorage(
    storagePrefix + wsName,
    [],
  );

  useEffect(() => {
    // do not process if files are not there yet
    if (files.length === 0) {
      return;
    }
    const newRecentWsPaths = recentWsPaths.filter((file) =>
      // remove files that no longer exist
      files.includes(file),
    );

    if (newRecentWsPaths.length !== recentWsPaths.length) {
      updateRecentWsPaths(newRecentWsPaths);
    }
  }, [files, recentWsPaths, updateRecentWsPaths, wsPath]);

  useEffect(() => {
    if (!wsPath || files.length === 0) {
      return;
    }
    // file is already at top
    if (recentWsPaths[0] === wsPath) {
      return;
    }

    // make sure files wsPath
    if (!files.includes(wsPath)) {
      return;
    }

    const newRecentWsPaths = recentWsPaths
      .filter((file) => file !== wsPath)
      .slice(0, FILE_PALETTE_MAX_RECENT_FILES);
    newRecentWsPaths.unshift(wsPath);
    updateRecentWsPaths(newRecentWsPaths);
  }, [wsPath, files, recentWsPaths, updateRecentWsPaths]);

  return recentWsPaths;
}

const cachedFileSet = weakCache((array) => {
  console.log('calculating set for array of size' + array.length);
  return new Set(array);
});
