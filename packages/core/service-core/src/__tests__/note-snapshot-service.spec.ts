import { getEventSenderMetadata } from '@bangle.io/base-utils';
import {
  DATABASE_TABLE_NAME,
  EXTERNAL_FILE_CHANGE_SENDER_TAG,
  WORKSPACE_STORAGE_TYPE,
} from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { countWords } from '../note-snapshot-service';

const TEST_WS_NAME = 'test-ws';
const NOTE_WS_PATH = `${TEST_WS_NAME}:note.md`;
const SELF_WATCHER_SENDER = getEventSenderMetadata({
  tag: EXTERNAL_FILE_CHANGE_SENDER_TAG,
});

async function setup({
  minCaptureIntervalMs = 0,
  maxSnapshotsPerWorkspace,
}: {
  minCaptureIntervalMs?: number;
  maxSnapshotsPerWorkspace?: number;
} = {}) {
  const controller = new AbortController();
  const testEnv = createTestEnvironment({
    controller,
    coreConfigOverrides: {
      noteSnapshot: (base) => ({
        ...base,
        minCaptureIntervalMs,
        ...(maxSnapshotsPerWorkspace === undefined
          ? {}
          : { maxSnapshotsPerWorkspace }),
      }),
    },
  });

  const services = testEnv.instantiateAll();
  await testEnv.mountAll();

  await services.workspaceOps.createWorkspaceInfo({
    name: TEST_WS_NAME,
    type: WORKSPACE_STORAGE_TYPE.Memory,
    metadata: {},
  });

  return { controller, services, testEnv };
}

async function writeNote(
  services: Awaited<ReturnType<typeof setup>>['services'],
  wsPath: string,
  content: string,
) {
  await services.fileSystem.writeFile(
    wsPath,
    new File([content], 'note.md', { type: 'text/plain' }),
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('countWords', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n ')).toBe(0);
    expect(countWords('hello')).toBe(1);
    // Markdown markers count as tokens; this is a rough size signal, not prose
    // word count.
    expect(countWords('# Hello world\n\n- item one\n- item two')).toBe(9);
  });
});

