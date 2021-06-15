import { Extension } from 'extension-helpers';
import { CoreActions } from './CoreActions';
import {
  extensionName,
  TOGGLE_FILE_SIDEBAR_ACTION,
  TOGGLE_THEME_ACTION,
  NEW_NOTE_ACTION,
  NEW_WORKSPACE_ACTION,
  RENAME_ACTIVE_NOTE_ACTION,
  DELETE_ACTIVE_NOTE_ACTION,
} from './config';

const extension = Extension.create({
  name: extensionName,
  ApplicationReactComponent: CoreActions,
  actions: [
    { name: TOGGLE_THEME_ACTION, title: 'Toggle theme' },
    { name: TOGGLE_FILE_SIDEBAR_ACTION, title: 'Toggle file sidebar' },
    { name: NEW_NOTE_ACTION, title: 'New note' },
    { name: NEW_WORKSPACE_ACTION, title: 'New workspace' },
    { name: RENAME_ACTIVE_NOTE_ACTION, title: 'Rename active note' },
    { name: DELETE_ACTIVE_NOTE_ACTION, title: 'Delete active note' },
  ],
});

export default extension;
