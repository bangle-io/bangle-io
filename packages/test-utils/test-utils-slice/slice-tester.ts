import { afterEach, beforeEach, jest } from '@jest/globals';
import { createStore, DebugLogger, Slice } from '@nalanda/core';

import {
  defaultWindowStoreConfig,
  getWindowStoreConfigRef,
} from '@bangle.io/lib-window-common';
import { silenceAllLoggers, unSilenceAllLoggers } from '@bangle.io/logger';
import { createManualEffectScheduler } from '@bangle.io/nsm-3';
import { EternalVarsWindow } from '@bangle.io/shared-types';

import { setupTestEternalVars } from './setup-test-eternal-vars';

const sleep = (ms = 1) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock for BroadcastChannel
const mockBroadcastChannel = {
  postMessage: jest.fn(),
  close: jest.fn(),
  onmessage: jest.fn(),
};
let originalBroadcastChannel: BroadcastChannel = (globalThis as any)
  .BroadcastChannel;

beforeEach(() => {
  // TODO improve this
  silenceAllLoggers();
  (globalThis as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);
});

afterEach(() => {
  jest.clearAllMocks();
  (globalThis as any).BroadcastChannel = originalBroadcastChannel;
  unSilenceAllLoggers();
});

export const setupSliceTestStore = ({
  autoStartEffects = true,
  useMemoryHistory = true,
  slices = [],
  debugCalls,
  eternalVars,
  abortSignal,
}: {
  abortSignal: AbortSignal;
  autoStartEffects?: boolean;
  useMemoryHistory?: boolean;
  slices?: Slice[];
  debugCalls?: DebugLogger;
  eternalVars?: EternalVarsWindow;
}) => {
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

  if (!eternalVars) {
    eternalVars = setupTestEternalVars({
      abortSignal,
    });
  }

  getWindowStoreConfigRef(store).current = {
    ...defaultWindowStoreConfig,
    historyType: useMemoryHistory ? 'memory' : 'browser',
    eternalVars: eternalVars,
  };

  abortSignal.addEventListener(
    'abort',
    () => {
      store.destroy();
    },
    { once: true },
  );

  return {
    store,
    appDatabase: eternalVars.appDatabase,
    runEffects: async () => {
      if (abortSignal.aborted) {
        return -1;
      }

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
