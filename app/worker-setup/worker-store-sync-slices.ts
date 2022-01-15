import * as Comlink from 'comlink';

import { workerSyncWhiteListedActions } from '@bangle.io/constants';
import { BaseAction, Slice, SliceKey } from '@bangle.io/create-store';
import { naukarWorkerProxy } from '@bangle.io/worker-naukar-proxy';
import {
  assertNonWorkerGlobalScope,
  setStoreSyncSliceReady,
  StoreSyncConfigType,
  storeSyncSlice,
} from '@bangle.io/utils';

import { workerLoaderSliceKey } from './worker-loader-slice';

assertNonWorkerGlobalScope();

const actionFilter = (action: BaseAction) =>
  workerSyncWhiteListedActions.some((rule) => action.name.startsWith(rule));

export const workerSyncKey = new SliceKey<
  { msgChannel: MessageChannel } & StoreSyncConfigType<BaseAction>
>('workerSetupSlice-stateSyncKey');

/**
 * A slice which handles handles communication of the store actions with the
 * worker thread's store.
 */
export function workerStoreSyncSlices() {
  return [
    new Slice({
      key: workerSyncKey,
      state: {
        init() {
          let msgChannel = new MessageChannel();
          return {
            port: msgChannel.port1,
            msgChannel,
            actionSendFilter: actionFilter,
            actionReceiveFilter: actionFilter,
          };
        },
      },
      sideEffect(store) {
        return {
          update(store, prevState) {
            const workerLoaded = workerLoaderSliceKey.getValueIfChanged(
              'workerLoaded',
              store.state,
              prevState,
            );

            if (workerLoaded) {
              const { msgChannel } = workerSyncKey.getSliceStateAsserted(
                store.state,
              );
              naukarWorkerProxy.sendMessagePort(
                Comlink.transfer(msgChannel.port2, [msgChannel.port2]),
              );

              setStoreSyncSliceReady()(store.state, store.dispatch);
            }
          },
        };
      },
    }),
    storeSyncSlice(workerSyncKey),
  ];
}
