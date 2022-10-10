import { Slice } from '@bangle.io/create-store';
import { cachedCalculateGitFileSha } from '@bangle.io/git-file-sha';
import type { NaukarStateConfig } from '@bangle.io/shared-types';
import {
  editorSyncKey,
  getCollabMessageBus,
} from '@bangle.io/slice-editor-collab-comms';
import {
  docToFile,
  workspaceSliceKey,
  writeFile,
} from '@bangle.io/slice-workspace';
import {
  updateDocInfo,
  updateShas,
  workspaceOpenedDocInfoKey,
} from '@bangle.io/slice-workspace-opened-doc-info';
import { assertActionName, assertNotUndefined } from '@bangle.io/utils';

import type { CollabStateInfo } from './common';
import { workerEditorSliceKey } from './common';
import { setupCollabManager } from './setup-collab-manager';

const LOG = true;
const log = LOG ? console.debug.bind(console, '[worker-editor] ') : () => {};

export function workerEditorSlice() {
  assertActionName('@bangle.io/worker-editor', workerEditorSliceKey);

  return new Slice({
    key: workerEditorSliceKey,
    state: {
      init() {
        return {
          collab: undefined,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/worker-editor:set-editor-manager': {
            // destroy previous collab manager
            state.collab?.controller.abort();

            return {
              ...state,
              collab: action.value,
            };
          }
          default: {
            return state;
          }
        }
      },
    },
    sideEffect: [collabManagerSetupEffect, purgeUnopenedDocs, staleDocEffect],
  });
}

export function getCollabManager() {
  return workerEditorSliceKey.queryOp((state) => {
    return workerEditorSliceKey.getSliceStateAsserted(state).collab?.manager;
  });
}

const collabManagerSetupEffect = workerEditorSliceKey.effect(
  (_, config: NaukarStateConfig) => {
    assertNotUndefined(
      config.extensionRegistry,
      'extensionRegistry needs to be defined',
    );

    return {
      deferredOnce(store, abortSignal) {
        // if the store is destroyed, destroy the current collab manager
        abortSignal.addEventListener('abort', () => {
          workerEditorSliceKey
            .getSliceStateAsserted(store.state)
            .collab?.controller.abort();
        });

        // Note: this should handle all of the errors related to writing
        const handleWrite = async (
          collabStateInfo: CollabStateInfo,
        ): Promise<void> => {
          const file = workspaceSliceKey.callQueryOp(
            store.state,
            docToFile(collabStateInfo.wsPath, collabStateInfo.collabState.doc),
          );

          const lastWrittenSha = await cachedCalculateGitFileSha(file);

          const writeFileStatus = await workspaceSliceKey
            .callAsyncOp(
              store,
              writeFile(collabStateInfo.wsPath, file, lastWrittenSha),
            )
            .catch((error) => {
              console.warn('received error while writing item', error.message);
              // TODO add testing for this
              store.errorHandler(error);
            });

          if (writeFileStatus) {
            workspaceOpenedDocInfoKey.callOp(
              store.state,
              store.dispatch,
              updateDocInfo(collabStateInfo.wsPath, {
                pendingWrite: false,
                // since both the shas at this time will be the same
                lastKnownDiskSha: lastWrittenSha,
                currentDiskSha: lastWrittenSha,
              }),
            );
          }
        };

        const { extensionRegistry } = config;
        const controller = new AbortController();

        const collabManager = setupCollabManager(
          extensionRegistry.specRegistry.schema,
          store,
          editorSyncKey.callQueryOp(store.state, getCollabMessageBus()),
          handleWrite,
          (type, wsPath, pendingWrites) => {
            // TODO send entire information using pendingWrites
            workspaceOpenedDocInfoKey.callOp(
              store.state,
              store.dispatch,
              updateDocInfo(wsPath, {
                pendingWrite: type === 'ADD',
              }),
            );
          },
          controller.signal,
        );

        controller.signal.addEventListener(
          'abort',
          () => {
            collabManager.destroy();
          },
          {
            once: true,
          },
        );

        store.dispatch({
          name: 'action::@bangle.io/worker-editor:set-editor-manager',
          value: {
            controller,
            manager: collabManager,
          },
        });
      },
    };
  },
);

// Removes a document from the collab manager if it is no longer opened.
const purgeUnopenedDocs = workerEditorSliceKey.effect(() => {
  return {
    update(store, prevState) {
      const openedWsPaths = workspaceSliceKey.getValueIfChanged(
        'openedWsPaths',
        store.state,
        prevState,
      );

      if (openedWsPaths) {
        const collabManager = getCollabManager()(store.state);
        // cleanup editor manager docs to save memory if they are not opened anymore
        collabManager?.getAllDocNames().forEach((docName) => {
          if (!openedWsPaths.has(docName)) {
            collabManager?.requestDeleteInstance(docName);
          }
        });
      }
    },
  };
});

// An effect that compares the content of file in the disk and
// in the memory. If they are different it will trigger a reset
export const staleDocEffect = workerEditorSliceKey.effect(() => {
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

            workerEditorSliceKey
              .callQueryOp(store.state, getCollabManager())
              ?.resetDoc(info.wsPath);
          });
        }
      }
    },
  };
});
