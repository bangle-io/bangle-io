import React from 'react';
import { Extension } from 'extension-registry';
import { notesPalette } from './NotesPalette';
import { extensionName } from './config';
import { workspacePalette } from './WorkspacePalette';
import { headingPalette } from './HeadingPalette';
import { questionPalette } from './QuestionPalette';
import { actionPalette } from './ActionPalette';
import { AlbumIcon, FileDocumentIcon, TerminalIcon } from 'ui-components';
import { isFirefox } from 'config/index';
import { ActionHandler } from './ActionHandler';

const extension = Extension.create({
  name: extensionName,
  application: {
    palettes: [
      headingPalette,
      workspacePalette,
      questionPalette,
      actionPalette,
      // should always be the last palette
      // TODO: add constraints to make sure it always is
      notesPalette,
    ],
    actions: [
      {
        name: '@action/core-palettes/TOGGLE_ACTION_PALETTE',
        title: 'Action Palette',
        hidden: true,
        keybinding: isFirefox ? 'Mod-o' : 'Mod-P',
      },
      {
        name: '@action/core-palettes/TOGGLE_WORKSPACE_PALETTE',
        title: 'Workspace Palette',
        hidden: true,
        keybinding: 'Ctrl-r',
      },
      {
        name: '@action/core-palettes/TOGGLE_NOTES_PALETTE',
        title: 'Notes Palette',
        hidden: true,
        keybinding: 'Mod-p',
      },
    ],
    optionsBar: [
      {
        icon: <TerminalIcon style={{ transform: 'scale(0.83, 0.83)' }} />,
        hint: 'Action Palette',
        action: '@action/core-palettes/TOGGLE_ACTION_PALETTE',
      },
      {
        icon: <AlbumIcon style={{ transform: 'scale(0.9, 0.9)' }} />,
        hint: 'Workspace Palette',
        action: '@action/core-palettes/TOGGLE_WORKSPACE_PALETTE',
      },
      {
        icon: <FileDocumentIcon style={{ transform: 'scale(0.88, 0.88)' }} />,
        hint: 'Notes Palette',
        action: '@action/core-palettes/TOGGLE_NOTES_PALETTE',
      },
    ],
    ReactComponent: ActionHandler,
  },
});

export default extension;
