import * as Comlink from 'comlink';

import { workerSyncWhiteListedActions } from '@bangle.io/constants';
import type { ApplicationStore, BaseAction } from '@bangle.io/create-store';
import { Slice, SliceKey } from '@bangle.io/create-store';
import type { StoreSyncConfigType } from '@bangle.io/store-sync';
import {
  isStoreSyncReady,
  startStoreSync,
  storeSyncSlice,
} from '@bangle.io/store-sync';
import { assertNonWorkerGlobalScope } from '@bangle.io/utils';
import { setNaukarProxyState } from '@bangle.io/worker-naukar-proxy';

import { loadNaukarModule } from './load-naukar-module';

const LOG = false;

const log = LOG ? console.log.bind(console, 'worker-setup-slice') : () => {};

assertNonWorkerGlobalScope();

const actionFilter = (action: BaseAction) =>
  workerSyncWhiteListedActions.some((rule) => action.name.startsWith(rule));

type StateType = {
  msgChannel: MessageChannel;
} & StoreSyncConfigType<BaseAction>;

export const workerStoreSyncKey = new SliceKey<StateType>(
  'worker-setup-slice-storeSyncKey',
);

/**
 * A slice which handles handles communication of the store actions with the
 * worker thread's store.
 */
export function workerSetupSlices() {
  return [
    new Slice({
      key: workerStoreSyncKey,
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
      sideEffect: [loadWorkerModuleEffect],
    }),
    storeSyncSlice(workerStoreSyncKey),
  ];
}

const loadWorkerModuleEffect = workerStoreSyncKey.effect((_, config) => {
  if (typeof config.useWebWorker !== 'boolean') {
    throw new Error('useWebWorker is required');
  }

  let setNaukarReadyCalled = false;
  let naukar:
    | undefined
    | Awaited<ReturnType<typeof loadNaukarModule>>['naukar'];

  return {
    deferredUpdate(store) {
      // Tell the proxy that the worker is ready
      // this will resolve the promise blocking anyone from
      // accessing naukar methods
      if (!setNaukarReadyCalled && naukar && isStoreSyncReady()(store.state)) {
        setNaukarReadyCalled = true;

        setNaukarProxyState(naukar)(store.state, store.dispatch);
        log('naukar is ready');
      }
    },

    deferredOnce(store: ApplicationStore, abortSignal) {
      let terminate: (() => void) | undefined;
      let destroyed = false;

      loadNaukarModule(config.useWebWorker).then(async (result) => {
        if (destroyed) {
          return;
        }
        terminate = result.terminate;

        const { msgChannel } = workerStoreSyncKey.getSliceStateAsserted(
          store.state,
        );

        result.naukar.sendMessagePort(
          Comlink.transfer(msgChannel.port2, [msgChannel.port2]),
        );

        naukar = result.naukar;

        startStoreSync()(store.state, store.dispatch);
      });

      abortSignal.addEventListener(
        'abort',
        () => {
          destroyed = true;
          terminate?.();
        },
        {
          once: true,
        },
      );
    },
  };
});
