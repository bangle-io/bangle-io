import { isFirefox, isMac } from '@bangle.io/config';
import {
  CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  CORE_PALETTES_TOGGLE_OPERATION_PALETTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';

import { extensionName } from './config';
import { PaletteManager } from './PaletteManager';

const extension = Extension.create({
  name: extensionName,
  application: {
    operations: [
      {
        name: CORE_PALETTES_TOGGLE_OPERATION_PALETTE,
        title: 'Operation Palette',
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
    ReactComponent: PaletteManager,
  },
});

export default extension;
