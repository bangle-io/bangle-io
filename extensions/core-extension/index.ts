import { ui, workspace } from '@bangle.io/api';
import {
  CHANGELOG_MODAL_NAME,
  CORE_OPERATIONS_CLOSE_EDITOR,
  CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
  CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
  CORE_OPERATIONS_NEW_NOTE,
  CORE_OPERATIONS_NEW_WORKSPACE,
  CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
  CORE_OPERATIONS_OPEN_IN_MINI_EDITOR,
  CORE_OPERATIONS_REMOVE_ACTIVE_WORKSPACE,
  CORE_OPERATIONS_SERVICE_WORKER_DISMISS_UPDATE,
  CORE_OPERATIONS_SERVICE_WORKER_RELOAD,
  CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT,
  NEW_NOTE_DIALOG_NAME,
  NEW_WORKSPACE_DIALOG_NAME,
  RELOAD_APPLICATION_DIALOG_NAME,
  RENAME_NOTE_DIALOG_NAME,
  WorkspaceTypeBrowser,
  WorkspaceTypeNative,
} from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import { Extension } from '@bangle.io/extension-registry';
import type { WorkspaceSliceAction } from '@bangle.io/shared-types';
import {
  focusPrimaryEditor,
  focusSecondaryEditor,
  isEditingAllowed,
  toggleEditing,
} from '@bangle.io/slice-editor-manager';
import {
  notificationSliceKey,
  showNotification,
} from '@bangle.io/slice-notification';
import { toggleTheme, UiContextAction } from '@bangle.io/slice-ui';

import {
  CORE_OPERATIONS_DELETE_ACTIVE_NOTE,
  CORE_OPERATIONS_DOWNLOAD_WORKSPACE_COPY,
  CORE_OPERATIONS_NEW_WORKSPACE_FROM_BACKUP,
  CORE_OPERATIONS_RENAME_ACTIVE_NOTE,
  CORE_OPERATIONS_TOGGLE_NOTE_SIDEBAR,
  CORE_OPERATIONS_TOGGLE_UI_THEME,
  extensionName,
} from './config';
import { ChangelogModal } from './dialogs/ChangelogModal';
import { NewWorkspaceModal } from './dialogs/new-workspace-modal';
import {
  NewNoteInputModal,
  RenameNoteInputModal,
} from './dialogs/NoteNameChangeDialog';
import { ReloadApplicationDialog } from './dialogs/ReloadApplicationDialog';
import {
  closeEditor,
  deleteActiveNote,
  downloadWorkspace,
  openMiniEditor,
  openNewNoteDialog,
  openNewWorkspaceDialog,
  removeWorkspace,
  renameActiveNote,
  restoreWorkspaceFromBackup,
  splitEditor,
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
        name: RELOAD_APPLICATION_DIALOG_NAME,
        ReactComponent: ReloadApplicationDialog,
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
        title: 'Editor: Open in mini editor',
        keywords: ['preview'],
      },
      {
        name: CORE_OPERATIONS_TOGGLE_UI_THEME,
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
              renameActiveNote()(bangleStore.state, bangleStore.dispatch);

              return true;
            }

            case CORE_OPERATIONS_TOGGLE_NOTE_SIDEBAR: {
              bangleStore.dispatch({
                name: 'action::@bangle.io/slice-ui:TOGGLE_NOTE_SIDEBAR',
              });

              return true;
            }

            case CORE_OPERATIONS_DELETE_ACTIVE_NOTE: {
              deleteActiveNote()(
                bangleStore.state,
                bangleStore.dispatch,
                bangleStore,
              );

              return true;
            }

            case CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT: {
              splitEditor()(bangleStore.state, bangleStore.dispatch);

              return true;
            }

            case CORE_OPERATIONS_OPEN_IN_MINI_EDITOR: {
              openMiniEditor()(bangleStore.state, bangleStore.dispatch);

              return true;
            }

            case CORE_OPERATIONS_CLOSE_EDITOR: {
              if (typeof payload === 'number') {
                closeEditor(payload)(bangleStore.state, bangleStore.dispatch);

                return true;
              }

              return false;
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
              focusPrimaryEditor()(bangleStore.state);

              return true;
            }

            case 'operation::@bangle.io/core-extension:focus-secondary-editor': {
              focusSecondaryEditor()(bangleStore.state);

              return true;
            }

            case CORE_OPERATIONS_TOGGLE_UI_THEME: {
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
              toggleEditing()(bangleStore.state, bangleStore.dispatch);
              let isEditing = isEditingAllowed()(bangleStore.state);
              showNotification({
                severity: isEditing ? 'info' : 'warning',
                uid: 'editing-mode' + isEditing + Date.now(),
                title: 'Editing mode is now ' + (isEditing ? 'on' : 'off'),
              })(bangleStore.state, bangleStore.dispatch);

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
    dispatch: ApplicationStore<
      any,
      WorkspaceSliceAction | UiContextAction
    >['dispatch'],
    store: ApplicationStore,
  ) => {
    if (typeof rootDirHandle?.name === 'string') {
      try {
        await workspace.createWorkspace(
          rootDirHandle.name,
          WorkspaceTypeNative,
          {
            rootDirHandle,
          },
        )(state, dispatch, store);

        (window as any).fathom?.trackGoal('K3NFTGWX', 0);
      } catch (error: any) {
        showNotification({
          severity: 'error',
          uid: 'error-create-workspace-' + rootDirHandle?.name,
          title: 'Unable to create workspace ' + rootDirHandle?.name,
          content: error.displayMessage || error.message,
        })(
          notificationSliceKey.getState(store.state),
          notificationSliceKey.getDispatch(store.dispatch),
        );

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
    dispatch: ApplicationStore<
      any,
      WorkspaceSliceAction | UiContextAction
    >['dispatch'],
    store: ApplicationStore,
  ) => {
    if (typeof wsName !== 'string') {
      throw new Error(
        'Incorrect parameters for ' + CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
      );
    }

    try {
      await workspace.createWorkspace(wsName, WorkspaceTypeBrowser, {})(
        state,
        dispatch,
        store,
      );
      (window as any).fathom?.trackGoal('AISLCLRF', 0);
    } catch (error: any) {
      showNotification({
        severity: 'error',
        uid: 'error-create-workspace-' + wsName,
        title: 'Unable to create workspace ' + wsName,
        content: error.displayMessage || error.message,
      })(
        notificationSliceKey.getState(state),
        notificationSliceKey.getDispatch(dispatch),
      );
      throw error;
    }

    return true;
  };
}
