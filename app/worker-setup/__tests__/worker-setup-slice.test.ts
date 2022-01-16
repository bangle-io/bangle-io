import * as Comlink from 'comlink';

import { Slice } from '@bangle.io/create-store';
import { blockReload, pageSlice } from '@bangle.io/slice-page';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';
import { sleep } from '@bangle.io/utils';
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

let sendMessagePortSpy: jest.SpyInstance | undefined;
beforeEach(() => {
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
});

test('works', async () => {
  const { store, actionsDispatched } = createTestStore(
    [...workerSetupSlices(), pageSlice()],
    {
      useWebWorker: false,
    },
  );

  await sleep(100);
  expect(actionsDispatched).toEqual([
    {
      id: expect.any(String),
      name: 'action::@bangle.io/utils:store-sync-start-sync',
    },
    {
      fromStore: 'worker-store',
      id: expect.any(String),
      name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
      value: {
        block: false,
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
                "action": Object {
                  "name": "action::@bangle.io/slice-page:BLOCK_RELOAD",
                  "serializedValue": Object {
                    "block": false,
                  },
                  "storeName": "worker-store",
                },
                "type": "action",
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
  );

  await sleep(0);

  blockReload(true)(store.state, store.dispatch);

  expect(slices[1]?.getSliceState(store.state)).toEqual({
    portReady: false,
    startSync: true,
    pendingActions: [
      {
        id: expect.any(String),
        name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
        value: { block: true },
      },
    ],
  });

  await sleep(100);

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

  // clears pendingActions
  expect(slices[1]?.getSliceState(store.state)).toEqual({
    portReady: true,
    startSync: true,
    pendingActions: [],
  });
});
