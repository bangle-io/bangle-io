import { AppState } from '@bangle.io/create-store';

import {
  UI_CONTEXT_TOGGLE_THEME,
  UiContextDispatchType,
  uiSliceKey,
} from './ui-slice';

export function toggleTheme() {
  return (state: AppState, dispatch: UiContextDispatchType) => {
    dispatch({
      name: UI_CONTEXT_TOGGLE_THEME,
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
      name: 'action::@bangle.io/ui-context:CHANGE_SIDEBAR',
      value: {
        type: currentSidebar === sidebar ? null : sidebar,
      },
    });
  };
}
