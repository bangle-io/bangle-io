import React from 'react';

import { isFirefox, isMac } from '@bangle.io/config';
import {
  CORE_PALETTES_TOGGLE_ACTION_PALETTE,
  CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';

import { ActionHandler } from './ActionHandler';
import { extensionName } from './config';

const extension = Extension.create({
  name: extensionName,
  application: {
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
