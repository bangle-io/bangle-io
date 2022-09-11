import { Slice } from '@bangle.io/create-store';
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
  workspaceOpenedDocInfoKey,
} from '@bangle.io/slice-workspace-opened-doc-info';
import { assertActionName, assertNotUndefined } from '@bangle.io/utils';

import type { CollabStateInfo } from './common';
import { workerEditorSliceKey } from './common';
import { cachedCalculateGitFileSha } from './helpers';
import { setupCollabManager } from './setup-collab-manager';

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
    sideEffect: [collabManagerSetupEffect, purgeUnopenedDocs],
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

          const [lastWrittenSha, writeFileStatus] = await Promise.all([
            cachedCalculateGitFileSha(file),
            workspaceSliceKey
              .callAsyncOp(store, writeFile(collabStateInfo.wsPath, file))
              .catch((error) => {
                console.warn(
                  'received error while writing item',
                  error.message,
                );
                // TODO add testing for this
                store.errorHandler(error);
              }),
          ]);

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
        // console.log(collabManager?.getAllDocNames());
        // cleanup editor manager docs if they are not opened anymore
        collabManager?.getAllDocNames().forEach((docName) => {
          if (!openedWsPaths.has(docName)) {
            // TODO move this to a better api which is clear about what it does
            // currently resetDoc gives a wrong idea of what it does and requires
            // a bunch of knowledge about the internals of collab manager to understand
            // how it removes the doc from the collab manager.
            // TODO the doc comment is also incorrect

            // removes a collab doc from the memory of collab manager
            // if any client is connected, it will trigger a hard reload
            // ~ discarding any unsaved data and reloading with fresh data
            console.log(`editorManagerSlice resetting ${docName} collab-state`);
            collabManager?.resetDoc(docName);
          }
        });
      }
    },
  };
});
