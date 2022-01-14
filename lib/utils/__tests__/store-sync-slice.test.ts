import { Slice, SliceKey } from '@bangle.io/create-store';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';

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
  const key1 = new SliceKey('key1');

  const { port1, port2 } = new MessageChannel();

  jest.spyOn(port1, 'postMessage');

  port2.onmessage = jest.fn(({ data }) => {
    if (data?.type === 'ping') {
      port2.postMessage({ type: 'pong' });
    }
  });

  const { store } = createTestStore([
    storeSyncSlice({ key: key1, port: port1 as any }),
    dummySlice,
  ]);
  await sleep(0);

  setStoreSyncSliceReady()(store.state, store.dispatch);
  store.dispatch({
    name: 'action::dummy-action:one',
    value: { counter: 'INCREMENT' },
  });

  await sleep(0);

  expect(port2.onmessage).toBeCalledTimes(1);

  expect(port2.onmessage).nthCalledWith(1, {
    data: {
      action: {
        name: 'action::dummy-action:one',
        serializedValue: { counter: 'INCREMENT' },
        storeName: 'test-store',
      },
      type: 'action',
    },
  });
});

test('syncs two store', async () => {
  const key1 = new SliceKey('key1');
  const key2 = new SliceKey('key2');
  const { port1, port2 } = new MessageChannel();

  const { store: store1 } = createTestStore([
    storeSyncSlice({ key: key1, port: port1 as any }),
    dummySlice,
  ]);
  const { store: store2 } = createTestStore([
    storeSyncSlice({ key: key2, port: port2 as any }),
    dummySlice,
  ]);
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
  const key1 = new SliceKey('key1');
  const key2 = new SliceKey('key2');
  const { port1, port2 } = new MessageChannel();

  const { store: store1 } = createTestStore([
    storeSyncSlice({
      key: key1,
      port: port1 as any,
      actionSendFilter: (action) => {
        return action.value.counter !== 'DECREMENT';
      },
    }),
    dummySlice,
  ]);
  const { store: store2 } = createTestStore([
    storeSyncSlice({ key: key2, port: port2 as any }),
    dummySlice,
  ]);
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
  const key1 = new SliceKey('key1');
  const key2 = new SliceKey('key2');
  const { port1, port2 } = new MessageChannel();

  const { store: store1 } = createTestStore([
    storeSyncSlice({
      key: key1,
      port: port1 as any,
      actionReceiveFilter: (action) => {
        return action.value.counter !== 'DECREMENT';
      },
    }),
    dummySlice,
  ]);
  const { store: store2 } = createTestStore([
    storeSyncSlice({ key: key2, port: port2 as any }),
    dummySlice,
  ]);
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
  const key1 = new SliceKey('key1');
  const key2 = new SliceKey('key2');
  const { port1, port2 } = new MessageChannel();

  const { store: store1 } = createTestStore([
    storeSyncSlice({ key: key1, port: port1 as any }),
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
    storeSyncSlice({ key: key2, port: port2 as any }),
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
