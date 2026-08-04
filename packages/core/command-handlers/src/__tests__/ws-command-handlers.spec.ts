// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { assertIsDefined, createAppError } from '@bangle.io/base-utils';
import { EDITOR_SAVE_DRAIN_TIMEOUT_MS } from '@bangle.io/constants';
import { toast } from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { describe, expect, test, vi } from 'vitest';
import { setupTest } from './test-utils';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

describe('WS command handlers', () => {
  describe('command::ws:create-note', () => {
    test('does not overwrite a newer navigation while creation is pending', async () => {
      const CURRENT_WS_PATH = 'test-ws:current.md';
      const NEW_WS_PATH = 'test-ws:new.md';
      const { dispatch, services, getCommandResults } = await setupTest({
        targetId: 'command::ws:create-note',
        workspaces: [{ name: 'test-ws', notes: [CURRENT_WS_PATH] }],
        autoNavigate: 'ws-path',
      });
      const createStarted = createDeferred<void>();
      const allowCreate = createDeferred<void>();
      const createFile = services.fileSystem.createFile.bind(
        services.fileSystem,
      );
      vi.spyOn(services.fileSystem, 'createFile').mockImplementationOnce(
        async (...args) => {
          createStarted.resolve();
          await allowCreate.promise;
          return createFile(...args);
        },
      );

      dispatch('command::ws:create-note', {
        navigate: true,
        wsPath: NEW_WS_PATH,
      });

      await createStarted.promise;
      // Re-selecting the current note is still a newer navigation intent even
      // though comparing the route before and after would show no difference.
      services.navigation.goWsPath(CURRENT_WS_PATH);
      allowCreate.resolve();

      await vi.waitFor(async () => {
        expect(
          getCommandResults().filter((result) => result.type === 'success'),
        ).toHaveLength(1);
        await expect(
          services.fileSystem.readFile(NEW_WS_PATH),
        ).resolves.toBeDefined();
      });
      expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
        CURRENT_WS_PATH,
      );
    });

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

    test('routes Markdown renames through note relocation', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.md';
      const DESTINATION_WS_PATH = 'test-ws:destination.md';
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:rename-ws-path',
        workspaces: [{ name: 'test-ws', notes: [SOURCE_WS_PATH] }],
      });
      const relocationSpy = vi.spyOn(services.noteRelocation, 'relocate');

      dispatch('command::ws:rename-ws-path', {
        wsPath: SOURCE_WS_PATH,
        newWsPath: DESTINATION_WS_PATH,
      });

      await vi.waitFor(() => {
        expect(relocationSpy).toHaveBeenCalledWith({
          destination: expect.objectContaining({ wsPath: DESTINATION_WS_PATH }),
          source: expect.objectContaining({ wsPath: SOURCE_WS_PATH }),
        });
      });
    });

    test('warns when a Markdown reference could not be updated safely', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.md';
      const DESTINATION_WS_PATH = 'test-ws:destination.md';
      const { dispatch, services, getCommandResults } = await setupTest({
        targetId: 'command::ws:rename-ws-path',
        workspaces: [{ name: 'test-ws', notes: [SOURCE_WS_PATH] }],
      });
      await services.fileSystem.writeFile(
        SOURCE_WS_PATH,
        new File(['[[./missing]]'], 'source.md', { type: 'text/plain' }),
      );
      const warningSpy = vi.spyOn(toast, 'warning');

      dispatch('command::ws:rename-ws-path', {
        wsPath: SOURCE_WS_PATH,
        newWsPath: DESTINATION_WS_PATH,
      });

      await vi.waitFor(() => {
        expect(
          getCommandResults().filter((result) => result.type === 'success'),
        ).toHaveLength(1);
        expect(warningSpy).toHaveBeenCalledWith(
          t.app.toasts.fileRenameReferenceUpdateIncomplete({
            fileName: 'destination.md',
            warningCount: 1,
          }),
        );
      });
    });

    test('reports the number and reason when a planned rewrite becomes stale', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.md';
      const DESTINATION_WS_PATH = 'test-ws:destination.md';
      const TARGET_WS_PATH = 'test-ws:target.md';
      const { dispatch, services, getCommandResults } = await setupTest({
        targetId: 'command::ws:rename-ws-path',
        workspaces: [
          { name: 'test-ws', notes: [SOURCE_WS_PATH, TARGET_WS_PATH] },
        ],
      });
      await services.fileSystem.writeFile(
        SOURCE_WS_PATH,
        new File([['[[./target]]', '[[./target]]'].join('\n\n')], 'source.md', {
          type: 'text/plain',
        }),
      );
      const renameFile = services.fileSystem.renameFile.bind(
        services.fileSystem,
      );
      const writeFile = services.fileSystem.writeFile.bind(services.fileSystem);
      vi.spyOn(services.fileSystem, 'renameFile').mockImplementation(
        async (args) => {
          if (args.oldWsPath === SOURCE_WS_PATH) {
            await writeFile(
              SOURCE_WS_PATH,
              new File(['[[./target]]'], 'source.md', {
                type: 'text/plain',
              }),
            );
          }
          return renameFile(args);
        },
      );
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
          services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
        ).resolves.toBe('[[./target]]');
        expect(warningSpy).toHaveBeenCalledWith(
          t.app.toasts.fileRenameReferenceUpdateSkipped({
            fileName: 'destination.md',
            reason: t.app.toasts.noteRelocationDestinationContentChanged,
            warningCount: 2,
          }),
        );
      });
    });

    test('keeps raw-file renames on the existing file-system path', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.txt';
      const DESTINATION_WS_PATH = 'test-ws:destination.txt';
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:rename-ws-path',
        workspaces: [{ name: 'test-ws', notes: [SOURCE_WS_PATH] }],
      });
      const relocationSpy = vi.spyOn(services.noteRelocation, 'relocate');
      const renameSpy = vi.spyOn(services.fileSystem, 'renameFile');

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
      });
      expect(relocationSpy).not.toHaveBeenCalled();
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

    test('does not pull the user back after they leave during metadata migration', async () => {
      const OTHER_WS_PATH = 'test-ws:other.md';
      const SOURCE_WS_PATH = 'test-ws:source.md';
      const DESTINATION_WS_PATH = 'test-ws:destination.md';
      const { dispatch, services, getCommandResults } = await setupTest({
        targetId: 'command::ws:rename-ws-path',
        workspaces: [
          { name: 'test-ws', notes: [OTHER_WS_PATH, SOURCE_WS_PATH] },
        ],
        autoNavigate: 'ws-path',
      });
      const metadataMigration = createDeferred<'succeeded'>();
      vi.spyOn(
        services.userActivityService,
        'relocateStarredItem',
      ).mockReturnValueOnce(metadataMigration.promise);

      dispatch('command::ws:rename-ws-path', {
        wsPath: SOURCE_WS_PATH,
        newWsPath: DESTINATION_WS_PATH,
      });

      await vi.waitFor(() => {
        expect(
          services.navigation.resolveAtoms().activeWsFilePath?.wsPath,
        ).toBe(DESTINATION_WS_PATH);
      });
      services.navigation.goWsPath(OTHER_WS_PATH);
      metadataMigration.resolve('succeeded');

      await vi.waitFor(() => {
        expect(
          getCommandResults().filter((result) => result.type === 'success'),
        ).toHaveLength(1);
      });
      expect(services.navigation.resolveAtoms().activeWsFilePath?.wsPath).toBe(
        OTHER_WS_PATH,
      );
    });

    test('reports the storage-authoritative destination conflict', async () => {
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
      await expect(
        services.fileSystem.readFile(SOURCE_WS_PATH),
      ).resolves.toBeDefined();
      await expect(
        services.fileSystem.readFile(DESTINATION_WS_PATH),
      ).resolves.toBeDefined();
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

    test('routes Markdown moves through note relocation', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.md';
      const DESTINATION_WS_PATH = 'test-ws:archive/source.md';
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:move-ws-path',
        workspaces: [{ name: 'test-ws', notes: [SOURCE_WS_PATH] }],
      });
      const relocationSpy = vi.spyOn(services.noteRelocation, 'relocate');

      dispatch('command::ws:move-ws-path', {
        destDirWsPath: 'test-ws:archive/',
        wsPath: SOURCE_WS_PATH,
      });

      await vi.waitFor(() => {
        expect(relocationSpy).toHaveBeenCalledWith({
          destination: expect.objectContaining({ wsPath: DESTINATION_WS_PATH }),
          source: expect.objectContaining({ wsPath: SOURCE_WS_PATH }),
        });
      });
    });

    test('keeps raw-file moves on the existing file-system path', async () => {
      const SOURCE_WS_PATH = 'test-ws:source.txt';
      const DESTINATION_WS_PATH = 'test-ws:archive/source.txt';
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:move-ws-path',
        workspaces: [{ name: 'test-ws', notes: [SOURCE_WS_PATH] }],
      });
      const relocationSpy = vi.spyOn(services.noteRelocation, 'relocate');
      const renameSpy = vi.spyOn(services.fileSystem, 'renameFile');

      dispatch('command::ws:move-ws-path', {
        destDirWsPath: 'test-ws:archive/',
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
      expect(relocationSpy).not.toHaveBeenCalled();
      expect(renameSpy).toHaveBeenCalledWith({
        oldWsPath: SOURCE_WS_PATH,
        newWsPath: DESTINATION_WS_PATH,
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

      // The relocation service rejects the known collision before a storage
      // rename, and both notes keep their original content.
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

  describe('command::ws:rename-directory', () => {
    test('blocks the batch while any descendant save cannot drain', async () => {
      const FIRST_WS_PATH = 'test-ws:folder/first.md';
      const SECOND_WS_PATH = 'test-ws:folder/second.md';
      const { dispatch, services, getCommandResults } = await setupTest({
        targetId: 'command::ws:rename-directory',
        workspaces: [
          { name: 'test-ws', notes: [FIRST_WS_PATH, SECOND_WS_PATH] },
        ],
        autoNavigate: 'ws-path',
      });
      const checkedPaths: Array<string | undefined> = [];
      vi.spyOn(
        services.editorEngine,
        'hasPendingOrFailedSave',
      ).mockImplementation((wsPath) => {
        checkedPaths.push(wsPath);
        return wsPath === SECOND_WS_PATH;
      });
      vi.spyOn(services.editorEngine, 'subscribeToSaveStatus').mockReturnValue(
        vi.fn(),
      );
      const renameSpy = vi.spyOn(services.fileSystem, 'renameFiles');

      vi.useFakeTimers();
      try {
        dispatch('command::ws:rename-directory', {
          oldDirWsPath: 'test-ws:folder/',
          newDirWsPath: 'test-ws:vault/',
        });
        await vi.advanceTimersByTimeAsync(EDITOR_SAVE_DRAIN_TIMEOUT_MS);
      } finally {
        vi.useRealTimers();
      }

      await vi.waitFor(() => {
        expect(
          getCommandResults().filter((result) => result.type === 'failure'),
        ).toHaveLength(1);
      });
      expect(checkedPaths).toEqual(
        expect.arrayContaining([FIRST_WS_PATH, SECOND_WS_PATH]),
      );
      expect(renameSpy).not.toHaveBeenCalled();
      await expect(
        services.fileSystem.readFile(SECOND_WS_PATH),
      ).resolves.toBeDefined();
    });

    test('relocates descendant stars and follows the active note', async () => {
      const FIRST_WS_PATH = 'test-ws:folder/first.md';
      const SECOND_WS_PATH = 'test-ws:folder/nested/second.md';
      const FIRST_DESTINATION = 'test-ws:vault/first.md';
      const SECOND_DESTINATION = 'test-ws:vault/nested/second.md';
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:rename-directory',
        workspaces: [
          { name: 'test-ws', notes: [FIRST_WS_PATH, SECOND_WS_PATH] },
        ],
        autoNavigate: 'ws-path',
      });
      await services.userActivityService.toggleStarItem(
        WsPath.fromString(FIRST_WS_PATH),
      );
      await services.userActivityService.toggleStarItem(
        WsPath.fromString(SECOND_WS_PATH),
      );
      const relocateStarsSpy = vi.spyOn(
        services.userActivityService,
        'relocateStarredItems',
      );

      dispatch('command::ws:rename-directory', {
        oldDirWsPath: 'test-ws:folder/',
        newDirWsPath: 'test-ws:vault/',
      });

      await vi.waitFor(async () => {
        await expect(
          services.fileSystem.readFile(FIRST_DESTINATION),
        ).resolves.toBeDefined();
        await expect(
          services.fileSystem.readFile(SECOND_DESTINATION),
        ).resolves.toBeDefined();
        expect(
          services.userActivityService.resolveAtoms().starredWsPaths,
        ).toEqual([FIRST_DESTINATION, SECOND_DESTINATION]);
        expect(
          services.navigation.resolveAtoms().activeWsFilePath?.wsPath,
        ).toBe(SECOND_DESTINATION);
      });
      expect(relocateStarsSpy).toHaveBeenCalledOnce();
      expect(relocateStarsSpy).toHaveBeenCalledWith([
        {
          oldItem: expect.objectContaining({ wsPath: FIRST_WS_PATH }),
          newItem: expect.objectContaining({ wsPath: FIRST_DESTINATION }),
        },
        {
          oldItem: expect.objectContaining({ wsPath: SECOND_WS_PATH }),
          newItem: expect.objectContaining({ wsPath: SECOND_DESTINATION }),
        },
      ]);
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
