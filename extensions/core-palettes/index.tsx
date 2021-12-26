import React from 'react';

import { isFirefox, isMac } from '@bangle.io/config';
import {
  CORE_PALETTES_TOGGLE_ACTION_PALETTE,
  CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';

import { ActionHandler } from './ActionHandler';
import { actionPalette } from './ActionPalette';
import { extensionName } from './config';
import { headingPalette } from './HeadingPalette';
import { notesPalette } from './NotesPalette';
import { questionPalette } from './QuestionPalette';
import { workspacePalette } from './WorkspacePalette';

const extension = Extension.create({
  name: extensionName,
  application: {
    palettes: [
      headingPalette,
      workspacePalette,
      questionPalette,
      actionPalette,
      // // should always be the last palette
      // // TODO: add constraints to make sure it always is
      notesPalette,
    ],
    actions: [
      {
        name: CORE_PALETTES_TOGGLE_ACTION_PALETTE,
        title: 'Action Palette',
        hidden: true,
        keybinding: isFirefox ? 'Mod-o' : 'Mod-P',
      },
      {
        name: CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
        title: 'Switch Workspace',
        hidden: false,
        keybinding: isMac ? 'Ctrl-r' : 'Ctrl-h',
      },
      {
        name: CORE_PALETTES_TOGGLE_NOTES_PALETTE,
        title: 'Open a Note',
        hidden: false,
        keybinding: 'Mod-p',
      },
    ],
    ReactComponent: ActionHandler,
  },
});

export default extension;
