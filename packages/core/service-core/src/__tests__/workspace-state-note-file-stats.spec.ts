import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

const TEST_WS_NAME = 'stats-workspace';

describe('WorkspaceStateService.$noteFileStats', () => {
  let controller: AbortController | undefined;

  afterEach(() => {
    controller?.abort();
    vi.restoreAllMocks();
  });

  async function setup(noteNames: string[]) {
    controller = new AbortController();
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();

    await services.workspaceOps.createWorkspaceInfo({
      name: TEST_WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    for (const noteName of noteNames) {
      await services.fileSystem.createTextFile(
        `${TEST_WS_NAME}:${noteName}`,
        `# ${noteName}`,
      );
    }

    services.navigation.goWorkspace(TEST_WS_NAME);
    await vi.waitFor(() => {
      expect(
        testEnv.store.get(services.workspaceState.$noteWsPaths),
      ).toHaveLength(noteNames.length);
    });

    return { testEnv, services, store: testEnv.store };
  }

  it('loads stats only while subscribed and keeps the cache across remounts', async () => {
    const { services, store } = await setup(['one.md', 'two.md']);
    const statsAtom = services.workspaceState.$noteFileStats;
    const fileStatSpy = vi.spyOn(services.fileSystem, 'fileStat');

    // Nothing subscribes yet: reading the atom returns the empty map and no
    // stat traffic has happened.
    expect(fileStatSpy).not.toHaveBeenCalled();

    const unsubscribe = store.sub(statsAtom, () => {});
    await vi.waitFor(() => {
      expect(store.get(statsAtom).size).toBe(2);
    });
    expect(
      store.get(statsAtom).get(`${TEST_WS_NAME}:one.md`)?.mtime,
    ).toBeGreaterThan(0);

    // While unsubscribed, a content change causes no stat traffic.
    unsubscribe();
    fileStatSpy.mockClear();
    await services.fileSystem.writeFile(
      `${TEST_WS_NAME}:one.md`,
      new File(['# changed'], 'one.md', { type: 'text/markdown' }),
    );
    expect(fileStatSpy).not.toHaveBeenCalled();

    // Resubscribing rescans (covering updates missed while away) and the
    // previous values remain available rather than starting from empty.
    const resubscribe = store.sub(statsAtom, () => {});
    expect(store.get(statsAtom).size).toBe(2);
    await vi.waitFor(() => {
      expect(fileStatSpy).toHaveBeenCalled();
    });
    resubscribe();
  });

  it('re-stats only the updated path on a content update', async () => {
    const { services, store } = await setup(['one.md', 'two.md', 'three.md']);
    const statsAtom = services.workspaceState.$noteFileStats;
    const fileStatSpy = vi.spyOn(services.fileSystem, 'fileStat');

    const unsubscribe = store.sub(statsAtom, () => {});
    await vi.waitFor(() => {
      expect(store.get(statsAtom).size).toBe(3);
    });
    await vi.waitFor(() => {
      expect(fileStatSpy).toHaveBeenCalledTimes(3);
    });

    fileStatSpy.mockClear();
    await services.fileSystem.writeFile(
      `${TEST_WS_NAME}:two.md`,
      new File(['# updated'], 'two.md', { type: 'text/markdown' }),
    );

    await vi.waitFor(() => {
      expect(fileStatSpy).toHaveBeenCalled();
    });
    expect(
      fileStatSpy.mock.calls.every(
        ([wsPath]) => wsPath === `${TEST_WS_NAME}:two.md`,
      ),
    ).toBe(true);
    unsubscribe();
  });

  it('rescans everything on a force-update relist', async () => {
    const { services, store } = await setup(['one.md', 'two.md']);
    const statsAtom = services.workspaceState.$noteFileStats;
    const fileStatSpy = vi.spyOn(services.fileSystem, 'fileStat');

    const unsubscribe = store.sub(statsAtom, () => {});
    await vi.waitFor(() => {
      expect(fileStatSpy).toHaveBeenCalledTimes(2);
    });

    fileStatSpy.mockClear();
    services.fileSystem.refreshFileTree();
    await vi.waitFor(() => {
      expect(fileStatSpy).toHaveBeenCalledTimes(2);
    });
    unsubscribe();
  });

  it('drops a failed stat without blocking the others', async () => {
    const { services, store } = await setup(['healthy.md', 'broken.md']);
    const statsAtom = services.workspaceState.$noteFileStats;

    const originalFileStat = services.fileSystem.fileStat.bind(
      services.fileSystem,
    );
    vi.spyOn(services.fileSystem, 'fileStat').mockImplementation(
      async (wsPath, options) => {
        if (wsPath === `${TEST_WS_NAME}:broken.md`) {
          throw new Error('stat failed');
        }
        return originalFileStat(wsPath, options);
      },
    );

    const unsubscribe = store.sub(statsAtom, () => {});
    await vi.waitFor(() => {
      expect(store.get(statsAtom).has(`${TEST_WS_NAME}:healthy.md`)).toBe(true);
    });
    expect(store.get(statsAtom).has(`${TEST_WS_NAME}:broken.md`)).toBe(false);
    unsubscribe();
  });
});
