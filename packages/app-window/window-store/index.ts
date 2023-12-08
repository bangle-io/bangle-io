import { createStore } from '@nalanda/core';

import {
  defaultWindowStoreConfig,
  getWindowStoreConfigRef,
  WindowStoreConfig,
} from '@bangle.io/lib-window-common';
import { allMiscSlices } from '@bangle.io/misc-slices';
import {
  customBangleScheduler,
  EffectScheduler,
  zeroTimeoutScheduler,
} from '@bangle.io/nsm-3';
import { slicePageAllSlices } from '@bangle.io/slice-page';
import { sliceUIAllSlices } from '@bangle.io/slice-ui';
import { sliceWorkspace } from '@bangle.io/slice-workspace';

import { logger } from './logger';
import { sliceSyncWithWindowStore } from './sync-with-worker';

// NOTE: be careful when updating this, also make sure test-utils-slice
// is in sync with this
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
  } else {
    scheduler = customBangleScheduler;
  }

  const store = createStore({
    slices: [
      ...slicePageAllSlices,
      ...sliceUIAllSlices,

      sliceWorkspace,

      ...allMiscSlices,
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
  getWindowStoreConfigRef(store).current = storeConfig;

  return store;
}
