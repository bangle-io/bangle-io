import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
} from '@bangle.io/test-utils';

import {
  readWorkspaceInfo,
  readWorkspaceMetadata,
  saveWorkspaceInfo,
} from '../read-ws-info';

let abortController = new AbortController();
let signal = abortController.signal;

beforeEach(() => {
  abortController.abort();
  abortController = new AbortController();
  signal = abortController.signal;
});

afterEach(() => {
  abortController.abort();
});

describe('readWorkspaceInfo', () => {
  test('reads workspace info', async () => {
    const { store } = createBasicTestStore({
      signal,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      ['test-ws-1:one.md', 'hello one'],
    ]);

    const wsInfo = await readWorkspaceInfo('test-ws-1');
    expect(wsInfo).toEqual({
      deleted: false,
      lastModified: expect.any(Number),
      metadata: {},
      name: 'test-ws-1',
      type: 'browser',
    });
  });

  test('reads workspace info with type filter', async () => {
    const { store } = createBasicTestStore({
      signal,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      ['test-ws-1:one.md', 'hello one'],
    ]);

    let wsInfo = await readWorkspaceInfo('test-ws-1', {
      type: 'browser',
    });

    expect(wsInfo).toEqual({
      deleted: false,
      lastModified: expect.any(Number),
      metadata: {},
      name: 'test-ws-1',
      type: 'browser',
    });

    wsInfo = await readWorkspaceInfo('test-ws-1', {
      type: 'some-type',
    });
    expect(wsInfo).toBeUndefined();
  });

  test('if delete filter is on', async () => {
    const { store } = createBasicTestStore({
      signal,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      ['test-ws-1:one.md', 'hello one'],
    ]);

    let wsInfo = await readWorkspaceInfo('test-ws-1', {
      type: 'browser',
    });

    await saveWorkspaceInfo({
      ...wsInfo!,
      deleted: true,
      lastModified: Date.now(),
      metadata: {
        test: '1234',
      },
    });

    wsInfo = await readWorkspaceInfo('test-ws-1', {
      type: 'browser',
    });
    expect(wsInfo).toBeUndefined();

    wsInfo = await readWorkspaceInfo('test-ws-1');
    expect(wsInfo).toBeUndefined();

    wsInfo = await readWorkspaceInfo('test-ws-1', { allowDeleted: true });

    expect(wsInfo).toEqual({
      deleted: true,
      lastModified: expect.any(Number),
      metadata: {
        test: '1234',
      },
      name: 'test-ws-1',
      type: 'browser',
    });
  });
});

describe('readWorkspaceMetadata', () => {
  test('works', async () => {
    const { store } = createBasicTestStore({
      signal,
    });

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      ['test-ws-1:one.md', 'hello one'],
    ]);

    const wsInfo = await readWorkspaceMetadata('test-ws-1');
    expect(wsInfo).toEqual({});

    await saveWorkspaceInfo({
      ...(await readWorkspaceInfo('test-ws-1'))!,
      lastModified: Date.now(),
      metadata: {
        test: '1234',
      },
    });

    expect(await readWorkspaceMetadata('test-ws-1')).toEqual({
      test: '1234',
    });

    expect(
      await readWorkspaceMetadata('test-ws-1', { type: 'something else' }),
    ).toEqual(undefined);
  });
});
