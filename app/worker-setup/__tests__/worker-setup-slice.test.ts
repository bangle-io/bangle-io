import { blockReload, pageSlice } from '@bangle.io/slice-page';
import { workspaceSlice, workspaceSliceKey } from '@bangle.io/slice-workspace';
import {
  listWorkspaces,
  workspacesSlice,
} from '@bangle.io/slice-workspaces-manager';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';
import { clearFakeIdb } from '@bangle.io/test-utils/fake-idb';
import * as idbHelpers from '@bangle.io/test-utils/indexedb-ws-helpers';
import { exponentialBackoff, sleep } from '@bangle.io/utils';
import { naukarProxy, naukarProxySlice } from '@bangle.io/worker-naukar-proxy';

import { workerSetupSlices, workerStoreSyncKey } from '../worker-setup-slice';

jest.mock('idb-keyval', () => {
  const { fakeIdb } = jest.requireActual('@bangle.io/test-utils/fake-idb');
  return fakeIdb;
});

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

const scheduler = (cb) => {
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
  idbHelpers.beforeEachHook();
  (window as any).MessageChannel = class MessageChannel {
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

  idbHelpers.afterEachHook();
  (window as any).MessageChannel = undefined;
  clearFakeIdb();
});

test('works', async () => {
  const { store, actionsDispatched } = createTestStore(
    [...workerSetupSlices(), pageSlice(), naukarProxySlice()],
    {
      useWebWorker: false,
    },
    scheduler,
  );

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
    workerStoreSyncKey.getSliceStateAsserted(store.state)?.msgChannel.port1
      .postMessage,
  ).toBeCalledWith({
    type: 'pong',
  });
  expect(
    workerStoreSyncKey.getSliceStateAsserted(store.state)?.msgChannel.port1
      .postMessage,
  ).toBeCalledWith({
    type: 'ping',
  });

  expect(
    workerStoreSyncKey.getSliceStateAsserted(store.state)?.msgChannel.port2
      .postMessage,
  ).toBeCalledWith({
    type: 'pong',
  });
  expect(
    workerStoreSyncKey.getSliceStateAsserted(store.state)?.msgChannel.port2
      .postMessage,
  ).toBeCalledWith({
    type: 'ping',
  });
});

test('sends actions correctly', async () => {
  const slices = workerSetupSlices();

  const { store, actionsDispatched } = createTestStore(
    [...slices, pageSlice(), naukarProxySlice()],
    {
      useWebWorker: false,
    },
    scheduler,
  );

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

  const { store } = createTestStore(
    [...slices, pageSlice(), naukarProxySlice()],
    {
      useWebWorker: false,
    },
    scheduler,
  );
  await sleep(0);

  const workerStore: any = await naukarProxy.testGetStore();
  const dispatchSpy = jest.spyOn(workerStore, 'dispatch');

  await blockReload(true)(store.state, store.dispatch);

  await sleep(0);

  expect(dispatchSpy).lastCalledWith({
    fromStore: 'test-store',
    id: expect.any(String),
    name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
    value: { block: true },
  });
});

test('sends workspaces slice action correctly', async () => {
  const slices = workerSetupSlices();

  const { store } = createTestStore(
    [...slices, pageSlice(), naukarProxySlice(), workspacesSlice()],
    {
      useWebWorker: false,
    },
    scheduler,
  );
  await sleep(0);

  const workerStore: any = await naukarProxy.testGetStore();

  const dispatchSpy = jest.spyOn(workerStore, 'dispatch');

  await listWorkspaces()(store.state, store.dispatch, store);

  await sleep(0);

  expect(dispatchSpy).lastCalledWith({
    fromStore: 'test-store',
    id: expect.any(String),
    name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos',
    value: expect.anything(),
  });
});

test('sends workspace slice action correctly', async () => {
  const slices = workerSetupSlices();

  const { store } = createTestStore(
    [
      ...slices,
      pageSlice(),
      naukarProxySlice(),
      workspacesSlice(),
      workspaceSlice(),
    ],
    {
      useWebWorker: false,
    },
    scheduler,
  );
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
