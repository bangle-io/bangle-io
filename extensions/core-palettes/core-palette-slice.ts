import {
  CORE_PALETTES_TOGGLE_ACTION_PALETTE,
  CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
  CorePalette,
} from '@bangle.io/constants';
import { AppState, Slice } from '@bangle.io/create-store';
import { UiContextAction, uiSliceKey } from '@bangle.io/ui-context';

import { operationPalette } from './ActionPalette';
import { sliceKey } from './config';
import { notesPalette } from './NotesPalette';
import { workspacePalette } from './WorkspacePalette';

type ActionsHandled =
  | {
      name: typeof CORE_PALETTES_TOGGLE_ACTION_PALETTE;
    }
  | {
      name: typeof CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE;
    }
  | {
      name: typeof CORE_PALETTES_TOGGLE_NOTES_PALETTE;
    };

const getType = (state: AppState, type: CorePalette) => {
  const uiState = uiSliceKey.getSliceState(state);
  return uiState?.paletteType === type ? null : type;
};

export function corePaletteSlice() {
  return new Slice<undefined, ActionsHandled>({
    key: sliceKey,
    appendAction(actions, state): UiContextAction | undefined {
      for (const action of actions) {
        // TODO get core-palette state out of ui-context and manage
        // it inside this extension
        switch (action.name) {
          case CORE_PALETTES_TOGGLE_ACTION_PALETTE: {
            return {
              name: 'UI/UPDATE_PALETTE',
              value: {
                type: getType(state, operationPalette.type),
              },
            };
          }

          case CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE: {
            return {
              name: 'UI/UPDATE_PALETTE',
              value: {
                type: getType(state, workspacePalette.type),
              },
            };
          }

          case CORE_PALETTES_TOGGLE_NOTES_PALETTE: {
            return {
              name: 'UI/UPDATE_PALETTE',
              value: {
                type: getType(state, notesPalette.type),
              },
            };
          }
        }
      }

      return undefined;
    },
  });
}
