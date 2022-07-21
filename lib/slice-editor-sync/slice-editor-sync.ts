import { CollabMessageBus } from '@bangle.dev/collab-comms';

import { Slice } from '@bangle.io/create-store';
import { APPLY_TRANSFER } from '@bangle.io/store-sync';
import { assertActionName } from '@bangle.io/utils';

import { editorSyncKey } from './common';
import { transferPortEffect } from './effects';

export function getCollabMessageBus() {
  return editorSyncKey.queryOp((state): CollabMessageBus => {
    return editorSyncKey.getSliceStateAsserted(state).collabMessageBus;
  });
}

/**
 * This slice sets up the CollabMessageBus across both worker and main thread, to allow
 * for communication between the collab-manager (running in worker) and the collab-clients (running in main thread).
 * It is asymmetric in dispatching the actions, unlike other slices, across this worker-main
 * boundary as it needs to _transfer_ `port2` to the other side.
 */
export function editorSyncSlice() {
  assertActionName('@bangle.io/slice-editor-sync', editorSyncKey);
  let seen = new WeakSet();

  return new Slice({
    key: editorSyncKey,
    state: {
      init() {
        return {
          collabMessageBus: new CollabMessageBus({}),
          unregister: () => {},
          port: undefined,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/slice-editor-sync:transfer-port': {
            state.unregister();
            state.port?.close();
            const { port } = action.value;
            const unregister = state.collabMessageBus.receiveMessages(
              CollabMessageBus.WILD_CARD,
              (message) => {
                // prevent posting the same message that it received
                if (seen.has(message)) {
                  return;
                }
                port.postMessage(message);
              },
            );
            port.onmessage = ({ data }) => {
              seen.add(data);
              state.collabMessageBus.transmit(data);
            };

            return {
              ...state,
              port: action.value.port,
              unregister,
            };
          }
        }

        return state;
      },
    },
    actions: {
      'action::@bangle.io/slice-editor-sync:transfer-port': (actionName) => {
        return editorSyncKey.actionSerializer(
          actionName,
          (action) => {
            switch (action.name) {
              case 'action::@bangle.io/slice-editor-sync:transfer-port': {
                const messageChannel = action.value.messageChannel;

                if (!messageChannel) {
                  throw new Error(
                    'messageChannel is required to transfer the port to worker',
                  );
                }

                return {
                  [APPLY_TRANSFER]: 'port',
                  port: messageChannel.port2 as any,
                };
              }
            }
          },
          (serialVal) => {
            return {
              port: serialVal.port,
            };
          },
        );
      },
    },
    sideEffect: [transferPortEffect],
  });
}
