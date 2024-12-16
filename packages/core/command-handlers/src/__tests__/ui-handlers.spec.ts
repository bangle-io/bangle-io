// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { assertIsDefined } from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import {
  type TestCommandHandlerReturnType,
  testCommandHandler,
} from '@bangle.io/test-utils';
import { assertedResolvePath } from '@bangle.io/ws-path';
import { describe, expect, it, vi } from 'vitest';
import { commandHandlers as defaultCommandHandlers } from '../index';

async function setupTest({
  targetId,
  workspaces,
  autoNavigate = 'workspace',
}: {
  targetId: string;
  workspaces?: Array<{
    name: string;
    notes?: string[];
  }>;
  autoNavigate?: 'workspace' | 'ws-path' | false;
}): Promise<{
  dispatch: TestCommandHandlerReturnType['dispatch'];
  testEnv: ReturnType<typeof testCommandHandler>['testEnv'];
  services: Awaited<
    ReturnType<ReturnType<typeof testCommandHandler>['autoMountServices']>
  >;
  getCommandResults: ReturnType<typeof testCommandHandler>['getCommandResults'];
}> {
  const target = defaultCommandHandlers.find((c) => c.id === targetId);
  assertIsDefined(target);
  const { dispatch, testEnv, autoMountServices, getCommandResults } =
    testCommandHandler({
      target,
    });

  const services = await autoMountServices();

  if (workspaces) {
    for (const workspace of workspaces) {
      await services.workspaceOps.createWorkspaceInfo({
        name: workspace.name,
        type: WORKSPACE_STORAGE_TYPE.Memory,
        metadata: {},
      });
      if (workspace.notes) {
        for (const wsPath of workspace.notes) {
          const { fileNameWithoutExt } = assertedResolvePath(wsPath);
          await services.fileSystem.createFile(
            wsPath,
            new File(
              [`I am content of ${fileNameWithoutExt}`],
              fileNameWithoutExt,
              {
                type: 'text/plain',
              },
            ),
          );
        }
      }
    }

    if (autoNavigate === 'workspace') {
      const workspace = workspaces?.at(-1);
      assertIsDefined(workspace);
      services.navigation.goWorkspace(workspace.name);

      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().wsName).toBe(workspace.name);
      });
    }

    if (autoNavigate === 'ws-path') {
      const workspace = workspaces?.at(-1);
      assertIsDefined(workspace);
      const wsPath = workspace.notes?.at(-1);
      assertIsDefined(wsPath);
      services.navigation.goWsPath(wsPath);

      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().wsPath).toBe(wsPath);
        expect(
          services.workspaceState.resolveAtoms().wsPaths.length,
        ).toBeGreaterThan(0);
      });
    }
  }

  return { dispatch, testEnv, services, getCommandResults };
}

