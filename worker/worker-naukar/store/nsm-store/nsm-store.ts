import type { SyncMessage } from '@bangle.io/nsm';
import {
  createSyncStore,
  payloadParser,
  payloadSerializer,
  Store,
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

  const synSlices = [nsmPageSlice];
  const syncStore = createSyncStore({
    storeName,
    debug: (log) => {
      console.info(storeName, log);
    },
    sync: {
      type: 'replica',
      slices: synSlices,
      mainStore: 'bangle-store',
      payloadParser,
      payloadSerializer,
      validate({ syncSlices }) {
        validateSlicesForSerialization(syncSlices);
      },
      sendMessage: (msg) => {
        sendMessage(msg);
      },
    },
    slices: [],
    scheduler: timeoutSchedular(5),
    dispatchTx: (store, tx) => {
      let newState = store.state.applyTransaction(tx);

      synSlices.forEach((sl) => {
        console.debug('worker', sl.spec.lineageId, sl.getState(newState));
      });
      Store.updateState(store, newState, tx);
    },
  });

  const store = syncStore.store;

  return {
    store,
    receiveMessage: (msg: any) => {
      const obj: SyncMessage = msg;
      syncStore.receiveMessage(obj);
    },
  };
};
