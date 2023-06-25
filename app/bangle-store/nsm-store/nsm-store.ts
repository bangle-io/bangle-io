import * as Comlink from 'comlink';

import { nsmApi2 } from '@bangle.io/api';
import { STORAGE_ON_CHANGE_EMITTER_KEY } from '@bangle.io/constants';
import { nsmExtensionRegistry } from '@bangle.io/extension-registry';
import type { SyncMessage } from '@bangle.io/nsm';
import {
  createSyncStore,
  idleCallbackScheduler,
  payloadParser,
  payloadSerializer,
  Store,
  validateSlicesForSerialization,
} from '@bangle.io/nsm';
import { nsmSliceFileSha } from '@bangle.io/nsm-slice-file-sha';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import type {
  EternalVars,
  StorageProviderChangeType,
} from '@bangle.io/shared-types';
import { nsmEditorManagerSlice } from '@bangle.io/slice-editor-manager';
import { nsmNotification } from '@bangle.io/slice-notification';
import { nsmPageSlice } from '@bangle.io/slice-page';
import {
  refreshWorkspace,
  sliceRefreshWorkspace,
} from '@bangle.io/slice-refresh-workspace';
import { nsmUISlice } from '@bangle.io/slice-ui';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

import { historySliceFamily } from './history-slice';
import { miscEffects } from './misc-effects';
import { nsmE2eEffect, nsmE2eSyncEffect } from './nsm-e2e';
import {
  pageLifeCycleBlockReload,
  pageLifeCycleWatch,
} from './page-lifecycle-slice';
import {
  getLocalStorageData,
  getSessionStorageData,
  persistStateSlice,
} from './persist-state-slice';

export const createNsmStore = (eternalVars: EternalVars): Store => {
  const extensionSlices = eternalVars.extensionRegistry.getNsmSlices();

  const storeName = 'bangle-store';

  const localStorageData = getLocalStorageData();
  const sessionStorageData = getSessionStorageData();

  const initStateOverride = {
    ...localStorageData,
    ...sessionStorageData,
    [nsmExtensionRegistry.spec.lineageId]: {
      extensionRegistry: eternalVars.extensionRegistry,
    },
  };

  console.debug('Overriding with state', initStateOverride);

  const syncSlices = [
    sliceRefreshWorkspace,
    nsmPageSlice,
    nsmNotification.nsmNotificationSlice,
    nsmSliceFileSha,
  ];

  const store = createSyncStore({
    storeName,
    debug: (log) => {
      if (log.type === 'TX') {
        console.group('TX >', log.sourceSliceLineage, '>', log.actionId);
        console.info(log.payload);
        console.info(log);
        console.groupEnd();
      } else {
        // console.info('NSM', log.type, log);
      }
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
      nsmExtensionRegistry,
      nsmUISlice,
      nsmEditorManagerSlice,
      nsmSliceWorkspace,

      nsmApi2.editor._editorManagerProxy,
      ...miscEffects,
      ...extensionSlices,
      // TODO: remove e2e effects for production
      nsmE2eEffect,
      nsmE2eSyncEffect,
      persistStateSlice,
    ],
    initStateOverride,
    scheduler: idleCallbackScheduler(15),
    dispatchTx: (store, tx) => {
      let newState = store.state.applyTransaction(tx);
      syncSlices.forEach((sl) => {
        console.debug('main', sl.spec.lineageId, sl.getState(newState));
      });
      Store.updateState(store, newState, tx);
    },
  });

  const onStorageProviderChange = (msg: StorageProviderChangeType) => {
    // Note: ensure you also update the worker store
    if (
      msg.type === 'delete' ||
      msg.type === 'create' ||
      msg.type === 'rename'
    ) {
      store.store.dispatch(refreshWorkspace(null), 'storage-provider-change');
    }
  };

  eternalVars.storageEmitter.on(
    STORAGE_ON_CHANGE_EMITTER_KEY,
    onStorageProviderChange,
  );

  store.store.destroySignal.addEventListener(
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

  naukarProxy.nsmNaukarStoreRegisterCb(
    Comlink.proxy((msg) => {
      const obj: SyncMessage = msg;

      store.receiveMessage(obj);
    }),
  );

  return store.store;
};
