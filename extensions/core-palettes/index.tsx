import { nsmApi2 } from '@bangle.io/api';
import type { CorePalette } from '@bangle.io/constants';
import {
  CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  CORE_PALETTES_TOGGLE_OPERATION_PALETTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import { isFirefox, isMac } from '@bangle.io/utils';

import { extensionName } from './config';
import { notesPalette } from './NotesPalette';
import { operationPalette } from './OperationPalette';
import { PaletteManager } from './PaletteManager';
import { workspacePalette } from './WorkspacePalette';

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

    operationHandler() {
      const getType = (type: CorePalette) => {
        const uiState = nsmApi2.ui.uiState();

        return uiState?.paletteType === type ? undefined : type;
      };

      return {
        handle(operation) {
          switch (operation.name) {
            case CORE_PALETTES_TOGGLE_OPERATION_PALETTE: {
              nsmApi2.ui.updatePalette(getType(operationPalette.type));

              return true;
            }

            case CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE: {
              nsmApi2.ui.updatePalette(getType(workspacePalette.type));

              return true;
            }

            case CORE_PALETTES_TOGGLE_NOTES_PALETTE: {
              nsmApi2.ui.updatePalette(getType(notesPalette.type));

              return true;
            }
            default: {
              return undefined;
            }
          }
        },
      };
    },
  },
});

export default extension;
