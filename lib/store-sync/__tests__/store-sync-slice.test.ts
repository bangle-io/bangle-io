import type { ActionsSerializersType } from '@bangle.io/create-store';
import { Slice, staticSlice } from '@bangle.io/create-store';
import { createTestStore } from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';

import type { StoreSyncConfigType } from '../store-sync';
import {
  APPLY_TRANSFER,
  isStoreSyncReady,
  startStoreSync,
  storeSyncSlice,
} from '../store-sync';

interface Port {
  onmessage: ((o: { data: any }) => void) | undefined;
  postMessage: (arg: any) => void;
  close: () => void;
}
class MessageChannel {
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
}

type DummyAction = {
  name: 'action::dummy-action:one';
  value: {
    counter: 'INCREMENT' | 'DECREMENT';
  };
};

let dummySlice = new Slice<{ counter: number }, DummyAction>({
  state: {
    init() {
      return { counter: 0 };
    },
    apply(action, state) {
      if (action.name === 'action::dummy-action:one') {
        return {
          ...state,
          counter:
            action.value.counter === 'INCREMENT'
              ? state.counter + 1
              : state.counter - 1,
        };
      }

      return state;
    },
  },
  actions: {
    'action::dummy-action:one': () => {
      return {
        toJSON(action) {
          return { counter: action.value.counter };
        },
        fromJSON(obj) {
          return {
            counter: obj.counter,
          };
        },
      };
    },
  },
});

function setup(
  store1Config: Partial<StoreSyncConfigType> = {},
  store2Config: Partial<StoreSyncConfigType> = {},
  extraSlice: Slice | undefined = undefined,
) {
  const { port1, port2 } = new MessageChannel();

  port2.onmessage = jest.fn(({ data }) => {
    if (data?.type === 'ping') {
      port2.postMessage({ type: 'pong' });
    }
  });
  port1.onmessage = jest.fn(({ data }) => {
    if (data?.type === 'ping') {
      port1.postMessage({ type: 'pong' });
    }
  });

  const { key: configKey1, slice: configSlice1 } = staticSlice({
    actionReceiveFilter: () => true,
    actionSendFilter: () => true,
    ...store1Config,
    port: port1 as any,
  });

  const { key: configKey2, slice: configSlice2 } = staticSlice({
    actionReceiveFilter: () => true,
    actionSendFilter: () => true,
    ...store2Config,
    port: port2 as any,
  });

  const slices1 = [configSlice1, storeSyncSlice(configKey1), dummySlice];

  if (extraSlice) {
    slices1.push(extraSlice);
  }

  const { store: store1 } = createTestStore({
    slices: slices1,
  });

  const slices2 = [configSlice2, storeSyncSlice(configKey2), dummySlice];

  if (extraSlice) {
    slices2.push(extraSlice);
  }

  const { store: store2 } = createTestStore({
    slices: slices2,
  });

  return {
    store1,
    store2,
    port2,
    port1,
  };
}

test('works', async () => {
  const { port1, port2 } = new MessageChannel();

  jest.spyOn(port1, 'postMessage');

  port2.onmessage = jest.fn(({ data }) => {
    if (data?.type === 'ping') {
      port2.postMessage({ type: 'pong' });
    }
  });

  const { key: configKey1, slice: configSlice1 } = staticSlice({
    actionReceiveFilter: () => true,
    actionSendFilter: () => true,
    port: port1 as any,
  });
  const slice = storeSyncSlice(configKey1);
  const { store } = createTestStore({
    slices: [configSlice1, slice, dummySlice],
  });
  await sleep(0);

  expect(slice.getSliceState(store.state)?.startSync).toBe(false);
  startStoreSync()(store.state, store.dispatch);
  expect(slice.getSliceState(store.state)?.startSync).toBe(true);

  store.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'INCREMENT' },
  });

  await sleep(0);

  expect(port2.onmessage).toBeCalledTimes(2);
  expect(port2.onmessage).nthCalledWith(1, {
    data: {
      type: 'ping',
    },
  });

  expect(port2.onmessage).lastCalledWith({
    data: {
      action: {
        name: 'action::dummy-action:one',
        serializedValue: { counter: 'INCREMENT' },
        storeName: 'test-store',
      },
      type: 'action',
    },
  });
  expect(slice.getSliceState(store.state)).toMatchInlineSnapshot(`
    Object {
      "pendingActions": Array [],
      "portReady": true,
      "startSync": true,
    }
  `);
});

