import { getNewStore, nsmApi2, ui, workspace } from '@bangle.io/api';
import {
  CHANGELOG_MODAL_NAME,
  CORE_OPERATIONS_CLOSE_EDITOR,
  CORE_OPERATIONS_CLOSE_MINI_EDITOR,
  CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
  CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
  CORE_OPERATIONS_CREATE_PRIVATE_FS_WORKSPACE,
  CORE_OPERATIONS_NEW_NOTE,
  CORE_OPERATIONS_NEW_WORKSPACE,
  CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
  CORE_OPERATIONS_OPEN_IN_MINI_EDITOR,
  CORE_OPERATIONS_REMOVE_ACTIVE_WORKSPACE,
  CORE_OPERATIONS_SERVICE_WORKER_DISMISS_UPDATE,
  CORE_OPERATIONS_SERVICE_WORKER_RELOAD,
  CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT,
  GENERIC_ERROR_MODAL_NAME,
  NEW_BROWSER_WORKSPACE_DIALOG_NAME,
  NEW_NATIVE_FS_WORKSPACE_DIALOG_NAME,
  NEW_NOTE_DIALOG_NAME,
  NEW_PRIVATE_FS_WORKSPACE_DIALOG_NAME,
  NEW_WORKSPACE_DIALOG_NAME,
  RELOAD_APPLICATION_DIALOG_NAME,
  RENAME_NOTE_DIALOG_NAME,
  SEVERITY,
  WorkspaceType,
} from '@bangle.io/constants';
import type { ApplicationStore, AppState } from '@bangle.io/create-store';
import { Extension } from '@bangle.io/extension-registry';
import { nsmEditorManagerSlice } from '@bangle.io/slice-editor-manager';
import { toggleTheme } from '@bangle.io/slice-ui';

import {
  CORE_OPERATIONS_DELETE_ACTIVE_NOTE,
  CORE_OPERATIONS_DOWNLOAD_WORKSPACE_COPY,
  CORE_OPERATIONS_NEW_WORKSPACE_FROM_BACKUP,
  CORE_OPERATIONS_RENAME_ACTIVE_NOTE,
  CORE_OPERATIONS_TOGGLE_NOTE_SIDEBAR,
  CORE_OPERATIONS_TOGGLE_UI_COLOR_SCHEME,
  extensionName,
} from './config';
import { ChangelogModal } from './dialogs/ChangelogModal';
import { GenericErrorModal } from './dialogs/GenericErrorModal';
import { NewBrowserWorkspaceDialog } from './dialogs/NewBrowserWorkspaceDialog';
import { NewNativeFsWorkspaceDialog } from './dialogs/NewNativeFsWorkspaceDialog';
import { NewPrivateFsWorkspaceDialog } from './dialogs/NewPrivateFsWorkspaceDialog';
import { NewWorkspaceModal } from './dialogs/NewWorkspaceModal';
import {
  NewNoteInputModal,
  RenameNoteInputModal,
} from './dialogs/NoteNameChangeDialog';
import { ReloadApplicationDialog } from './dialogs/ReloadApplicationDialog';
import {
  deleteActiveNote,
  downloadWorkspace,
  openNewNoteDialog,
  openNewWorkspaceDialog,
  removeWorkspace,
  renameActiveNote,
  restoreWorkspaceFromBackup,
} from './operations';

