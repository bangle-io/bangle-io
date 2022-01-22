import { blockReload, pageSlice, pageSliceKey } from '@bangle.io/slice-page';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';
import { sleep } from '@bangle.io/utils';

import { syncWithWindowSlices } from '../sync-with-window-slices';

const Port = (): MessagePort => ({
  close: jest.fn(),
  start: jest.fn(),
  onmessage(ev: MessageEvent<any>) {},
  postMessage: jest.fn(() => {}),
  addEventListener() {},
  removeEventListener() {},
  onmessageerror() {},
  dispatchEvent(e) {
    return true;
  },
});

test('sets up', async () => {
  const port = Port();

  const { store } = createTestStore([...syncWithWindowSlices(), pageSlice()], {
    port,
  });
  expect(store.state.config.opts).toMatchObject({
    port,
  });

  expect(store.state.config.fields.map((r) => r.name)).toMatchInlineSnapshot(`
    Array [
      "sync-with-window-stateSyncKey$",
      "store-sync$",
      "page-slice$",
    ]
  `);

  await sleep(0);

  expect(port.postMessage).toBeCalledTimes(1);
  expect(port.postMessage).nthCalledWith(1, {
    type: 'ping',
  });
  store.destroy();
});

test('destroys', async () => {
  const port = Port();

  const { store } = createTestStore([...syncWithWindowSlices(), pageSlice()], {
    port,
  });
  await sleep(0);

  expect(port.postMessage).toBeCalledTimes(1);
  expect(port.postMessage).nthCalledWith(1, {
    type: 'ping',
  });
  expect(port.close).toBeCalledTimes(0);

  store.destroy();
  expect(port.close).toBeCalledTimes(1);
});

test('sends actions to the port', async () => {
  const port = Port();

  port.postMessage = jest.fn().mockImplementation(() => {
    port.onmessage!({ data: { type: 'pong' } } as any);
  });

  const { store } = createTestStore([...syncWithWindowSlices(), pageSlice()], {
    port,
  });

  expect(store.state.config.opts).toMatchObject({
    port,
  });

  await sleep(0);

  expect(port.postMessage).toBeCalledTimes(1);
  expect(port.postMessage).nthCalledWith(1, {
    type: 'ping',
  });

  blockReload(true)(store.state, store.dispatch);

  await sleep(0);

  expect(port.postMessage).toBeCalledTimes(2);

  expect(port.postMessage).nthCalledWith(2, {
    action: {
      name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
      serializedValue: {
        block: true,
      },
      storeName: 'test-store',
    },
    type: 'action',
  });
  store.destroy();
});

test('handles actions coming from port', async () => {
  const port = Port();

  port.postMessage = jest.fn().mockImplementation(() => {
    port.onmessage?.({ data: { type: 'pong' } } as any);
  });

  const { store } = createTestStore([...syncWithWindowSlices(), pageSlice()], {
    port,
  });
  await sleep(0);

  expect(port.postMessage).toBeCalledTimes(1);
  expect(port.postMessage).nthCalledWith(1, {
    type: 'ping',
  });

  expect(pageSliceKey.getSliceState(store.state)?.blockReload).toBe(false);

  await sleep(0);

  port.onmessage?.({
    data: {
      action: {
        name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
        serializedValue: {
          block: true,
        },
        storeName: 'test-store',
      },
      type: 'action',
    },
  } as any);

  expect(pageSliceKey.getSliceState(store.state)?.blockReload).toBe(true);
  store.destroy();
});

test('blocks actions which are not recognized', async () => {
  const port = Port();

  port.postMessage = jest.fn().mockImplementation(() => {
    port.onmessage?.({ data: { type: 'pong' } } as any);
  });

  const { store, actionsDispatched } = createTestStore(
    [...syncWithWindowSlices(), pageSlice()],
    {
      port,
    },
  );

  await sleep(0);

  port.onmessage?.({
    data: {
      action: {
        name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
        serializedValue: {
          block: true,
        },
        storeName: 'test-store',
      },
      type: 'action',
    },
  } as any);

  await sleep(0);
  const expectedActions = [
    {
      id: expect.any(String),
      name: 'action::@bangle.io/store-sync:port-ready',
    },
    {
      id: expect.any(String),
      name: 'action::@bangle.io/store-sync:start-sync',
    },
    {
      fromStore: 'test-store',
      id: expect.any(String),
      name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
      value: {
        block: true,
      },
    },
  ];
  expect(actionsDispatched).toEqual(expectedActions);

  port.onmessage?.({
    data: {
      action: {
        name: 'action::@bangle.io/suspicious:BLOCK_RELOAD',
        serializedValue: {
          block: false,
        },
        storeName: 'test-store',
      },
      type: 'action',
    },
  } as any);
  await sleep(0);

  expect(actionsDispatched).toEqual(expectedActions);
  expect(pageSliceKey.getSliceState(store.state)?.blockReload).toBe(true);
  store.destroy();
});
