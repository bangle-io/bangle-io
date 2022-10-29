import { WorkspaceType } from '@bangle.io/constants';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
} from '@bangle.io/test-utils';

import {
  compareWorkspaceInfo,
  readWorkspaceInfo,
  readWorkspaceMetadata,
  saveWorkspaceInfo,
} from '../workspace-info';

describe('readWorkspaceInfo', () => {
  test('reads workspace info', async () => {
    const { store } = createBasicTestStore({});

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      ['test-ws-1:one.md', 'hello one'],
    ]);

    const wsInfo = await readWorkspaceInfo('test-ws-1');
    expect(wsInfo).toEqual({
      deleted: false,
      lastModified: expect.any(Number),
      metadata: {},
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
    });
  });

  test('reads workspace info with type filter', async () => {
    const { store } = createBasicTestStore({});

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      ['test-ws-1:one.md', 'hello one'],
    ]);

    let wsInfo = await readWorkspaceInfo('test-ws-1', {
      type: WorkspaceType.Browser,
    });

    expect(wsInfo).toEqual({
      deleted: false,
      lastModified: expect.any(Number),
      metadata: {},
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
    });

    wsInfo = await readWorkspaceInfo('test-ws-1', {
      type: 'some-type',
    });
    expect(wsInfo).toBeUndefined();
  });

  test('if delete filter is on', async () => {
    const { store } = createBasicTestStore({});

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      ['test-ws-1:one.md', 'hello one'],
    ]);

    let wsInfo = await readWorkspaceInfo('test-ws-1', {
      type: WorkspaceType.Browser,
    });

    await saveWorkspaceInfo(
      'test-ws-1',
      (wsInfo) => ({
        ...wsInfo,
        deleted: true,
        metadata: {
          test: '1234',
        },
      }),
      wsInfo!,
    );

    wsInfo = await readWorkspaceInfo('test-ws-1', {
      type: WorkspaceType.Browser,
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
      type: WorkspaceType.Browser,
    });
  });
});

describe('readWorkspaceMetadata', () => {
  test('works', async () => {
    const { store } = createBasicTestStore({});

    await setupMockWorkspaceWithNotes(store, 'test-ws-1', [
      ['test-ws-1:one.md', 'hello one'],
    ]);

    const wsInfo = await readWorkspaceMetadata('test-ws-1');
    expect(wsInfo).toEqual({});

    await saveWorkspaceInfo(
      'test-ws-1',
      (wsInfo) => ({
        ...wsInfo!,
        lastModified: Date.now(),
        metadata: {
          test: '1234',
        },
      }),
      (await readWorkspaceInfo('test-ws-1'))!,
    );

    expect(await readWorkspaceMetadata('test-ws-1')).toEqual({
      test: '1234',
    });

    expect(
      await readWorkspaceMetadata('test-ws-1', { type: 'something else' }),
    ).toEqual(undefined);
  });
});

describe('compareWorkspaceInfo', () => {
  test('same workspace 1', async () => {
    let a: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {},
      deleted: false,
    };
    let b: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {},
      deleted: false,
    };

    expect(await compareWorkspaceInfo(a, b)).toEqual(true);
  });

  test('different name', async () => {
    let a: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {},
      deleted: false,
    };
    let b: WorkspaceInfo = {
      name: 'test-ws-2',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {},
      deleted: false,
    };

    expect(await compareWorkspaceInfo(a, b)).toEqual(false);
  });

  test('different type', async () => {
    let a: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {},
      deleted: false,
    };
    let b: WorkspaceInfo = {
      name: 'test-ws-1',
      type: 'browser-not',
      lastModified: 5,
      metadata: {},
      deleted: false,
    };

    expect(await compareWorkspaceInfo(a, b)).toEqual(false);
  });

  test('different time', async () => {
    let a: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 6,
      metadata: {},
      deleted: false,
    };
    let b: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {},
      deleted: false,
    };

    expect(await compareWorkspaceInfo(a, b)).toEqual(false);
  });

  test('different deleted', async () => {
    let a: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {},
      deleted: true,
    };
    let b: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {},
      deleted: false,
    };

    expect(await compareWorkspaceInfo(a, b)).toEqual(false);
  });

  test('same metadata', async () => {
    let a: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        f: 1,
      },
      deleted: false,
    };
    let b: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        f: 1,
      },
      deleted: false,
    };

    expect(await compareWorkspaceInfo(a, b)).toEqual(true);
  });

  test('different metadata 1', async () => {
    let a: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        f: 1,
      },
      deleted: false,
    };
    let b: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {},
      deleted: false,
    };

    expect(await compareWorkspaceInfo(a, b)).toEqual(false);
  });

  test('different metadata 2', async () => {
    let a: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        f: 1,
      },
      deleted: false,
    };
    let b: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        z: 1,
      },
      deleted: false,
    };

    expect(await compareWorkspaceInfo(a, b)).toEqual(false);
  });

  test('different metadata 3', async () => {
    let a: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        f: [],
      },
      deleted: false,
    };
    let b: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        f: [],
      },
      deleted: false,
    };

    expect(await compareWorkspaceInfo(a, b)).toEqual(false);
  });

  test('metadata different file handle keys', async () => {
    let a: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        r: new FileSystemHandle(),
      },
      deleted: false,
    };
    let b: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        f: new FileSystemHandle(),
      },
      deleted: false,
    };

    expect(await compareWorkspaceInfo(a, b)).toEqual(false);
  });

  test('metadata equal file handle', async () => {
    let fileHandleA = new FileSystemHandle();
    let fileHandleB = new FileSystemHandle();
    let a: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        r: fileHandleA,
      },
      deleted: false,
    };
    let b: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        r: fileHandleB,
      },
      deleted: false,
    };

    expect(await compareWorkspaceInfo(a, b)).toEqual(true);
  });

  test('metadata equal file handle but lastModified is different', async () => {
    let fileHandleA = new FileSystemHandle();
    let fileHandleB = new FileSystemHandle();
    let a: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 15,
      metadata: {
        r: fileHandleA,
      },
      deleted: false,
    };
    let b: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        r: fileHandleB,
      },
      deleted: false,
    };

    expect(await compareWorkspaceInfo(a, b)).toEqual(false);
  });

  test('metadata different file handle', async () => {
    let fileHandleA = new FileSystemHandle();
    (fileHandleA as any).name = 'food';
    let fileHandleB = new FileSystemHandle();
    let a: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        r: fileHandleA,
      },
      deleted: false,
    };
    let b: WorkspaceInfo = {
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
      lastModified: 5,
      metadata: {
        r: fileHandleB,
      },
      deleted: false,
    };

    expect(await compareWorkspaceInfo(a, b)).toEqual(false);
  });
});
