import { createStore } from '@nalanda/core';

import type { EternalVarsWindow } from '@bangle.io/shared-types';
import { sliceUIAllSlices } from '@bangle.io/slice-ui';
import { StoreConfig } from '@bangle.io/window-common';

import { logger } from './logger';
import { sliceEternalVarsEvents } from './slices/slice-eternal-events';

export function createWindowStore({
  eternalVars,
}: {
  eternalVars: EternalVarsWindow;
}) {
  const storeConfig: StoreConfig = {
    eternalVars,
  };
  const store = createStore({
    slices: [
      ...sliceUIAllSlices,

      // keep at end
      sliceEternalVarsEvents,
    ],
    config: storeConfig,
    autoStartEffects: true,
    debug: (log) => {
      logger.debug(log);
    },
    overrides: {},
  });

  return store;
}