const extension = Extension.create({
  name: extensionName,
  application: {
    dialogs: [
      {
        name: CHANGELOG_MODAL_NAME,
        ReactComponent: ChangelogModal,
      },
      {
        name: NEW_NOTE_DIALOG_NAME,
        ReactComponent: NewNoteInputModal,
      },
      {
        name: RENAME_NOTE_DIALOG_NAME,
        ReactComponent: RenameNoteInputModal,
      },
      {
        name: NEW_WORKSPACE_DIALOG_NAME,
        ReactComponent: NewWorkspaceModal,
      },
      {
        name: NEW_NATIVE_FS_WORKSPACE_DIALOG_NAME,
        ReactComponent: NewNativeFsWorkspaceDialog,
      },
      {
        name: NEW_BROWSER_WORKSPACE_DIALOG_NAME,
        ReactComponent: NewBrowserWorkspaceDialog,
      },
      {
        name: NEW_PRIVATE_FS_WORKSPACE_DIALOG_NAME,
        ReactComponent: NewPrivateFsWorkspaceDialog,
      },
      {
        name: RELOAD_APPLICATION_DIALOG_NAME,
        ReactComponent: ReloadApplicationDialog,
      },
      {
        name: GENERIC_ERROR_MODAL_NAME,
        ReactComponent: GenericErrorModal,
      },
    ],
    operations: [
      {
        name: CORE_OPERATIONS_CLOSE_EDITOR,
        title: 'Close all open editor/s',
        keywords: ['dismiss', 'hide'],
      },
      {
        name: CORE_OPERATIONS_DELETE_ACTIVE_NOTE,
        title: 'Delete active note',
        keywords: ['remove'],
      },
      {
        name: CORE_OPERATIONS_NEW_NOTE,
        title: 'New note',
        keywords: ['create'],
      },
      {
        name: CORE_OPERATIONS_NEW_WORKSPACE,
        title: 'New workspace',
        keywords: ['create'],
      },
      {
        name: CORE_OPERATIONS_REMOVE_ACTIVE_WORKSPACE,
        title: 'Remove active workspace',
        keywords: ['delete'],
      },
      { name: CORE_OPERATIONS_RENAME_ACTIVE_NOTE, title: 'Rename active note' },
      {
        name: CORE_OPERATIONS_TOGGLE_NOTE_SIDEBAR,
        title: 'Show/Hide Note Widget Sidebar',
        keywords: ['hide', 'outline', 'toc', 'backlink', 'right sidebar'],
      },
      {
        name: CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT,
        title: 'Show/Hide editor split screen',
        keybinding: 'Mod-\\',
        keywords: ['hide'],
      },
      {
        name: CORE_OPERATIONS_OPEN_IN_MINI_EDITOR,
        title: 'Open in mini editor',
        keywords: ['preview'],
      },
      {
        name: CORE_OPERATIONS_CLOSE_MINI_EDITOR,
        title: 'Close mini editor',
        keywords: ['hide'],
      },
      {
        name: CORE_OPERATIONS_TOGGLE_UI_COLOR_SCHEME,
        title: 'Switch Light/Dark theme',
        keywords: ['darkmode', 'lightmode', 'color'],
      },
      {
        name: CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
        title: 'Create native fs workspace',
        hidden: true,
      },
      {
        name: CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
        title: 'Create browser workspace',
        hidden: true,
      },
      {
        name: CORE_OPERATIONS_CREATE_PRIVATE_FS_WORKSPACE,
        title: 'Create private fs workspace',
        hidden: true,
      },
      {
        name: CORE_OPERATIONS_SERVICE_WORKER_RELOAD,
        title: 'Reload page in response to a service worker update',
        hidden: true,
      },
      {
        name: CORE_OPERATIONS_SERVICE_WORKER_DISMISS_UPDATE,
        title: 'Dismiss prompt from service worker to update',
        hidden: true,
      },
      {
        name: CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
        title: 'Report an issue on Github',
        hidden: true,
      },
      {
        name: CORE_OPERATIONS_DOWNLOAD_WORKSPACE_COPY,
        title: 'Download a backup copy of workspace',
      },
      {
        name: CORE_OPERATIONS_NEW_WORKSPACE_FROM_BACKUP,
        title: 'Restore this workspace from a backup file',
      },
      {
        name: 'operation::@bangle.io/core-extension:focus-primary-editor',
        title: 'Editor: Focus on primary editor',
      },
      {
        name: 'operation::@bangle.io/core-extension:focus-secondary-editor',
        title: 'Editor: Focus on secondary editor',
      },
      {
        name: 'operation::@bangle.io/core-extension:toggle-editing-mode',
        title: 'Editor: Toggle editing mode',
      },
      {
        name: 'operation::@bangle.io/core-extension:reload-application',
        title: 'Reload application',
      },
      {
        name: 'operation::@bangle.io/core-extension:show-changelog',
        title: 'Show Changelog',
        keywords: ['update', 'what is new'],
      },
    ],
    operationHandler() {
      return {
        handle(operation, payload: unknown, bangleStore) {
          const nsmStore = getNewStore(bangleStore);
          switch (operation.name) {
            case CORE_OPERATIONS_NEW_NOTE: {
              // TODO fix payload as any
              const { path } = (payload as any) || {};

              let _path = typeof path === 'string' ? path : undefined;

              openNewNoteDialog(_path)(bangleStore.state, bangleStore.dispatch);

              return true;
            }

            case CORE_OPERATIONS_NEW_WORKSPACE: {
              openNewWorkspaceDialog()(bangleStore.state, bangleStore.dispatch);

              return true;
            }

            case CORE_OPERATIONS_RENAME_ACTIVE_NOTE: {
              renameActiveNote(bangleStore);

              return true;
            }

            case CORE_OPERATIONS_TOGGLE_NOTE_SIDEBAR: {
              nsmApi2.ui.toggleNoteSidebar();

              return true;
            }

            case CORE_OPERATIONS_DELETE_ACTIVE_NOTE: {
              deleteActiveNote(nsmStore);

              return true;
            }

            case CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT: {
              const { openedWsPaths } = nsmApi2.workspace.workspaceState();

              if (openedWsPaths.secondaryWsPath) {
                nsmApi2.workspace.pushOpenedWsPath((openedWsPath) =>
                  openedWsPath.updateSecondaryWsPath(undefined),
                );
              } else if (openedWsPaths.primaryWsPath) {
                nsmApi2.workspace.pushOpenedWsPath((openedWsPath) =>
                  openedWsPath.updateSecondaryWsPath(
                    openedWsPaths.primaryWsPath,
                  ),
                );
              }

              return true;
            }

            case CORE_OPERATIONS_OPEN_IN_MINI_EDITOR: {
              const targetWsPath = nsmApi2.editor.getFocusedWsPath();

              if (targetWsPath) {
                nsmApi2.workspace.pushOpenedWsPath((openedWsPath) =>
                  openedWsPath.updateMiniEditorWsPath(targetWsPath),
                );
              }

              return true;
            }
            case CORE_OPERATIONS_CLOSE_MINI_EDITOR: {
              nsmApi2.workspace.pushOpenedWsPath((openedWsPath) =>
                openedWsPath.updateMiniEditorWsPath(undefined),
              );

              return true;
            }

            case CORE_OPERATIONS_CLOSE_EDITOR: {
              if (typeof payload === 'number') {
                nsmApi2.workspace.closeEditor(payload);

                return true;
              } else {
                nsmApi2.workspace.closeEditor();

                return true;
              }
            }

            case CORE_OPERATIONS_DOWNLOAD_WORKSPACE_COPY: {
              downloadWorkspace()(bangleStore.state, bangleStore.dispatch);

              return true;
            }

            case CORE_OPERATIONS_NEW_WORKSPACE_FROM_BACKUP: {
              restoreWorkspaceFromBackup()(
                bangleStore.state,
                bangleStore.dispatch,
                bangleStore,
              );

              return true;
            }

            case CORE_OPERATIONS_REMOVE_ACTIVE_WORKSPACE: {
              const targetWsName =
                typeof payload === 'string' ? payload : undefined;

              removeWorkspace(targetWsName)(
                bangleStore.state,
                bangleStore.dispatch,
                bangleStore,
              );

              return true;
            }
            case 'operation::@bangle.io/core-extension:focus-primary-editor': {
              nsmEditorManagerSlice
                .resolveState(nsmStore.state)
                .primaryEditor?.focusView();

              return true;
            }

            case 'operation::@bangle.io/core-extension:focus-secondary-editor': {
              nsmEditorManagerSlice
                .resolveState(nsmStore.state)
                .secondaryEditor?.focusView();

              return true;
            }

            case CORE_OPERATIONS_TOGGLE_UI_COLOR_SCHEME: {
              toggleTheme()(bangleStore.state, bangleStore.dispatch);

              return true;
            }

            case CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE: {
              // TODO fix payload as any
              const { wsName } = (payload as any) || {};

              createBrowserWorkspace(wsName)(
                bangleStore.state,
                bangleStore.dispatch,
                bangleStore,
              );

              return true;
            }

            case CORE_OPERATIONS_CREATE_PRIVATE_FS_WORKSPACE: {
              // TODO fix payload as any
              const { wsName } = (payload as any) || {};

              console.debug('Creating private fs workspace', wsName);

              createPrivateFsWorkspace(wsName)(
                bangleStore.state,
                bangleStore.dispatch,
                bangleStore,
              );

              return true;
            }

            case CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE: {
              // TODO fix payload as any
              const { rootDirHandle } = (payload as any) || {};
              createNativeFsWorkspace(rootDirHandle)(
                bangleStore.state,
                bangleStore.dispatch,
                bangleStore,
              );

              return true;
            }

            case CORE_OPERATIONS_OPEN_GITHUB_ISSUE: {
              window.open(`https://github.com/bangle-io/bangle-io/issues/new`);

              return true;
            }

            case 'operation::@bangle.io/core-extension:toggle-editing-mode': {
              nsmApi2.editor.toggleEditing();
              let { editingAllowed } = nsmEditorManagerSlice.getState(
                nsmStore.state,
              );

              nsmApi2.ui.showNotification({
                severity: editingAllowed ? SEVERITY.INFO : SEVERITY.WARNING,
                uid: 'editing-mode' + editingAllowed + Date.now(),
                title: 'Editing mode is now ' + (editingAllowed ? 'on' : 'off'),
              });

              return true;
            }

            case 'operation::@bangle.io/core-extension:reload-application': {
              ui.showDialog(RELOAD_APPLICATION_DIALOG_NAME)(
                bangleStore.state,
                bangleStore.dispatch,
              );

              return true;
            }
            case 'operation::@bangle.io/core-extension:show-changelog': {
              ui.showDialog(CHANGELOG_MODAL_NAME)(
                bangleStore.state,
                bangleStore.dispatch,
              );

              return true;
            }

            default: {
              return false;
            }
          }
        },
      };
    },
  },
});