describe('UI command handlers', () => {
  describe('command::ui:toggle-sidebar', () => {
    it('should correctly toggle the sidebar', async () => {
      const { dispatch, testEnv, services } = await setupTest({
        targetId: 'command::ui:toggle-sidebar',
      });
      expect(testEnv.store.get(services.workbenchState.$sidebarOpen)).toBe(
        true,
      );
      dispatch('command::ui:toggle-sidebar', null);
      expect(testEnv.store.get(services.workbenchState.$sidebarOpen)).toBe(
        false,
      );
    });
  });

  describe('command::ui:reload-app', () => {
    it('should reload the app', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ui:reload-app',
      });
      const spy = vi.spyOn(services.workbenchState, 'reloadUi');
      dispatch('command::ui:reload-app', null);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('command::ui:toggle-omni-search', () => {
    it('should toggle omni-search and prefill input if provided', async () => {
      const { dispatch, testEnv, services } = await setupTest({
        targetId: 'command::ui:toggle-omni-search',
      });
      expect(testEnv.store.get(services.workbenchState.$openOmniSearch)).toBe(
        false,
      );
      dispatch('command::ui:toggle-omni-search', { prefill: undefined });
      expect(testEnv.store.get(services.workbenchState.$openOmniSearch)).toBe(
        true,
      );

      dispatch('command::ui:toggle-omni-search', { prefill: 'test' });
      expect(testEnv.store.get(services.workbenchState.$omniSearchInput)).toBe(
        'test',
      );
    });
  });

  describe('command::ui:switch-theme', () => {
    it('should open the theme switcher dialog and update theme preference when selected', async () => {
      const { dispatch, testEnv, services } = await setupTest({
        targetId: 'command::ui:switch-theme',
      });
      dispatch('command::ui:switch-theme', {
        prefill: undefined,
      });
      const dialog = testEnv.store.get(
        services.workbenchState.$singleSelectDialog,
      );
      expect(dialog).toBeDefined();
      expect(dialog?.dialogId).toBe('dialog::change-theme-pref-dialog');
      //  since we mock the theme preference, not needed to check for theme change
    });
  });

  describe('command::ui:create-note-dialog', () => {
    it('should open the new note dialog and dispatch ws:new-note-from-input on name entry', async () => {
      const { dispatch, testEnv, services, getCommandResults } =
        await setupTest({
          targetId: 'command::ui:create-note-dialog',
          workspaces: [{ name: 'test-ws' }],
        });
      dispatch('command::ui:create-note-dialog', {
        prefillName: undefined,
      });
      const dialog = testEnv.store.get(
        services.workbenchState.$singleInputDialog,
      );
      expect(dialog).toBeDefined();
      expect(dialog?.dialogId).toBe('dialog::new-note-dialog');

      dialog?.onSelect('My Note');

      await vi.waitFor(() => {
        expect(
          getCommandResults()
            .filter((result) => result.type === 'success')
            .map((result) => result.command.id),
        ).toContain('command::ws:new-note-from-input');
      });
    });
  });

  describe('command::ui:delete-note-dialog', () => {
    it('should open the delete note dialog, show alert on note selection, and dispatch ws:delete-ws-path on confirmation', async () => {
      const { dispatch, testEnv, services, getCommandResults } =
        await setupTest({
          targetId: 'command::ui:delete-note-dialog',
          workspaces: [{ name: 'test-ws', notes: ['test-ws:test.md'] }],
          autoNavigate: 'ws-path',
        });

      dispatch('command::ui:delete-note-dialog', {
        wsPath: 'test-ws:test.md',
      });
      const dialog = testEnv.store.get(
        services.workbenchState.$singleSelectDialog,
      );
      expect(dialog).toBeDefined();
      expect(dialog?.dialogId).toBe('dialog::delete-ws-path-dialog');

      dialog?.onSelect({ id: 'test-ws:test.md', title: 'test.md' });
      const alertDialog = testEnv.store.get(
        services.workbenchState.$alertDialog,
      );
      expect(alertDialog).toBeDefined();
      expect(alertDialog?.dialogId).toBe('dialog::alert');

      alertDialog?.onContinue?.();

      await vi.waitFor(() => {
        expect(
          getCommandResults()
            .filter((result) => result.type === 'success')
            .map((result) => result.command.id),
        ).toContain('command::ws:delete-ws-path');
      });
    });
  });

  describe('command::ui:rename-note-dialog', () => {
    it('should open the rename note dialog and dispatch command::ws:rename-ws-path on new name', async () => {
      const { dispatch, testEnv, services, getCommandResults } =
        await setupTest({
          targetId: 'command::ui:rename-note-dialog',
          workspaces: [{ name: 'test-ws', notes: ['test-ws:test.md'] }],
        });

      dispatch('command::ui:rename-note-dialog', {
        wsPath: 'test-ws:test.md',
      });
      const dialog = testEnv.store.get(
        services.workbenchState.$singleInputDialog,
      );
      expect(dialog).toBeDefined();
      expect(dialog?.dialogId).toBe('dialog::rename-note-dialog');

      dialog?.onSelect('New Name');

      await vi.waitFor(() => {
        expect(
          getCommandResults()
            .filter((result) => result.type === 'success')
            .map((result) => result.command.id),
        ).toContain('command::ws:rename-ws-path');
      });
    });
  });

  describe('command::ui:move-note-dialog', () => {
    it('should open the move note dialog and dispatch command::ws:move-ws-path on selection', async () => {
      const { dispatch, testEnv, services, getCommandResults } =
        await setupTest({
          targetId: 'command::ui:move-note-dialog',
          workspaces: [
            {
              name: 'test-ws',
              notes: ['test-ws:test.md', 'test-ws:dir/test2.md'],
            },
          ],
        });

      dispatch('command::ui:move-note-dialog', {
        wsPath: 'test-ws:test.md',
      });
      const dialog = testEnv.store.get(
        services.workbenchState.$singleSelectDialog,
      );
      expect(dialog).toBeDefined();
      expect(dialog?.dialogId).toBe('dialog::move-note-dialog');

      dialog?.onSelect({ id: 'dir', title: 'dir' });

      await vi.waitFor(() => {
        expect(
          getCommandResults()
            .filter((result) => result.type === 'success')
            .map((result) => result.command.id),
        ).toContain('command::ws:move-ws-path');
      });
    });
  });

  describe('command::ui:create-directory-dialog', () => {
    it('should open the new directory dialog and dispatch command::ws:create-directory on name entry', async () => {
      const { dispatch, testEnv, services, getCommandResults } =
        await setupTest({
          targetId: 'command::ui:create-directory-dialog',
          workspaces: [{ name: 'test-ws' }],
        });

      dispatch('command::ui:create-directory-dialog', null);
      const dialog = testEnv.store.get(
        services.workbenchState.$singleInputDialog,
      );
      expect(dialog).toBeDefined();
      expect(dialog?.dialogId).toBe('dialog::new-directory-dialog');

      dialog?.onSelect('My Directory');

      await vi.waitFor(() => {
        expect(
          getCommandResults()
            .filter((result) => result.type === 'success')
            .map((result) => result.command.id),
        ).toContain('command::ws:create-directory');
      });
    });
  });

  describe('command::ui:create-workspace-dialog', () => {
    it('should open the new workspace dialog', async () => {
      const { dispatch, testEnv, services } = await setupTest({
        targetId: 'command::ui:create-workspace-dialog',
      });
      dispatch('command::ui:create-workspace-dialog', null);
      expect(testEnv.store.get(services.workbenchState.$openWsDialog)).toBe(
        true,
      );
    });
  });

  describe('command::ui:switch-workspace', () => {
    it('should navigate to the selected workspace', async () => {
      const { dispatch, testEnv, services } = await setupTest({
        targetId: 'command::ui:switch-workspace',
        workspaces: [{ name: 'test-ws' }, { name: 'ws2' }],
      });

      expect(services.navigation.resolveAtoms().wsName).toBe('ws2');

      dispatch('command::ui:switch-workspace', null);
      const dialog = testEnv.store.get(
        services.workbenchState.$singleSelectDialog,
      );
      expect(dialog).toBeDefined();
      expect(dialog?.dialogId).toBe('dialog::switch-workspace-dialog');
      dialog?.onSelect({ id: 'test-ws', title: 'test-ws' });
      expect(services.navigation.resolveAtoms().wsName).toBe('test-ws');
    });
  });

  describe('command::ui:delete-workspace-dialog', () => {
    it('should open the delete workspace dialog, confirm, and dispatch ws:delete-workspace', async () => {
      const { dispatch, testEnv, services, getCommandResults } =
        await setupTest({
          targetId: 'command::ui:delete-workspace-dialog',
          workspaces: [{ name: 'test-ws' }, { name: 'ws2' }],
        });

      vi.spyOn(window, 'confirm').mockImplementation(() => true);

      dispatch('command::ui:delete-workspace-dialog', null);
      const dialog = testEnv.store.get(
        services.workbenchState.$singleSelectDialog,
      );
      expect(dialog).toBeDefined();
      expect(dialog?.dialogId).toBe('dialog::delete-workspace-dialog');

      dialog?.onSelect({ id: 'ws2', title: 'ws2' });
      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete the workspace "ws2"? This action cannot be undone.',
      );

      await vi.waitFor(() => {
        expect(
          getCommandResults()
            .filter((result) => result.type === 'success')
            .map((result) => result.command.id),
        ).toContain('command::ws:delete-workspace');
      });
    });
  });

  describe('command::ui:native-fs-auth', () => {
    it('should navigate to the workspace if permission is granted', async () => {
      const { dispatch, services, testEnv } = await setupTest({
        targetId: 'command::ui:native-fs-auth',
        workspaces: [{ name: 'test-ws' }],
        autoNavigate: false,
      });

      vi.spyOn(services.workspaceOps, 'getWorkspaceMetadata').mockResolvedValue(
        {
          rootDirHandle: {
            requestPermission: vi.fn().mockResolvedValue('granted'),
          },
        } as any,
      );

      dispatch('command::ui:native-fs-auth', { wsName: 'test-ws' });

      await vi.waitFor(() => {
        const alertDialog = testEnv.store.get(
          services.workbenchState.$alertDialog,
        );
        expect(alertDialog).toBeDefined();
        expect(alertDialog?.dialogId).toBe(
          'dialog::workspace:native-fs-auth-needed',
        );

        alertDialog?.onContinue();
      });
      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().wsName).toBe('test-ws');
      });
    });
  });

  describe('command::ui:toggle-all-files', () => {
    it('should toggle all files view and prefill search input', async () => {
      const { dispatch, testEnv, services } = await setupTest({
        targetId: 'command::ui:toggle-all-files',
      });
      expect(testEnv.store.get(services.workbenchState.$openAllFiles)).toBe(
        false,
      );
      dispatch('command::ui:toggle-all-files', { prefillInput: undefined });
      expect(testEnv.store.get(services.workbenchState.$openAllFiles)).toBe(
        true,
      );

      dispatch('command::ui:toggle-all-files', { prefillInput: 'test' });
      expect(
        testEnv.store.get(services.workbenchState.$allFilesSearchInput),
      ).toBe('test');
    });
  });

  describe('command::ui:toggle-wide-editor', () => {
    it('should toggle wide editor', async () => {
      const { dispatch, testEnv, services } = await setupTest({
        targetId: 'command::ui:toggle-wide-editor',
        workspaces: [{ name: 'test-ws', notes: ['test-ws:test.md'] }],
        autoNavigate: 'ws-path',
      });
      expect(testEnv.store.get(services.workbenchState.$wideEditor)).toBe(true);
      dispatch('command::ui:toggle-wide-editor', null);
      expect(testEnv.store.get(services.workbenchState.$wideEditor)).toBe(
        false,
      );
    });
  });
});
