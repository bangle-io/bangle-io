import { config } from '@bangle.io/config';
import { STORAGE_ON_CHANGE_EMITTER_KEY } from '@bangle.io/constants';
import type { E2ENaukarTypes } from '@bangle.io/e2e-types';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import { nsmExtensionRegistry } from '@bangle.io/extension-registry';
import type { SyncMessage } from '@bangle.io/nsm';
import {
  createSyncStore,
  payloadParser,
  payloadSerializer,
  Store,
  timeoutSchedular,
  validateSlicesForSerialization,
} from '@bangle.io/nsm';
import type { StorageProviderChangeType } from '@bangle.io/shared-types';
import { nsmNotification } from '@bangle.io/slice-notification';
import { nsmPageSlice } from '@bangle.io/slice-page';
import {
  incrementCounter,
  sliceRefreshWorkspace,
} from '@bangle.io/slice-refresh-workspace';
import type { Emitter } from '@bangle.io/utils';

export const createNsmStore = ({
  sendMessage,
  extensionRegistry,
  storageEmitter,
}: {
  sendMessage: (msg: any) => void;
  extensionRegistry: ExtensionRegistry;
  storageEmitter: Emitter<StorageProviderChangeType>;
}) => {
  const storeName = 'naukar-store';

  const synSlices = [
    sliceRefreshWorkspace,
    nsmPageSlice,
    nsmNotification.nsmNotificationSlice,
  ];
  const initStateOverride = {
    [nsmExtensionRegistry.spec.lineageId]: { extensionRegistry },
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
    slices: [nsmExtensionRegistry],
    initStateOverride,
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

  const onStorageProviderChange = (msg: StorageProviderChangeType) => {
    // TODO test if this works
    console.warn('worker', msg);
    store.dispatch(incrementCounter(null));
  };
  storageEmitter.on(STORAGE_ON_CHANGE_EMITTER_KEY, onStorageProviderChange);

  store.destroySignal.addEventListener(
    'abort',
    () => {
      storageEmitter.off(
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
    receiveMessage: (msg: any) => {
      const obj: SyncMessage = msg;
      syncStore.receiveMessage(obj);
    },
  };
};
