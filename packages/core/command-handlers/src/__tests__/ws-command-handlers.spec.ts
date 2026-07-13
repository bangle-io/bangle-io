// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { assertIsDefined, createAppError } from '@bangle.io/base-utils';
import { EDITOR_SAVE_DRAIN_TIMEOUT_MS } from '@bangle.io/constants';
import { toast } from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { describe, expect, test, vi } from 'vitest';
import { setupTest } from './test-utils';

describe('WS command handlers', () => {
  describe('command::ws:create-note', () => {
    test('reports duplicate note creation as a command failure', async () => {
      const NOTE_WS_PATH = 'test-ws:existing.md';
      const { dispatch, services, getCommandResults, testEnv } =
        await setupTest({
          targetId: 'command::ws:create-note',
          workspaces: [{ name: 'test-ws', notes: [NOTE_WS_PATH] }],
          autoNavigate: 'workspace',
        });

      dispatch('command::ws:create-note', {
        navigate: true,
        wsPath: NOTE_WS_PATH,
      });

      await vi.waitFor(() => {
        expect(
          getCommandResults().filter((result) => result.type === 'failure'),
        ).toEqual([
          expect.objectContaining({
            command: expect.objectContaining({
              id: 'command::ws:create-note',
            }),
          }),
        ]);
        expect(testEnv.commonOpts.emitAppError).toHaveBeenCalledWith(
          expect.objectContaining({
            cause: expect.objectContaining({
              name: 'error::file:already-existing',
              payload: { wsPath: NOTE_WS_PATH },
            }),
          }),
        );
      });

      expect(services.navigation.resolveAtoms().wsPath?.wsPath).not.toBe(
        NOTE_WS_PATH,
      );
    });
  });

  describe('command::ws:delete-ws-path', () => {
    test('keeps an open asset route stable after durable delete', async () => {
      const ASSET_WS_PATH = 'test-ws:assets/report.pdf';
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:delete-ws-path',
        workspaces: [{ name: 'test-ws', notes: [ASSET_WS_PATH] }],
        autoNavigate: 'workspace',
      });

      services.navigation.goWsPath(ASSET_WS_PATH);
      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().routeInfo).toEqual({
          route: 'asset',
          payload: { wsPath: ASSET_WS_PATH },
        });
      });

      dispatch('command::ws:delete-ws-path', {
        wsPath: ASSET_WS_PATH,
      });

      await vi.waitFor(async () => {
        expect(
          await services.fileSystem.readFile(ASSET_WS_PATH),
        ).toBeUndefined();
        expect(services.navigation.resolveAtoms().routeInfo).toEqual({
          route: 'asset',
          payload: { wsPath: ASSET_WS_PATH },
        });
        expect(services.workspaceState.resolveAtoms().currentWsFilePath).toBe(
          undefined,
        );
      });
    });
  });

  describe('command::ws:delete-ws-paths', () => {
    test('deletes selected files in one durable batch', async () => {
      const FIRST_WS_PATH = 'test-ws:first.md';
      const SECOND_WS_PATH = 'test-ws:nested/second.md';
      const KEEP_WS_PATH = 'test-ws:keep.md';
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:delete-ws-paths',
        workspaces: [
          {
            name: 'test-ws',
            notes: [FIRST_WS_PATH, SECOND_WS_PATH, KEEP_WS_PATH],
          },
        ],
        autoNavigate: 'workspace',
      });

      dispatch('command::ws:delete-ws-paths', {
        wsPaths: [FIRST_WS_PATH, SECOND_WS_PATH],
      });

      await vi.waitFor(async () => {
        await expect(
          services.fileSystem.readFile(FIRST_WS_PATH),
        ).resolves.toBeUndefined();
        await expect(
          services.fileSystem.readFile(SECOND_WS_PATH),
        ).resolves.toBeUndefined();
        await expect(
          services.fileSystem.readFile(KEEP_WS_PATH),
        ).resolves.toBeDefined();
      });
    });
  });

  describe('command::ws:rename-ws-path', () => {
    test('waits for the source save to drain before renaming', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.md';
      const DESTINATION_WS_PATH = 'test-ws:destination.md';
      const { dispatch, services, getCommandResults } = await setupTest({
        targetId: 'command::ws:rename-ws-path',
        workspaces: [{ name: 'test-ws', notes: [SOURCE_WS_PATH] }],
        autoNavigate: 'ws-path',
      });
      let dirty = true;
      const checkedPaths: Array<string | undefined> = [];
      vi.spyOn(
        services.editorEngine,
        'hasPendingOrFailedSave',
      ).mockImplementation((wsPath) => {
        checkedPaths.push(wsPath);
        return dirty;
      });
      vi.spyOn(
        services.editorEngine,
        'subscribeToSaveStatus',
      ).mockImplementation((listener) => {
        queueMicrotask(() => {
          dirty = false;
          listener();
        });
        return vi.fn();
      });
      const renameSpy = vi.spyOn(services.fileSystem, 'renameFile');

      dispatch('command::ws:rename-ws-path', {
        wsPath: SOURCE_WS_PATH,
        newWsPath: DESTINATION_WS_PATH,
      });

      await vi.waitFor(() => {
        expect(
          getCommandResults().filter((result) => result.type === 'success'),
        ).toEqual([
          expect.objectContaining({
            command: expect.objectContaining({
              id: 'command::ws:rename-ws-path',
            }),
          }),
        ]);
      });
      expect(checkedPaths.length).toBeGreaterThan(0);
      expect(checkedPaths.every((path) => path === SOURCE_WS_PATH)).toBe(true);
      expect(renameSpy).toHaveBeenCalledWith({
        oldWsPath: SOURCE_WS_PATH,
        newWsPath: DESTINATION_WS_PATH,
      });
    });

    test('blocks relocation when the source save cannot drain', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.md';
      const DESTINATION_WS_PATH = 'test-ws:destination.md';
      const { dispatch, services, getCommandResults, testEnv } =
        await setupTest({
          targetId: 'command::ws:rename-ws-path',
          workspaces: [{ name: 'test-ws', notes: [SOURCE_WS_PATH] }],
          autoNavigate: 'ws-path',
        });
      vi.spyOn(services.editorEngine, 'hasPendingOrFailedSave').mockReturnValue(
        true,
      );
      vi.spyOn(services.editorEngine, 'subscribeToSaveStatus').mockReturnValue(
        vi.fn(),
      );
      const renameSpy = vi.spyOn(services.fileSystem, 'renameFile');

      vi.useFakeTimers();
      try {
        dispatch('command::ws:rename-ws-path', {
          wsPath: SOURCE_WS_PATH,
          newWsPath: DESTINATION_WS_PATH,
        });
        await vi.advanceTimersByTimeAsync(EDITOR_SAVE_DRAIN_TIMEOUT_MS);
      } finally {
        vi.useRealTimers();
      }

      await vi.waitFor(() => {
        expect(
          getCommandResults().filter((result) => result.type === 'failure'),
        ).toHaveLength(1);
        expect(testEnv.commonOpts.emitAppError).toHaveBeenCalledWith(
          expect.objectContaining({
            cause: expect.objectContaining({
              name: 'error::file:invalid-operation',
              payload: expect.objectContaining({
                oldWsPath: SOURCE_WS_PATH,
                newWsPath: DESTINATION_WS_PATH,
              }),
            }),
          }),
        );
      });
      expect(renameSpy).not.toHaveBeenCalled();
      expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
        SOURCE_WS_PATH,
      );
    });

    test('preserves a star after the durable rename succeeds', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.md';
      const DESTINATION_WS_PATH = 'test-ws:destination.md';
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:rename-ws-path',
        workspaces: [{ name: 'test-ws', notes: [SOURCE_WS_PATH] }],
        autoNavigate: 'ws-path',
      });
      await services.userActivityService.toggleStarItem(
        WsPath.fromString(SOURCE_WS_PATH),
      );

      dispatch('command::ws:rename-ws-path', {
        wsPath: SOURCE_WS_PATH,
        newWsPath: DESTINATION_WS_PATH,
      });

      await vi.waitFor(async () => {
        await expect(
          services.fileSystem.readFile(SOURCE_WS_PATH),
        ).resolves.toBeUndefined();
        await expect(
          services.fileSystem.readFile(DESTINATION_WS_PATH),
        ).resolves.toBeDefined();
        expect(
          services.userActivityService.resolveAtoms().starredWsPaths,
        ).toEqual([DESTINATION_WS_PATH]);
      });
    });

    test('keeps a successful rename when starred metadata migration fails', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.md';
      const DESTINATION_WS_PATH = 'test-ws:destination.md';
      const { dispatch, services, getCommandResults } = await setupTest({
        targetId: 'command::ws:rename-ws-path',
        workspaces: [{ name: 'test-ws', notes: [SOURCE_WS_PATH] }],
        autoNavigate: 'ws-path',
      });
      vi.spyOn(
        services.userActivityService,
        'relocateStarredItem',
      ).mockResolvedValueOnce('failed');
      const warningSpy = vi.spyOn(toast, 'warning');

      dispatch('command::ws:rename-ws-path', {
        wsPath: SOURCE_WS_PATH,
        newWsPath: DESTINATION_WS_PATH,
      });

      await vi.waitFor(async () => {
        expect(
          getCommandResults().filter((result) => result.type === 'success'),
        ).toHaveLength(1);
        await expect(
          services.fileSystem.readFile(DESTINATION_WS_PATH),
        ).resolves.toBeDefined();
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          DESTINATION_WS_PATH,
        );
        expect(warningSpy).toHaveBeenCalledWith(
          expect.stringContaining('could not preserve its starred status'),
        );
      });
    });

    test('reports a destination conflict without calling storage', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.md';
      const DESTINATION_WS_PATH = 'test-ws:destination.md';
      const { dispatch, services, getCommandResults, testEnv } =
        await setupTest({
          targetId: 'command::ws:rename-ws-path',
          workspaces: [
            {
              name: 'test-ws',
              notes: [SOURCE_WS_PATH, DESTINATION_WS_PATH],
            },
          ],
          autoNavigate: 'ws-path',
        });
      const renameSpy = vi.spyOn(services.fileSystem, 'renameFile');

      dispatch('command::ws:rename-ws-path', {
        wsPath: SOURCE_WS_PATH,
        newWsPath: DESTINATION_WS_PATH,
      });

      await vi.waitFor(() => {
        expect(
          getCommandResults().filter((result) => result.type === 'failure'),
        ).toHaveLength(1);
        expect(testEnv.commonOpts.emitAppError).toHaveBeenCalledWith(
          expect.objectContaining({
            cause: expect.objectContaining({
              name: 'error::file:already-existing',
              payload: { wsPath: DESTINATION_WS_PATH },
            }),
          }),
        );
      });
      expect(renameSpy).not.toHaveBeenCalled();
    });

    test('reports storage rename failures before navigating to the destination', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.md';
      const DESTINATION_WS_PATH = 'test-ws:destination.md';
      const { dispatch, services, getCommandResults } = await setupTest({
        targetId: 'command::ws:rename-ws-path',
        workspaces: [{ name: 'test-ws', notes: [SOURCE_WS_PATH] }],
        autoNavigate: 'ws-path',
      });
      vi.spyOn(services.fileSystem, 'renameFile').mockRejectedValueOnce(
        createAppError('error::file:already-existing', 'rename failed', {
          wsPath: DESTINATION_WS_PATH,
        }),
      );
      const errorToastSpy = vi.spyOn(toast, 'error');

      dispatch('command::ws:rename-ws-path', {
        wsPath: SOURCE_WS_PATH,
        newWsPath: DESTINATION_WS_PATH,
      });

      await vi.waitFor(() => {
        expect(
          getCommandResults().filter((result) => result.type === 'failure'),
        ).toEqual([
          expect.objectContaining({
            command: expect.objectContaining({
              id: 'command::ws:rename-ws-path',
            }),
          }),
        ]);
      });
      expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
        SOURCE_WS_PATH,
      );
      expect(errorToastSpy).not.toHaveBeenCalledWith(
        t.app.toasts.fileRenameFailed,
      );
    });
  });

  describe('command::ws:move-ws-path', () => {
    test('normalizes slash root destination when moving a nested file to workspace root', async () => {
      const SOURCE_WS_PATH = 'test-ws:folder/source.md';
      const DESTINATION_WS_PATH = 'test-ws:source.md';
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:move-ws-path',
        workspaces: [{ name: 'test-ws', notes: [SOURCE_WS_PATH] }],
        autoNavigate: 'workspace',
      });

      dispatch('command::ws:move-ws-path', {
        destDirWsPath: 'test-ws:/',
        wsPath: SOURCE_WS_PATH,
      });

      await vi.waitFor(async () => {
        await expect(
          services.fileSystem.readFile(SOURCE_WS_PATH),
        ).resolves.toBeUndefined();
        await expect(
          services.fileSystem.readFile(DESTINATION_WS_PATH),
        ).resolves.toBeDefined();
      });
    });

    test('preserves a star after the durable move succeeds', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.md';
      const DESTINATION_WS_PATH = 'test-ws:archive/source.md';
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:move-ws-path',
        workspaces: [{ name: 'test-ws', notes: [SOURCE_WS_PATH] }],
        autoNavigate: 'ws-path',
      });
      await services.userActivityService.toggleStarItem(
        WsPath.fromString(SOURCE_WS_PATH),
      );

      dispatch('command::ws:move-ws-path', {
        destDirWsPath: 'test-ws:archive/',
        wsPath: SOURCE_WS_PATH,
      });

      await vi.waitFor(async () => {
        await expect(
          services.fileSystem.readFile(DESTINATION_WS_PATH),
        ).resolves.toBeDefined();
        expect(
          services.userActivityService.resolveAtoms().starredWsPaths,
        ).toEqual([DESTINATION_WS_PATH]);
      });
    });

    test('reports a conflict without overwriting when the destination name is taken', async () => {
      const SOURCE_WS_PATH = 'test-ws:a.md';
      const DEST_DIR_WS_PATH = 'test-ws:folder/';
      const EXISTING_WS_PATH = 'test-ws:folder/a.md';
      const { dispatch, services, getCommandResults, testEnv } =
        await setupTest({
          targetId: 'command::ws:move-ws-path',
          workspaces: [
            { name: 'test-ws', notes: [SOURCE_WS_PATH, EXISTING_WS_PATH] },
          ],
          autoNavigate: 'workspace',
        });

      await services.fileSystem.writeFile(
        SOURCE_WS_PATH,
        new File(['source body'], 'a.md', { type: 'text/plain' }),
      );
      await services.fileSystem.writeFile(
        EXISTING_WS_PATH,
        new File(['destination body'], 'a.md', { type: 'text/plain' }),
      );

      const renameSpy = vi.spyOn(services.fileSystem, 'renameFile');

      dispatch('command::ws:move-ws-path', {
        destDirWsPath: DEST_DIR_WS_PATH,
        wsPath: SOURCE_WS_PATH,
      });

      await vi.waitFor(() => {
        expect(
          getCommandResults().filter((result) => result.type === 'failure'),
        ).toEqual([
          expect.objectContaining({
            command: expect.objectContaining({
              id: 'command::ws:move-ws-path',
            }),
          }),
        ]);
        expect(testEnv.commonOpts.emitAppError).toHaveBeenCalledWith(
          expect.objectContaining({
            cause: expect.objectContaining({
              name: 'error::file:already-existing',
              payload: { wsPath: EXISTING_WS_PATH },
            }),
          }),
        );
      });

      // The conflict must never fall through to a destructive rename: both the
      // dragged note and the note it collides with keep their original content.
      expect(renameSpy).not.toHaveBeenCalled();
      await expect(
        services.fileSystem.readFileAsText(SOURCE_WS_PATH),
      ).resolves.toBe('source body');
      await expect(
        services.fileSystem.readFileAsText(EXISTING_WS_PATH),
      ).resolves.toBe('destination body');
    });

    test('reports storage move failures before navigating to the destination', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.md';
      const DESTINATION_DIR_WS_PATH = 'test-ws:archive/';
      const DESTINATION_WS_PATH = 'test-ws:archive/source.md';
      const { dispatch, services, getCommandResults } = await setupTest({
        targetId: 'command::ws:move-ws-path',
        workspaces: [{ name: 'test-ws', notes: [SOURCE_WS_PATH] }],
        autoNavigate: 'ws-path',
      });
      vi.spyOn(services.fileSystem, 'renameFile').mockRejectedValueOnce(
        createAppError('error::file:already-existing', 'move failed', {
          wsPath: DESTINATION_WS_PATH,
        }),
      );

      dispatch('command::ws:move-ws-path', {
        wsPath: SOURCE_WS_PATH,
        destDirWsPath: DESTINATION_DIR_WS_PATH,
      });

      await vi.waitFor(() => {
        expect(
          getCommandResults().filter((result) => result.type === 'failure'),
        ).toEqual([
          expect.objectContaining({
            command: expect.objectContaining({
              id: 'command::ws:move-ws-path',
            }),
          }),
        ]);
      });
      expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
        SOURCE_WS_PATH,
      );
      expect(services.navigation.resolveAtoms().wsPath?.wsPath).not.toBe(
        DESTINATION_WS_PATH,
      );
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

    test('reports toggle-star without an open note as a handled app error', async () => {
      const { dispatch, getCommandResults, testEnv } = await setupTest({
        targetId: 'command::workspace:toggle-star',
        workspaces: [{ name: 'test-ws' }],
        autoNavigate: 'workspace',
      });

      dispatch('command::workspace:toggle-star', {
        wsPath: undefined,
      });

      await vi.waitFor(() => {
        expect(
          getCommandResults().filter((result) => result.type === 'failure'),
        ).toEqual([
          expect.objectContaining({
            command: expect.objectContaining({
              id: 'command::workspace:toggle-star',
            }),
          }),
        ]);
        expect(testEnv.commonOpts.emitAppError).toHaveBeenCalledWith(
          expect.objectContaining({
            cause: expect.objectContaining({
              name: 'error::workspace:no-note-opened',
            }),
          }),
        );
      });
    });
  });
});
