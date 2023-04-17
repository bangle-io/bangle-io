import * as Comlink from 'comlink';

import type { SyncMessage } from '@bangle.io/nsm';
import {
  createSyncStore,
  idleCallbackScheduler,
  payloadParser,
  payloadSerializer,
  Store,
  validateSlicesForSerialization,
} from '@bangle.io/nsm';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { nsmUISlice } from '@bangle.io/slice-ui';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

import { historySliceFamily } from './history-slice';
import {
  pageLifeCycleBlockReload,
  pageLifeCycleWatch,
} from './page-lifecycle-slice';

export const createNsmStore = () => {
  const storeName = 'bangle-store';

  const syncSlices = [nsmPageSlice];
  const store = createSyncStore({
    storeName,
    debug: (log) => {
      console.info(storeName, '=>', log);
    },
    sync: {
      type: 'main',
      slices: syncSlices,
      replicaStores: ['naukar-store'],
      validate({ syncSlices }) {
        validateSlicesForSerialization(syncSlices);
      },
      payloadParser,
      payloadSerializer,
      sendMessage(msg) {
        naukarProxy.nsmNaukarStoreReceive(msg);
      },
    },
    slices: [
      ...historySliceFamily,
      pageLifeCycleWatch,
      pageLifeCycleBlockReload,
      nsmUISlice,
    ],
    scheduler: idleCallbackScheduler(15),
    dispatchTx: (store, tx) => {
      let newState = store.state.applyTransaction(tx);
      syncSlices.forEach((sl) => {
        console.debug('main', sl.lineageId, sl.getState(newState));
      });
      Store.updateState(store, newState, tx);
    },
  });

  naukarProxy.nsmNaukarStoreRegisterCb(
    Comlink.proxy((msg) => {
      const obj: SyncMessage = msg;

      store.receiveMessage(obj);
    }),
  );

  return store.store;
};
