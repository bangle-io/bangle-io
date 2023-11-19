import { createStore } from '@nalanda/core';

import {
  createWindowStoreConfigRef,
  defaultWindowStoreConfig,
  WindowStoreConfig,
} from '@bangle.io/lib-common';
import { slicePage, slicePageAllSlices } from '@bangle.io/slice-page';
import { sliceUIAllSlices } from '@bangle.io/slice-ui';

import { logger } from './logger';
import { sliceSyncWithWindowStore } from './slices/sync-with-worker';

export function createWindowStore(
  eternalVars: WindowStoreConfig['eternalVars'],
  optionalConfig: Partial<Omit<WindowStoreConfig, 'eternalVars'>> = {},
) {
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
    overrides: {},
  });

  // window.store = store;
  // window.slicePage = slicePage;

  // initialize store config right after store is created
  // so that we can use it in the effects
  createWindowStoreConfigRef(store).current = {
    ...defaultWindowStoreConfig,
    ...optionalConfig,
    eternalVars,
  };

  return store;
}
