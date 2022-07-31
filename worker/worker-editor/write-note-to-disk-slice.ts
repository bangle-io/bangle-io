import type { CollabServerState } from '@bangle.dev/collab-manager';

import type { ApplicationStore } from '@bangle.io/create-store';
import { Slice, SliceKey } from '@bangle.io/create-store';
import {
  blockReload,
  pageLifeCycleTransitionedTo,
  pageSliceKey,
} from '@bangle.io/slice-page';
import { docToFile, writeFile } from '@bangle.io/slice-workspace';
import {
  bulkUpdateCurrentDiskShas,
  getOpenedDocInfo,
  updateDocInfo,
  workspaceOpenedDocInfoKey,
} from '@bangle.io/slice-workspace-opened-doc-info';
import type { OpenedFile } from '@bangle.io/slice-workspace-opened-doc-info/common';
import { assertActionName } from '@bangle.io/utils';

import { workerEditorSliceKey } from './common';
import { cachedCalculateGitFileSha, getDiskSha } from './helpers';
import { resetCollabDoc } from './operations';

const LOG = true;
const log = LOG
  ? console.debug.bind(console, '[worker-editor] write-note-to-disk-slice')
  : () => {};

type CollabStateInfo = {
  wsPath: string;
  collabState: CollabServerState;
};

type WriteNoteToDiskActions = {
  name: 'action::@bangle.io/worker-naukar:write-note-to-disk-update';
  value: CollabStateInfo;
};
export const writeNoteToDiskSliceKey = new SliceKey<
  {
    writeQueue: CollabStateInfo[];
  },
  WriteNoteToDiskActions
>('write-note-to-disk-key');

export function queueWrite(value: CollabStateInfo) {
  return writeNoteToDiskSliceKey.op((state, dispatch) => {
    return dispatch({
      name: 'action::@bangle.io/worker-naukar:write-note-to-disk-update',
      value,
    });
  });
}

export function writeNoteToDiskSlice() {
  assertActionName('@bangle.io/worker-naukar', {} as WriteNoteToDiskActions);

  return new Slice({
    key: writeNoteToDiskSliceKey,
    state: {
      init() {
        return { writeQueue: [] };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/worker-naukar:write-note-to-disk-update': {
            const { writeQueue } = state;
            const { wsPath, collabState } = action.value;
            const existing = writeQueue.find((item) => item.wsPath === wsPath);

            // Modifying in place to be efficient
            if (existing) {
              existing.collabState = collabState;
            } else {
              writeQueue.push({ wsPath, collabState });
            }

            return state;
          }
          default: {
            return state;
          }
        }
      },
    },

    sideEffect: [
      writeToDiskEffect,
      calculateCurrentDiskShaEffect,
      staleDocEffect,
      blockOnPendingWriteEffect,
    ],
  });
}

const writeToDiskEffect = writeNoteToDiskSliceKey.effect(() => {
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

// Performs a git hash calculation of the current disk state of opened files
const calculateCurrentDiskShaEffect = writeNoteToDiskSliceKey.effect(() => {
  let interval = 2000;
  let pendingRun = false;

  const updateShasOfFile = async (store: ApplicationStore) => {
    const openedFiles = getOpenedDocInfo()(store.state);
    const openedFilesArray = Object.values(openedFiles);

    if (pendingRun || openedFilesArray.length === 0) {
      return;
    }

    pendingRun = true;

    let result: Parameters<typeof bulkUpdateCurrentDiskShas>[0] = [];

    await Promise.all(
      openedFilesArray.map(async (info) => {
        const sha = await getDiskSha(info.wsPath, store);

        if (sha === info.currentDiskSha) {
          return;
        }

        result.push({ wsPath: info.wsPath, currentDiskSha: sha });
      }),
    );

    if (result.length > 0) {
      workspaceOpenedDocInfoKey.callOp(
        store.state,
        store.dispatch,
        bulkUpdateCurrentDiskShas(result),
      );
    }

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
      const val = setInterval(() => {
        updateShasOfFile(store);
      }, interval);

      abortSignal.addEventListener(
        'abort',
        () => {
          clearInterval(val);
        },
        { once: true },
      );
    },
  };
});

// An effect that compares the content of file in the disk and
// in the memory. If they are different it will trigger a reset
const staleDocEffect = writeNoteToDiskSliceKey.effect(() => {
  return {
    update(store) {
      const { openedFiles } = workspaceOpenedDocInfoKey.getSliceStateAsserted(
        store.state,
      );

      const staleDocs = Object.values(openedFiles).filter((info) => {
        // check if the document is stale
        if (
          !info.pendingWrite &&
          info.currentDiskSha &&
          info.lastKnownDiskSha &&
          info.currentDiskSha !== info.lastKnownDiskSha
        ) {
          return true;
        }

        return false;
      });

      if (staleDocs.length > 0) {
        // before resetting collab state, make the sha's same so that
        // we don't trigger it again
        workspaceOpenedDocInfoKey.callOp(
          store.state,
          store.dispatch,
          bulkUpdateCurrentDiskShas(
            staleDocs.map((info) => ({
              wsPath: info.wsPath,
              currentDiskSha: info.currentDiskSha,
              lastKnownDiskSha: info.currentDiskSha,
            })),
          ),
        );

        staleDocs.forEach((info) => {
          queueMicrotask(() => {
            workerEditorSliceKey.callQueryOp(
              store.state,
              resetCollabDoc(info.wsPath),
            );
          });
        });
      }
    },
  };
});

const blockOnPendingWriteEffect = writeNoteToDiskSliceKey.effect(() => {
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

    // set it to 'off' at a slower cadence to do a sort of debounce
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
