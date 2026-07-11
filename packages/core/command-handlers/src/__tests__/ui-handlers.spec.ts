// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import {
  EDITOR_ENGINE_QUERY_PARAM,
  type EditorEngineId,
  SETTINGS_PAGE_DEFINITIONS,
} from '@bangle.io/constants';
import { describe, expect, it, vi } from 'vitest';
import { setupTest } from './test-utils';

type SetupResult = Awaited<ReturnType<typeof setupTest>>;

function countReloadEvents(testEnv: SetupResult['testEnv']) {
  let count = 0;
  testEnv.rootEmitter.on(
    'event::app:reload-ui',
    () => count++,
    testEnv.commonOpts.rootAbortSignal,
  );
  return () => count;
}

function selectEditorEngine(
  { services, testEnv }: Pick<SetupResult, 'services' | 'testEnv'>,
  engineId: EditorEngineId,
) {
  const dialog = testEnv.store.get(services.workbenchState.$singleSelectDialog);
  const option = dialog?.options.find((item) => item.id === engineId);
  if (!dialog || !option) {
    throw new Error(`Expected the "${engineId}" editor option`);
  }
  dialog.onSelect(option);
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
      const { dispatch, testEnv } = await setupTest({
        targetId: 'command::ui:reload-app',
      });
      const reloadCount = countReloadEvents(testEnv);

      dispatch('command::ui:reload-app', null);

      expect(reloadCount()).toBe(1);
    });
  });

  describe('command::ui:switch-editor-engine', () => {
    it('updates the URL and reloads the current page', async () => {
      const { dispatch, services, testEnv } = await setupTest({
        targetId: 'command::ui:switch-editor-engine',
      });
      const reloadSpy = vi
        .spyOn(window.history, 'go')
        .mockImplementation(() => {});
      window.history.replaceState(null, '', '/?debug=true#route=welcome');

      dispatch('command::ui:switch-editor-engine', null);
      selectEditorEngine({ services, testEnv }, 'wordgard');

      await vi.waitFor(() => {
        expect(reloadSpy).toHaveBeenCalledOnce();
      });
      expect(
        new URL(window.location.href).searchParams.get(
          EDITOR_ENGINE_QUERY_PARAM,
        ),
      ).toBe('wordgard');
      expect(new URL(window.location.href).searchParams.get('debug')).toBe(
        'true',
      );
      reloadSpy.mockRestore();
    });
  });

  describe('command::ui:open-settings', () => {
    it('should navigate to settings', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ui:open-settings',
      });

      dispatch('command::ui:open-settings', null);

      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().routeInfo).toEqual({
          route: 'settings-general',
          payload: {
            returnTo: services.navigation.toUri({
              route: 'welcome',
              payload: {},
            }),
          },
        });
      });
    });

    it.each(
      SETTINGS_PAGE_DEFINITIONS,
    )('should navigate to $id settings', async (settingsPage) => {
      const { dispatch, services } = await setupTest({
        targetId: settingsPage.commandId,
      });

      dispatch(settingsPage.commandId, null);

      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().routeInfo).toEqual({
          route: settingsPage.route,
          payload: {
            returnTo: services.navigation.toUri({
              route: 'welcome',
              payload: {},
            }),
          },
        });
      });
    });

    it('should preserve returnTo while navigating between settings pages', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ui:open-settings-general',
      });

      dispatch('command::ui:open-settings-general', null);

      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().routeInfo).toEqual({
          route: 'settings-general',
          payload: {
            returnTo: services.navigation.toUri({
              route: 'welcome',
              payload: {},
            }),
          },
        });
      });

      dispatch('command::ui:open-settings-workspaces', null);

      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().routeInfo).toEqual({
          route: 'settings-workspaces',
          payload: {
            returnTo: services.navigation.toUri({
              route: 'welcome',
              payload: {},
            }),
          },
        });
      });
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
      expect(dialog?.searchPlaceholder).toBe(
        t.app.dialogs.changeTheme.searchPlaceholder,
      );
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
      expect(dialog?.title).toBe(t.app.dialogs.createNote.title);
      expect(dialog?.inputLabel).toBe(t.app.dialogs.createNote.inputLabel);
      expect(dialog?.placeholder).toBe(t.app.dialogs.createNote.placeholder);
      expect(dialog?.submitText).toBe(t.app.dialogs.createNote.submitText);

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
    it('should open delete confirmation and dispatch ws:delete-ws-path on confirmation', async () => {
      const { dispatch, testEnv, services, getCommandResults } =
        await setupTest({
          targetId: 'command::ui:delete-note-dialog',
          workspaces: [{ name: 'test-ws', notes: ['test-ws:test.md'] }],
          autoNavigate: 'ws-path',
        });

      dispatch('command::ui:delete-note-dialog', {
        wsPath: 'test-ws:test.md',
      });
      expect(
        testEnv.store.get(services.workbenchState.$singleSelectDialog),
      ).toBeUndefined();
      const alertDialog = testEnv.store.get(
        services.workbenchState.$alertDialog,
      );
      expect(alertDialog).toBeDefined();
      expect(alertDialog?.dialogId).toBe('dialog::alert');
      expect(alertDialog?.title).toBe(t.app.dialogs.confirmDelete.title);
      expect(alertDialog?.description).toBe(
        t.app.dialogs.confirmDelete.description({ fileName: 'test' }),
      );

      alertDialog?.onContinue?.();

      await vi.waitFor(() => {
        expect(
          getCommandResults()
            .filter((result) => result.type === 'success')
            .map((result) => result.command.id),
        ).toContain('command::ws:delete-ws-path');
      });
    });

    it('should confirm deletion for the current note when no wsPath is provided', async () => {
      const { dispatch, testEnv, services } = await setupTest({
        targetId: 'command::ui:delete-note-dialog',
        workspaces: [{ name: 'test-ws', notes: ['test-ws:current.md'] }],
        autoNavigate: 'ws-path',
      });

      dispatch('command::ui:delete-note-dialog', {
        wsPath: undefined,
      });

      expect(
        testEnv.store.get(services.workbenchState.$singleSelectDialog),
      ).toBeUndefined();
      const alertDialog = testEnv.store.get(
        services.workbenchState.$alertDialog,
      );
      expect(alertDialog).toBeDefined();
      expect(alertDialog?.dialogId).toBe('dialog::alert');
      expect(alertDialog?.title).toBe(t.app.dialogs.confirmDelete.title);
      expect(alertDialog?.description).toBe(
        t.app.dialogs.confirmDelete.description({ fileName: 'current' }),
      );
    });
  });

  describe('command::ui:delete-files-dialog', () => {
    it('confirms selected file deletion and dispatches a batch delete', async () => {
      const { dispatch, testEnv, services, getCommandResults } =
        await setupTest({
          targetId: 'command::ui:delete-files-dialog',
          workspaces: [
            {
              name: 'test-ws',
              notes: ['test-ws:first.md', 'test-ws:second.md'],
            },
          ],
          autoNavigate: 'workspace',
        });

      dispatch('command::ui:delete-files-dialog', {
        wsPaths: ['test-ws:first.md', 'test-ws:second.md'],
      });

      const alertDialog = testEnv.store.get(
        services.workbenchState.$alertDialog,
      );
      expect(alertDialog).toBeDefined();
      expect(alertDialog?.dialogId).toBe('dialog::delete-files-alert');
      expect(alertDialog?.title).toBe(t.app.dialogs.confirmDeleteFiles.title);
      expect(alertDialog?.description).toContain('first.md');
      expect(alertDialog?.description).toContain('second.md');

      alertDialog?.onContinue?.();

      await vi.waitFor(() => {
        expect(
          getCommandResults()
            .filter((result) => result.type === 'success')
            .map((result) => result.command.id),
        ).toContain('command::ws:delete-ws-paths');
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
      expect(dialog?.title).toBe(t.app.dialogs.renameNote.title);
      expect(dialog?.inputLabel).toBe(t.app.dialogs.renameNote.inputLabel);
      expect(dialog?.placeholder).toBe(t.app.dialogs.renameNote.placeholder);
      expect(dialog?.description).toBe(
        t.app.dialogs.renameNote.description({
          fileNameWithoutExtension: 'test',
        }),
      );
      expect(dialog?.submitText).toBe(t.app.dialogs.renameNote.submitText);

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

  describe('command::ui:copy-workspace-path', () => {
    it('copies the workspace-local file path', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      const originalClipboard = Object.getOwnPropertyDescriptor(
        navigator,
        'clipboard',
      );
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });

      try {
        const { dispatch } = await setupTest({
          targetId: 'command::ui:copy-workspace-path',
        });

        dispatch('command::ui:copy-workspace-path', {
          wsPath: 'test-ws:docs/getting-started/codex-prerequisites.md',
        });

        await vi.waitFor(() => {
          expect(writeText).toHaveBeenCalledWith(
            'docs/getting-started/codex-prerequisites.md',
          );
        });
      } finally {
        if (originalClipboard) {
          Object.defineProperty(navigator, 'clipboard', originalClipboard);
        } else {
          delete (navigator as unknown as { clipboard?: Clipboard }).clipboard;
        }
      }
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
      expect(dialog?.searchPlaceholder).toBe(
        t.app.dialogs.moveNote.searchPlaceholder,
      );
      expect(dialog?.title).toBe(
        t.app.dialogs.moveNote.title({ fileNameWithoutExtension: 'test' }),
      );

      dialog?.onSelect({ id: 'dir/', title: 'dir/' });

      await vi.waitFor(() => {
        expect(
          getCommandResults()
            .filter((result) => result.type === 'success')
            .map((result) => result.command.id),
        ).toContain('command::ws:move-ws-path');
        expect(
          services.workspaceState
            .resolveAtoms()
            .wsPaths.map((path) => path.wsPath),
        ).toContain('test-ws:dir/test.md');
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

      dispatch('command::ui:create-directory-dialog', {
        pathPrefix: undefined,
      });
      const dialog = testEnv.store.get(
        services.workbenchState.$singleInputDialog,
      );
      expect(dialog).toBeDefined();
      expect(dialog?.dialogId).toBe('dialog::new-directory-dialog');
      expect(dialog?.title).toBe(t.app.dialogs.createDirectory.title);
      expect(dialog?.inputLabel).toBe(t.app.dialogs.createDirectory.inputLabel);
      expect(dialog?.placeholder).toBe(
        t.app.dialogs.createDirectory.placeholder,
      );
      expect(dialog?.submitText).toBe(t.app.dialogs.createDirectory.submitText);

      dialog?.onSelect('My Directory');

      await vi.waitFor(() => {
        expect(
          getCommandResults()
            .filter((result) => result.type === 'success')
            .map((result) => result.command.id),
        ).toContain('command::ws:create-directory');
      });
    });

    it('should create directories under an optional path prefix', async () => {
      const { dispatch, testEnv, services } = await setupTest({
        targetId: 'command::ui:create-directory-dialog',
        workspaces: [{ name: 'test-ws' }],
      });
      const createFileSpy = vi.spyOn(services.fileSystem, 'createFile');

      dispatch('command::ui:create-directory-dialog', {
        pathPrefix: 'parent',
      });
      const dialog = testEnv.store.get(
        services.workbenchState.$singleInputDialog,
      );

      dialog?.onSelect('Child Directory');

      await vi.waitFor(() => {
        expect(createFileSpy).toHaveBeenCalledWith(
          'test-ws:parent/Child Directory/untitled-1.md',
          expect.any(File),
        );
      });
    });

    it('should preserve dotted names as directory paths', async () => {
      const { dispatch, testEnv, services } = await setupTest({
        targetId: 'command::ui:create-directory-dialog',
        workspaces: [{ name: 'test-ws' }],
      });
      const createFileSpy = vi.spyOn(services.fileSystem, 'createFile');

      dispatch('command::ui:create-directory-dialog', {
        pathPrefix: undefined,
      });
      const dialog = testEnv.store.get(
        services.workbenchState.$singleInputDialog,
      );

      dialog?.onSelect('v1.0');

      await vi.waitFor(() => {
        expect(createFileSpy).toHaveBeenCalledWith(
          'test-ws:v1.0/untitled-1.md',
          expect.any(File),
        );
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
      expect(dialog?.searchPlaceholder).toBe(
        t.app.dialogs.switchWorkspace.searchPlaceholder,
      );
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

      dispatch('command::ui:delete-workspace-dialog', null);
      const dialog = testEnv.store.get(
        services.workbenchState.$singleSelectDialog,
      );
      expect(dialog).toBeDefined();
      expect(dialog?.dialogId).toBe('dialog::delete-workspace-dialog');
      expect(dialog?.searchPlaceholder).toBe(
        t.app.dialogs.deleteWorkspace.searchPlaceholder,
      );

      dialog?.onSelect({ id: 'ws2', title: 'ws2' });

      const alertDialog = testEnv.store.get(
        services.workbenchState.$alertDialog,
      );
      expect(alertDialog).toBeDefined();
      expect(alertDialog?.dialogId).toBe('dialog::alert-delete-workspace');
      expect(alertDialog?.title).toBe(
        t.app.dialogs.confirmDeleteWorkspace.title,
      );
      expect(alertDialog?.description).toBe(
        t.app.dialogs.confirmDeleteWorkspace.description({ wsName: 'ws2' }),
      );

      alertDialog?.onContinue();

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
        expect(alertDialog?.title).toBe(t.app.dialogs.nativeFsAuth.title);
        expect(alertDialog?.description).toBe(
          t.app.dialogs.nativeFsAuth.descriptionInitial({ wsName: 'test-ws' }),
        );
        expect(alertDialog?.continueText).toBe(
          t.app.dialogs.nativeFsAuth.continueTextInitial,
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
