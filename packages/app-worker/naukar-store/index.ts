import { createStore } from '@nalanda/core';

import { StoreConfig } from '@bangle.io/naukar-common';
import type { EternalVarsWorker } from '@bangle.io/shared-types';

import { logger } from './logger';
import { sliceEternalVarsEvents } from './slices/slice-eternal-events';

export function createNaukarStore({
  eternalVars,
}: {
  eternalVars: EternalVarsWorker;
}) {
  const storeConfig: StoreConfig = {
    eternalVars,
  };
  const store = createStore({
    slices: [
      // keep at end
      sliceEternalVarsEvents,
    ],
    config: storeConfig,
    autoStartEffects: true,
    overrides: {},
  });

  return store;
}
