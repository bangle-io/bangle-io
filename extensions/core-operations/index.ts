import {
  CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
  CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
  CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
  CORE_OPERATIONS_SERVICE_WORKER_DISMISS_UPDATE,
  CORE_OPERATIONS_SERVICE_WORKER_RELOAD,
} from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import {
  closeEditor,
  createBrowserWorkspace,
  createNativeFsWorkpsace,
  deleteActiveNote,
  newNote,
  newWorkspace,
  removeWorkspace,
  renameActiveNote,
  splitEditor,
} from '@bangle.io/shared-operations';
import {
  focusEditor,
  isEditingAllowed,
  toggleEditing,
} from '@bangle.io/slice-editor-manager';
import { showNotification } from '@bangle.io/slice-notification';
import { toggleTheme } from '@bangle.io/slice-ui';

import {
  CORE_OPERATIONS_CLOSE_EDITOR,
  CORE_OPERATIONS_DELETE_ACTIVE_NOTE,
  CORE_OPERATIONS_DOWNLOAD_WORKSPACE_COPY,
  CORE_OPERATIONS_NEW_NOTE,
  CORE_OPERATIONS_NEW_WORKSPACE,
  CORE_OPERATIONS_NEW_WORKSPACE_FROM_BACKUP,
  CORE_OPERATIONS_REMOVE_ACTIVE_WORKSPACE,
  CORE_OPERATIONS_RENAME_ACTIVE_NOTE,
  CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT,
  CORE_OPERATIONS_TOGGLE_NOTE_SIDEBAR,
  CORE_OPERATIONS_TOGGLE_UI_THEME,
  extensionName,
} from './config';
import { CoreActionsHandler } from './CoreActionsHandler';
import { downloadWorkspace, restoreWorkspaceFromBackup } from './operations';

const extension = Extension.create({
  name: extensionName,
  application: {
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
        title: 'Toggle Note sidebar',
        keywords: ['hide'],
      },
      {
        name: CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT,
        title: 'Toggle editor split screen',
        keybinding: 'Mod-\\',
        keywords: ['hide'],
      },
      { name: CORE_OPERATIONS_TOGGLE_UI_THEME, title: 'Toggle theme' },
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
        name: 'operation::@bangle.io/core-operations:focus-primary-editor',
        title: 'Editor: Focus on primary editor',
      },
      {
        name: 'operation::@bangle.io/core-operations:focus-secondary-editor',
        title: 'Editor: Focus on secondary editor',
      },
      {
        name: 'operation::@bangle.io/core-operations:toggle-editing-mode',
        title: 'Editor: Toggle editing mode',
      },
    ],
    ReactComponent: CoreActionsHandler,

    operationHandler() {
      return {
        handle(operation, payload, bangleStore) {
          switch (operation.name) {
            case CORE_OPERATIONS_NEW_NOTE: {
              newNote()(bangleStore.state, bangleStore.dispatch);
              return true;
            }

            case CORE_OPERATIONS_NEW_WORKSPACE: {
              newWorkspace()(bangleStore.state, bangleStore.dispatch);
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

            case CORE_OPERATIONS_CLOSE_EDITOR: {
              const editorId = payload;
              closeEditor(editorId)(bangleStore.state, bangleStore.dispatch);
              return true;
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
              removeWorkspace()(
                bangleStore.state,
                bangleStore.dispatch,
                bangleStore,
              );
              return true;
            }
            case 'operation::@bangle.io/core-operations:focus-primary-editor': {
              focusEditor(0)(bangleStore.state);
              return true;
            }

            case 'operation::@bangle.io/core-operations:focus-secondary-editor': {
              focusEditor(1)(bangleStore.state);
              return true;
            }

            case CORE_OPERATIONS_TOGGLE_UI_THEME: {
              toggleTheme()(bangleStore.state, bangleStore.dispatch);
              return true;
            }

            case CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE: {
              const { wsName } = payload || {};

              createBrowserWorkspace(wsName)(
                bangleStore.state,
                bangleStore.dispatch,
                bangleStore,
              );
              return true;
            }

            case CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE: {
              const { rootDirHandle } = payload || {};
              createNativeFsWorkpsace(rootDirHandle)(
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

            case 'operation::@bangle.io/core-operations:toggle-editing-mode': {
              toggleEditing()(bangleStore.state, bangleStore.dispatch);
              let isEditing = isEditingAllowed()(bangleStore.state);
              showNotification({
                severity: isEditing ? 'info' : 'warning',
                uid: 'editing-mode' + isEditing + Date.now(),
                title: 'Editing mode is now ' + (isEditing ? 'on' : 'off'),
              })(bangleStore.state, bangleStore.dispatch);
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

export default extension;
