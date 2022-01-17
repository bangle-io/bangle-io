import { blockReload, pageSlice } from '@bangle.io/slice-page';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

import { workerSetupSlices, workerStoreSyncKey } from '../worker-setup-slice';

jest.mock('@bangle.io/constants', () => {
  const rest = jest.requireActual('@bangle.io/constants');
  return {
    ...rest,
    workerSyncWhiteListedActions: ['action::'],
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
  jest.useFakeTimers('modern');

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

afterEach(() => {
  (window as any).MessageChannel = undefined;
  jest.useRealTimers();
});

let waiter = async () => {
  for (let i = 0; i < 50; i++) {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  }
};

test('works', async () => {
  const { store, actionsDispatched } = createTestStore(
    [...workerSetupSlices(), pageSlice()],
    {
      useWebWorker: false,
    },
    scheduler,
  );

  await waiter();

  expect(actionsDispatched).toEqual([
    {
      id: expect.any(String),
      name: 'action::@bangle.io/utils:store-sync-start-sync',
    },
    {
      id: expect.any(String),
      name: 'action::@bangle.io/utils:store-sync-port-ready',
    },
    {
      id: expect.any(String),
      name: 'action::@bangle.io/worker-naukar-proxy:naukar',
      value: {
        naukar: expect.any(Object),
      },
    },
  ]);
  expect(workerStoreSyncKey.getSliceStateAsserted(store.state)?.msgChannel)
    .toMatchInlineSnapshot(`
    MessageChannel {
      "port1": Object {
        "close": [MockFunction],
        "onmessage": [Function],
        "postMessage": [MockFunction] {
          "calls": Array [
            Array [
              Object {
                "type": "ping",
              },
            ],
            Array [
              Object {
                "type": "pong",
              },
            ],
            Array [
              Object {
                "type": "ping",
              },
            ],
          ],
          "results": Array [
            Object {
              "type": "return",
              "value": undefined,
            },
            Object {
              "type": "return",
              "value": undefined,
            },
            Object {
              "type": "return",
              "value": undefined,
            },
          ],
        },
      },
      "port2": Object {
        "close": [MockFunction],
        "onmessage": [Function],
        "postMessage": [MockFunction] {
          "calls": Array [
            Array [
              Object {
                "type": "ping",
              },
            ],
            Array [
              Object {
                "type": "pong",
              },
            ],
          ],
          "results": Array [
            Object {
              "type": "return",
              "value": undefined,
            },
            Object {
              "type": "return",
              "value": undefined,
            },
          ],
        },
      },
    }
  `);
});

test('sends actions correctly', async () => {
  const slices = workerSetupSlices();

  const { store, actionsDispatched } = createTestStore(
    [...slices, pageSlice()],
    {
      useWebWorker: false,
    },
    scheduler,
  );

  blockReload(true)(store.state, store.dispatch);
  await Promise.resolve();

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

  await waiter();

  const { msgChannel } = workerStoreSyncKey.getSliceStateAsserted(store.state);

  expect(msgChannel.port1.postMessage).lastCalledWith({
    action: {
      name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
      serializedValue: { block: true },
      storeName: 'test-store',
    },
    type: 'action',
  });
  await waiter();
  await waiter();

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
      name: 'action::@bangle.io/utils:store-sync-start-sync',
    },

    {
      id: expect.any(String),
      name: 'action::@bangle.io/utils:store-sync-port-ready',
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
});
