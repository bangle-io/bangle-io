import type {
  CollabManager,
  CollabMessageBus,
} from '@bangle.dev/collab-manager';

import { Slice, SliceKey } from '@bangle.io/create-store';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import {
  getOpenedWsPaths,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import { assertNotUndefined } from '@bangle.io/utils';

import type { NaukarStateConfig } from '../common';
import { setupCollabManager } from '../common';

export const workerEditorSliceKey = new SliceKey<
  {
    editorManager: CollabManager | undefined;
  },
  {
    name: 'action::@bangle.io/worker-naukar:set-editor-manager';
    value: {
      editorManager: CollabManager;
    };
  },
  any,
  NaukarStateConfig
>('workerEditorSlice');

export function getEditorManager() {
  return workerEditorSliceKey.queryOp((state) => {
    return workerEditorSliceKey.getSliceStateAsserted(state).editorManager;
  });
}

export function editorManagerSlice() {
  return new Slice({
    key: workerEditorSliceKey,
    state: {
      init() {
        return {
          editorManager: undefined,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/worker-naukar:set-editor-manager': {
            state.editorManager?.destroy();

            return {
              ...state,
              editorManager: action.value.editorManager,
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
            const editorManager = getEditorManager()(store.state);

            // cleanup editor manager docs if they are not opened anymore
            editorManager?.getAllDocNames().forEach((docName) => {
              if (!openedWsPaths.has(docName)) {
                console.debug(
                  `editorManagerSlice remove ${docName} collab-state`,
                );
                editorManager?.removeCollabState(docName);
              }
            });
          },

          deferredOnce(store, abortSignal) {
            const { extensionRegistry, collabMessageBus } = config;

            store.dispatch({
              name: 'action::@bangle.io/worker-naukar:set-editor-manager',
              value: {
                editorManager: setupCollabManager(
                  extensionRegistry.specRegistry.schema,
                  store,
                  collabMessageBus,
                ),
              },
            });

            abortSignal.addEventListener(
              'abort',
              () => {
                getEditorManager()(store.state)?.destroy();
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
