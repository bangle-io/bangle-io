import { createStore } from '@nalanda/core';

import {
  createWindowStoreConfigRef,
  defaultWindowStoreConfig,
  WindowStoreConfig,
} from '@bangle.io/lib-common';
import { EffectScheduler, zeroTimeoutScheduler } from '@bangle.io/nsm-3';
import { slicePageAllSlices } from '@bangle.io/slice-page';
import { sliceUIAllSlices } from '@bangle.io/slice-ui';

import { logger } from './logger';
import { sliceSyncWithWindowStore } from './slices/sync-with-worker';

export function createWindowStore(
  eternalVars: WindowStoreConfig['eternalVars'],
  optionalConfig: Partial<Omit<WindowStoreConfig, 'eternalVars'>> = {},
) {
  let scheduler: EffectScheduler | undefined;
  if (eternalVars.debugFlags.testZeroTimeoutStoreEffectsScheduler) {
    logger.warn(
      'Using zeroTimeoutScheduler, this is only for testing and should not be used in production',
    );
    scheduler = zeroTimeoutScheduler;
  }

  const store = createStore({
    slices: [
      ...slicePageAllSlices,
      ...sliceUIAllSlices,

      // keep at end
      sliceSyncWithWindowStore,
    ],
    autoStartEffects: true,
    debug: (log) => {
      logger.debug(log);
    },
    overrides: {
      effectScheduler: scheduler,
    },
  });
  const storeConfig: WindowStoreConfig = {
    ...defaultWindowStoreConfig,
    ...optionalConfig,
    eternalVars,
  };

  // initialize store config right after store is created
  // so that we can use it in the effects
  createWindowStoreConfigRef(store).current = storeConfig;

  return store;
}
