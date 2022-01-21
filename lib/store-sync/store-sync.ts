import {
  ApplicationStore,
  AppState,
  BaseAction,
  Slice,
  SliceKey,
} from '@bangle.io/create-store';
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
      (initialState) => {
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
      },

      () => {
        return {
          update(store, _, sliceState) {
            const ready = sliceState.startSync && sliceState.portReady;

            if (ready && sliceState.pendingActions.length > 0) {
              const { port } = configKey.getSliceStateAsserted(store.state);

              for (const action of sliceState.pendingActions) {
                // If an action has fromStore field, do not send it across as it
                // was received from outside.
                if (!action.fromStore) {
                  const serializedAction = (
                    store as ApplicationStore
                  ).serializeAction(action);

                  if (serializedAction) {
                    log('sending message', action.name);
                    port.postMessage({
                      type: 'action',
                      action: serializedAction,
                    });
                  } else {
                    log('No serialization found for ', action.name);
                  }
                }
              }
              sliceState.pendingActions = [];
            }
          },
        };
      },
    ],
  });
}
