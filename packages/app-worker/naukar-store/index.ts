import { createStore, EffectScheduler } from '@nalanda/core';

import {
  defaultStoreConfig,
  getStoreConfigRef,
} from '@bangle.io/naukar-common';
import { customBangleScheduler, zeroTimeoutScheduler } from '@bangle.io/nsm-3';
import type { EternalVarsWorker } from '@bangle.io/shared-types';

import { logger } from './logger';
import { sliceWindowState } from './slices/slice-window-state';
export { sliceWindowState as windowStoreReplicaSlice } from './slices/slice-window-state';

export function createNaukarStore({
  eternalVars,
}: {
  eternalVars: EternalVarsWorker;
}) {
  let scheduler: EffectScheduler | undefined;

  if (eternalVars.debugFlags.testZeroTimeoutStoreEffectsScheduler) {
    logger.warn(
      'Using zeroTimeoutScheduler, this is only for testing and should not be used in production',
    );
    scheduler = zeroTimeoutScheduler;
  } else {
    scheduler = customBangleScheduler;
  }

  const store = createStore({
    slices: [
      // keep at end
      sliceWindowState,
    ],
    autoStartEffects: true,
    overrides: {
      effectScheduler: scheduler,
    },
  });

  getStoreConfigRef(store).current = {
    ...defaultStoreConfig,
    eternalVars,
  };

  return store;
}
