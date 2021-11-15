import {
  CORE_ACTIONS_CLONE_WORKSPACE,
  CORE_ACTIONS_CLOSE_EDITOR,
  CORE_ACTIONS_CREATE_BROWSER_WORKSPACE,
  CORE_ACTIONS_CREATE_NATIVE_FS_WORKSPACE,
  CORE_ACTIONS_DELETE_ACTIVE_NOTE,
  CORE_ACTIONS_NEW_NOTE,
  CORE_ACTIONS_NEW_WORKSPACE,
  CORE_ACTIONS_RENAME_ACTIVE_NOTE,
  CORE_ACTIONS_TOGGLE_EDITOR_SPLIT,
  CORE_ACTIONS_TOGGLE_FILE_SIDEBAR,
  CORE_ACTIONS_TOGGLE_THEME,
} from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';

import { extensionName } from './config';
import { CoreActionsHandler } from './CoreActionsHandler';

const extension = Extension.create({
  name: extensionName,
  application: {
    actions: [
      { name: CORE_ACTIONS_CLONE_WORKSPACE, title: 'Clone current workspace' },
      { name: CORE_ACTIONS_CLOSE_EDITOR, title: 'Close editor/s' },
      { name: CORE_ACTIONS_DELETE_ACTIVE_NOTE, title: 'Delete active note' },
      { name: CORE_ACTIONS_NEW_NOTE, title: 'New note' },
      { name: CORE_ACTIONS_NEW_WORKSPACE, title: 'New workspace' },
      { name: CORE_ACTIONS_RENAME_ACTIVE_NOTE, title: 'Rename active note' },
      {
        name: CORE_ACTIONS_TOGGLE_EDITOR_SPLIT,
        title: 'Toggle editor split screen',
        keybinding: 'Mod-\\',
      },
      { name: CORE_ACTIONS_TOGGLE_FILE_SIDEBAR, title: 'Toggle file sidebar' },
      { name: CORE_ACTIONS_TOGGLE_THEME, title: 'Toggle theme' },
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
    ],
    ReactComponent: CoreActionsHandler,
  },
});

export default extension;
