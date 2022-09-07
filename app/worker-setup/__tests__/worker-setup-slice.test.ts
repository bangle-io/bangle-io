/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { blockReload, pageSlice } from '@bangle.io/slice-page';
import { workspaceSlice, workspaceSliceKey } from '@bangle.io/slice-workspace';
import { createTestStore } from '@bangle.io/test-utils';
import type { exponentialBackoff } from '@bangle.io/utils';
import { sleep } from '@bangle.io/utils';
import { naukarProxy, naukarProxySlice } from '@bangle.io/worker-naukar-proxy';
import { readAllWorkspacesInfo } from '@bangle.io/workspace-info';

import { workerSetupSlices, workerStoreSyncKey } from '../worker-setup-slice';

jest.mock('@bangle.io/utils', () => {
  const actual = jest.requireActual('@bangle.io/utils');
  const rest = Object.assign({}, jest.requireActual('@bangle.io/utils'));

  const noWaitExponentialBackoff: typeof exponentialBackoff = async (
    fn,
    abort: AbortSignal,
    opts,
  ) => {
    if (opts?.sleep) {
      throw new Error('option sleep is reserved for testing');
    }

    return actual.exponentialBackoff(fn, abort, {
      ...opts,
      sleep: () => Promise.resolve(),
    });
  };

  return {
    ...rest,
    exponentialBackoff: noWaitExponentialBackoff,
  };
});

jest.mock('comlink', () => {
  return {
    transfer: jest.fn((arg) => arg),
  };
});

interface Port {
  onmessage: ((o: { data: any }) => void) | undefined;
  postMessage: (arg: any) => void;
  close: () => void;
}

const scheduler = (cb: () => void) => {
  let destroyed = false;
  Promise.resolve().then(() => {
    if (!destroyed) {
      cb();
    }
  });

  return () => {
    destroyed = true;
  };
};

beforeEach(() => {
  (global as any).MessageChannel = class MessageChannel {
    port1: Port = {
      onmessage: undefined,
      postMessage: jest.fn((arg) => {
        this.port2.onmessage?.({ data: JSON.parse(JSON.stringify(arg)) });
      }),
      close: jest.fn(),
    };

    port2: Port = {
      onmessage: undefined,
      postMessage: jest.fn((arg) => {
        this.port1.onmessage?.({ data: JSON.parse(JSON.stringify(arg)) });
      }),
      close: jest.fn(),
    };
  };
});

afterEach(async () => {
  await naukarProxy.testDestroyStore();

  (global as any).MessageChannel = undefined;
});

test('works', async () => {
  const { store, actionsDispatched } = createTestStore({
    slices: [...workerSetupSlices(), pageSlice(), naukarProxySlice()],
    opts: {
      useWebWorker: false,
    },
    scheduler,
  });

  await sleep(0);

  expect(actionsDispatched).toEqual([
    {
      id: expect.any(String),
      name: 'action::@bangle.io/store-sync:start-sync',
    },
    {
      id: expect.any(String),
      name: 'action::@bangle.io/store-sync:port-ready',
    },
    {
      id: expect.any(String),
      name: 'action::@bangle.io/worker-naukar-proxy:naukar',
      value: {
        naukar: expect.any(Object),
      },
    },
  ]);

  expect(
    workerStoreSyncKey.getSliceStateAsserted(store.state).msgChannel.port1
      .postMessage,
  ).toBeCalledWith({
    type: 'pong',
  });
  expect(
    workerStoreSyncKey.getSliceStateAsserted(store.state).msgChannel.port1
      .postMessage,
  ).toBeCalledWith({
    type: 'ping',
  });

  expect(
    workerStoreSyncKey.getSliceStateAsserted(store.state).msgChannel.port2
      .postMessage,
  ).toBeCalledWith({
    type: 'pong',
  });
  expect(
    workerStoreSyncKey.getSliceStateAsserted(store.state).msgChannel.port2
      .postMessage,
  ).toBeCalledWith({
    type: 'ping',
  });
});

