import { Extension } from '@bangle.io/extension-registry';

import {
  CLONE_WORKSPACE_ACTION,
  CLOSE_EDITOR_ACTION,
  DELETE_ACTIVE_NOTE_ACTION,
  extensionName,
  NEW_NOTE_ACTION,
  NEW_WORKSPACE_ACTION,
  RENAME_ACTIVE_NOTE_ACTION,
  TOGGLE_EDITOR_SPLIT_ACTION,
  TOGGLE_FILE_SIDEBAR_ACTION,
  TOGGLE_THEME_ACTION,
} from './config';
import { CoreActionsHandler } from './CoreActionsHandler';

const extension = Extension.create({
  name: extensionName,
  application: {
    actions: [
      { name: CLONE_WORKSPACE_ACTION, title: 'Clone current workspace' },
      { name: CLOSE_EDITOR_ACTION, title: 'Close editor/s' },
      { name: DELETE_ACTIVE_NOTE_ACTION, title: 'Delete active note' },
      { name: NEW_NOTE_ACTION, title: 'New note' },
      { name: NEW_WORKSPACE_ACTION, title: 'New workspace' },
      { name: RENAME_ACTIVE_NOTE_ACTION, title: 'Rename active note' },
      {
        name: TOGGLE_EDITOR_SPLIT_ACTION,
        title: 'Toggle editor split screen',
        keybinding: 'Mod-\\',
      },
      { name: TOGGLE_FILE_SIDEBAR_ACTION, title: 'Toggle file sidebar' },
      { name: TOGGLE_THEME_ACTION, title: 'Toggle theme' },
    ],
    ReactComponent: CoreActionsHandler,
  },
});

export default extension;
