import { CorePalette } from '@bangle.io/constants';
import { AppState } from '@bangle.io/create-store';
import { UiContextDispatchType, uiSliceKey } from '@bangle.io/ui-context';

export function toggleCorePaletteType(type: CorePalette | null) {
  return (state: AppState, dispatch: UiContextDispatchType) => {
    const uiState = uiSliceKey.getSliceState(state);

    dispatch({
      name: 'action::@bangle.io/ui-context:UPDATE_PALETTE',
      value: {
        type: uiState?.paletteType === type ? null : type,
      },
    });
  };
}

export function toggleActionPalette() {
  return toggleCorePaletteType(CorePalette.Operation);
}

export function toggleWorkspacePalette() {
  return toggleCorePaletteType(CorePalette.Workspace);
}

export function toggleNotesPalette() {
  return toggleCorePaletteType(CorePalette.Notes);
}
