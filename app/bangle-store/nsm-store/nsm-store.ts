// <-- PLOP INSERT SLICE IMPORT -->

import { setupStore } from '@bangle.io/bangle-store-context';
import {
  extensionRegistryEffects,
  nsmExtensionRegistry,
} from '@bangle.io/extension-registry';
import type { EffectCreator, Store } from '@bangle.io/nsm-3';
import {
  nsmSliceFileSha,
  nsmSliceFileShaEffects,
} from '@bangle.io/nsm-slice-file-sha';
import {
  nsmSliceWorkspace,
  nsmWorkspaceEffects,
} from '@bangle.io/nsm-slice-workspace';
import type { EternalVars } from '@bangle.io/shared-types';
import {
  nsmEditorEffects,
  nsmEditorManagerSlice,
} from '@bangle.io/slice-editor-manager';
import { nsmNotificationSlice } from '@bangle.io/slice-notification';
import { nsmPageSlice } from '@bangle.io/slice-page';
import {
  refreshWorkspace,
  sliceRefreshWorkspace,
} from '@bangle.io/slice-refresh-workspace';
import { nsmUISlice, uiEffects } from '@bangle.io/slice-ui';
import { _clearWorker, _setWorker } from '@bangle.io/worker-naukar-proxy';
import { workerSetup } from '@bangle.io/worker-setup';

import { historyEffects, historySlice } from './history-slice';
import { miscEffects } from './misc-effects';
import { naukarReplicaSlicesDispatch } from './naukar-replica-slices-dispatch';
import { nsmE2eEffects } from './nsm-e2e';
import { pageLifeCycleEffects } from './page-lifecycle-slice';
import {
  getLocalStorageData,
  getSessionStorageData,
  persistEffects,
  persistStateSlice,
} from './persist-state-slice';
import { syncNaukarReplicaEffects } from './sync-naukar-replica-slices';

const allEffects: EffectCreator[] = [
  ...extensionRegistryEffects,
  ...historyEffects,
  ...miscEffects,
  ...nsmE2eEffects,
  ...nsmEditorEffects,
  ...nsmSliceFileShaEffects,
  ...nsmWorkspaceEffects,
  ...pageLifeCycleEffects,
  ...persistEffects,
  ...syncNaukarReplicaEffects,
  ...uiEffects,
];

export const createNsmStore = (
  eternalVars: EternalVars,
  handleError: (
    error: Error,
    nsmStore: Store,
    eternalVars: EternalVars,
  ) => void,
): Store => {
  const localStorageData = getLocalStorageData();
  const sessionStorageData = getSessionStorageData();

  const initStateOverride = {
    ...localStorageData,
    ...sessionStorageData,
    [nsmExtensionRegistry.sliceId]: {
      extensionRegistry: eternalVars.extensionRegistry,
    },
  };

  console.debug('Overriding with state', initStateOverride);

  const appStore = setupStore({
    type: 'window',
    eternalVars,

    otherStoreParams: {
      dispatchTransaction: (store, updateState, tx) => {
        const newState = store.state.applyTransaction(tx);
        updateState(newState);
      },
      debug: (log) => {
        console.group(`[main] ${log.type} >`);
        console.info(log);
        console.groupEnd();
      },
      stateOverride: initStateOverride,
    },
    onRefreshWorkspace: (store) => {
      store.dispatch(refreshWorkspace(), {
        debugInfo: 'storage-provider-change',
      });
    },
    effects: [...allEffects, ...eternalVars.extensionRegistry.getNsmEffects()],
    slices: [
      nsmExtensionRegistry,
      sliceRefreshWorkspace,
      nsmPageSlice,
      nsmNotificationSlice,
      nsmSliceFileSha,
      nsmUISlice,
      // <-- PLOP INSERT SLICE -->

      historySlice,
      nsmEditorManagerSlice,

      nsmSliceWorkspace,
      persistStateSlice,

      ...eternalVars.extensionRegistry.getNsmSlices(),
    ],

    registerWorker: {
      setup: async (store) => {
        const naukar = await workerSetup(store.destroySignal);
        _setWorker(naukar);

        return naukar;
      },
      api: (store, eternalVars) => {
        return {
          application: {
            onError: async (error: Error) => {
              handleError(error, store, eternalVars);
            },
          },
          replicaSlices: naukarReplicaSlicesDispatch(store),
        };
      },
    },
  });

  appStore.destroySignal.addEventListener(
    'abort',
    () => {
      _clearWorker();
    },
    {
      once: true,
    },
  );

  return appStore;
};
