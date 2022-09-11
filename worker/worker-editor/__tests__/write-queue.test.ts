import { createPMNode, waitForExpect } from '@bangle.io/test-utils';

import { WriteQueue } from '../write-queue';

const createItem = (name = 'item-1', version = 0) => ({
  wsPath: `test-ws:${name}.md`,
  collabState: {
    doc: createPMNode([], name),
    steps: [],
    version,
  },
});

test('works', async () => {
  const controller = new AbortController();

  const onWrite = jest.fn(async () => {});
  const onPendingChange = jest.fn();
  const queue = new WriteQueue(controller.signal, onWrite, onPendingChange);

  const item1 = createItem('item-1', 0);

  queue.add(item1);

  await waitForExpect(() => {
    expect(onWrite).toBeCalledTimes(1);
  });

  expect(onWrite).toBeCalledWith(item1);

  expect(onPendingChange).toBeCalledTimes(2);
  expect(onPendingChange).nthCalledWith(1, 'ADD', item1.wsPath, [item1.wsPath]);
  expect(onPendingChange).nthCalledWith(2, 'REMOVE', item1.wsPath, []);

  expect(queue.isRunning).toBe(false);
});

test('queues up item if the same item is being currently written', async () => {
  const controller = new AbortController();

  let resolveOnWrite: () => void = () => {};

  const onWrite = jest.fn(async () => {
    return new Promise<void>((resolve) => {
      resolveOnWrite = resolve;
    });
  });
  const onPendingChange = jest.fn();

  const queue = new WriteQueue(controller.signal, onWrite, onPendingChange);

  const item1v0 = createItem('item-1', 0);
  const item1v1 = createItem('item-1', 1);

  queue.add(item1v0);
  expect(onWrite).toBeCalledTimes(1);
  expect(onWrite).toBeCalledWith(item1v0);

  // add a newer version, which should wait
  queue.add(item1v1);

  expect(onPendingChange).toBeCalledTimes(1);
  expect(onPendingChange).nthCalledWith(1, 'ADD', item1v0.wsPath, [
    item1v0.wsPath,
  ]);

  // resolve the writing of the first item
  resolveOnWrite();

  await waitForExpect(() => {
    expect(onPendingChange).toBeCalledTimes(3);
  });

  // should remove item1 and add it back with the newer version
  expect(onPendingChange).nthCalledWith(2, 'REMOVE', item1v0.wsPath, []);
  expect(onPendingChange).nthCalledWith(3, 'ADD', item1v0.wsPath, [
    item1v0.wsPath,
  ]);

  // resolve the writing of the newer item
  resolveOnWrite();

  await waitForExpect(() => {
    expect(onPendingChange).toBeCalledTimes(4);
  });

  expect(onPendingChange).nthCalledWith(4, 'REMOVE', item1v0.wsPath, []);

  expect(queue.isRunning).toBe(false);
});

test('updates the collabState to latest if multiple items in queue', async () => {
  const controller = new AbortController();

  let resolveOnWrite: () => void = () => {};

  const onWrite = jest.fn(async () => {
    return new Promise<void>((resolve) => {
      resolveOnWrite = resolve;
    });
  });
  const onPendingChange = jest.fn();

  const queue = new WriteQueue(controller.signal, onWrite, onPendingChange);

  const item1 = createItem('item-1', 0);
  const item2 = createItem('item-2', 0);
  const item2v1 = createItem('item-2', 1);
  const item3 = createItem('item-3', 0);

  queue.add(item1);
  queue.add(item2);
  queue.add(item3);

  await waitForExpect(() => {
    expect(onPendingChange).toBeCalledTimes(1);
  });

  // should have 2 and 3, since 1 is being written
  expect(queue.queue.map((r) => r.wsPath)).toEqual([
    'test-ws:item-2.md',
    'test-ws:item-3.md',
  ]);

  expect(queue.queue[0]).toEqual(item2);

  // add a newer version of item2, should replace the older
  queue.add(item2v1);
  expect(queue.queue[0]).toEqual(item2v1);

  // should have no effect onPending change
  expect(onPendingChange).toBeCalledTimes(1);

  // write all of the items
  resolveOnWrite();
  await waitForExpect(() => {
    resolveOnWrite();
    expect(onPendingChange).toBeCalledTimes(6);
  });

  expect(onWrite).nthCalledWith(1, item1);
  expect(onWrite).nthCalledWith(2, item2v1);
  expect(onWrite).nthCalledWith(3, item3);
});

test('handles if write throws error', async () => {
  const controller = new AbortController();

  let count = 0;
  const onWrite = jest.fn(async () => {
    // reject on 2nd write for item2
    if (count++ === 1) {
      return Promise.reject(new Error('problem'));
    }

    return;
  });
  const onPendingChange = jest.fn();

  const queue = new WriteQueue(controller.signal, onWrite, onPendingChange);

  const item1 = createItem('item-1', 0);
  const item2 = createItem('item-2', 0);
  const item3 = createItem('item-3', 0);

  queue.add(item1);
  queue.add(item2);

  await waitForExpect(() => {
    expect(onWrite).toBeCalledTimes(2);
  });

  // should continue to work even if error was throw
  queue.add(item3);
  expect(onWrite).toBeCalledTimes(3);

  await waitForExpect(() => {
    expect(onPendingChange).toBeCalledTimes(6);
  });

  expect(onPendingChange).lastCalledWith('REMOVE', item3.wsPath, []);
});
