import { DISK_SHA_CHECK_INTERVAL } from '@bangle.io/constants';
import {
  blockReload,
  pageLifeCycleTransitionedTo,
  pageSliceKey,
} from '@bangle.io/slice-page';
import { workspaceSliceKey } from '@bangle.io/slice-workspace';
import { abortableSetInterval } from '@bangle.io/utils';

import type { OpenedFile } from './common';
import { SYNC_ENTRIES, workspaceOpenedDocInfoKey } from './common';
import { getDiskSha } from './get-disk-sha';
import {
  getOpenedDocInfo,
  updateCurrentDiskSha,
  updateLastKnownDiskSha,
} from './operations';

const LOG = true;
const log = LOG
  ? console.debug.bind(console, '[slice-workspace-opened-doc-info] ')
  : () => {};

export const syncWithOpenedWsPathsEffect = workspaceOpenedDocInfoKey.reactor(
  {
    openedWsPaths: workspaceSliceKey.select('openedWsPaths'),
    openedFiles: workspaceOpenedDocInfoKey.select('openedFiles'),
  },
  (_, dispatch, { openedWsPaths, openedFiles }) => {
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
      dispatch({
        name: SYNC_ENTRIES,
        value: {
          additions,
          removals,
        },
      });
    }
  },
);

export const blockOnPendingWriteEffect = workspaceOpenedDocInfoKey.effect(
  () => {
    const shouldBlock = (openedFiles: OpenedFile[]) => {
      return openedFiles.some((info) => info.pendingWrite);
    };

    return {
      update(store, prevState) {
        const openedFiles = workspaceOpenedDocInfoKey.getValueIfChanged(
          'openedFiles',
          store.state,
          prevState,
        );

        if (!openedFiles) {
          return;
        }

        if (shouldBlock(Object.values(openedFiles))) {
          log('[blockOnPendingWriteEffect] blocking on pending write');
          blockReload(true)(
            store.state,
            pageSliceKey.getDispatch(store.dispatch),
          );
        }
      },

      // set it to 'false' at a slower cadence to do a sort of debounce
      // since it is of lower priority compared to `blockReload(true)`. This helps
      // smoothen out the `true` -> `false` -> ... -> `true`.
      deferredUpdate(store, prevState, abortSignal) {
        const openedFiles = workspaceOpenedDocInfoKey.getSliceStateAsserted(
          store.state,
        ).openedFiles;

        if (!shouldBlock(Object.values(openedFiles))) {
          blockReload(false)(
            store.state,
            pageSliceKey.getDispatch(store.dispatch),
          );
        }
      },
    };
  },
);

// Check and persist git hash calculation of the current disk state of opened files
export const calculateCurrentDiskShaEffect = workspaceOpenedDocInfoKey.effect(
  () => {
    let pendingRun = false;

    const updateShasOfFile = async (
      store: ReturnType<typeof workspaceOpenedDocInfoKey.getStore>,
    ) => {
      const openedFiles = getOpenedDocInfo()(store.state);
      const openedFilesArray = Object.values(openedFiles);

      if (pendingRun || openedFilesArray.length === 0) {
        return;
      }

      pendingRun = true;

      await Promise.all(
        openedFilesArray.map(async (info) => {
          const sha = await getDiskSha(info.wsPath, store);

          if (sha === info.currentDiskSha) {
            return;
          }

          if (sha) {
            log(
              '[calculateCurrentDiskShaEffect] updateCurrentDiskSha',
              info.wsPath,
            );
            queueMicrotask(() => {
              updateCurrentDiskSha(info.wsPath, sha)(
                store.state,
                store.dispatch,
              );
            });
          }
        }),
      );

      pendingRun = false;
    };

    return {
      //  Page lifecycle check runs in `update` because it is a high urgency event.
      //  There is a high likely hood (compared to already being active) that the user
      //  modified the file externally.
      update(store, prevState) {
        const pageTransitionedToActive = pageLifeCycleTransitionedTo(
          'active',
          prevState,
        )(store.state);

        if (pageTransitionedToActive) {
          updateShasOfFile(store);
        }
      },
      deferredOnce(store, abortSignal) {
        abortableSetInterval(
          () => {
            updateShasOfFile(store);
          },
          abortSignal,
          DISK_SHA_CHECK_INTERVAL,
        );
      },
    };
  },
);

// Calculate lastKnownDiskSha of files that are just opened
export const calculateLastKnownDiskShaEffect =
  workspaceOpenedDocInfoKey.deferredReactor(
    {
      openedFiles: workspaceOpenedDocInfoKey.select('openedFiles'),
    },
    async (store, { openedFiles }) => {
      const openedFilesArray = Object.values(openedFiles);

      for (const openedFile of openedFilesArray) {
        // lastKnownDiskSha will be undefined for newly opened files
        if (!openedFile.lastKnownDiskSha) {
          const sha = await getDiskSha(openedFile.wsPath, store);

          if (sha) {
            // queue it so that we can finish the current loop
            queueMicrotask(() => {
              log(
                '[calculateLastKnownDiskShaEffect] updateLastKnownDiskSha',
                openedFile.wsPath,
              );

              updateLastKnownDiskSha(openedFile.wsPath, sha)(
                store.state,
                store.dispatch,
              );
            });
          }
        }
      }
    },
  );
