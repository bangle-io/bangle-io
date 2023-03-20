import * as Comlink from 'comlink';

import type { SyncMessage } from '@bangle.io/nsm';
import {
  createSyncStore,
  deserializeTransaction,
  idleCallbackScheduler,
  serializeTransaction,
  validateSlicesForSerialization,
} from '@bangle.io/nsm';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

export const createNsmStore = () => {
  const storeName = 'bangle-store';

  const store = createSyncStore({
    storeName,
    debug: (log) => {},
    sync: {
      type: 'main',
      slices: [],
      replicaStores: ['naukar-store'],
      validate({ syncSlices }) {
        validateSlicesForSerialization(syncSlices);
      },
      sendMessage(msg) {
        if (msg.type === 'tx') {
          const txObj = serializeTransaction(msg.body, store.store);

          naukarProxy.nsmNaukarStoreReceive({ ...msg, body: txObj });
        } else {
          naukarProxy.nsmNaukarStoreReceive(msg);
        }
      },
    },
    slices: [],
    scheduler: idleCallbackScheduler(15),
  });

  naukarProxy.nsmNaukarStoreRegisterCb(
    Comlink.proxy((msg) => {
      const obj: SyncMessage = msg;

      if (obj.type === 'tx') {
        const tx = deserializeTransaction(obj.body as any, store.store);
        store.receiveMessage({
          ...obj,
          body: tx,
        });

        return;
      } else {
        store.receiveMessage(obj);

        return;
      }
    }),
  );

  return store.store;
};
