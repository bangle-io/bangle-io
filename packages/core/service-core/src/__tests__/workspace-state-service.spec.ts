import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const WS_NAME = 'backlink-index';
const TARGET = `${WS_NAME}:Target.md`;
const SOURCE_WIKI = `${WS_NAME}:SourceWiki.md`;
const SOURCE_MARKDOWN = `${WS_NAME}:SourceMarkdown.md`;
const PLAIN_MENTION = `${WS_NAME}:PlainMention.md`;

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

async function setupWorkspaceStateService({
  controller = new AbortController(),
}: {
  controller?: AbortController;
} = {}) {
  const testEnv = createTestEnvironment({ controller });
  const services = testEnv.instantiateAll();
  await testEnv.mountAll();

  await services.workspaceOps.createWorkspaceInfo({
    name: WS_NAME,
    type: WORKSPACE_STORAGE_TYPE.Memory,
    metadata: {},
  });

  await services.fileSystem.createTextFile(TARGET, 'Target content');
  await services.fileSystem.createTextFile(SOURCE_WIKI, 'See [[Target]]');
  await services.fileSystem.createTextFile(
    SOURCE_MARKDOWN,
    'See [Target](Target.md)',
  );
  await services.fileSystem.createTextFile(
    PLAIN_MENTION,
    'Target appears as plain text.',
  );

  services.navigation.goWsPath(TARGET);
  await vi.waitUntil(() => {
    return (
      services.workspaceState.resolveAtoms().currentWsPath?.wsPath === TARGET
    );
  });

  return { rootEmitter: testEnv.rootEmitter, services, store: testEnv.store };
}

