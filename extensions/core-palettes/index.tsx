import React from 'react';

import { isFirefox } from '@bangle.io/config';
import { Extension } from '@bangle.io/extension-registry';
import {
  AlbumIcon,
  FileDocumentIcon,
  TerminalIcon,
} from '@bangle.io/ui-components';

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
        name: 'action::bangle-io-core-palettes:TOGGLE_ACTION_PALETTE',
        title: 'Action Palette',
        hidden: true,
        keybinding: isFirefox ? 'Mod-o' : 'Mod-P',
      },
      {
        name: 'action::bangle-io-core-palettes:TOGGLE_WORKSPACE_PALETTE',
        title: 'Workspace Palette',
        hidden: true,
        keybinding: 'Ctrl-r',
      },
      {
        name: 'action::bangle-io-core-palettes:TOGGLE_NOTES_PALETTE',
        title: 'Notes Palette',
        hidden: true,
        keybinding: 'Mod-p',
      },
    ],
    ReactComponent: ActionHandler,
  },
});

export default extension;
