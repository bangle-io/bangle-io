import {
  ApplicationStore,
  AppState,
  BaseAction,
  Slice,
  SliceKey,
} from '@bangle.io/create-store';

type SyncAction = {
  name: '@bangle.io/utils/store-sync-slice-is-ready';
};

export function setStoreSyncSliceReady() {
  return (
    _: AppState,
    dispatch: ApplicationStore<any, SyncAction>['dispatch'],
  ) => {
    dispatch({
      name: '@bangle.io/utils/store-sync-slice-is-ready',
    });
  };
}

export function storeSyncSlice<A extends BaseAction>({
  key,
  port,
  actionSendFilter = () => true,
  actionReceiveFilter = () => true,
}: {
  port: MessagePort;
  key: SliceKey;
  actionSendFilter?: (action: A) => boolean;
  actionReceiveFilter?: (action: A) => boolean;
}) {
  return new Slice<{ pendingActions: A[]; isReady: boolean }, A>({
    key,
    state: {
      init() {
        return { pendingActions: [], isReady: false };
      },
      apply(action, sliceState) {
        if (action.name === '@bangle.io/utils/store-sync-slice-is-ready') {
          return {
            ...sliceState,
            isReady: true,
          };
        }

        if (actionSendFilter(action as A)) {
          sliceState.pendingActions.push(action as A);
        }
        return sliceState;
      },
    },
    sideEffect(store: ApplicationStore) {
      port.onmessage = ({ data }) => {
        if (data?.type === 'action') {
          let parsedAction = store.parseAction(data.action);
          if (parsedAction && actionReceiveFilter(parsedAction)) {
            // console.debug('action received', parsedAction);
            store.dispatch(parsedAction);
          }
        }
      };

      return {
        update(store, _, sliceState) {
          const isReady = sliceState.isReady;

          if (isReady && sliceState.pendingActions.length > 0) {
            for (const action of sliceState.pendingActions) {
              if (!action.fromStore) {
                const serializedAction = store.serializeAction(action);
                if (serializedAction) {
                  port.postMessage({
                    type: 'action',
                    action: serializedAction,
                  });
                }
              }
            }
            sliceState.pendingActions = [];
          }
        },
        destroy() {
          port.close();
        },
      };
    },
  });
}
