import { Slice } from '@bangle.io/create-store';
import type { NaukarStateConfig } from '@bangle.io/shared-types';
import {
  editorSyncKey,
  getCollabMessageBus,
} from '@bangle.io/slice-editor-collab-comms';
import {
  getOpenedWsPaths,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import { assertNotUndefined } from '@bangle.io/utils';

import { workerEditorSliceKey } from './common';
import { getCollabManager, resetCollabDoc } from './operations';
import { setupCollabManager } from './setup-collab-manager';

export function workerEditorSlice() {
  return new Slice({
    key: workerEditorSliceKey,
    state: {
      init() {
        return {
          collabManager: undefined,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/worker-naukar:set-editor-manager': {
            state.collabManager?.destroy();

            return {
              ...state,
              collabManager: action.value.editorManager,
            };
          }
          default: {
            return state;
          }
        }
      },
    },
    sideEffect: [
      workerEditorSliceKey.effect((_, config: NaukarStateConfig) => {
        assertNotUndefined(
          config.extensionRegistry,
          'extensionRegistry needs to be defined',
        );

        return {
          deferredUpdate(store) {
            const openedWsPaths = getOpenedWsPaths()(
              workspaceSliceKey.getState(store.state),
            );
            const editorManager = getCollabManager()(store.state);

            // cleanup editor manager docs if they are not opened anymore
            editorManager?.getAllDocNames().forEach((docName) => {
              if (!openedWsPaths.has(docName)) {
                // this will remove them from the memory
                resetCollabDoc(docName)(store.state);
              }
            });
          },

          deferredOnce(store, abortSignal) {
            const { extensionRegistry } = config;

            store.dispatch({
              name: 'action::@bangle.io/worker-naukar:set-editor-manager',
              value: {
                editorManager: setupCollabManager(
                  extensionRegistry.specRegistry.schema,
                  store,
                  editorSyncKey.callQueryOp(store.state, getCollabMessageBus()),
                ),
              },
            });

            abortSignal.addEventListener(
              'abort',
              () => {
                getCollabManager()(store.state)?.destroy();
              },
              {
                once: true,
              },
            );
          },
        };
      }),
    ],
  });
}
