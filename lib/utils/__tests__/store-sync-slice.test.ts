import { Slice, staticSlice } from '@bangle.io/create-store';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';

import { StoreSyncConfigType } from '..';
import { setStoreSyncSliceReady, storeSyncSlice } from '../store-sync-slice';
import { sleep } from '../utility';

interface Port {
  onmessage: ((o: { data: any }) => void) | undefined;
  postMessage: (arg: any) => void;
}
class MessageChannel {
  port1: Port = {
    onmessage: undefined,
    postMessage: jest.fn((arg) => {
      this.port2.onmessage?.({ data: arg });
    }),
  };

  port2: Port = {
    onmessage: undefined,
    postMessage: jest.fn((arg) => {
      this.port1.onmessage?.({ data: arg });
    }),
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
  const { store } = createTestStore([configSlice1, slice, dummySlice]);
  await sleep(0);

  expect(slice.getSliceState(store.state)?.isReady).toBe(false);
  setStoreSyncSliceReady()(store.state, store.dispatch);
  expect(slice.getSliceState(store.state)?.isReady).toBe(true);

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
      "isReady": true,
      "pendingActions": Array [],
    }
  `);
});

function setup(
  store1Config: Partial<StoreSyncConfigType<any>> = {},
  store2Config: Partial<StoreSyncConfigType<any>> = {},
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

  const { store: store1 } = createTestStore([
    configSlice1,
    storeSyncSlice(configKey1),
    dummySlice,
  ]);
  const { store: store2 } = createTestStore([
    configSlice2,
    storeSyncSlice(configKey2),
    dummySlice,
  ]);

  return {
    store1,
    store2,
  };
}

test('syncs two store', async () => {
  const { store1, store2 } = setup();

  setStoreSyncSliceReady()(store1.state, store1.dispatch);
  setStoreSyncSliceReady()(store2.state, store2.dispatch);

  store1.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'INCREMENT' },
  });

  await sleep(0);

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

  setStoreSyncSliceReady()(store1.state, store1.dispatch);
  setStoreSyncSliceReady()(store2.state, store2.dispatch);

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

  setStoreSyncSliceReady()(store1.state, store1.dispatch);
  setStoreSyncSliceReady()(store2.state, store2.dispatch);

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
    actionSendFilter: () => true,
    actionReceiveFilter: (action) => {
      return action.value.counter !== 'DECREMENT';
    },
    port: port1 as any,
  });

  const { key: configKey2, slice: configSlice2 } = staticSlice({
    actionReceiveFilter: () => true,
    actionSendFilter: () => true,
    port: port2 as any,
  });

  const { store: store1 } = createTestStore([
    configSlice1,
    storeSyncSlice(configKey1),
    dummySlice,
  ]);

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

  const { store: store2 } = createTestStore([
    configSlice2,
    storeSyncSlice(configKey2),
    dummySlice,
  ]);
  setStoreSyncSliceReady()(store1.state, store1.dispatch);
  setStoreSyncSliceReady()(store2.state, store2.dispatch);
  store1.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'INCREMENT' },
  });
  await sleep(0);

  expect(dummySlice.getSliceState(store2.state)).toEqual({ counter: 5 });
});
