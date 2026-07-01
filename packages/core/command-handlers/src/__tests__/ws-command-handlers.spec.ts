// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import {
  assertIsDefined,
  type BaseError,
  getAppErrorCause,
} from '@bangle.io/base-utils';
import { WsPath } from '@bangle.io/ws-path';
import { describe, expect, test, vi } from 'vitest';
import {
  assertValidDirectoryRenameTarget,
  deleteDirectoryTargetsWithPartialFailureError,
} from '../ws-command-handlers';
import { setupTest } from './test-utils';

describe('WS command handlers', () => {
  describe('directory ws path operations', () => {
    test('waits for file rename durability before navigating', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:rename-ws-path',
        workspaces: [{ name: 'test-ws', notes: ['test-ws:old.md'] }],
        autoNavigate: 'ws-path',
      });
      let finishRename: (() => void) | undefined;
      const renameFile = vi
        .spyOn(services.fileSystem, 'renameFile')
        .mockReturnValue(
          new Promise<void>((resolve) => {
            finishRename = resolve;
          }),
        );

      dispatch('command::ws:rename-ws-path', {
        wsPath: 'test-ws:old.md',
        newWsPath: 'test-ws:new.md',
      });

      await vi.waitFor(() => {
        expect(renameFile).toHaveBeenCalledWith({
          oldWsPath: 'test-ws:old.md',
          newWsPath: 'test-ws:new.md',
        });
      });
      expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
        'test-ws:old.md',
      );

      finishRename?.();

      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          'test-ws:new.md',
        );
      });
    });

    test('waits for file move durability before navigating', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:move-ws-path',
        workspaces: [
          {
            name: 'test-ws',
            notes: ['test-ws:old.md', 'test-ws:dest/keep.md'],
          },
        ],
        autoNavigate: 'ws-path',
      });
      services.navigation.goWsPath('test-ws:old.md');
      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          'test-ws:old.md',
        );
      });
      let finishMove: (() => void) | undefined;
      const renameFile = vi
        .spyOn(services.fileSystem, 'renameFile')
        .mockReturnValue(
          new Promise<void>((resolve) => {
            finishMove = resolve;
          }),
        );

      dispatch('command::ws:move-ws-path', {
        wsPath: 'test-ws:old.md',
        destDirWsPath: 'test-ws:dest',
      });

      await vi.waitFor(() => {
        expect(renameFile).toHaveBeenCalledWith({
          oldWsPath: 'test-ws:old.md',
          newWsPath: 'test-ws:dest/old.md',
        });
      });
      expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
        'test-ws:old.md',
      );

      finishMove?.();

      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          'test-ws:dest/old.md',
        );
      });
    });

    test('renames all files under a directory prefix', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:rename-ws-path',
        workspaces: [
          {
            name: 'test-ws',
            notes: [
              'test-ws:dir/a.md',
              'test-ws:dir/sub/b.md',
              'test-ws:other.md',
            ],
          },
        ],
        autoNavigate: 'ws-path',
      });

      services.navigation.goWsPath('test-ws:dir/sub/b.md');
      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          'test-ws:dir/sub/b.md',
        );
      });

      dispatch('command::ws:rename-ws-path', {
        wsPath: 'test-ws:dir',
        newWsPath: 'test-ws:renamed',
      });

      await vi.waitFor(() => {
        const wsPaths = services.workspaceState
          .resolveAtoms()
          .wsPaths.map((item) => item.wsPath);
        expect(wsPaths).toContain('test-ws:renamed/a.md');
        expect(wsPaths).toContain('test-ws:renamed/sub/b.md');
        expect(wsPaths).not.toContain('test-ws:dir/a.md');
        expect(wsPaths).not.toContain('test-ws:dir/sub/b.md');
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          'test-ws:renamed/sub/b.md',
        );
      });
    });

    test('rejects renaming a directory into its own descendant', () => {
      const oldDir = WsPath.fromString('test-ws:dir').asDir();
      const sameDir = WsPath.fromString('test-ws:dir').asDir();
      const descendantDir = WsPath.fromString('test-ws:dir/sub').asDir();
      assertIsDefined(oldDir);
      assertIsDefined(sameDir);
      assertIsDefined(descendantDir);

      expect(assertValidDirectoryRenameTarget(oldDir, sameDir)).toBe(false);
      expect(() =>
        assertValidDirectoryRenameTarget(oldDir, descendantDir),
      ).toThrowError();
      try {
        assertValidDirectoryRenameTarget(oldDir, descendantDir);
      } catch (error) {
        expect(getAppErrorCause(error as BaseError)?.name).toBe(
          'error::file:invalid-operation',
        );
      }
    });

    test('moves a directory into another directory', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:move-ws-path',
        workspaces: [
          {
            name: 'test-ws',
            notes: [
              'test-ws:source/a.md',
              'test-ws:source/sub/b.md',
              'test-ws:dest/existing.md',
            ],
          },
        ],
        autoNavigate: 'ws-path',
      });

      services.navigation.goWsPath('test-ws:source/sub/b.md');
      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          'test-ws:source/sub/b.md',
        );
      });

      dispatch('command::ws:move-ws-path', {
        wsPath: 'test-ws:source',
        destDirWsPath: 'test-ws:dest',
      });

      await vi.waitFor(() => {
        const wsPaths = services.workspaceState
          .resolveAtoms()
          .wsPaths.map((item) => item.wsPath);
        expect(wsPaths).toContain('test-ws:dest/source/a.md');
        expect(wsPaths).toContain('test-ws:dest/source/sub/b.md');
        expect(wsPaths).not.toContain('test-ws:source/a.md');
        expect(wsPaths).not.toContain('test-ws:source/sub/b.md');
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          'test-ws:dest/source/sub/b.md',
        );
      });
    });

    test('deletes all files under a directory prefix', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:delete-ws-path',
        workspaces: [
          {
            name: 'test-ws',
            notes: ['test-ws:dir/a.md', 'test-ws:dir/sub/b.md', 'test-ws:c.md'],
          },
        ],
        autoNavigate: 'ws-path',
      });

      dispatch('command::ws:delete-ws-path', {
        wsPath: 'test-ws:dir',
      });

      await vi.waitFor(() => {
        const wsPaths = services.workspaceState
          .resolveAtoms()
          .wsPaths.map((item) => item.wsPath);
        expect(wsPaths).not.toContain('test-ws:dir/a.md');
        expect(wsPaths).not.toContain('test-ws:dir/sub/b.md');
        expect(wsPaths).toContain('test-ws:c.md');
      });
    });

    test('reports partial directory delete failures explicitly', async () => {
      const deleted: string[] = [];
      await expect(
        deleteDirectoryTargetsWithPartialFailureError({
          fileSystem: {
            exists: vi.fn(),
            deleteFile: async (wsPath) => {
              if (wsPath === 'test-ws:dir/sub/b.md') {
                throw new Error('delete failed');
              }
              deleted.push(wsPath);
            },
          },
          targets: ['test-ws:dir/a.md', 'test-ws:dir/sub/b.md'],
        }),
      ).rejects.toSatisfy(
        (error: unknown) =>
          getAppErrorCause(error as BaseError)?.name ===
          'error::file:invalid-operation',
      );
      expect(deleted).toEqual(['test-ws:dir/a.md']);
    });
  });

  describe('command::ws:clone-note', () => {
    test.each([
      {
        description: 'clones a normal note with no prior copies',
        initialNotes: ['test-ws:test.md'],
        expectedClone: 'test-ws:test-copy-1.md',
      },
      {
        description: 'generates copy note with continuous copies',
        initialNotes: [
          'test-ws:test.md',
          'test-ws:test-copy-1.md',
          'test-ws:test-copy-2.md',
        ],
        expectedClone: 'test-ws:test-copy-3.md',
      },
      {
        description: 'skips missing copy number when copies are non-continuous',
        initialNotes: [
          'test-ws:test.md',
          'test-ws:test-copy-1.md',
          'test-ws:test-copy-3.md',
        ],
        expectedClone: 'test-ws:test-copy-2.md',
      },
      {
        description: 'handles cloning note with existing copy suffix',
        initialNotes: ['test-ws:test-copy-1.md'],
        expectedClone: 'test-ws:test-copy-2.md',
      },
      {
        description: 'handles cloning note in a subdirectory',
        initialNotes: ['test-ws:dir/test.md'],
        expectedClone: 'test-ws:dir/test-copy-1.md',
      },
    ])('should %s', async ({ initialNotes, expectedClone }) => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:clone-note',
        workspaces: [{ name: 'test-ws', notes: initialNotes }],
        autoNavigate: 'ws-path',
      });

      const initialCount =
        services.workspaceState.resolveAtoms().wsPaths.length;

      dispatch('command::ws:clone-note', null);

      await vi.waitFor(async () => {
        const wsPaths = services.workspaceState.resolveAtoms().wsPaths;
        expect(wsPaths.length).toBe(initialCount + 1);
        expect(wsPaths.map(({ wsPath }) => wsPath)).toContain(expectedClone);

        // Verify navigation updated to the new clone
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          expectedClone,
        );

        // Verify that the content was copied from the original note
        const activeNote = initialNotes[initialNotes.length - 1];
        assertIsDefined(activeNote);
        const originalFile = await services.fileSystem.readFile(activeNote);
        const cloneFile = await services.fileSystem.readFile(expectedClone);
        if (originalFile && cloneFile) {
          const originalContent = await originalFile.text();
          const cloneContent = await cloneFile.text();
          expect(cloneContent).toBe(originalContent);
        }
      });
    });
  });

  describe('command::ws:daily-note', () => {
    const FIXED_DATE_TIMESTAMP = new Date(2024, 1, 15).getTime();
    const EXPECTED_DATE_STR = '2024-Feb-15';
    const EXPECTED_ROOT_FILENAME = `${EXPECTED_DATE_STR}-daily.md`;
    const EXPECTED_ROOT_WSPATH = `test-ws:${EXPECTED_ROOT_FILENAME}`;
    const EXPECTED_SUBDIR_FILENAME = `${EXPECTED_DATE_STR}-daily.md`;
    const EXPECTED_SUBDIR_WSPATH = `test-ws:subdir/${EXPECTED_SUBDIR_FILENAME}`;

    test('should create daily note in root if no note is open', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:daily-note',
        workspaces: [{ name: 'test-ws' }],
        autoNavigate: 'workspace', // Navigate to workspace home
      });

      dispatch('command::ws:daily-note', { date: FIXED_DATE_TIMESTAMP });

      await vi.waitFor(async () => {
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          EXPECTED_ROOT_WSPATH,
        );

        const content =
          await services.fileSystem.readFileAsText(EXPECTED_ROOT_WSPATH);
        expect(content).toBeDefined();
      });
    });

    test('should create daily note in root if a root note is open', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:daily-note',
        workspaces: [{ name: 'test-ws', notes: ['test-ws:root-note.md'] }],
        autoNavigate: 'ws-path',
      });

      expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
        'test-ws:root-note.md',
      );

      dispatch('command::ws:daily-note', { date: FIXED_DATE_TIMESTAMP });

      await vi.waitFor(async () => {
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          EXPECTED_ROOT_WSPATH,
        );
        const content =
          await services.fileSystem.readFileAsText(EXPECTED_ROOT_WSPATH);
        expect(content).toBeDefined();
      });
    });

    test('should create daily note in subdir if a subdir note is open', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:daily-note',
        workspaces: [
          { name: 'test-ws', notes: ['test-ws:subdir/sub-note.md'] },
        ],
        autoNavigate: 'ws-path',
      });

      expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
        'test-ws:subdir/sub-note.md',
      );

      dispatch('command::ws:daily-note', { date: FIXED_DATE_TIMESTAMP });

      await vi.waitFor(async () => {
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          EXPECTED_SUBDIR_WSPATH,
        );

        const content = await services.fileSystem.readFileAsText(
          EXPECTED_SUBDIR_WSPATH,
        );
        expect(content).toBeDefined();
      });
    });

    test('should navigate to existing daily note in subdir', async () => {
      const { dispatch, services, getCommandResults } = await setupTest({
        targetId: 'command::ws:daily-note',
        workspaces: [
          {
            name: 'test-ws',
            notes: ['test-ws:subdir/other.md', EXPECTED_SUBDIR_WSPATH],
          },
        ],
        autoNavigate: 'ws-path', // Navigate to subdir/other.md
      });

      const createSpy = vi.spyOn(services.fileSystem, 'createFile');

      dispatch('command::ws:daily-note', { date: FIXED_DATE_TIMESTAMP });

      await vi.waitFor(async () => {
        // Check navigation
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          EXPECTED_SUBDIR_WSPATH,
        );

        // Ensure create file was not called
        expect(createSpy).not.toHaveBeenCalled();

        // Ensure create-note command was not dispatched
        expect(
          getCommandResults()
            .filter((r) => r.type === 'success')
            .map((r) => r.command.id),
        ).not.toContain('command::ws:create-note');
      });
    });
  });

  describe('command::workspace:toggle-star', () => {
    test('should toggle star status for the currently open note', async () => {
      const NOTE_WS_PATH = 'test-ws:current-note.md';
      const { dispatch, services } = await setupTest({
        targetId: 'command::workspace:toggle-star',
        workspaces: [{ name: 'test-ws', notes: [NOTE_WS_PATH] }],
        autoNavigate: 'ws-path',
      });

      await vi.waitFor(() => {
        const starredPaths =
          services.userActivityService.resolveAtoms().starredWsPaths;
        expect(starredPaths).toEqual([]);
      });

      dispatch('command::workspace:toggle-star', {
        wsPath: undefined,
      });

      await vi.waitFor(() => {
        const starredPaths =
          services.userActivityService.resolveAtoms().starredWsPaths;
        expect(starredPaths).toContain(NOTE_WS_PATH);
      });

      // Action 2: Unstar the note by dispatching the command again
      dispatch('command::workspace:toggle-star', {
        wsPath: undefined,
      });

      await vi.waitFor(() => {
        const starredPaths =
          services.userActivityService.resolveAtoms().starredWsPaths;
        // Since it was the only starred note, the list should be empty again.
        expect(starredPaths).toEqual([]);
      });
    });
  });
});
