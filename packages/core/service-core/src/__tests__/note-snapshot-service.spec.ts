import {
  DATABASE_TABLE_NAME,
  WORKSPACE_STORAGE_TYPE,
} from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { countWords } from '../note-snapshot-service';

const TEST_WS_NAME = 'test-ws';
const NOTE_WS_PATH = `${TEST_WS_NAME}:note.md`;

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