describe('NoteSnapshotService', () => {
  it('captures the pre-edit content when a note is overwritten', async () => {
    const { controller, services } = await setup();
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'hello original');

    await writeNote(services, NOTE_WS_PATH, 'hello edited');

    const snapshots = await services.noteSnapshot.listSnapshots({
      wsName: TEST_WS_NAME,
    });
    expect(snapshots).toHaveLength(1);
    const metadata = snapshots[0];
    expect(metadata).toMatchObject({
      wsName: TEST_WS_NAME,
      wsPath: NOTE_WS_PATH,
      wordCount: 2,
    });
    expect(metadata).not.toHaveProperty('content');

    const full = await services.noteSnapshot.getSnapshot(metadata?.id ?? '');
    expect(full?.content).toBe('hello original');

    // The write itself still landed.
    expect(await services.fileSystem.readFileAsText(NOTE_WS_PATH)).toBe(
      'hello edited',
    );
    controller.abort();
  });

  it('does not snapshot a note that was only created and never overwritten', async () => {
    const { controller, services } = await setup();
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'fresh note');

    expect(await services.noteSnapshot.listSnapshots()).toEqual([]);
    controller.abort();
  });

  it('skips empty pre-edit content but captures later real content', async () => {
    const { controller, services } = await setup();
    await services.fileSystem.createTextFile(NOTE_WS_PATH, '');

    await writeNote(services, NOTE_WS_PATH, 'first real content');
    expect(await services.noteSnapshot.listSnapshots()).toEqual([]);

    await writeNote(services, NOTE_WS_PATH, 'second content');
    const snapshots = await services.noteSnapshot.listSnapshots();
    expect(snapshots).toHaveLength(1);
    const full = await services.noteSnapshot.getSnapshot(
      snapshots[0]?.id ?? '',
    );
    expect(full?.content).toBe('first real content');
    controller.abort();
  });

  it('ignores non-markdown files', async () => {
    const { controller, services } = await setup();
    const assetPath = `${TEST_WS_NAME}:image.png`;
    await services.fileSystem.createFile(
      assetPath,
      new File(['binary-ish'], 'image.png'),
    );
    await services.fileSystem.writeFile(
      assetPath,
      new File(['other-binary'], 'image.png'),
    );

    expect(await services.noteSnapshot.listSnapshots()).toEqual([]);
    controller.abort();
  });

  it('does not store duplicate snapshots for unchanged content', async () => {
    const { controller, services } = await setup();
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'same content');

    await writeNote(services, NOTE_WS_PATH, 'same content');
    await writeNote(services, NOTE_WS_PATH, 'same content');

    expect(await services.noteSnapshot.listSnapshots()).toHaveLength(1);
    controller.abort();
  });

  it('throttles rapid consecutive saves of the same note', async () => {
    const { controller, services } = await setup({
      minCaptureIntervalMs: 60_000,
    });
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'v1');

    await writeNote(services, NOTE_WS_PATH, 'v2');
    await writeNote(services, NOTE_WS_PATH, 'v3');
    await writeNote(services, NOTE_WS_PATH, 'v4');

    const snapshots = await services.noteSnapshot.listSnapshots();
    expect(snapshots).toHaveLength(1);
    const full = await services.noteSnapshot.getSnapshot(
      snapshots[0]?.id ?? '',
    );
    expect(full?.content).toBe('v1');
    controller.abort();
  });

  it('re-captures despite the throttle after another tab updates the note', async () => {
    const { controller, services, testEnv } = await setup({
      minCaptureIntervalMs: 60_000,
    });
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'v1');

    await writeNote(services, NOTE_WS_PATH, 'v2');
    expect(await services.noteSnapshot.listSnapshots()).toHaveLength(1);

    // Simulate another tab's save arriving over the cross-tab event bridge:
    // same event shape, but a foreign sender id.
    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-content-update',
      wsPath: NOTE_WS_PATH,
      sender: { id: 'some-other-tab', tag: 'file-system-service' },
    });

    // The next local save must snapshot the other writer's content even
    // though this tab captured less than a minute ago. (Both captures fall in
    // the same 10-minute retention bucket, so the newest one supersedes the
    // older rather than adding a row — without the foreign event the newest
    // snapshot would still hold 'v1'.)
    await writeNote(services, NOTE_WS_PATH, 'v3');
    const snapshots = await services.noteSnapshot.listSnapshots();
    const newest = await services.noteSnapshot.getSnapshot(
      snapshots[0]?.id ?? '',
    );
    expect(newest?.content).toBe('v2');
    controller.abort();
  });

  it("preserves this tab's outgoing content when another tab overwrites it", async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-21T00:00:00Z'));
    const { controller, services, testEnv } = await setup({
      minCaptureIntervalMs: 60_000,
    });
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'v1');
    await writeNote(services, NOTE_WS_PATH, 'v2 from this tab');
    // Different retention bucket, so the preserved snapshot adds a row
    // instead of superseding the v1 capture.
    vi.advanceTimersByTime(11 * 60_000);

    // Another tab overwrote the note. This tab's write lost the race: its
    // content exists nowhere on storage anymore.
    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-content-update',
      wsPath: NOTE_WS_PATH,
      sender: { id: 'some-other-tab', tag: 'file-system-service' },
    });

    await vi.waitFor(async () => {
      const snapshots = await services.noteSnapshot.listSnapshots();
      expect(snapshots).toHaveLength(2);
      const newest = await services.noteSnapshot.getSnapshot(
        snapshots[0]?.id ?? '',
      );
      expect(newest?.content).toBe('v2 from this tab');
    });
    controller.abort();
  });

  it('retains outgoing content across a watcher create echo', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-21T00:00:00Z'));
    const { controller, services, testEnv } = await setup({
      minCaptureIntervalMs: 60_000,
    });
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'v1');
    await writeNote(services, NOTE_WS_PATH, 'v2 from this tab');
    vi.advanceTimersByTime(11 * 60_000);

    // NativeFS atomic replacement can surface as temp-file -> visible-file,
    // which the watcher reports as a create even though this was our write.
    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-create',
      wsPath: NOTE_WS_PATH,
      sender: SELF_WATCHER_SENDER,
    });
    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-content-update',
      wsPath: NOTE_WS_PATH,
      sender: { id: 'some-other-tab', tag: 'file-system-service' },
    });

    await vi.waitFor(async () => {
      const snapshots = await services.noteSnapshot.listSnapshots();
      const contents = await Promise.all(
        snapshots.map(
          async ({ id }) =>
            (await services.noteSnapshot.getSnapshot(id))?.content,
        ),
      );
      expect(contents).toContain('v2 from this tab');
    });
    controller.abort();
  });

  it('re-captures same-tab watcher content despite the throttle', async () => {
    const { controller, services, testEnv } = await setup({
      minCaptureIntervalMs: 60_000,
    });
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'v1');
    await writeNote(services, NOTE_WS_PATH, 'v2 from this tab');

    // Production watcher events carry this browsing context's id plus the
    // external-change tag. Write storage directly to model the external edit.
    await services.fileStorageMemory.writeFile(
      NOTE_WS_PATH,
      new File(['external disk content'], 'note.md'),
    );
    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-content-update',
      wsPath: NOTE_WS_PATH,
      sender: SELF_WATCHER_SENDER,
    });

    await writeNote(services, NOTE_WS_PATH, 'v3 local overwrite');
    const snapshots = await services.noteSnapshot.listSnapshots();
    const newest = await services.noteSnapshot.getSnapshot(
      snapshots[0]?.id ?? '',
    );
    expect(newest?.content).toBe('external disk content');
    controller.abort();
  });

  it('keeps capturing local versions once the throttle window has passed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-21T00:00:00Z'));
    const { controller, services, testEnv } = await setup({
      minCaptureIntervalMs: 60_000,
    });
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'v1');
    await writeNote(services, NOTE_WS_PATH, 'v2 from this tab');

    // A watched workspace echoes every one of this tab's own writes back. That
    // must not switch off ordinary snapshot history: after the throttle window
    // the next save still has to preserve the version it overwrites.
    // Spaced past the retention thinning bucket so each version survives.
    for (const content of ['v3 from this tab', 'v4 from this tab']) {
      testEnv.rootEmitter.emit('event::file:update', {
        type: 'file-content-update',
        wsPath: NOTE_WS_PATH,
        sender: SELF_WATCHER_SENDER,
      });
      vi.advanceTimersByTime(11 * 60_000);
      await writeNote(services, NOTE_WS_PATH, content);
    }

    const snapshots = await services.noteSnapshot.listSnapshots();
    const contents = await Promise.all(
      snapshots.map(
        async ({ id }) =>
          (await services.noteSnapshot.getSnapshot(id))?.content,
      ),
    );
    expect(contents).toEqual(
      expect.arrayContaining(['v1', 'v2 from this tab', 'v3 from this tab']),
    );
    controller.abort();
  });

  it('does not snapshot a same-tab watcher echo as external content', async () => {
    const { controller, services, testEnv } = await setup({
      minCaptureIntervalMs: 60_000,
    });
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'v1');
    await writeNote(services, NOTE_WS_PATH, 'v2 from this tab');

    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-content-update',
      wsPath: NOTE_WS_PATH,
      sender: SELF_WATCHER_SENDER,
    });
    await writeNote(services, NOTE_WS_PATH, 'v3 from this tab');

    const snapshots = await services.noteSnapshot.listSnapshots();
    expect(snapshots).toHaveLength(1);
    await expect(
      services.noteSnapshot.getSnapshot(snapshots[0]?.id ?? ''),
    ).resolves.toMatchObject({ content: 'v1' });
    controller.abort();
  });

  it('preserves each cached outgoing version only once', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-21T00:00:00Z'));
    const { controller, services, testEnv } = await setup();
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'v1');
    await writeNote(services, NOTE_WS_PATH, 'v2 from this tab');
    vi.advanceTimersByTime(11 * 60_000);

    const emitForeignUpdate = () => {
      testEnv.rootEmitter.emit('event::file:update', {
        type: 'file-content-update',
        wsPath: NOTE_WS_PATH,
        sender: { id: 'some-other-tab', tag: 'file-system-service' },
      });
    };
    emitForeignUpdate();
    await services.noteSnapshot.captureBeforeOverwrite(
      `${TEST_WS_NAME}:first-barrier.md`,
      async () => new File(['first barrier'], 'first-barrier.md'),
    );

    vi.advanceTimersByTime(11 * 60_000);
    await services.noteSnapshot.captureBeforeOverwrite(
      NOTE_WS_PATH,
      async () => new File(['newer foreign content'], 'note.md'),
    );
    vi.advanceTimersByTime(11 * 60_000);
    emitForeignUpdate();
    await services.noteSnapshot.captureBeforeOverwrite(
      `${TEST_WS_NAME}:second-barrier.md`,
      async () => new File(['second barrier'], 'second-barrier.md'),
    );

    const snapshots = await services.noteSnapshot.listSnapshots();
    const contents = await Promise.all(
      snapshots.map(
        async ({ id }) =>
          (await services.noteSnapshot.getSnapshot(id))?.content,
      ),
    );
    expect(
      contents.filter((content) => content === 'v2 from this tab'),
    ).toHaveLength(1);
    controller.abort();
  });

  it('serializes concurrent duplicate captures', async () => {
    const { controller, services } = await setup();

    await Promise.all([
      services.noteSnapshot.captureBeforeOverwrite(
        NOTE_WS_PATH,
        async () => new File(['shared content'], 'note.md'),
      ),
      services.noteSnapshot.captureBeforeOverwrite(
        NOTE_WS_PATH,
        async () => new File(['shared content'], 'note.md'),
      ),
    ]);

    expect(await services.noteSnapshot.listSnapshots()).toHaveLength(1);
    controller.abort();
  });

  it('keeps the workspace cap under concurrent captures', async () => {
    const { controller, services } = await setup({
      maxSnapshotsPerWorkspace: 3,
    });

    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        services.noteSnapshot.captureBeforeOverwrite(
          `${TEST_WS_NAME}:note-${index}.md`,
          async () => new File([`content ${index}`], `note-${index}.md`),
        ),
      ),
    );

    expect(await services.noteSnapshot.listSnapshots()).toHaveLength(3);
    controller.abort();
  });

  it('resets capture throttling when a deleted path is recreated', async () => {
    const { controller, services } = await setup({
      minCaptureIntervalMs: 60_000,
    });
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'old original');
    await writeNote(services, NOTE_WS_PATH, 'old outgoing');

    await services.fileSystem.deleteFile(NOTE_WS_PATH);
    await services.fileSystem.createTextFile(
      NOTE_WS_PATH,
      'replacement original',
    );
    await writeNote(services, NOTE_WS_PATH, 'replacement edited');

    const snapshots = await services.noteSnapshot.listSnapshots();
    const contents = await Promise.all(
      snapshots.map(
        async ({ id }) =>
          (await services.noteSnapshot.getSnapshot(id))?.content,
      ),
    );
    expect(contents).toContain('replacement original');
    controller.abort();
  });

  it('does not preserve cached content after its path is deleted', async () => {
    const { controller, services, testEnv } = await setup();
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'old original');
    await writeNote(services, NOTE_WS_PATH, 'old outgoing');
    await services.fileSystem.deleteFile(NOTE_WS_PATH);
    await services.fileSystem.createTextFile(
      NOTE_WS_PATH,
      'replacement original',
    );

    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-content-update',
      wsPath: NOTE_WS_PATH,
      sender: { id: 'some-other-tab', tag: 'file-system-service' },
    });
    // This capture shares the workspace lock, so when it finishes any
    // preservation triggered by the event above has also finished.
    await services.noteSnapshot.captureBeforeOverwrite(
      `${TEST_WS_NAME}:barrier.md`,
      async () => new File(['barrier content'], 'barrier.md'),
    );

    const snapshots = await services.noteSnapshot.listSnapshots();
    const contents = await Promise.all(
      snapshots.map(
        async ({ id }) =>
          (await services.noteSnapshot.getSnapshot(id))?.content,
      ),
    );
    expect(contents).not.toContain('old outgoing');
    controller.abort();
  });

  it('stores a distinct version even when its hash collides with the latest snapshot', async () => {
    // '0000000r' and '00000020' collide in the djb2 fingerprint.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-21T00:00:00Z'));
    const { controller, services } = await setup();
    await services.fileSystem.createTextFile(NOTE_WS_PATH, '0000000r');
    await writeNote(services, NOTE_WS_PATH, '00000020');
    // Separate retention buckets so both captures survive thinning.
    vi.advanceTimersByTime(11 * 60_000);
    await writeNote(services, NOTE_WS_PATH, 'final content');

    const snapshots = await services.noteSnapshot.listSnapshots();
    const contents = await Promise.all(
      snapshots.map(
        async (meta) =>
          (await services.noteSnapshot.getSnapshot(meta.id))?.content,
      ),
    );
    expect(contents).toContain('0000000r');
    expect(contents).toContain('00000020');
    controller.abort();
  });

  it('skips notes larger than the snapshot size limit', async () => {
    const { controller, services } = await setup();
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'small start');

    const huge = `# big\n${'word '.repeat(1_000_000)}`;
    await services.fileSystem.writeFile(
      NOTE_WS_PATH,
      new File([huge], 'note.md', { type: 'text/plain' }),
    );
    // First overwrite captured the small pre-edit content.
    expect(await services.noteSnapshot.listSnapshots()).toHaveLength(1);

    // Overwriting the huge note does not snapshot the huge content.
    await writeNote(services, NOTE_WS_PATH, 'small again');
    expect(await services.noteSnapshot.listSnapshots()).toHaveLength(1);
    controller.abort();
  });

  it('reports externally displaced editor content over the size limit as unpreservable', async () => {
    const { controller, services } = await setup();
    const huge = `# big\n${'word '.repeat(1_000_000)}`;

    // Reporting this as preserved would let the caller destroy the only
    // remaining copy of the note.
    await expect(
      services.noteSnapshot.preserveExternalOverwrite(NOTE_WS_PATH, huge),
    ).resolves.toBe('unpreservable');
    expect(await services.noteSnapshot.listSnapshots()).toEqual([]);
    controller.abort();
  });

  it('evicts old snapshots beyond the workspace cap, preferring recent ones', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-21T00:00:00Z'));
    const { controller, services } = await setup({
      maxSnapshotsPerWorkspace: 3,
    });
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'version 0');

    for (let i = 1; i <= 6; i++) {
      // Move past both the throttle and the 10-minute thinning bucket.
      vi.advanceTimersByTime(11 * 60_000);
      await writeNote(services, NOTE_WS_PATH, `version ${i}`);
    }

    const snapshots = await services.noteSnapshot.listSnapshots();
    expect(snapshots.length).toBeLessThanOrEqual(3);
    // The newest snapshot (most recent pre-edit content) is retained.
    const newest = snapshots[0];
    const full = await services.noteSnapshot.getSnapshot(newest?.id ?? '');
    expect(full?.content).toBe('version 5');
    controller.abort();
  });

  it('never blocks or fails the save when snapshotting fails', async () => {
    const { controller, services } = await setup();
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'important data');

    const originalUpdateEntry = services.database.updateEntry.bind(
      services.database,
    );
    vi.spyOn(services.database, 'updateEntry').mockImplementation(
      async (key, callback, options) => {
        if (options.tableName === DATABASE_TABLE_NAME.noteSnapshots) {
          throw new Error('database exploded');
        }
        return originalUpdateEntry(key, callback, options);
      },
    );

    await expect(
      writeNote(services, NOTE_WS_PATH, 'newer data'),
    ).resolves.toBeUndefined();
    expect(await services.fileSystem.readFileAsText(NOTE_WS_PATH)).toBe(
      'newer data',
    );
    expect(await services.noteSnapshot.listSnapshots()).toEqual([]);
    controller.abort();
  });

  it('retries preserving outgoing content after a transient storage failure', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-21T00:00:00Z'));
    const { controller, services, testEnv } = await setup();
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'v1');
    await writeNote(services, NOTE_WS_PATH, 'v2 from this tab');
    // Different retention bucket, so the preserved snapshot adds a row.
    vi.advanceTimersByTime(11 * 60_000);

    const originalUpdateEntry = services.database.updateEntry.bind(
      services.database,
    );
    const failingUpdateEntry = vi
      .spyOn(services.database, 'updateEntry')
      .mockImplementation(async (key, callback, options) => {
        if (options.tableName === DATABASE_TABLE_NAME.noteSnapshotsContent) {
          throw new Error('database exploded');
        }
        return originalUpdateEntry(key, callback, options);
      });

    const emitForeignUpdate = () => {
      testEnv.rootEmitter.emit('event::file:update', {
        type: 'file-content-update',
        wsPath: NOTE_WS_PATH,
        sender: { id: 'some-other-tab', tag: 'file-system-service' },
      });
    };
    // This preservation attempt fails in storage; the capture below shares
    // the workspace lock, so once it finishes the failure has completed.
    emitForeignUpdate();
    await services.noteSnapshot.captureBeforeOverwrite(
      `${TEST_WS_NAME}:barrier.md`,
      async () => new File(['barrier content'], 'barrier.md'),
    );
    failingUpdateEntry.mockRestore();

    // Storage works again: a later foreign event must retry the preservation
    // instead of treating the lost content as already handled.
    await vi.waitFor(async () => {
      emitForeignUpdate();
      const snapshots = await services.noteSnapshot.listSnapshots();
      const contents = await Promise.all(
        snapshots.map(
          async ({ id }) =>
            (await services.noteSnapshot.getSnapshot(id))?.content,
        ),
      );
      expect(contents).toContain('v2 from this tab');
    });
    controller.abort();
  });

  it('keeps snapshot history attached to a note across a rename', async () => {
    const { controller, services } = await setup();
    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'original');
    await writeNote(services, NOTE_WS_PATH, 'edited');
    expect(await services.noteSnapshot.listSnapshots()).toHaveLength(1);

    const renamedWsPath = `${TEST_WS_NAME}:renamed.md`;
    await services.fileSystem.renameFile({
      oldWsPath: NOTE_WS_PATH,
      newWsPath: renamedWsPath,
    });

    await vi.waitFor(async () => {
      const snapshots = await services.noteSnapshot.listSnapshots();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]?.wsPath).toBe(renamedWsPath);
    });
    // The re-keyed row still resolves to its content.
    const snapshots = await services.noteSnapshot.listSnapshots();
    const full = await services.noteSnapshot.getSnapshot(
      snapshots[0]?.id ?? '',
    );
    expect(full?.content).toBe('original');
    expect(full?.wsName).toBe(TEST_WS_NAME);
    controller.abort();
  });

  it('lists snapshots per workspace, newest first', async () => {
    const OTHER_WS = 'other-ws';
    const { controller, services } = await setup();
    await services.workspaceOps.createWorkspaceInfo({
      name: OTHER_WS,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });

    await services.fileSystem.createTextFile(NOTE_WS_PATH, 'ws one note');
    const otherPath = `${OTHER_WS}:other.md`;
    await services.fileSystem.createTextFile(otherPath, 'ws two note');

    await writeNote(services, NOTE_WS_PATH, 'ws one note updated');
    await services.fileSystem.writeFile(
      otherPath,
      new File(['ws two note updated'], 'other.md', { type: 'text/plain' }),
    );

    expect(await services.noteSnapshot.listSnapshots()).toHaveLength(2);
    expect(
      await services.noteSnapshot.listSnapshots({ wsName: TEST_WS_NAME }),
    ).toHaveLength(1);
    expect(
      await services.noteSnapshot.listSnapshots({ wsName: OTHER_WS }),
    ).toHaveLength(1);
    controller.abort();
  });
});
