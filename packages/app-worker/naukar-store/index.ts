import { createStore } from '@nalanda/core';

import { defaultStoreConfig, getStoreConfig } from '@bangle.io/naukar-common';
import type { EternalVarsWorker } from '@bangle.io/shared-types';

import { windowStoreReplicaSlice } from './slices/slice-sync-with-window-store';
export { windowStoreReplicaSlice as sliceSyncWithWindowStore } from './slices/slice-sync-with-window-store';

export function createNaukarStore({
  eternalVars,
}: {
  eternalVars: EternalVarsWorker;
}) {
  const store = createStore({
    slices: [
      // keep at end
      windowStoreReplicaSlice,
    ],
    autoStartEffects: true,
    overrides: {},
  });

  getStoreConfig(store).current = {
    ...defaultStoreConfig,
    eternalVars,
  };

  return store;
}
