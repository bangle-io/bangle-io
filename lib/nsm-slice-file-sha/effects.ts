import type { OpenedFile } from '@bangle.io/constants';
import { DISK_SHA_CHECK_INTERVAL } from '@bangle.io/constants';
import { cachedCalculateGitFileSha } from '@bangle.io/git-file-sha';
import type { InferSliceNameFromSlice } from '@bangle.io/nsm-3';
import { cleanup, effect, operation, ref } from '@bangle.io/nsm-3';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import { blockReload } from '@bangle.io/slice-page';
import { fs } from '@bangle.io/workspace-info';
import { createWsPath } from '@bangle.io/ws-path';

import {
  actSyncEntries,
  actUpdateEntry,
  nsmSliceFileSha,
} from './nsm-slice-file-sha';

const LOG = true;
const log = LOG
  ? console.debug.bind(console, '[slice-workspace-opened-doc-info] ')
  : () => {};

const getPendingRunRef = ref(() => {
  return {
    pendingRun: false,
  };
});

const runUpdateShas = operation<
  InferSliceNameFromSlice<typeof nsmSliceFileSha>
>({
  deferred: true,
})(function runUpdateShas() {
  return async (store) => {
    const pendingRunRef = getPendingRunRef(store);

    if (pendingRunRef.current.pendingRun) {
      return;
    }

    const { openedFiles } = nsmSliceFileSha.get(store.state);
    const openedFilesArray = Object.values(openedFiles);

    if (openedFilesArray.length === 0) {
      return;
    }

    let destroyed = false;

    cleanup(store, () => {
      destroyed = true;
    });

    await Promise.all(
      openedFilesArray.map(async (info) => {
        if (destroyed) {
          return;
        }

        const sha = await getDiskSha(info.wsPath);

        pendingRunRef.current.pendingRun = false;

        if (sha === info.currentDiskSha) {
          return;
        }

        if (sha) {
          log(
            '[calculateCurrentDiskShaEffect] updateCurrentDiskSha',
            info.wsPath,
          );
          queueMicrotask(() => {
            store.dispatch(
              actUpdateEntry({
                wsPath: info.wsPath,
                info: {
                  currentDiskSha: sha,
                },
              }),
            );
          });
        }

        return;
      }),
    );
  };
});

const syncWithOpenedWsPathsEffect = effect(function syncWithOpenedWsPathsEffect(
  store,
) {
  const { openedWsPaths } = nsmSliceWorkspace.track(store);
  const { openedFiles } = nsmSliceFileSha.get(store.state);

  let additions: string[] = [];
  let removals: string[] = [];
  // cleanup data that is not opened anymore and does not have a pending write
  Object.entries(openedFiles).forEach(([wsPath, val]) => {
    if (!openedWsPaths.has(wsPath) && !val.pendingWrite) {
      removals.push(wsPath);
    }
  });
  // add new data
  openedWsPaths.getWsPaths().forEach((wsPath) => {
    if (!openedFiles[wsPath]) {
      additions.push(wsPath);
    }
  });

  if (additions.length > 0 || removals.length > 0) {
    store.dispatch(
      actSyncEntries({
        additions,
        removals,
      }),
    );

    return;
  }
});

const blockWriteEffectSync = effect(
  function blockWriteEffectSync(store) {
    const { openedFiles } = nsmSliceFileSha.track(store);

    if (shouldBlock(Object.values(openedFiles))) {
      store.dispatch(blockReload(true));
    }
  },
  { deferred: false },
);

// set it to 'false' at a slower cadence to do a sort of debounce
// since it is of lower priority compared to `oldBlockReload(true)`. This helps
// smoothen out the `true` -> `false` -> ... -> `true`.
const unblockWriteEffect = effect(function unblockWriteEffect(store) {
  const { openedFiles } = nsmSliceFileSha.track(store);

  if (!shouldBlock(Object.values(openedFiles))) {
    store.dispatch(blockReload(false));
  }
});

// Check and persist git hash calculation of the current disk state of opened files
const calculateCurrentDiskShaEffect = effect(
  function calculateCurrentDiskShaEffect(store) {
    // tracking opened files
    void nsmSliceFileSha.track(store).openedFiles;

    const pendingRef = getPendingRunRef(store);

    if (pendingRef.current.pendingRun) {
      return;
    }

    store.dispatch(runUpdateShas());
  },
);

const calculateCurrentDiskShaEffectInterval = effect(
  function calculateCurrentDiskShaEffectInterval(store) {
    const intervalId = setInterval(() => {
      const pendingRef = getPendingRunRef(store);

      if (pendingRef.current.pendingRun) {
        return;
      }

      store.dispatch(runUpdateShas());
    }, DISK_SHA_CHECK_INTERVAL);

    cleanup(store, () => {
      clearInterval(intervalId);
    });
  },
);

const calculateLastKnownDiskShaEffect = effect(
  function calculateLastKnownDiskShaEffect(store) {
    const { openedFiles } = nsmSliceFileSha.track(store);

    const openedFilesArray = Object.values(openedFiles);

    let destroyed = false;

    cleanup(store, () => {
      destroyed = true;
    });

    openedFilesArray.forEach((openedFile) => {
      // lastKnownDiskSha will be undefined for newly opened files
      if (!openedFile.lastKnownDiskSha) {
        getDiskSha(openedFile.wsPath).then((sha) => {
          if (destroyed) {
            return;
          }

          if (sha) {
            // queue it so that we can finish the current loop
            queueMicrotask(() => {
              log(
                '[calculateLastKnownDiskShaEffect] updateLastKnownDiskSha',
                openedFile.wsPath,
              );

              store.dispatch(
                actUpdateEntry({
                  wsPath: openedFile.wsPath,
                  info: {
                    lastKnownDiskSha: sha,
                  },
                }),
              );
            });
          }
        });
      }
    });
  },
);

function shouldBlock(openedFiles: OpenedFile[]) {
  return openedFiles.some((info) => info.pendingWrite);
}

async function getDiskSha(wsPath: string): Promise<string | undefined> {
  const file = await fs.readFile(createWsPath(wsPath));

  if (file) {
    return cachedCalculateGitFileSha(file);
  }

  return undefined;
}

export const nsmSliceFileShaEffects = [
  syncWithOpenedWsPathsEffect,
  blockWriteEffectSync,
  unblockWriteEffect,
  calculateCurrentDiskShaEffect,
  calculateCurrentDiskShaEffectInterval,
  calculateLastKnownDiskShaEffect,
];
