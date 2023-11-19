import { createStore } from '@nalanda/core';

import {
  defaultStoreConfig,
  getStoreConfigRef,
} from '@bangle.io/naukar-common';
import type { EternalVarsWorker } from '@bangle.io/shared-types';

import { sliceWindowState } from './slices/slice-window-state';
export { sliceWindowState as windowStoreReplicaSlice } from './slices/slice-window-state';

export function createNaukarStore({
  eternalVars,
}: {
  eternalVars: EternalVarsWorker;
}) {
  const store = createStore({
    slices: [
      // keep at end
      sliceWindowState,
    ],
    autoStartEffects: true,
    overrides: {},
  });

  getStoreConfigRef(store).current = {
    ...defaultStoreConfig,
    eternalVars,
  };

  return store;
}
