import { FILE_PALETTE_MAX_RECENT_FILES } from 'config/index';
import { dedupeArray, useLocalStorage, weakCache } from 'utils/index';
import { useWorkspacePath } from 'workspace';
import React, { useCallback, useEffect } from 'react';

export function useRecordRecentWsPaths(files) {
  const { wsName, wsPath } = useWorkspacePath();
  let [recentWsPaths, updateRecentWsPaths] = useLocalStorage(
    'useRecordRecentWsPaths2-XihLD' + wsName,
    [],
  );

  useEffect(() => {
    if (wsPath) {
      updateRecentWsPaths((array) =>
        dedupeArray([wsPath, ...array]).slice(0, FILE_PALETTE_MAX_RECENT_FILES),
      );
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

const cachedFileSet = weakCache((array) => {
  return new Set(array);
});
