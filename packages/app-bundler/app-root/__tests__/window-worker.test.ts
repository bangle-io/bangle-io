/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { AppDatabaseInMemory } from '@bangle.io/app-database-in-memory';
import { silenceAllLoggers, unSilenceAllLoggers } from '@bangle.io/logger';
import { setupEternalVarsWindow } from '@bangle.io/setup-eternal-vars/window';
import { setupWorker } from '@bangle.io/setup-worker';
import { DebugFlags } from '@bangle.io/shared-types';
import { waitForExpect } from '@bangle.io/test-utils-common';
import { createWindowStore } from '@bangle.io/window-store';

import { getDebugFlag } from '../helpers';

let abortController = new AbortController();

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(() => {
  abortController.abort();
});

describe('createBroadcaster', () => {
  // Mock for BroadcastChannel
  const mockBroadcastChannel = {
    postMessage: jest.fn(),
    close: jest.fn(),
    onmessage: jest.fn(),
  };
  let originalBroadcastChannel: BroadcastChannel = (globalThis as any)
    .BroadcastChannel;

  beforeEach(() => {
    silenceAllLoggers();
    (globalThis as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);
  });

  afterEach(() => {
    jest.clearAllMocks();
    (globalThis as any).BroadcastChannel = originalBroadcastChannel;
    unSilenceAllLoggers();
  });

  test('works', async () => {
    const debugFlags: DebugFlags = {
      ...getDebugFlag(),
      testAppDatabase: 'memory',
      testDisableWorker: true,
      testZeroTimeoutStoreEffectsScheduler: true,
    };
    const database = new AppDatabaseInMemory();
    const { naukarRemote, naukarTerminate } = setupWorker({ debugFlags });
    const eternalVars = setupEternalVarsWindow({
      naukarRemote,
      debugFlags,
      baseDatabase: database,
      abortSignal: abortController.signal,
    });

    const windowStore = createWindowStore(eternalVars, {
      historyType: 'memory',
    });

    expect(await eternalVars.naukar.readWindowState()).toEqual({
      page: {},
      ui: {},
    });

    await waitForExpect(async () => {
      expect(await eternalVars.naukar.readWindowState()).toEqual({
        page: {
          lifecycle: 'passive',
          location: {
            pathname: '',
            search: '',
          },
        },
        ui: {
          colorScheme: 'light',
          widescreen: true,
          screenHeight: 768,
          screenWidth: 1024,
        },
      });
    });

    await naukarTerminate();
    windowStore.destroy();
  });
});