test('closes properly', async () => {
  const { store1, store2, port1 } = setup();

  startStoreSync()(store1.state, store1.dispatch);
  startStoreSync()(store2.state, store2.dispatch);

  store1.destroy();

  await sleep(0);

  expect(port1.close).toBeCalledTimes(1);
});

test('syncs two store', async () => {
  const { store1, store2 } = setup();

  startStoreSync()(store1.state, store1.dispatch);
  startStoreSync()(store2.state, store2.dispatch);

  store1.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'INCREMENT' },
  });

  await sleep(0);

  expect(isStoreSyncReady()(store1.state)).toBe(true);
  expect(isStoreSyncReady()(store2.state)).toBe(true);

  expect(dummySlice.getSliceState(store1.state)).toEqual({ counter: 1 });
  expect(dummySlice.getSliceState(store2.state)).toEqual({ counter: 1 });

  store2.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'INCREMENT' },
  });

  await sleep(0);

  expect(dummySlice.getSliceState(store1.state)).toEqual({ counter: 2 });
  expect(dummySlice.getSliceState(store2.state)).toEqual({ counter: 2 });
});

test('actionSendFilter works', async () => {
  const { store1, store2 } = setup({
    actionReceiveFilter: () => true,
    actionSendFilter: (action) => {
      return action.value.counter !== 'DECREMENT';
    },
  });

  startStoreSync()(store1.state, store1.dispatch);
  startStoreSync()(store2.state, store2.dispatch);

  store1.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'INCREMENT' },
  });

  await sleep(0);

  expect(dummySlice.getSliceState(store1.state)).toEqual({ counter: 1 });
  expect(dummySlice.getSliceState(store2.state)).toEqual({ counter: 1 });

  store1.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'DECREMENT' },
  });

  await sleep(0);

  expect(dummySlice.getSliceState(store1.state)).toEqual({ counter: 0 });
  expect(dummySlice.getSliceState(store2.state)).toEqual({ counter: 1 });
});

test('actionReceiveFilter works', async () => {
  const { store1, store2 } = setup({
    actionSendFilter: () => true,
    actionReceiveFilter: (action) => {
      return action.value.counter !== 'DECREMENT';
    },
  });

  startStoreSync()(store1.state, store1.dispatch);
  startStoreSync()(store2.state, store2.dispatch);

  store1.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'INCREMENT' },
  });

  await sleep(0);

  expect(dummySlice.getSliceState(store1.state)).toEqual({ counter: 1 });
  expect(dummySlice.getSliceState(store2.state)).toEqual({ counter: 1 });

  store2.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'DECREMENT' },
  });

  await sleep(0);

  expect(dummySlice.getSliceState(store1.state)).toEqual({ counter: 1 });
  expect(dummySlice.getSliceState(store2.state)).toEqual({ counter: 0 });
});

