import { DISK_SHA_CHECK_INTERVAL } from '@bangle.io/constants';
import { cachedCalculateGitFileSha } from '@bangle.io/git-file-sha';
import type { Transaction } from '@bangle.io/nsm';
import { changeEffect, intervalRunEffect, Slice } from '@bangle.io/nsm';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import { blockReload, nsmPageSlice } from '@bangle.io/slice-page';
import { fs } from '@bangle.io/workspace-info';
import { createWsPath } from '@bangle.io/ws-path';

import type { OpenedFile } from './nsm-slice-file-sha';
import {
  actSyncEntries,
  actUpdateEntry,
  nsmSliceFileSha,
} from './nsm-slice-file-sha';

const LOG = true;
const log = LOG
  ? console.debug.bind(console, '[slice-workspace-opened-doc-info] ')
  : () => {};

const syncWithOpenedWsPathsEffect = changeEffect(
  'syncWithOpenedWsPathsEffect',
  {
    openedWsPaths: nsmSliceWorkspace.pick((s) => s.openedWsPaths),
    openedFiles: nsmSliceFileSha.passivePick((s) => s.openedFiles),
  },
  ({ openedWsPaths, openedFiles }, dispatch) => {
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
      dispatch(
        actSyncEntries({
          additions,
          removals,
        }),
      );
    }
  },
);

const blockWriteEffectSync = changeEffect(
  'blockWriteEffectSync',
  {
    openedFiles: nsmSliceFileSha.pick((s) => s.openedFiles),
    blockReload: nsmPageSlice.passivePick((s) => s.blockReload),
  },
  ({ openedFiles }, dispatch) => {
    if (shouldBlock(Object.values(openedFiles))) {
      dispatch(blockReload(true));
    }
  },
  {
    sync: true,
  },
);
// set it to 'false' at a slower cadence to do a sort of debounce
// since it is of lower priority compared to `oldBlockReload(true)`. This helps
// smoothen out the `true` -> `false` -> ... -> `true`.
const unblockWriteEffect = changeEffect(
  'unblockWriteEffect',
  {
    openedFiles: nsmSliceFileSha.pick((s) => s.openedFiles),
    blockReload: nsmPageSlice.passivePick((s) => s.blockReload),
  },
  ({ openedFiles }, dispatch) => {
    if (!shouldBlock(Object.values(openedFiles))) {
      dispatch(blockReload(false));
    }
  },
);

// Check and persist git hash calculation of the current disk state of opened files
const calculateCurrentDiskShaEffect = changeEffect(
  'calculateCurrentDiskShaEffect',
  {
    openedFiles: nsmSliceFileSha.pick((s) => s.openedFiles),
  },
  ({ openedFiles }, dispatch, _ref) => {
    let ref = _ref as { pendingRun?: boolean };
    ref.pendingRun = ref.pendingRun ?? false;

    if (!ref.pendingRun) {
      ref.pendingRun = true;
      runUpdateShas(openedFiles, dispatch)
        .then(() => {
          ref.pendingRun = false;
        })
        .catch(() => {
          ref.pendingRun = false;
        });
    }
  },
);

const calculateCurrentDiskShaEffectInterval = intervalRunEffect(
  'calculateCurrentDiskShaEffectInterval',
  [nsmSliceFileSha],
  DISK_SHA_CHECK_INTERVAL,
  (state, dispatch) => {
    const { openedFiles } = nsmSliceFileSha.resolveState(state);
    runUpdateShas(openedFiles, dispatch);
  },
);

const calculateLastKnownDiskShaEffect = changeEffect(
  'calculateLastKnownDiskShaEffect',
  {
    openedFiles: nsmSliceFileSha.pick((s) => s.openedFiles),
  },
  ({ openedFiles }, dispatch) => {
    const openedFilesArray = Object.values(openedFiles);

    openedFilesArray.forEach((openedFile) => {
      // lastKnownDiskSha will be undefined for newly opened files
      if (!openedFile.lastKnownDiskSha) {
        getDiskSha(openedFile.wsPath).then((sha) => {
          if (sha) {
            // queue it so that we can finish the current loop
            queueMicrotask(() => {
              log(
                '[calculateLastKnownDiskShaEffect] updateLastKnownDiskSha',
                openedFile.wsPath,
              );

              dispatch(
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

async function runUpdateShas(
  openedFiles: Record<string, OpenedFile>,
  dispatch: (tx: Transaction<'nsm-slice-file-sha', any>) => void,
): Promise<void> {
  const openedFilesArray = Object.values(openedFiles);

  if (openedFilesArray.length === 0) {
    return;
  }

  await Promise.all(
    openedFilesArray.map(async (info) => {
      const sha = await getDiskSha(info.wsPath);

      if (sha === info.currentDiskSha) {
        return;
      }

      if (sha) {
        log(
          '[calculateCurrentDiskShaEffect] updateCurrentDiskSha',
          info.wsPath,
        );
        queueMicrotask(() => {
          dispatch(
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
}

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

const effects = [
  syncWithOpenedWsPathsEffect,
  blockWriteEffectSync,
  unblockWriteEffect,
  calculateCurrentDiskShaEffect,
  calculateCurrentDiskShaEffectInterval,
  calculateLastKnownDiskShaEffect,
];

Slice.registerEffectSlice(nsmSliceWorkspace, effects);