describe('WorkspaceStateService $workspaces list', () => {
  let controller = new AbortController();

  beforeEach(() => {
    controller = new AbortController();
  });

  afterEach(() => {
    controller.abort();
  });

  it('drops a workspace from $workspaces after it is deleted', async () => {
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();
    const store = testEnv.store;

    await services.workspaceOps.createWorkspaceInfo({
      name: 'keep-ws',
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await services.workspaceOps.createWorkspaceInfo({
      name: 'delete-ws',
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });

    await vi.waitFor(() => {
      expect(
        store.get(services.workspaceState.$workspaces).map((ws) => ws.name),
      ).toEqual(expect.arrayContaining(['keep-ws', 'delete-ws']));
    });

    // Soft-delete emits an 'update' change; $workspaces must still refresh so the
    // deleted workspace disappears from any live list without a reload.
    await services.workspaceOps.deleteWorkspaceInfo('delete-ws');

    await vi.waitFor(() => {
      const names = store
        .get(services.workspaceState.$workspaces)
        .map((ws) => ws.name);
      expect(names).toContain('keep-ws');
      expect(names).not.toContain('delete-ws');
    });
  });
});

describe('WorkspaceStateService backlink index', () => {
  let controller = new AbortController();

  beforeEach(() => {
    controller = new AbortController();
  });

  afterEach(() => {
    controller.abort();
  });

  it('builds linked mentions from service-owned state', async () => {
    const { services, store } = await setupWorkspaceStateService({
      controller,
    });

    const state = await vi.waitUntil(() => {
      const next = store.get(services.workspaceState.$backlinkIndex);
      const sources = next.byTargetWsPath.get(TARGET) ?? [];
      return next.status === 'ready' && sources.length > 0 ? next : undefined;
    });

    expect(
      state?.byTargetWsPath.get(TARGET)?.map((path) => path.wsPath),
    ).toEqual([SOURCE_MARKDOWN, SOURCE_WIKI]);
  });

  it('keeps the current backlink state while debouncing rebuilds after edits', async () => {
    const { services, store } = await setupWorkspaceStateService({
      controller,
    });
    await vi.waitUntil(() => {
      const next = store.get(services.workspaceState.$backlinkIndex);
      const sources = next.byTargetWsPath.get(TARGET) ?? [];
      return next.status === 'ready' && sources.length > 0 ? next : undefined;
    });

    const originalReadFileAsText = services.fileSystem.readFileAsText.bind(
      services.fileSystem,
    );
    const readFileAsText = vi
      .spyOn(services.fileSystem, 'readFileAsText')
      .mockImplementation(originalReadFileAsText);

    await services.fileSystem.writeFile(
      SOURCE_WIKI,
      new File(['See [[Target]] again'], 'SourceWiki', { type: 'text/plain' }),
    );

    expect(store.get(services.workspaceState.$backlinkIndex).status).toBe(
      'ready',
    );
    expect(readFileAsText).not.toHaveBeenCalled();

    await vi.waitUntil(() => readFileAsText.mock.calls.length > 0);
    await vi.waitUntil(() => {
      const next = store.get(services.workspaceState.$backlinkIndex);
      return next.status === 'ready' ? next : undefined;
    });
  });

  it('rebuilds the backlink index after content updates', async () => {
    const { services, store } = await setupWorkspaceStateService({
      controller,
    });
    await vi.waitUntil(() => {
      const next = store.get(services.workspaceState.$backlinkIndex);
      const sources = next.byTargetWsPath.get(TARGET) ?? [];
      return next.status === 'ready' && sources.length > 0 ? next : undefined;
    });

    const originalReadFileAsText = services.fileSystem.readFileAsText.bind(
      services.fileSystem,
    );
    const readFileAsText = vi
      .spyOn(services.fileSystem, 'readFileAsText')
      .mockImplementation(originalReadFileAsText);

    await services.fileSystem.writeFile(
      SOURCE_WIKI,
      new File(['No link now'], 'SourceWiki', { type: 'text/plain' }),
    );

    await vi.waitUntil(() => {
      const next = store.get(services.workspaceState.$backlinkIndex);
      const sources = next.byTargetWsPath.get(TARGET) ?? [];
      return (
        next.status === 'ready' &&
        sources.map((path) => path.wsPath).join(',') === SOURCE_MARKDOWN
      );
    });

    expect(
      new Set(readFileAsText.mock.calls.map(([wsPath]) => wsPath)),
    ).toEqual(new Set([TARGET, SOURCE_MARKDOWN, SOURCE_WIKI, PLAIN_MENTION]));
  });

  it('reports an error without reusing stale backlink data when a rebuild read fails', async () => {
    const { services, store } = await setupWorkspaceStateService({
      controller,
    });
    const initialState = await vi.waitUntil(() => {
      const next = store.get(services.workspaceState.$backlinkIndex);
      const sources = next.byTargetWsPath.get(TARGET) ?? [];
      return next.status === 'ready' && sources.length > 0 ? next : undefined;
    });
    const initialSources = initialState?.byTargetWsPath.get(TARGET) ?? [];
    expect(initialSources.map((path) => path.wsPath)).toEqual([
      SOURCE_MARKDOWN,
      SOURCE_WIKI,
    ]);

    const originalReadFileAsText = services.fileSystem.readFileAsText.bind(
      services.fileSystem,
    );
    vi.spyOn(services.fileSystem, 'readFileAsText').mockImplementation(
      async (wsPath) => {
        if (wsPath === SOURCE_WIKI) {
          throw new Error('forced backlink read failure');
        }
        return originalReadFileAsText(wsPath);
      },
    );

    await services.fileSystem.writeFile(
      SOURCE_WIKI,
      new File(['See [[Target]] again'], 'SourceWiki', { type: 'text/plain' }),
    );

    const errorState = await vi.waitUntil(() => {
      const next = store.get(services.workspaceState.$backlinkIndex);
      return next.status === 'error' ? next : undefined;
    });

    expect(errorState?.error).toBeInstanceOf(Error);
    expect(errorState?.byTargetWsPath.get(TARGET)).toBeUndefined();
  });

  it('does not cache partial backlink data from an aborted full rebuild', async () => {
    const { rootEmitter, services, store } = await setupWorkspaceStateService({
      controller,
    });
    await vi.waitUntil(() => {
      const next = store.get(services.workspaceState.$backlinkIndex);
      const sources = next.byTargetWsPath.get(TARGET) ?? [];
      return next.status === 'ready' && sources.length > 0 ? next : undefined;
    });

    const unsubscribe = store.sub(
      services.workspaceState.$backlinkIndex,
      () => {},
    );
    const originalReadFileAsText = services.fileSystem.readFileAsText.bind(
      services.fileSystem,
    );
    const blockedSourceRead = createDeferred<string | undefined>();
    const blockedSourceReadStarted = createDeferred<void>();
    let sourceWikiReads = 0;

    vi.spyOn(services.fileSystem, 'readFileAsText').mockImplementation(
      async (wsPath, options) => {
        if (wsPath === SOURCE_WIKI) {
          sourceWikiReads += 1;
          if (sourceWikiReads === 1) {
            blockedSourceReadStarted.resolve();
            return blockedSourceRead.promise;
          }
        }
        return originalReadFileAsText(wsPath, options);
      },
    );

    try {
      rootEmitter.emit('event::file:force-update', {
        sender: { id: 'test' },
      });
      await blockedSourceReadStarted.promise;

      await services.fileSystem.writeFile(
        PLAIN_MENTION,
        new File(['Also see [[Target]]'], 'PlainMention', {
          type: 'text/plain',
        }),
      );

      await vi.waitUntil(() => {
        const next = store.get(services.workspaceState.$backlinkIndex);
        const sources = next.byTargetWsPath.get(TARGET) ?? [];
        return next.status === 'ready' &&
          sources.some((path) => path.wsPath === PLAIN_MENTION)
          ? next
          : undefined;
      });
      expect(sourceWikiReads).toBeGreaterThanOrEqual(2);

      blockedSourceRead.resolve('See [[Target]]');
      await new Promise((resolve) => setTimeout(resolve, 0));

      await services.fileSystem.writeFile(
        PLAIN_MENTION,
        new File(['Target appears as plain text again.'], 'PlainMention', {
          type: 'text/plain',
        }),
      );

      const finalState = await vi.waitUntil(() => {
        const next = store.get(services.workspaceState.$backlinkIndex);
        const sources = next.byTargetWsPath.get(TARGET) ?? [];
        return next.status === 'ready' &&
          !sources.some((path) => path.wsPath === PLAIN_MENTION)
          ? next
          : undefined;
      });

      expect(
        finalState?.byTargetWsPath.get(TARGET)?.map((path) => path.wsPath),
      ).toEqual([SOURCE_MARKDOWN, SOURCE_WIKI]);
    } finally {
      unsubscribe();
    }
  });
});

describe('WorkspaceStateService file tree updates', () => {
  let controller = new AbortController();

  beforeEach(() => {
    controller = new AbortController();
  });

  afterEach(() => {
    controller.abort();
  });

  it('adds newly created notes to workspace state without a full rescan', async () => {
    const { services } = await setupWorkspaceStateService({ controller });
    const newWsPath = `${WS_NAME}:NewNote.md`;
    const originalListFiles = services.fileSystem.listFiles.bind(
      services.fileSystem,
    );
    const listFiles = vi
      .spyOn(services.fileSystem, 'listFiles')
      .mockImplementation(originalListFiles);

    await services.fileSystem.createTextFile(newWsPath, 'Created note');
    services.navigation.goWsPath(newWsPath);

    await vi.waitUntil(() => {
      return (
        services.workspaceState.resolveAtoms().currentWsPath?.wsPath ===
        newWsPath
      );
    });

    expect(
      services.workspaceState.resolveAtoms().wsPaths.map((path) => path.wsPath),
    ).toContain(newWsPath);
    expect(listFiles).not.toHaveBeenCalled();
  });

  it('keeps an incremental create when an older full rescan resolves later', async () => {
    const { services, store } = await setupWorkspaceStateService({
      controller,
    });
    const newWsPath = `${WS_NAME}:CreatedDuringScan.md`;
    const stalePaths = services.workspaceState
      .resolveAtoms()
      .wsPaths.map((path) => path.wsPath);
    const blockedScan = createDeferred<string[]>();
    const originalListFiles = services.fileSystem.listFiles.bind(
      services.fileSystem,
    );
    let listFilesCalls = 0;
    vi.spyOn(services.fileSystem, 'listFiles').mockImplementation(
      (wsName, abortSignal) => {
        listFilesCalls += 1;
        if (listFilesCalls === 1) {
          return blockedScan.promise;
        }
        return originalListFiles(wsName, abortSignal);
      },
    );

    store.set(services.fileSystem.$fileForceUpdateCount, (count) => count + 1);
    await vi.waitUntil(() => listFilesCalls === 1);

    await services.fileSystem.createTextFile(newWsPath, 'Created note');
    services.navigation.goWsPath(newWsPath);
    await vi.waitUntil(() => {
      return (
        services.workspaceState.resolveAtoms().currentWsPath?.wsPath ===
        newWsPath
      );
    });

    blockedScan.resolve(stalePaths);
    await blockedScan.promise;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      services.workspaceState.resolveAtoms().wsPaths.map((path) => path.wsPath),
    ).toContain(newWsPath);
    expect(services.workspaceState.resolveAtoms().currentWsPath?.wsPath).toBe(
      newWsPath,
    );
  });

  it('tracks multiple created notes without a full rescan', async () => {
    const { services } = await setupWorkspaceStateService({ controller });
    const firstWsPath = `${WS_NAME}:BurstOne.md`;
    const secondWsPath = `${WS_NAME}:BurstTwo.md`;
    const originalListFiles = services.fileSystem.listFiles.bind(
      services.fileSystem,
    );
    const listFiles = vi
      .spyOn(services.fileSystem, 'listFiles')
      .mockImplementation(originalListFiles);

    await Promise.all([
      services.fileSystem.createTextFile(firstWsPath, 'First'),
      services.fileSystem.createTextFile(secondWsPath, 'Second'),
    ]);

    await vi.waitUntil(() => {
      const wsPaths = services.workspaceState
        .resolveAtoms()
        .wsPaths.map((path) => path.wsPath);
      return wsPaths.includes(firstWsPath) && wsPaths.includes(secondWsPath);
    });

    expect(listFiles).not.toHaveBeenCalled();
  });

  it('does not add unsupported created files to workspace note state', async () => {
    const { services, store } = await setupWorkspaceStateService({
      controller,
    });
    const unsupportedWsPath = `${WS_NAME}:asset.txt`;
    const originalListFiles = services.fileSystem.listFiles.bind(
      services.fileSystem,
    );
    const listFiles = vi
      .spyOn(services.fileSystem, 'listFiles')
      .mockImplementation(originalListFiles);

    await services.fileSystem.createFile(
      unsupportedWsPath,
      new File(['not a note'], 'asset.txt', { type: 'text/plain' }),
    );

    await vi.waitUntil(() => {
      return (
        store.get(services.fileSystem.$fileCreateEvent)?.wsPath ===
        unsupportedWsPath
      );
    });

    expect(
      services.workspaceState.resolveAtoms().wsPaths.map((path) => path.wsPath),
    ).not.toContain(unsupportedWsPath);
    expect(listFiles).not.toHaveBeenCalled();
  });
});
