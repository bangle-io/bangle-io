import {
  ApplicationStore,
  AppState,
  BaseAction,
  Slice,
  SliceKey,
} from '@bangle.io/create-store';

import { assertActionName } from './action';
import { exponentialBackoff } from './utility';
import { isWorkerGlobalScope } from './worker';

type SyncAction = {
  name: 'action::@bangle.io/utils:store-sync-slice-is-ready';
};

const LOG = false;
const log = LOG
  ? console.log.bind(
      console,
      `${isWorkerGlobalScope() ? '[worker]' : ''} store-sync-slice`,
    )
  : () => {};

const MAX_PING_PONG_TRY = 15;

export function setStoreSyncSliceReady() {
  return (
    _: AppState,
    dispatch: ApplicationStore<any, SyncAction>['dispatch'],
  ) => {
    dispatch({
      name: 'action::@bangle.io/utils:store-sync-slice-is-ready',
    });
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
 * The slice is set to keep recording actions until `setStoreSyncSliceReady`
 * is called and the port handshake is successfull, after which it starts a bidirectional
 * action communication to sync the two stores stores.
 *
 * @param configKey - the key containing the configuration
 */
export function storeSyncSlice<
  A extends BaseAction,
  C extends StoreSyncConfigType<A>,
>(configKey: SliceKey<C>) {
  assertActionName('@bangle.io/utils', {} as SyncAction);

  return new Slice<{ pendingActions: A[]; isReady: boolean }, A>({
    state: {
      init() {
        return { pendingActions: [], isReady: false };
      },
      apply(action, sliceState, appState) {
        if (
          action.name === 'action::@bangle.io/utils:store-sync-slice-is-ready'
        ) {
          return {
            ...sliceState,
            isReady: true,
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
    sideEffect(store: ApplicationStore) {
      const { port, actionReceiveFilter } = configKey.getSliceStateAsserted(
        store.state,
      );

      let portReady = false;
      let pingController = new AbortController();

      port.onmessage = ({ data }) => {
        if (data?.type === 'ping') {
          port.postMessage({ type: 'pong' });
          return;
        }
        if (data?.type === 'pong') {
          log('received pong port is ready!');
          pingController.abort();
          portReady = true;
          return;
        }
        if (data?.type === 'action') {
          let parsedAction = store.parseAction(data.action);
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

      return {
        update(store, _, sliceState) {
          const isReady = sliceState.isReady && portReady;

          if (isReady && sliceState.pendingActions.length > 0) {
            for (const action of sliceState.pendingActions) {
              // If an action has fromStore field, do not send it across as it
              // was received from outside.
              if (!action.fromStore) {
                const serializedAction = store.serializeAction(action);
                if (serializedAction) {
                  port.postMessage({
                    type: 'action',
                    action: serializedAction,
                  });
                } else {
                  log('No serialization found for ', action);
                }
              }
            }
            sliceState.pendingActions = [];
          }
        },
        destroy() {
          pingController.abort();
          port.close();
        },
      };
    },
  });
}
