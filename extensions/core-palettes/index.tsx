import type { CorePalette } from '@bangle.io/constants';
import {
  CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  CORE_PALETTES_TOGGLE_OPERATION_PALETTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';
import type { AppState } from '@bangle.io/create-store';
import { Extension } from '@bangle.io/extension-registry';
import { uiSliceKey } from '@bangle.io/slice-ui';
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
      const getType = (state: AppState, type: CorePalette) => {
        const uiState = uiSliceKey.getSliceState(state);

        return uiState?.paletteType === type ? null : type;
      };

      return {
        handle(operation, _, bangleStore) {
          switch (operation.name) {
            case CORE_PALETTES_TOGGLE_OPERATION_PALETTE: {
              bangleStore.dispatch({
                name: 'action::@bangle.io/slice-ui:UPDATE_PALETTE',
                value: {
                  type: getType(bangleStore.state, operationPalette.type),
                },
              });

              return true;
            }

            case CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE: {
              bangleStore.dispatch({
                name: 'action::@bangle.io/slice-ui:UPDATE_PALETTE',
                value: {
                  type: getType(bangleStore.state, workspacePalette.type),
                },
              });

              return true;
            }

            case CORE_PALETTES_TOGGLE_NOTES_PALETTE: {
              bangleStore.dispatch({
                name: 'action::@bangle.io/slice-ui:UPDATE_PALETTE',
                value: {
                  type: getType(bangleStore.state, notesPalette.type),
                },
              });

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
