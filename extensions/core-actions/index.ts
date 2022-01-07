import {
  CORE_ACTIONS_CREATE_BROWSER_WORKSPACE,
  CORE_ACTIONS_CREATE_NATIVE_FS_WORKSPACE,
  CORE_ACTIONS_SERVICE_WORKER_DISMISS_UPDATE,
  CORE_ACTIONS_SERVICE_WORKER_RELOAD,
} from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import { UI_CONTEXT_TOGGLE_THEME } from '@bangle.io/ui-context';

import {
  CORE_ACTIONS_CLOSE_EDITOR,
  CORE_ACTIONS_DELETE_ACTIVE_NOTE,
  CORE_ACTIONS_DOWNLOAD_WORKSPACE_COPY,
  CORE_ACTIONS_NEW_NOTE,
  CORE_ACTIONS_NEW_WORKSPACE,
  CORE_ACTIONS_NEW_WORKSPACE_FROM_BACKUP,
  CORE_ACTIONS_RENAME_ACTIVE_NOTE,
  CORE_ACTIONS_TOGGLE_EDITOR_SPLIT,
  CORE_ACTIONS_TOGGLE_NOTE_SIDEBAR,
  extensionName,
} from './config';
import { CoreActionsHandler } from './CoreActionsHandler';

const extension = Extension.create({
  name: extensionName,
  application: {
    actions: [
      { name: CORE_ACTIONS_CLOSE_EDITOR, title: 'Close all open editor/s' },
      { name: CORE_ACTIONS_DELETE_ACTIVE_NOTE, title: 'Delete active note' },
      { name: CORE_ACTIONS_NEW_NOTE, title: 'New note' },
      { name: CORE_ACTIONS_NEW_WORKSPACE, title: 'New workspace' },
      { name: CORE_ACTIONS_RENAME_ACTIVE_NOTE, title: 'Rename active note' },
      { name: CORE_ACTIONS_TOGGLE_NOTE_SIDEBAR, title: 'Toggle Note sidebar' },
      {
        name: CORE_ACTIONS_TOGGLE_EDITOR_SPLIT,
        title: 'Toggle editor split screen',
        keybinding: 'Mod-\\',
      },
      { name: UI_CONTEXT_TOGGLE_THEME, title: 'Toggle theme' },
      {
        name: CORE_ACTIONS_CREATE_NATIVE_FS_WORKSPACE,
        title: 'Create native fs workspace',
        hidden: true,
      },
      {
        name: CORE_ACTIONS_CREATE_BROWSER_WORKSPACE,
        title: 'Create browser workspace',
        hidden: true,
      },
      {
        name: CORE_ACTIONS_SERVICE_WORKER_RELOAD,
        title: 'Reload page in response to a service worker update',
        hidden: true,
      },
      {
        name: CORE_ACTIONS_SERVICE_WORKER_DISMISS_UPDATE,
        title: 'Dismiss prompt from service worker to update',
        hidden: true,
      },
      {
        name: CORE_ACTIONS_DOWNLOAD_WORKSPACE_COPY,
        title: 'Download a backup copy of workspace',
      },
      {
        name: CORE_ACTIONS_NEW_WORKSPACE_FROM_BACKUP,
        title: 'Restore this workspace from a backup file',
      },
      {
        name: 'action::bangle-io-core-actions:focus-primary-editor',
        title: 'Editor: Focus on primary editor',
      },
      {
        name: 'action::bangle-io-core-actions:focus-secondary-editor',
        title: 'Editor: Focus on secondary editor',
      },
      {
        name: 'action::editor-manager-context:on-focus-update',
        title: 'Editor: Record focus change',
        hidden: true,
      },
      {
        name: 'action::editor-manager-context:update-scroll-position',
        title: 'Editor: update the editors scroll position',
        hidden: true,
      },
      {
        name: 'action::editor-manager-context:update-initial-selection-json',
        title:
          'Editor: save the selection to be used to put back the cursor on reload',
        hidden: true,
      },
      {
        name: 'action::editor-manager-context:set-editor',
        title: 'Sets the editor instance in the store on editor load',
        hidden: true,
      },
      {
        name: 'action::workspace-context:update-location',
        title: "Update the store's browser history location ",
        hidden: true,
      },
      {
        name: 'action::page-slice:history-set-history',
        title: 'Save the history object in the slice state',
        hidden: true,
      },
    ],
    ReactComponent: CoreActionsHandler,
  },
});

export default extension;
