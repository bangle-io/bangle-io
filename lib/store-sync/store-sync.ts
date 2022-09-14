import type {
  ApplicationStore,
  AppState,
  BaseAction,
} from '@bangle.io/create-store';
import { Slice, SliceKey } from '@bangle.io/create-store';
import {
  assertActionName,
  exponentialBackoff,
  isWorkerGlobalScope,
} from '@bangle.io/utils';

type SyncAction =
  | {
      name: 'action::@bangle.io/store-sync:start-sync';
    }
  | {
      name: 'action::@bangle.io/store-sync:port-ready';
    };

export interface StoreSyncState<A> {
  pendingActions: A[];
  startSync: boolean;
  portReady: boolean;
}

const syncStoreKey = new SliceKey<StoreSyncState<any>, SyncAction>(
  'store-sync',
);

const LOG = false;
const log = LOG
  ? console.log.bind(
      console,
      `${isWorkerGlobalScope() ? '[worker]' : ''} store-sync`,
    )
  : () => {};

const logWarn = console.warn.bind(
  console,
  `${isWorkerGlobalScope() ? '[worker]' : ''} store-sync`,
);

// Use this to add a key in the action serializer to signal which field must be transferred.
// Example usage:
// someKey.actionSerializer(
//   actionName,
//   (action) => {
//     const messageChannel = action.value.messageChannel;
//     return {
//       [APPLY_TRANSFER]: 'port',  // <--- this key helps us find the value that needs to be transferred
//       port: messageChannel.port2 as any, // <--- this is the value that will be transferred
//       ... // Any other values will be copied and sent provided they can be serialized
//     };
//   },
//   (serialVal) => {
//     return {
//       port: serialVal.port,
//     };
//   },
// );
export const APPLY_TRANSFER: unique symbol = Symbol('apply-transfer');

const MAX_PING_PONG_TRY = 15;

export function startStoreSync() {
  return (
    _: AppState,
    dispatch: ApplicationStore<any, SyncAction>['dispatch'],
  ) => {
    dispatch({
      name: 'action::@bangle.io/store-sync:start-sync',
    });
  };
}

export function isStoreSyncReady() {
  return (state: AppState) => {
    return (
      syncStoreKey.getSliceStateAsserted(state).portReady &&
      syncStoreKey.getSliceStateAsserted(state).startSync
    );
  };
}

export type StoreSyncConfigType<A extends BaseAction = any> = {
  port: MessagePort;
  // return true for the actions that you want to send across
  actionSendFilter: (action: A) => boolean;
  // return true for actions that you want to receive from the foreign port
  actionReceiveFilter: (action: A) => boolean;
};

/**
 * The slice is set to keep recording actions until `startStoreSync`
 * is called and the port handshake is successfull, after which it starts a bidirectional
 * action communication to sync the two stores.
 * NOTE: This is one of the rare exceptions where side effects are run in both worker ~ main
 * and the actions dispatched for one are not dispatched to the other.
 *
 * @param configKey - the key containing the configuration
 */
export function storeSyncSlice<
  A extends BaseAction,
  C extends StoreSyncConfigType<A>,
>(configKey: SliceKey<C>) {
  assertActionName('@bangle.io/store-sync', {} as SyncAction);

  return new Slice<StoreSyncState<A>, SyncAction>({
    key: syncStoreKey,
    state: {
      init() {
        return { pendingActions: [], portReady: false, startSync: false };
      },
      apply(action, sliceState, appState) {
        if (action.name === 'action::@bangle.io/store-sync:start-sync') {
          return {
            ...sliceState,
            startSync: true,
          };
        }

        if (action.name === 'action::@bangle.io/store-sync:port-ready') {
          return {
            ...sliceState,
            portReady: true,
          };
        }

        if (
          configKey
            .getSliceStateAsserted(appState)
            .actionSendFilter(action as A)
        ) {
          sliceState.pendingActions.push(action as A);
        }

        return sliceState;
      },
    },

    sideEffect: [
      syncStoreKey.effect((initialState) => {
        const pingController = new AbortController();
        const { port, actionReceiveFilter } =
          configKey.getSliceStateAsserted(initialState);

        return {
          destroy() {
            pingController.abort();
            port.close();
          },

          update(store, prevState) {
            if (
              syncStoreKey.getValueIfChanged(
                'startSync',
                store.state,
                prevState,
              ) === true &&
              !pingController.signal.aborted
            ) {
              port.onmessage = ({ data }) => {
                if (data?.type === 'ping') {
                  port.postMessage({ type: 'pong' });

                  return;
                }
                if (
                  data?.type === 'pong' &&
                  // avoid dispatching again if port is already ready
                  !syncStoreKey.getSliceStateAsserted(store.state).portReady
                ) {
                  log('port is ready!');
                  pingController.abort();
                  store.dispatch({
                    name: 'action::@bangle.io/store-sync:port-ready',
                  });

                  return;
                }
                if (data?.type === 'action') {
                  const parsedAction = (store as ApplicationStore).parseAction(
                    data.action,
                  );

                  if (parsedAction && actionReceiveFilter(parsedAction)) {
                    log('received action', parsedAction);
                    store.dispatch(parsedAction);
                  }
                }
              };

              // start pinging the port untill we hear a response from the other side.
              exponentialBackoff(
                (attempt) => {
                  log('store sync attempt', attempt);

                  if (attempt === MAX_PING_PONG_TRY) {
                    throw new Error(
                      'Unable to get a ping response from the other port',
                    );
                  }
                  port.postMessage({ type: 'ping' });

                  return false;
                },
                pingController.signal,
                {
                  maxTry: MAX_PING_PONG_TRY,
                },
              );
            }
          },
        };
      }),

      syncStoreKey.effect(() => {
        return {
          update(store, _, sliceState) {
            const ready = sliceState.startSync && sliceState.portReady;

            if (ready && sliceState.pendingActions.length > 0) {
              const { port } = configKey.getSliceStateAsserted(store.state);
              const pendingActions = sliceState.pendingActions;
              sliceState.pendingActions = [];

              for (const action of pendingActions) {
                // If an action has fromStore field, do not send it across as it
                // was received from outside.
                if (!action.fromStore) {
                  const serializedAction = (
                    store as ApplicationStore
                  ).serializeAction(action);

                  if (serializedAction) {
                    log('sending message', action.name);
                    const { serializedValue } = serializedAction;

                    let transferKey = serializedValue
                      ? (serializedValue as Record<string | symbol, unknown>)[
                          APPLY_TRANSFER
                        ]
                      : undefined;

                    if (transferKey) {
                      if (typeof transferKey !== 'string') {
                        throw new Error('transferKey must be a string');
                      }

                      let serializedValue: any =
                        serializedAction.serializedValue;

                      log('transferring :', transferKey);

                      const value = serializedValue[transferKey];

                      if (value == null) {
                        throw new Error(
                          `transfer value with key "${transferKey}" must not be undefined`,
                        );
                      }

                      delete serializedValue[APPLY_TRANSFER];

                      port.postMessage(
                        {
                          type: 'action',
                          action: serializedAction,
                        },
                        [value],
                      );
                    } else {
                      port.postMessage({
                        type: 'action',
                        action: serializedAction,
                      });
                    }
                  } else {
                    logWarn('No serialization found for ', action.name);
                  }
                }
              }
            }
          },
        };
      }),
    ],
  });
}
