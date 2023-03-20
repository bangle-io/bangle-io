import type { SyncMessage } from '@bangle.io/nsm';
import {
  createSyncStore,
  deserializeTransaction,
  serializeTransaction,
  timeoutSchedular,
  validateSlicesForSerialization,
} from '@bangle.io/nsm';
import { nsmPageSlice } from '@bangle.io/slice-page';

export const createNsmStore = ({
  sendMessage,
}: {
  sendMessage: (msg: any) => void;
}) => {
  const storeName = 'naukar-store';

  const syncStore = createSyncStore({
    storeName,
    debug: (log) => {
      console.debug(storeName, log);
    },
    sync: {
      type: 'replica',
      slices: [nsmPageSlice],
      mainStore: 'bangle-store',
      validate({ syncSlices }) {
        validateSlicesForSerialization(syncSlices);
      },
      sendMessage: (msg) => {
        if (msg.type === 'tx') {
          const txObj = serializeTransaction(msg.body, syncStore.store);

          sendMessage({ ...msg, body: txObj });
        } else {
          sendMessage(msg);
        }
      },
    },
    slices: [],
    scheduler: timeoutSchedular(5),
  });

  const store = syncStore.store;

  return {
    store,
    receiveMessage: (msg: any) => {
      const obj: SyncMessage = msg;

      if (obj.type === 'tx') {
        const tx = deserializeTransaction(obj.body as any, syncStore.store);
        syncStore.receiveMessage({
          ...obj,
          body: tx,
        });
      } else {
        syncStore.receiveMessage(obj);

        return;
      }
    },
  };
};
