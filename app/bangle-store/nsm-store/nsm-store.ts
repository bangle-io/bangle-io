import * as Comlink from 'comlink';

import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { SyncMessage } from '@bangle.io/nsm';
import {
  createSyncStore,
  idleCallbackScheduler,
  payloadParser,
  payloadSerializer,
  Store,
  validateSlicesForSerialization,
} from '@bangle.io/nsm';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import { nsmEditorManagerSlice } from '@bangle.io/slice-editor-manager';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { nsmUISlice } from '@bangle.io/slice-ui';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

import { historySliceFamily } from './history-slice';
import { nsmE2eEffect, nsmE2eSyncEffect } from './nsm-e2e';
import {
  pageLifeCycleBlockReload,
  pageLifeCycleWatch,
} from './page-lifecycle-slice';

export const createNsmStore = ({
  extensionRegistry,
}: {
  extensionRegistry: ExtensionRegistry;
}) => {
  const extensionSlices = extensionRegistry.getNsmSlices();

  const storeName = 'bangle-store';

  const syncSlices = [nsmPageSlice];
  const store = createSyncStore({
    storeName,
    debug: (log) => {
      if (log.type === 'TX') {
        console.group('TX >', log.sourceSliceLineage, '>', log.actionId);
        console.info(log.payload);
        console.info(log);
        console.groupEnd();
      } else {
        console.info('NSM', log.type, log);
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
      nsmUISlice,
      nsmEditorManagerSlice,
      nsmSliceWorkspace,
      ...extensionSlices,
      // TODO: remove e2e effects for production
      nsmE2eEffect,
      nsmE2eSyncEffect,
    ],
    scheduler: idleCallbackScheduler(15),
    dispatchTx: (store, tx) => {
      let newState = store.state.applyTransaction(tx);
      syncSlices.forEach((sl) => {
        console.debug('main', sl.spec.lineageId, sl.getState(newState));
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
