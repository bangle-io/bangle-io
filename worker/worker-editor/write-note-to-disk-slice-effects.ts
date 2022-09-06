import type { ApplicationStore } from '@bangle.io/create-store';
import {
  blockReload,
  pageLifeCycleTransitionedTo,
  pageSliceKey,
} from '@bangle.io/slice-page';
import {
  docToFile,
  handleWorkspaceError,
  writeFile,
} from '@bangle.io/slice-workspace';
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
const log = LOG ? console.debug.bind(console, '[worker-editor] ') : () => {};

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
        log('[writeToDiskEffect] writing file', item.wsPath);
        // TODO check if file was externally modified before writing
        const [lastWrittenSha, writeFileStatus] = await Promise.all([
          cachedCalculateGitFileSha(file),
          writeFile(item.wsPath, file)(
            store.state,
            store.dispatch,
            store,
          ).catch((error) => {
            console.warn('received error while writing item', error.message);

            const canHandle = handleWorkspaceError(error)(
              store.state,
              store.dispatch,
            );

            if (canHandle) {
              updateDocInfo(item.wsPath, {
                pendingWrite: false,
              })(store.state, store.dispatch);
            } else {
              throw error;
            }
          }),
        ]);

        if (writeFileStatus) {
          updateDocInfo(item.wsPath, {
            pendingWrite: false,
            // since both the shas at this time will be the same
            lastKnownDiskSha: lastWrittenSha,
            currentDiskSha: lastWrittenSha,
          })(store.state, store.dispatch);
        }
      } catch (error) {
        console.error(error);

        updateDocInfo(item.wsPath, {
          pendingWrite: false,
        })(store.state, store.dispatch);
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
                log(
                  '[calculateLastKnownDiskShaEffect] updateLastKnownDiskSha',
                  openedFile.wsPath,
                );
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

// Check and persist git hash calculation of the current disk state of opened files
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
            log(
              '[calculateCurrentDiskShaEffect] updateCurrentDiskSha',
              info.wsPath,
            );
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
        const { pendingWrite, wsPath, currentDiskSha, lastKnownDiskSha } = info;

        if (
          !pendingWrite &&
          currentDiskSha &&
          lastKnownDiskSha &&
          currentDiskSha !== lastKnownDiskSha
        ) {
          log('[staleDocEffect] triggering for ', wsPath);
          queueMicrotask(() => {
            workspaceOpenedDocInfoKey.callOp(
              store.state,
              store.dispatch,
              updateShas(wsPath, {
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
});
