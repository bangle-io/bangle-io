import * as Comlink from 'comlink';

import { Slice } from '@bangle.io/create-store';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';
import { sleep } from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

import { workerLoaderSliceKey } from '../worker-loader-slice';
import {
  workerStoreSyncSlices,
  workerSyncKey,
} from '../worker-store-sync-slices';

jest.mock('@bangle.io/worker-naukar-proxy', () => {
  return {
    naukarProxy: { sendMessagePort: jest.fn() },
  };
});

jest.mock('@bangle.io/constants', () => {
  const rest = jest.requireActual('@bangle.io/constants');
  return {
    ...rest,
    workerSyncWhiteListedActions: ['action::'],
  };
});

jest.mock('comlink', () => {
  return {
    transfer: jest.fn(),
  };
});

jest.mock('../worker-loader-slice', () => {
  return {
    workerLoaderSliceKey: {
      getValueIfChanged: jest.fn(),
    },
  };
});

const sendMessagePortMock = naukarProxy[
  'sendMessagePort'
] as jest.MockedFunction<typeof naukarProxy['sendMessagePort']>;

const getValueIfChangedMock = workerLoaderSliceKey[
  'getValueIfChanged'
] as jest.MockedFunction<typeof workerLoaderSliceKey['getValueIfChanged']>;

beforeEach(() => {
  sendMessagePortMock.mockImplementation(() => {});
  getValueIfChangedMock.mockImplementation(() => false);
});

interface Port {
  onmessage: ((o: { data: any }) => void) | undefined;
  postMessage: (arg: any) => void;
  close: () => void;
}

beforeEach(() => {
  (window as any).MessageChannel = class MessageChannel {
    port1: Port = {
      onmessage: undefined,
      postMessage: jest.fn((arg) => {
        this.port2.onmessage?.({ data: arg });
      }),
      close: jest.fn(),
    };
    port2: Port = {
      onmessage: undefined,
      postMessage: jest.fn((arg) => {
        this.port1.onmessage?.({ data: arg });
      }),
      close: jest.fn(),
    };
  };
});

afterEach(() => {
  (window as any).MessageChannel = undefined;
});

test('works', async () => {
  const { store } = createTestStore([...workerStoreSyncSlices()]);

  await sleep(0);
  expect(workerSyncKey.getSliceStateAsserted(store.state)?.msgChannel)
    .toMatchInlineSnapshot(`
    MessageChannel {
      "port1": Object {
        "close": [MockFunction],
        "onmessage": undefined,
        "postMessage": [MockFunction],
      },
      "port2": Object {
        "close": [MockFunction],
        "onmessage": undefined,
        "postMessage": [MockFunction],
      },
    }
  `);
});

test('forwards naukarWorker with the port', async () => {
  const { store } = createTestStore([...workerStoreSyncSlices()]);
  getValueIfChangedMock.mockImplementationOnce(() => true);

  store.dispatch({ name: 'action::dummy' } as any);
  await sleep(0);

  const { msgChannel } = workerSyncKey.getSliceStateAsserted(store.state);
  expect(sendMessagePortMock).toBeCalledTimes(1);
  expect(Comlink.transfer).toBeCalledTimes(1);
  expect(Comlink.transfer).nthCalledWith(1, msgChannel.port2, [
    msgChannel.port2,
  ]);
});

test('sends actions correctly', async () => {
  const dummySlice = new Slice({
    actions: {
      'action::for-a': () => ({
        toJSON: (action) => {
          return {
            value: JSON.stringify(action.value),
          };
        },
        fromJSON: (obj) => {
          return {
            value: JSON.parse(obj.value),
          };
        },
      }),
    },
  });

  const slices = workerStoreSyncSlices();
  const { store } = createTestStore([dummySlice, ...slices]);

  await sleep(0);

  getValueIfChangedMock.mockImplementationOnce(() => true);

  store.dispatch({
    name: 'action::for-a',
    value: { counter: 1 },
  });

  await sleep(0);

  expect(slices[1]?.getSliceState(store.state)).toEqual({
    portReady: false,
    startSync: true,
    pendingActions: [
      {
        id: expect.any(String),
        name: 'action::for-a',
        value: { counter: 1 },
      },
    ],
  });

  const { msgChannel } = workerSyncKey.getSliceStateAsserted(store.state);

  msgChannel.port1.onmessage?.({ data: { type: 'pong' } } as any);

  store.dispatch({
    name: 'action::for-a',
    value: { counter: 2 },
  });

  await sleep(0);

  expect(msgChannel.port1.postMessage).toBeCalledTimes(3);

  expect(msgChannel.port1.postMessage).nthCalledWith(1, { type: 'ping' });
  expect(msgChannel.port1.postMessage).nthCalledWith(2, {
    action: {
      name: 'action::for-a',
      serializedValue: { value: '{"counter":1}' },
      storeName: 'test-store',
    },
    type: 'action',
  });
  expect(msgChannel.port1.postMessage).nthCalledWith(3, {
    action: {
      name: 'action::for-a',
      serializedValue: { value: '{"counter":2}' },
      storeName: 'test-store',
    },
    type: 'action',
  });

  // clears pendingActions
  expect(slices[1]?.getSliceState(store.state)).toEqual({
    portReady: true,
    startSync: true,
    pendingActions: [],
  });
});