export * from './operations';
export default extension;

function createNativeFsWorkspace(rootDirHandle: any) {
  return async (
    state: AppState,
    dispatch: ApplicationStore['dispatch'],
    store: ApplicationStore,
  ) => {
    if (typeof rootDirHandle?.name === 'string') {
      try {
        await workspace.createWorkspace(
          rootDirHandle.name,
          WorkspaceType.NativeFS,
          {
            rootDirHandle,
          },
        )(state, dispatch, store);

        (window as any).fathom?.trackGoal('K3NFTGWX', 0);
      } catch (error: any) {
        nsmApi2.ui.showNotification({
          severity: SEVERITY.ERROR,
          uid: 'error-create-workspace-' + rootDirHandle?.name,
          title: 'Unable to create workspace ' + rootDirHandle?.name,
          content: error.displayMessage || error.message,
        });

        throw error;
      }
    } else {
      throw new Error(
        'Incorrect parameters for ' +
          CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
      );
    }

    return true;
  };
}

function createBrowserWorkspace(wsName: string) {
  return async (
    state: AppState,
    dispatch: ApplicationStore['dispatch'],
    store: ApplicationStore,
  ) => {
    if (typeof wsName !== 'string') {
      throw new Error(
        'Incorrect parameters for ' + CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
      );
    }

    try {
      await workspace.createWorkspace(wsName, WorkspaceType.Browser, {})(
        state,
        dispatch,
        store,
      );
      (window as any).fathom?.trackGoal('AISLCLRF', 0);
    } catch (error: any) {
      nsmApi2.ui.showNotification({
        severity: SEVERITY.ERROR,
        uid: 'error-create-workspace-' + wsName,
        title: 'Unable to create workspace ' + wsName,
        content: error.displayMessage || error.message,
      });
      throw error;
    }

    return true;
  };
}

function createPrivateFsWorkspace(wsName: string) {
  return async (
    state: AppState,
    dispatch: ApplicationStore['dispatch'],
    store: ApplicationStore,
  ) => {
    if (typeof wsName !== 'string') {
      throw new Error(
        'Incorrect parameters for ' +
          CORE_OPERATIONS_CREATE_PRIVATE_FS_WORKSPACE,
      );
    }

    try {
      await workspace.createWorkspace(wsName, WorkspaceType.PrivateFS, {})(
        state,
        dispatch,
        store,
      );
      (window as any).fathom?.trackGoal('KWXITXAK', 0);
    } catch (error: any) {
      nsmApi2.ui.showNotification({
        severity: SEVERITY.ERROR,
        uid: 'error-create-workspace-' + wsName,
        title: 'Unable to create workspace ' + wsName,
        content: error.displayMessage || error.message,
      });
      throw error;
    }

    return true;
  };
}