test('when there is a delay in second store', async () => {
  const { port1, port2 } = new MessageChannel();

  const { key: configKey1, slice: configSlice1 } = staticSlice({
    actionSendFilter: () => true,
    actionReceiveFilter: (action: any) => {
      return action.value.counter !== 'DECREMENT';
    },
    port: port1 as any,
  });

  const { key: configKey2, slice: configSlice2 } = staticSlice({
    actionReceiveFilter: () => true,
    actionSendFilter: () => true,
    port: port2 as any,
  });

  const { store: store1 } = createTestStore({
    slices: [configSlice1, storeSyncSlice(configKey1), dummySlice],
  });

  store1.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'INCREMENT' },
  });
  store1.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'INCREMENT' },
  });
  store1.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'INCREMENT' },
  });
  store1.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'INCREMENT' },
  });

  expect(dummySlice.getSliceState(store1.state)).toEqual({ counter: 4 });

  const { store: store2 } = createTestStore({
    slices: [configSlice2, storeSyncSlice(configKey2), dummySlice],
  });
  startStoreSync()(store1.state, store1.dispatch);
  startStoreSync()(store2.state, store2.dispatch);
  store1.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'INCREMENT' },
  });

  // give some time for ping to advance
  await sleep(30);

  expect(isStoreSyncReady()(store1.state)).toBe(true);
  expect(isStoreSyncReady()(store2.state)).toBe(true);
  await sleep(0);

  expect(dummySlice.getSliceState(store2.state)).toEqual({ counter: 5 });
});

describe('transferring values', () => {
  const toTransfer = 'my-kitty';
  type Action = {
    name: 'action::transfer-action:transfer';
    value: {
      kitty: string;
    };
  };
  const transferSetup = async (
    serializer = () => {
      return {
        toJSON(action: Action) {
          return {
            kitty: action.value.kitty,
            [APPLY_TRANSFER]: 'kitty',
          };
        },
        fromJSON(obj: any) {
          return {
            kitty: obj.kitty,
          };
        },
      };
    },
  ) => {
    let testSlice = new Slice<{ kitty: string | undefined }, Action>({
      state: {
        init() {
          return { kitty: undefined };
        },
        apply(action, state) {
          if (action.name === 'action::transfer-action:transfer') {
            return {
              ...state,
              kitty: action.value.kitty,
            };
          }

          return state;
        },
      },
      actions: {
        'action::transfer-action:transfer': serializer,
      },
    });

    let { store1, store2, port1 } = setup({}, {}, testSlice);

    startStoreSync()(store1.state, store1.dispatch);
    startStoreSync()(store2.state, store2.dispatch);

    return {
      store1,
      store2,
      port1,
      testSlice,
    };
  };

  test('transfers value between the store', async () => {
    const onError = jest.fn();
    const { store1, store2, testSlice, port1 } = await transferSetup(undefined);

    store1.dispatch({
      name: 'action::transfer-action:transfer',
      value: {
        kitty: toTransfer,
      },
    });

    expect(testSlice.getSliceState(store1.state)).toEqual({
      kitty: toTransfer,
    });

    await sleep(0);

    expect(isStoreSyncReady()(store1.state)).toBe(true);
    expect(isStoreSyncReady()(store2.state)).toBe(true);

    expect(testSlice.getSliceState(store2.state)).toEqual({
      kitty: toTransfer,
    });

    expect(port1.postMessage).lastCalledWith(
      {
        type: 'action',
        action: {
          name: 'action::transfer-action:transfer',
          serializedValue: {
            kitty: 'my-kitty',
          },
          storeName: 'test-store',
        },
      },
      ['my-kitty'],
    );
  });

  test('throws error if transfer value is undefined', async () => {
    const { store1 } = await transferSetup();

    expect(() =>
      store1.dispatch({
        name: 'action::transfer-action:transfer',
        value: {
          kitty: undefined,
        },
      }),
    ).toThrowErrorMatchingInlineSnapshot(
      `"transfer value with key \\"kitty\\" must not be undefined"`,
    );
  });

  test('throws error if transfer key is of not string type', async () => {
    const { store1 } = await transferSetup(() => {
      return {
        toJSON(action: Action) {
          return {
            kitty: action.value.kitty,
            [APPLY_TRANSFER]: {} as any,
          };
        },
        fromJSON(obj: any) {
          return {
            kitty: obj.kitty,
          };
        },
      };
    });

    expect(() =>
      store1.dispatch({
        name: 'action::transfer-action:transfer',
        value: {
          kitty: undefined,
        },
      }),
    ).toThrowErrorMatchingInlineSnapshot(`"transferKey must be a string"`);
  });
});
