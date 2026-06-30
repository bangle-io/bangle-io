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
  const testEnv = createTestEnvironment({ controller }).setDefaultConfig();
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
