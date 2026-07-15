import { throwAppError } from '@bangle.io/base-utils';
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

  it('preserves the last successful workspace list when a refresh fails', async () => {
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();
    const store = testEnv.store;

    await services.workspaceOps.createWorkspaceInfo({
      name: 'keep-ws',
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    services.navigation.goWorkspace('keep-ws');

    await vi.waitFor(() => {
      expect(
        store.get(services.workspaceState.$workspaceListState),
      ).toMatchObject({
        status: 'ready',
        data: [expect.objectContaining({ name: 'keep-ws' })],
      });
      expect(services.workspaceState.resolveAtoms().currentWsName).toBe(
        'keep-ws',
      );
    });

    const lastSuccessfulList = store.get(services.workspaceState.$workspaces);
    const databaseFailure = new Error('forced workspace refresh failure');
    const getAllEntriesSpy = vi
      .spyOn(services.database, 'getAllEntries')
      .mockImplementation(async () => {
        throwAppError(
          'error::database:unknown-error',
          'Failed to refresh workspace metadata',
          {
            error: databaseFailure,
            databaseName: services.database.name,
          },
        );
      });

    store.set(services.workspaceOps.$workspaceInfoChange, (count) => count + 1);

    await vi.waitFor(() => {
      expect(store.get(services.workspaceState.$workspaceListState)).toEqual({
        status: 'error',
        data: lastSuccessfulList,
        error: expect.any(Error),
      });
    });
    expect(store.get(services.workspaceState.$workspaces)).toBe(
      lastSuccessfulList,
    );
    expect(services.workspaceState.resolveAtoms().currentWsName).toBe(
      'keep-ws',
    );
    expect(testEnv.commonOpts.emitAppError).toHaveBeenCalledWith(
      store.get(services.workspaceState.$workspaceListState).error,
    );

    getAllEntriesSpy.mockRestore();
    store.set(services.workspaceOps.$workspaceInfoChange, (count) => count + 1);

    await vi.waitFor(() => {
      expect(
        store.get(services.workspaceState.$workspaceListState),
      ).toMatchObject({
        status: 'ready',
        data: [expect.objectContaining({ name: 'keep-ws' })],
      });
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
  });

  it('replaces a renamed path and follows the active file route', async () => {
    const { services } = await setupWorkspaceStateService({ controller });
    const renamedWsPath = `${WS_NAME}:RenamedTarget.md`;

    await services.fileSystem.renameFile({
      oldWsPath: TARGET,
      newWsPath: renamedWsPath,
    });

    await vi.waitFor(() => {
      expect(services.navigation.resolveAtoms().activeWsFilePath?.wsPath).toBe(
        renamedWsPath,
      );
      expect(
        services.workspaceState.resolveAtoms().currentWsFilePath?.wsPath,
      ).toBe(renamedWsPath);
    });
    const wsPaths = services.workspaceState
      .resolveAtoms()
      .wsPaths.map((path) => path.wsPath);
    expect(wsPaths).toContain(renamedWsPath);
    expect(wsPaths).not.toContain(TARGET);
  });

  it('does not follow a rename when the user is viewing another file', async () => {
    const { services } = await setupWorkspaceStateService({ controller });
    const renamedWsPath = `${WS_NAME}:RenamedSource.md`;
    services.navigation.goWsPath(SOURCE_WIKI);

    await services.fileSystem.renameFile({
      oldWsPath: TARGET,
      newWsPath: renamedWsPath,
    });

    expect(services.navigation.resolveAtoms().activeWsFilePath?.wsPath).toBe(
      SOURCE_WIKI,
    );
    await vi.waitFor(() => {
      expect(
        services.workspaceState
          .resolveAtoms()
          .wsPaths.map((path) => path.wsPath),
      ).toContain(renamedWsPath);
    });
    expect(services.navigation.resolveAtoms().activeWsFilePath?.wsPath).toBe(
      SOURCE_WIKI,
    );
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
    const originalListWorkspaceFiles =
      services.fileSystem.listWorkspaceFiles.bind(services.fileSystem);
    let listWorkspaceFilesCalls = 0;
    vi.spyOn(services.fileSystem, 'listWorkspaceFiles').mockImplementation(
      (wsName, abortSignal) => {
        listWorkspaceFilesCalls += 1;
        if (listWorkspaceFilesCalls === 1) {
          return blockedScan.promise;
        }
        return originalListWorkspaceFiles(wsName, abortSignal);
      },
    );

    store.set(services.fileSystem.$fileForceUpdateCount, (count) => count + 1);
    await vi.waitUntil(() => listWorkspaceFilesCalls === 1);

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
  });

  it('adds visible non-note files to workspace file state', async () => {
    const { services, store } = await setupWorkspaceStateService({
      controller,
    });
    const visibleWsPath = `${WS_NAME}:asset.txt`;

    await services.fileSystem.createFile(
      visibleWsPath,
      new File(['not a note'], 'asset.txt', { type: 'text/plain' }),
    );

    await vi.waitUntil(() => {
      return (
        store.get(services.fileSystem.$fileCreateEvent)?.wsPath ===
        visibleWsPath
      );
    });

    expect(
      services.workspaceState.resolveAtoms().wsPaths.map((path) => path.wsPath),
    ).toContain(visibleWsPath);
    expect(
      services.workspaceState
        .resolveAtoms()
        .noteWsPaths.map((path) => path.wsPath),
    ).not.toContain(visibleWsPath);
  });

  it('does not expose non-markdown files as the current editor path', async () => {
    const { services } = await setupWorkspaceStateService({ controller });
    const assetWsPath = `${WS_NAME}:asset.pdf`;

    await services.fileSystem.createFile(
      assetWsPath,
      new File(['pdf'], 'asset.pdf', { type: 'application/pdf' }),
    );
    services.navigation.go({
      route: 'editor',
      payload: { wsPath: assetWsPath },
    });

    expect(
      services.workspaceState.resolveAtoms().currentWsPath,
    ).toBeUndefined();
    expect(
      services.workspaceState.resolveAtoms().currentWsFilePath?.wsPath,
    ).toBe(assetWsPath);
  });

  it('exposes asset routes as the current file without making them current notes', async () => {
    const { services } = await setupWorkspaceStateService({ controller });
    const assetWsPath = `${WS_NAME}:image.png`;

    await services.fileSystem.createFile(
      assetWsPath,
      new File(['image'], 'image.png', { type: 'image/png' }),
    );
    services.navigation.goWsFile(assetWsPath);

    await vi.waitUntil(() => {
      return (
        services.workspaceState.resolveAtoms().currentWsFilePath?.wsPath ===
        assetWsPath
      );
    });

    expect(
      services.workspaceState.resolveAtoms().currentWsPath,
    ).toBeUndefined();
    expect(
      services.workspaceState.resolveAtoms().wsPaths.map((path) => path.wsPath),
    ).toContain(assetWsPath);
  });

  it('does not add ignored created files to workspace file state', async () => {
    const { services, store } = await setupWorkspaceStateService({
      controller,
    });
    const ignoredWsPath = `${WS_NAME}:node_modules/pkg/index.ts`;

    await services.fileSystem.createFile(
      ignoredWsPath,
      new File(['ignored'], 'index.ts', { type: 'text/plain' }),
    );

    await vi.waitUntil(() => {
      return (
        store.get(services.fileSystem.$fileCreateEvent)?.wsPath ===
        ignoredWsPath
      );
    });

    expect(
      services.workspaceState.resolveAtoms().wsPaths.map((path) => path.wsPath),
    ).not.toContain(ignoredWsPath);
  });

  it('preserves the last known file tree when a rescan fails', async () => {
    const { services, store } = await setupWorkspaceStateService({
      controller,
    });
    const pathsBeforeFailure = services.workspaceState
      .resolveAtoms()
      .wsPaths.map((path) => path.wsPath);
    expect(pathsBeforeFailure.length).toBeGreaterThan(0);

    let failListCalls = 0;
    const originalListWorkspaceFiles =
      services.fileSystem.listWorkspaceFiles.bind(services.fileSystem);
    const listSpy = vi
      .spyOn(services.fileSystem, 'listWorkspaceFiles')
      .mockImplementation(async () => {
        failListCalls += 1;
        throw new Error('forced transient list failure');
      });

    store.set(services.fileSystem.$fileForceUpdateCount, (count) => count + 1);
    await vi.waitUntil(() => failListCalls > 0);

    await vi.waitUntil(() => {
      return (
        store.get(services.workspaceState.$fileTreeListState).status === 'error'
      );
    });

    expect(
      services.workspaceState.resolveAtoms().wsPaths.map((path) => path.wsPath),
    ).toEqual(pathsBeforeFailure);
    // The routed note must stay resolvable: a failed scan is not absence.
    expect(services.workspaceState.resolveAtoms().currentWsPath?.wsPath).toBe(
      TARGET,
    );

    // Retry through the recovery path and confirm the error state clears.
    listSpy.mockImplementation(originalListWorkspaceFiles);
    services.fileSystem.refreshFileTree();

    await vi.waitUntil(() => {
      return (
        store.get(services.workspaceState.$fileTreeListState).status === 'ok'
      );
    });
    expect(
      services.workspaceState.resolveAtoms().wsPaths.map((path) => path.wsPath),
    ).toEqual(pathsBeforeFailure);
  });

  it('does not leak a previous workspace tree when listing the next workspace fails', async () => {
    const { services, store } = await setupWorkspaceStateService({
      controller,
    });
    const otherWsName = 'other-ws';
    await services.workspaceOps.createWorkspaceInfo({
      name: otherWsName,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });

    const originalListWorkspaceFiles =
      services.fileSystem.listWorkspaceFiles.bind(services.fileSystem);
    vi.spyOn(services.fileSystem, 'listWorkspaceFiles').mockImplementation(
      async (wsName, abortSignal) => {
        if (wsName === otherWsName) {
          throw new Error('forced list failure while switching workspaces');
        }
        return originalListWorkspaceFiles(wsName, abortSignal);
      },
    );

    services.navigation.goWorkspace(otherWsName);

    await vi.waitUntil(() => {
      return (
        store.get(services.workspaceState.$fileTreeListState).status === 'error'
      );
    });

    // Never present workspace A's files as workspace B's tree.
    expect(services.workspaceState.resolveAtoms().wsPaths).toEqual([]);
  });

  it('exposes a typed recovery state when a native workspace directory is missing', async () => {
    const { services, store } = await setupWorkspaceStateService({
      controller,
    });

    vi.spyOn(services.fileSystem, 'listWorkspaceFiles').mockImplementation(
      async (wsName) => {
        throwAppError(
          'error::file-storage:file-does-not-exist',
          'Native workspace path was not found',
          {
            storage: 'file-storage-nativefs',
            wsPath: `${wsName}:`,
          },
        );
      },
    );

    services.fileSystem.refreshFileTree();

    await vi.waitFor(() => {
      expect(store.get(services.workspaceState.$fileTreeListState)).toEqual({
        status: 'native-fs-directory-not-found',
        error: expect.any(Error),
        wsName: WS_NAME,
      });
    });

    // A missing folder is a recovery state, never an empty-workspace success.
    expect(
      services.workspaceState.resolveAtoms().wsPaths.map((path) => path.wsPath),
    ).not.toEqual([]);
  });

  it('does not expose ignored Markdown files returned by storage scans', async () => {
    const { services, store } = await setupWorkspaceStateService({
      controller,
    });
    const originalListWorkspaceFiles =
      services.fileSystem.listWorkspaceFiles.bind(services.fileSystem);
    const ignoredWsPaths = [
      `${WS_NAME}:node_modules/pkg/README.md`,
      `${WS_NAME}:.git/hooks/post-commit.md`,
      `${WS_NAME}:notes/.draft.md`,
    ];
    let callCount = 0;

    vi.spyOn(services.fileSystem, 'listWorkspaceFiles').mockImplementation(
      async (wsName, abortSignal) => {
        callCount += 1;
        return [
          ...(await originalListWorkspaceFiles(wsName, abortSignal)),
          ...ignoredWsPaths,
        ];
      },
    );

    store.set(services.fileSystem.$fileForceUpdateCount, (count) => count + 1);

    await vi.waitUntil(() => callCount > 0);

    const atoms = services.workspaceState.resolveAtoms();
    expect(atoms.wsPaths.map((path) => path.wsPath)).not.toEqual(
      expect.arrayContaining(ignoredWsPaths),
    );
    expect(atoms.noteWsPaths.map((path) => path.wsPath)).not.toEqual(
      expect.arrayContaining(ignoredWsPaths),
    );
  });
});
