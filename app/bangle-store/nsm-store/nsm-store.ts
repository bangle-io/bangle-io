// <-- PLOP INSERT SLICE IMPORT -->

import {
  editorManagerProxy,
  editorManagerProxyEffects,
} from '@bangle.io/api/nsm/editor';
import { STORAGE_ON_CHANGE_EMITTER_KEY } from '@bangle.io/constants';
import {
  extensionRegistryEffects,
  nsmExtensionRegistry,
} from '@bangle.io/extension-registry';
import type { EffectCreator, Store } from '@bangle.io/nsm-3';
import { store } from '@bangle.io/nsm-3';
import {
  nsmSliceFileSha,
  nsmSliceFileShaEffects,
} from '@bangle.io/nsm-slice-file-sha';
import {
  nsmSliceWorkspace,
  nsmWorkspaceEffects,
} from '@bangle.io/nsm-slice-workspace';
import type {
  EternalVars,
  StorageProviderChangeType,
} from '@bangle.io/shared-types';
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
import { nsmUISlice } from '@bangle.io/slice-ui';
import { uiEffects } from '@bangle.io/slice-ui/nsm-ui-slice';

import { historyEffects, historySlice } from './history-slice';
import { miscEffects } from './misc-effects';
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
  ...editorManagerProxyEffects,
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

export const createNsmStore = (eternalVars: EternalVars): Store => {
  const storeName = 'bangle-store';

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

  const bangleStore = store({
    storeName,
    debug: (log) => {
      console.group(`[main] ${log.type} >`);
      console.info(log);
      console.groupEnd();
    },
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
      editorManagerProxy,

      ...eternalVars.extensionRegistry.getNsmSlices(),
    ],

    stateOverride: initStateOverride,
  });

  allEffects.forEach((effect) => {
    bangleStore.registerEffect(effect);
  });
  eternalVars.extensionRegistry.getNsmEffects().forEach((effect) => {
    bangleStore.registerEffect(effect);
  });

  const onStorageProviderChange = (msg: StorageProviderChangeType) => {
    // Note: ensure you also update the worker store
    if (
      msg.type === 'delete' ||
      msg.type === 'create' ||
      msg.type === 'rename'
    ) {
      bangleStore.dispatch(refreshWorkspace(), {
        debugInfo: 'storage-provider-change',
      });
    }
  };

  eternalVars.storageEmitter.on(
    STORAGE_ON_CHANGE_EMITTER_KEY,
    onStorageProviderChange,
  );

  bangleStore.destroySignal.addEventListener(
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

  return bangleStore;
};