test('sends actions correctly', async () => {
  const slices = workerSetupSlices();

  const { store, actionsDispatched } = createTestStore({
    slices: [...slices, pageSlice(), naukarProxySlice()],
    opts: {
      useWebWorker: false,
    },
    scheduler,
  });

  blockReload(true)(store.state, store.dispatch);

  // test that naukar-proxy is setup correctly
  let naukarProxyReady = false;
  naukarProxy.status().then((result) => {
    naukarProxyReady = result;
  });

  expect(naukarProxyReady).toBe(false);

  expect(slices[1]?.getSliceState(store.state)).toEqual({
    portReady: false,
    startSync: false,
    pendingActions: [
      {
        id: expect.any(String),
        name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
        value: { block: true },
      },
    ],
  });

  await sleep(0);

  const { msgChannel } = workerStoreSyncKey.getSliceStateAsserted(store.state);

  expect(msgChannel.port1.postMessage).lastCalledWith({
    action: {
      name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
      serializedValue: { block: true },
      storeName: 'test-store',
    },
    type: 'action',
  });

  await sleep(0);

  expect(actionsDispatched).toEqual([
    {
      id: expect.any(String),
      name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
      value: {
        block: true,
      },
    },
    {
      id: expect.any(String),
      name: 'action::@bangle.io/store-sync:start-sync',
    },

    {
      id: expect.any(String),
      name: 'action::@bangle.io/store-sync:port-ready',
    },

    // PROXY setup should be after port is marked ready
    {
      id: expect.any(String),
      name: 'action::@bangle.io/worker-naukar-proxy:naukar',
      value: {
        naukar: expect.any(Object),
      },
    },
  ]);

  // clears pendingActions
  expect(slices[1]?.getSliceState(store.state)).toEqual({
    portReady: true,
    startSync: true,
    pendingActions: [],
  });

  expect(naukarProxyReady).toBe(true);
});

test('sends slice-page action correctly', async () => {
  const slices = workerSetupSlices();

  const { store } = createTestStore({
    slices: [...slices, pageSlice(), naukarProxySlice()],
    opts: {
      useWebWorker: false,
    },
    scheduler,
  });

  await sleep(0);

  const workerStore: any = await naukarProxy.testGetStore();
  const dispatchSpy = jest.spyOn(workerStore, 'dispatch');

  await blockReload(true)(store.state, store.dispatch);

  expect(dispatchSpy).lastCalledWith({
    fromStore: 'test-store',
    id: expect.any(String),
    name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
    value: { block: true },
  });
});

test('sends workspaces slice action correctly', async () => {
  const slices = workerSetupSlices();

  const { store } = createTestStore({
    slices: [...slices, pageSlice(), naukarProxySlice(), workspaceSlice()],
    opts: {
      useWebWorker: false,
    },
    scheduler,
  });

  await sleep(0);

  await naukarProxy.testGetStore();

  const result = await readAllWorkspacesInfo();

  expect(result).toEqual([
    {
      deleted: false,
      lastModified: expect.any(Number),
      metadata: {
        allowLocalChanges: true,
      },
      name: 'bangle-help',
      type: 'helpfs',
    },
  ]);
});

test('sends workspace slice action correctly', async () => {
  const slices = workerSetupSlices();

  const { store } = createTestStore({
    slices: [...slices, pageSlice(), naukarProxySlice(), workspaceSlice()],
    opts: {
      useWebWorker: false,
    },
    scheduler,
  });

  await sleep(0);

  const workerStore: any = await naukarProxy.testGetStore();

  const dispatchSpy = jest.spyOn(workerStore, 'dispatch');

  workspaceSliceKey.getDispatch(store.dispatch)({
    name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths',
    value: {
      wsName: 'test-ws',
      recentlyUsedWsPaths: [],
    },
  });

  await sleep(0);

  expect(dispatchSpy).toBeCalledWith({
    fromStore: 'test-store',
    id: expect.any(String),
    name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths',
    value: {
      wsName: 'test-ws',
      recentlyUsedWsPaths: [],
    },
  });
});
