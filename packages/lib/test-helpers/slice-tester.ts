import {
  cleanup,
  createKey,
  createStore,
  DebugLogger,
  ref,
  Slice,
  StoreOptions,
} from '@nalanda/core';

import {
  createWindowStoreConfigRef,
  defaultWindowStoreConfig,
} from '@bangle.io/lib-common';
import { createManualEffectScheduler } from '@bangle.io/nsm-3';

import { sleep } from './sleep';

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
      effectsCallbackRegistry.forEach((cb) => {
        void cb();
      });
      await sleep(0);
    },
  };
};
