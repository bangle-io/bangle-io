import { config } from '@bangle.io/config';
import { STORAGE_ON_CHANGE_EMITTER_KEY } from '@bangle.io/constants';
import type { E2ENaukarTypes } from '@bangle.io/e2e-types';
import { nsmExtensionRegistry } from '@bangle.io/extension-registry';
import type { InferSliceName, SyncMessage } from '@bangle.io/nsm';
import {
  createSyncStore,
  payloadParser,
  payloadSerializer,
  Store,
  timeoutSchedular,
  validateSlicesForSerialization,
} from '@bangle.io/nsm';
import { nsmSliceFileSha } from '@bangle.io/nsm-slice-file-sha';
import type {
  EternalVars,
  StorageProviderChangeType,
} from '@bangle.io/shared-types';
import { nsmNotification } from '@bangle.io/slice-notification';
import { nsmPageSlice } from '@bangle.io/slice-page';
import {
  refreshWorkspace,
  sliceRefreshWorkspace,
} from '@bangle.io/slice-refresh-workspace';
import { nsmWorkerEditor } from '@bangle.io/worker-editor';

// TODO: some of the slices are async and some are sync
//       this means the dispatching the async ones will not immediately
//       update the state.
export type WorkerStore = Store<
  | InferSliceName<typeof nsmExtensionRegistry>
  | InferSliceName<typeof nsmNotification.nsmNotificationSlice>
  | InferSliceName<typeof nsmPageSlice>
  | InferSliceName<typeof nsmSliceFileSha>
  | InferSliceName<typeof nsmWorkerEditor>
  | InferSliceName<typeof sliceRefreshWorkspace>
>;

export const createNsmStore = ({
  sendMessage,
  eternalVars,
}: {
  sendMessage: (msg: any) => void;
  eternalVars: EternalVars;
}): {
  store: WorkerStore;
  receiveMessage: (msg: SyncMessage) => void;
} => {
  const storeName = 'naukar-store';

  const synSlices = [
    // ensure types are also updated
    nsmNotification.nsmNotificationSlice,
    nsmPageSlice,
    nsmSliceFileSha,
    sliceRefreshWorkspace,
  ];
  const initStateOverride = {
    [nsmExtensionRegistry.spec.lineageId]: {
      extensionRegistry: eternalVars.extensionRegistry,
    },
  };

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
    slices: [
      // ensure types are also updated
      nsmExtensionRegistry,
      nsmWorkerEditor,
    ],
    initStateOverride,
    scheduler: timeoutSchedular(5),
    dispatchTx: (store, tx) => {
      let newState = store.state.applyTransaction(tx);

      synSlices.forEach((sl) => {
        console.log('worker=>', sl.spec.lineageId, sl.getState(newState));
      });
      Store.updateState(store, newState, tx);
    },
  });

  const store = syncStore.store;

  const onStorageProviderChange = (msg: StorageProviderChangeType) => {
    // Note: ensure you also update the main store
    if (
      msg.type === 'delete' ||
      msg.type === 'create' ||
      msg.type === 'rename'
    ) {
      store.dispatch(refreshWorkspace(null), 'storage-provider-change');
    }
  };

  eternalVars.storageEmitter.on(
    STORAGE_ON_CHANGE_EMITTER_KEY,
    onStorageProviderChange,
  );

  store.destroySignal.addEventListener(
    'abort',
    () => {
      eternalVars.storageEmitter.off(
        STORAGE_ON_CHANGE_EMITTER_KEY,
        onStorageProviderChange,
      );
    },
    {
      once: true,
    },
  );

  const helpers: E2ENaukarTypes = {
    config,
  };

  // eslint-disable-next-line no-restricted-globals
  self._e2eNaukarHelpers = helpers;

  return {
    store,
    receiveMessage: (msg) => {
      const obj: SyncMessage = msg;
      syncStore.receiveMessage(obj);
    },
  };
};
