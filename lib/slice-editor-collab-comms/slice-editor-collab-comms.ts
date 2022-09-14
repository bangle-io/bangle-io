import { CollabMessageBus } from '@bangle.dev/collab-comms';

import { Slice } from '@bangle.io/create-store';
import { APPLY_TRANSFER } from '@bangle.io/store-sync';
import { assertActionName, isWorkerGlobalScope } from '@bangle.io/utils';

import { editorSyncKey } from './common';

export function getCollabMessageBus() {
  return editorSyncKey.queryOp((state): CollabMessageBus => {
    return editorSyncKey.getSliceStateAsserted(state).comms.collabMessageBus;
  });
}

/**
 * This slice sets up the CollabMessageBus across both worker and main thread, to allow
 * for communication between the collab-manager (running in worker) and the collab-clients (running in main thread).
 * It is asymmetric in dispatching the actions, unlike other slices, across this worker-main
 * boundary as it needs to _transfer_ `port2` to the other side.
 */
export function editorSyncSlice() {
  assertActionName('@bangle.io/slice-editor-collab-comms', editorSyncKey);
  const seen = new WeakSet();

  return new Slice({
    key: editorSyncKey,
    state: {
      init() {
        return {
          comms: {
            collabMessageBus: new CollabMessageBus({}),
            unregister: undefined,
            port: undefined,
          },
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/slice-editor-collab-comms:transfer-port': {
            const { comms } = state;
            comms.unregister?.();
            comms.port?.close();
            const { port } = action.value;
            const unregister = comms.collabMessageBus.receiveMessages(
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
              comms.collabMessageBus.transmit(data);
            };

            return {
              ...state,
              comms: {
                ...comms,
                port: action.value.port,
                unregister,
              },
            };
          }
        }

        return state;
      },
    },
    // Action serializers help us serialize/parse actions to send across the worker-main boundary.
    actions: {
      'action::@bangle.io/slice-editor-collab-comms:transfer-port': (
        actionName,
      ) => {
        return editorSyncKey.actionSerializer(
          actionName,
          (action) => {
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

export const transferPortEffect = editorSyncKey.effect(() => {
  return {
    deferredOnce(store) {
      // do not run it in worker context, to avoid duplicate firing in worker
      // TODO we should remove this, since we are anyway disabling this effect in worker thread
      if (isWorkerGlobalScope()) {
        console.warn('transferPortEffect should not be run in worker context');

        return;
      }

      const messageChannel = new MessageChannel();

      const port = messageChannel.port1;

      // dispatching this action will do things dependent on whether we are in worker or main thread
      // in main thread:
      // - this effect will run and execute serialization of the action and transfer the port2 to worker (see above).
      // - run the state reducer and setup the port1 to receive messages to/from worker.
      // in worker thread:
      // - this effect will not run.
      // - the action from main thread will be parsed and then the state reducer and setup the port2 to receive messages to/from main thread.
      store.dispatch({
        name: 'action::@bangle.io/slice-editor-collab-comms:transfer-port',
        value: {
          port,
          messageChannel,
        },
      });
    },
  };
});
