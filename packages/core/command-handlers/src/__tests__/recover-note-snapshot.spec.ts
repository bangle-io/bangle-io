// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { assertIsDefined } from '@bangle.io/base-utils';
import { toast } from '@bangle.io/ui-components';
import { describe, expect, test, vi } from 'vitest';
import { setupTest } from './test-utils';

describe('command::ws:recover-note-snapshot', () => {
  const NOTE_WS_PATH = 'test-ws:daily/journal.md';

  async function setupWithSnapshot() {
    const setup = await setupTest({
      targetId: 'command::ws:recover-note-snapshot',
      workspaces: [{ name: 'test-ws', notes: [NOTE_WS_PATH] }],
      autoNavigate: 'workspace',
    });
    // Overwrite the note so a pre-edit snapshot of the original content
    // exists (the exact flow a real user triggers by editing).
    await setup.services.fileSystem.writeFile(
      NOTE_WS_PATH,
      new File(['overwritten content'], 'journal.md', {
        type: 'text/plain',
      }),
    );
    const snapshots = await setup.services.noteSnapshot.listSnapshots();
    expect(snapshots).toHaveLength(1);
    const snapshot = snapshots[0];
    assertIsDefined(snapshot);
    return { ...setup, snapshot };
  }

  test('recovers a snapshot into a new note without touching the original', async () => {
    const { dispatch, services, snapshot } = await setupWithSnapshot();

    dispatch('command::ws:recover-note-snapshot', {
      snapshotId: snapshot.id,
    });

    const recoveredWsPath = 'test-ws:daily/journal-recovered-1.md';
    await vi.waitFor(async () => {
      expect(await services.fileSystem.readFileAsText(recoveredWsPath)).toBe(
        'I am content of journal',
      );
    });

    // The original note keeps its latest (overwritten) content.
    expect(await services.fileSystem.readFileAsText(NOTE_WS_PATH)).toBe(
      'overwritten content',
    );
    // Navigation lands on the recovered note.
    await vi.waitFor(() => {
      expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
        recoveredWsPath,
      );
    });
  });

  test('picks the next free -recovered-<n> name on repeat recovery', async () => {
    const { dispatch, services, snapshot } = await setupWithSnapshot();

    dispatch('command::ws:recover-note-snapshot', {
      snapshotId: snapshot.id,
    });
    await vi.waitFor(async () => {
      expect(
        await services.fileSystem.exists(
          'test-ws:daily/journal-recovered-1.md',
        ),
      ).toBe(true);
    });

    dispatch('command::ws:recover-note-snapshot', {
      snapshotId: snapshot.id,
    });
    await vi.waitFor(async () => {
      expect(
        await services.fileSystem.exists(
          'test-ws:daily/journal-recovered-2.md',
        ),
      ).toBe(true);
    });
  });

  test('shows an error toast when the snapshot no longer exists', async () => {
    const { dispatch, getCommandResults } = await setupWithSnapshot();
    const errorToast = vi.spyOn(toast, 'error');

    dispatch('command::ws:recover-note-snapshot', {
      snapshotId: 'missing-snapshot-id',
    });

    await vi.waitFor(() => {
      expect(errorToast).toHaveBeenCalled();
      // The command completes without throwing; missing snapshots are a
      // handled user-facing case.
      expect(
        getCommandResults().filter((result) => result.type === 'failure'),
      ).toEqual([]);
    });
  });

  test('shows the recovery error when the snapshot workspace was deleted', async () => {
    const { dispatch, services, snapshot } = await setupWithSnapshot();
    const errorToast = vi.spyOn(toast, 'error');
    await services.workspaceOps.deleteWorkspaceInfo('test-ws');

    dispatch('command::ws:recover-note-snapshot', {
      snapshotId: snapshot.id,
    });

    await vi.waitFor(() => {
      expect(errorToast).toHaveBeenCalledWith(
        t.app.toasts.snapshotRecoverFailed,
      );
    });
  });
});
