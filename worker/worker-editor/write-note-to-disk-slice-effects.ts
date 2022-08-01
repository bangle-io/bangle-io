import type { ApplicationStore } from '@bangle.io/create-store';
import {
  blockReload,
  pageLifeCycleTransitionedTo,
  pageSliceKey,
} from '@bangle.io/slice-page';
import { docToFile, writeFile } from '@bangle.io/slice-workspace';
import type { OpenedFile } from '@bangle.io/slice-workspace-opened-doc-info';
import {
  getOpenedDocInfo,
  updateCurrentDiskSha,
  updateDocInfo,
  updateLastKnownDiskSha,
  updateShas,
  workspaceOpenedDocInfoKey,
} from '@bangle.io/slice-workspace-opened-doc-info';
import { abortableSetInterval } from '@bangle.io/utils';

import type { CollabStateInfo } from './common';
import {
  DISK_SHA_CHECK_INTERVAL,
  workerEditorSliceKey,
  writeNoteToDiskSliceKey,
} from './common';
import { cachedCalculateGitFileSha, getDiskSha } from './helpers';
import { resetCollabDoc } from './operations';

const LOG = true;
const log = LOG
  ? console.debug.bind(console, '[worker-editor] write-note-to-disk-slice')
  : () => {};

export const writeToDiskEffect = writeNoteToDiskSliceKey.effect(() => {
  async function write(writeQueue: CollabStateInfo[], store: ApplicationStore) {
    if (writeQueue.length === 0) {
      return;
    }

    while (writeQueue.length > 0) {
      const item = writeQueue.shift();

      if (!item) {
        continue;
      }

      try {
        updateDocInfo(item.wsPath, {
          pendingWrite: true,
        })(store.state, store.dispatch);

        const file = docToFile(item.wsPath, item.collabState.doc)(store.state);
        // TODO check if file was externally modified before writing
        const [lastWrittenSha] = await Promise.all([
          cachedCalculateGitFileSha(file),
          writeFile(item.wsPath, file)(store.state, store.dispatch, store),
        ]);

        updateDocInfo(item.wsPath, {
          pendingWrite: false,
          // since both the shas at this time will be the same
          lastKnownDiskSha: lastWrittenSha,
          currentDiskSha: lastWrittenSha,
        })(store.state, store.dispatch);
      } catch (error) {
        if (error instanceof Error) {
          console.log('received error while writing item', error.message);
          queueMicrotask(() => {
            updateDocInfo(item.wsPath, {
              pendingWrite: false,
            })(store.state, store.dispatch);
          });
          store.errorHandler(error);
        }
      }
    }
  }

  let writeInProgress = false;

  return {
    async deferredUpdate(store) {
      const { writeQueue } = writeNoteToDiskSliceKey.getSliceStateAsserted(
        store.state,
      );

      if (writeInProgress) {
        return;
      }

      writeInProgress = true;

      await write(writeQueue, store);

      writeInProgress = false;
    },
  };
});

// Calculate lastKnownDiskSha of files that are just opened
export const calculateLastKnownDiskShaEffect = writeNoteToDiskSliceKey.effect(
  () => {
    return {
      async deferredUpdate(store, prevState) {
        const openedFiles = workspaceOpenedDocInfoKey.getValueIfChanged(
          'openedFiles',
          store.state,
          prevState,
        );

        if (!openedFiles) {
          return;
        }

        const openedFilesArray = Object.values(openedFiles);

        for (const openedFile of openedFilesArray) {
          // lastKnownDiskSha will be undefined for newly opened files
          if (!openedFile.lastKnownDiskSha) {
            const sha = await getDiskSha(openedFile.wsPath, store);

            if (sha) {
              // queue it so that we can finish the current loop
              queueMicrotask(() => {
                workspaceOpenedDocInfoKey.callOp(
                  store.state,
                  store.dispatch,
                  updateLastKnownDiskSha(openedFile.wsPath, sha),
                );
              });
            }
          }
        }
      },
    };
  },
);

// Performs a git hash calculation of the current disk state of opened files
export const calculateCurrentDiskShaEffect = writeNoteToDiskSliceKey.effect(
  () => {
    let pendingRun = false;

    const updateShasOfFile = async (store: ApplicationStore) => {
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
            queueMicrotask(() => {
              workspaceOpenedDocInfoKey.callOp(
                store.state,
                store.dispatch,
                updateCurrentDiskSha(info.wsPath, sha),
              );
            });
          }
        }),
      );

      pendingRun = false;
    };

    return {
      //  Page lifecycle runs in `update` as it takes priority so that
      // when user switches back to bangle we can immediately check for staleness
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

// An effect that compares the content of file in the disk and
// in the memory. If they are different it will trigger a reset
export const staleDocEffect = writeNoteToDiskSliceKey.effect(() => {
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

      for (const info of Object.values(openedFiles)) {
        if (
          !info.pendingWrite &&
          info.currentDiskSha &&
          info.lastKnownDiskSha &&
          info.currentDiskSha !== info.lastKnownDiskSha
        ) {
          const { currentDiskSha } = info;
          queueMicrotask(() => {
            workspaceOpenedDocInfoKey.callOp(
              store.state,
              store.dispatch,
              updateShas(info.wsPath, {
                currentDiskSha: currentDiskSha,
                lastKnownDiskSha: currentDiskSha,
              }),
            );

            workerEditorSliceKey.callQueryOp(
              store.state,
              resetCollabDoc(info.wsPath),
            );
          });
        }
      }
    },
  };
});

export const blockOnPendingWriteEffect = writeNoteToDiskSliceKey.effect(() => {
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
        log('blocking on pending write');
        blockReload(true)(
          store.state,
          pageSliceKey.getDispatch(store.dispatch),
        );
      }
    },

    // set it to 'false' at a slower cadence to do a sort of debounce
    // for the case when we have to turn off blockReload. This helps
    // avoid the cases in which we do `true` -> `false` -> ... -> `true`
    // bunch of times.
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
});
