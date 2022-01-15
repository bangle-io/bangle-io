import { blockReload, pageSliceKey } from '@bangle.io/slice-page';
import { sleep } from '@bangle.io/utils';

import { initializeNaukarStore } from '../initialize-naukar-store';

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

test('sets up', () => {
  const port = Port();

  const store = initializeNaukarStore({
    port,
  });
  expect(store.state.config.opts).toMatchObject({
    port,
  });

  expect(store.state.config.fields.map((r) => r.name)).toMatchInlineSnapshot(`
    Array [
      "sync-with-window-stateSyncKey$",
      "slice$",
      "page-slice$",
    ]
  `);

  expect(port.postMessage).toBeCalledTimes(1);
  expect(port.postMessage).nthCalledWith(1, {
    type: 'ping',
  });
});

test('destroys', () => {
  const port = Port();

  const store = initializeNaukarStore({
    port,
  });

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
    port.onmessage?.({ data: { type: 'pong' } } as any);
  });

  const store = initializeNaukarStore({
    port,
  });

  expect(store.state.config.opts).toMatchObject({
    port,
  });

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
      storeName: 'worker-store',
    },
    type: 'action',
  });
});

test('handles actions coming from port', async () => {
  const port = Port();

  port.postMessage = jest.fn().mockImplementation(() => {
    port.onmessage?.({ data: { type: 'pong' } } as any);
  });

  const store = initializeNaukarStore({
    port,
  });

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
        storeName: 'window-store',
      },
      type: 'action',
    },
  } as any);

  expect(pageSliceKey.getSliceState(store.state)?.blockReload).toBe(true);
});
