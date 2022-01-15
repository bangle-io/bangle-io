import * as Comlink from 'comlink';

import { BaseAction, Slice, SliceKey } from '@bangle.io/create-store';
import { naukarWorkerProxy } from '@bangle.io/naukar-proxy';
import {
  assertNonWorkerGlobalScope,
  setStoreSyncSliceReady,
  StoreSyncConfigType,
  storeSyncSlice,
} from '@bangle.io/utils';

import { workerLoaderSliceKey } from './worker-loader-slice';

assertNonWorkerGlobalScope();

let whiteListedActions = ['action::@bangle.io/slice-page:'];

const actionFilter = (action: BaseAction) =>
  whiteListedActions.some((rule) => action.name.startsWith(rule));

const sliceKey = new SliceKey<
  { msgChannel: MessageChannel } & StoreSyncConfigType<BaseAction>
>('workerSetupSlice-stateSyncKey');

export function workerStoreSyncSlices() {
  return [
    new Slice({
      key: sliceKey,
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
        const { msgChannel } = sliceKey.getSliceStateAsserted(store.state);

        naukarWorkerProxy.sendMessagePort(
          Comlink.transfer(msgChannel.port2, [msgChannel.port2]),
        );

        return {
          update(store, prevState) {
            const workerLoaded = workerLoaderSliceKey.getValueIfChanged(
              'workerLoaded',
              store.state,
              prevState,
            );

            if (workerLoaded) {
              setStoreSyncSliceReady()(store.state, store.dispatch);
            }
          },
        };
      },
    }),
    storeSyncSlice(sliceKey),
  ];
}
