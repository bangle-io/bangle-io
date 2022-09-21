import type { CorePalette } from '@bangle.io/constants';
import type { AppState, ExtractActionValue } from '@bangle.io/create-store';

import type { UiContextAction, UiContextDispatchType } from './ui-slice';
import { UI_CONTEXT_TOGGLE_THEME, uiSliceKey } from './ui-slice';

export function updatePalette(
  value: ExtractActionValue<
    UiContextAction,
    'action::@bangle.io/slice-ui:UPDATE_PALETTE'
  >,
) {
  return uiSliceKey.op((state, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/slice-ui:UPDATE_PALETTE',
      value,
    });
  });
}

export function toggleTheme() {
  return (state: AppState, dispatch: UiContextDispatchType) => {
    dispatch({
      name: UI_CONTEXT_TOGGLE_THEME,
      value: {},
    });
  };
}

export function setSidebar(sidebar: string | null) {
  return (state: AppState, dispatch: UiContextDispatchType) => {
    dispatch({
      name: 'action::@bangle.io/slice-ui:CHANGE_SIDEBAR',
      value: {
        type: sidebar,
      },
    });
  };
}

export function changeSidebar(sidebar: string | null) {
  return (state: AppState, dispatch: UiContextDispatchType) => {
    const { sidebar: currentSidebar } = uiSliceKey.getSliceState(state) || {};

    if (sidebar == null && currentSidebar == null) {
      return;
    }

    dispatch({
      name: 'action::@bangle.io/slice-ui:CHANGE_SIDEBAR',
      value: {
        type: currentSidebar === sidebar ? null : sidebar,
      },
    });
  };
}

export function togglePaletteType(type: CorePalette | undefined) {
  return (_: AppState, dispatch: UiContextDispatchType) => {
    dispatch({
      name: 'action::@bangle.io/slice-ui:TOGGLE_PALETTE',
      value: {
        type: type || null,
      },
    });
  };
}

export function showDialog(
  dialogName: string,
  metadata?: undefined | { [key: string]: any },
) {
  return uiSliceKey.op((_, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/slice-ui:SHOW_DIALOG',
      value: {
        dialogName,
        metadata,
      },
    });
  });
}

export function dismissDialog(dialogName?: string) {
  return uiSliceKey.op((_, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/slice-ui:DISMISS_DIALOG',
      value: {
        dialogName,
      },
    });
  });
}
