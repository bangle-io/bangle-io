import { Manager } from '@bangle.dev/collab-server';
import { DebouncedDisk } from '@bangle.dev/disk';
import { Node } from '@bangle.dev/pm';

import { Slice, SliceKey } from '@bangle.io/create-store';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { NaukarStateConfig } from '@bangle.io/shared-types';
import {
  blockReload,
  pageLifeCycleTransitionedTo,
  pageSliceKey,
} from '@bangle.io/slice-page';
import {
  getNote,
  workspaceSliceKey,
  writeNote,
} from '@bangle.io/slice-workspace';
import { asssertNotUndefined } from '@bangle.io/utils';

import { setupCollabManager } from '../collab-manager';
import {
  DOC_WRITE_DEBOUNCE_MAX_WAIT,
  DOC_WRITE_DEBOUNCE_WAIT,
} from '../common';

const LOG = false;
const log = LOG ? console.debug.bind(console, 'worker-editor-slice') : () => {};

const workerEditorSliceKey = new SliceKey<
  {
    editorManager: Manager | undefined;
    disk: DebouncedDisk | undefined;
  },
  {
    name: 'action::@bangle.io/worker-naukar:set-editor-manager';
    value: {
      editorManager: Manager;
      disk: DebouncedDisk;
    };
  },
  any,
  NaukarStateConfig
>('workerEditorSlice');

export function diskFlushAll() {
  return workerEditorSliceKey.op((state) => {
    log('diskFlushAll called');
    return workerEditorSliceKey.getSliceStateAsserted(state).disk?.flushAll();
  });
}

export function getEditorManager() {
  return workerEditorSliceKey.op((state, dispatch) => {
    return workerEditorSliceKey.getSliceStateAsserted(state).editorManager;
  });
}

export function editorManagerReset(extensionRegistry: ExtensionRegistry) {
  return workerEditorSliceKey.op((state, dispatch) => {
    const disk = workerEditorSliceKey.getSliceStateAsserted(state).disk;
    const editorManager =
      workerEditorSliceKey.getSliceStateAsserted(state).editorManager;

    asssertNotUndefined(
      editorManager,
      'cannot reset an undefined editor manager',
    );
    asssertNotUndefined(
      disk,
      'cannot reset an editor manager with undefined disk',
    );

    dispatch({
      name: 'action::@bangle.io/worker-naukar:set-editor-manager',
      value: {
        editorManager: setupCollabManager(extensionRegistry, disk),
        disk,
      },
    });
  });
}

/**
 * Sets up syncing of store actions with the window
 */
export function editorManagerSlice() {
  return new Slice({
    key: workerEditorSliceKey,
    state: {
      init() {
        return {
          editorManager: undefined,
          disk: undefined,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/worker-naukar:set-editor-manager': {
            if (state.editorManager && !state.editorManager.destroyed) {
              state.editorManager.destroy();
            }
            return {
              ...state,
              editorManager: action.value.editorManager,
              disk: action.value.disk,
            };
          }
          default: {
            return state;
          }
        }
      },
    },
    sideEffect: [setupEditorManager, flushNaukarEffect],
  });
}

export const setupEditorManager = workerEditorSliceKey.effect((_, config) => {
  asssertNotUndefined(
    config.extensionRegistry,
    'extensionRegistry needs to be defined',
  );

  return {
    deferredOnce(store, abortSignal) {
      const { extensionRegistry } = config;
      const getItem = async (wsPath: string): Promise<Node> => {
        // TODO the try catch is not ideal, the debouce disk should handl error
        try {
          const doc = await getNote(wsPath)(
            workspaceSliceKey.getStore(store).state,
            workspaceSliceKey.getDispatch(store.dispatch),
            workspaceSliceKey.getStore(store),
          );
          if (!doc) {
            throw new Error(`Note ${wsPath} not found`);
          }
          return doc;
        } catch (error) {
          if (error instanceof Error) {
            store.errorHandler(error);
          }
          // TODO we need to silence this error but also be careful about not losing any user data
          throw error;
        }
      };

      const setItem = async (wsPath: string, doc: Node): Promise<void> => {
        // TODO the try catch is not ideal, the debouce disk should handl error
        try {
          await writeNote(wsPath, doc)(
            workspaceSliceKey.getState(store),
            workspaceSliceKey.getDispatch(store.dispatch),
            workspaceSliceKey.getStore(store),
          );
        } catch (error) {
          if (error instanceof Error) {
            store.errorHandler(error);
          }
        }
      };

      let pendingCall: undefined | ReturnType<typeof setTimeout>;

      const unblock = () => {
        pendingCall = setTimeout(() => {
          blockReload(false)(
            store.state,
            pageSliceKey.getDispatch(store.dispatch),
          );
        }, 100);
      };
      const disk = new DebouncedDisk(getItem, setItem, {
        debounceWait: DOC_WRITE_DEBOUNCE_WAIT,
        debounceMaxWait: DOC_WRITE_DEBOUNCE_MAX_WAIT,
        onPendingWrites: (size) => {
          if (typeof pendingCall === 'number') {
            clearTimeout(pendingCall);
          }
          const needsBlock = size !== 0;

          // immediate dispatch if it needs a block
          // a cooldown wait to avoid noise if it needs to unblock
          if (
            needsBlock !==
            pageSliceKey.getSliceStateAsserted(store.state).blockReload
          ) {
            if (needsBlock === true) {
              blockReload(true)(
                store.state,
                pageSliceKey.getDispatch(store.dispatch),
              );
            } else {
              unblock();
            }
          }
        },
      });
      store.dispatch({
        name: 'action::@bangle.io/worker-naukar:set-editor-manager',
        value: {
          editorManager: setupCollabManager(extensionRegistry, disk),
          disk,
        },
      });

      abortSignal.addEventListener('abort', () => {
        const { disk, editorManager } =
          workerEditorSliceKey.getSliceStateAsserted(store.state);
        disk?.flushAll();
        editorManager?.destroy();
      });
    },
  };
});

export const flushNaukarEffect = workerEditorSliceKey.effect(
  (state, config) => {
    asssertNotUndefined(
      config.extensionRegistry,
      'extensionRegistry needs to be defined',
    );

    return {
      update(store, prevState) {
        if (pageLifeCycleTransitionedTo('active', prevState)(store.state)) {
          editorManagerReset(config.extensionRegistry)(
            store.state,
            store.dispatch,
          );
          return;
        }

        const pageTransitionedToInactive = pageLifeCycleTransitionedTo(
          ['passive', 'terminated', 'frozen', 'hidden'],
          prevState,
        )(store.state);

        if (pageTransitionedToInactive) {
          diskFlushAll()(store.state, store.dispatch);
          return;
        }
      },
    };
  },
);
