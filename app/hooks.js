import { FILE_PALETTE_MAX_RECENT_FILES } from 'config/index';
import { dedupeArray, useLocalStorage, weakCache } from 'utils/index';
import { useGetCachedWorkspaceFiles, useWorkspacePath } from 'workspace';
import React, { useCallback, useEffect } from 'react';

export function useRecordRecentWsPaths() {
  let [files] = useGetCachedWorkspaceFiles();
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
    if (!files) {
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
