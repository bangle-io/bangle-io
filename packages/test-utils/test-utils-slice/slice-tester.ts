import { createStore, DebugLogger, Slice } from '@nalanda/core';

import {
  createWindowStoreConfigRef,
  defaultWindowStoreConfig,
} from '@bangle.io/lib-common';
import { createManualEffectScheduler } from '@bangle.io/nsm-3';

const sleep = (ms = 1) => new Promise((resolve) => setTimeout(resolve, ms));

export const setupSliceTestStore = ({
  autoStartEffects = true,
  useMemoryHistory = true,
  slices = [],
  debugCalls,
}: {
  autoStartEffects?: boolean;
  useMemoryHistory?: boolean;
  slices?: Slice[];
  debugCalls?: DebugLogger;
} = {}) => {
  const {
    manualEffectScheduler,
    manualCallbacksRegistry: effectsCallbackRegistry,
  } = createManualEffectScheduler();
  const store = createStore({
    slices: slices,
    autoStartEffects: autoStartEffects,
    debug: debugCalls,
    overrides: {
      effectScheduler: manualEffectScheduler,
    },
  });

  createWindowStoreConfigRef(store).current = {
    ...defaultWindowStoreConfig,
    historyType: useMemoryHistory ? 'memory' : 'browser',
    // TODO remove any
    eternalVars: {} as any,
  };

  return {
    store,
    runEffects: async () => {
      await sleep(0);
      let runCount = 0;
      effectsCallbackRegistry.forEach((cb) => {
        void cb();
        runCount++;
      });
      await sleep(0);

      return runCount;
    },
  };
};
