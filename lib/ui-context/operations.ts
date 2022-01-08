import { AppState } from '@bangle.io/create-store';

import { UI_CONTEXT_TOGGLE_THEME, UiContextDispatchType } from './ui-slice';

export function toggleTheme() {
  return (state: AppState, dispatch: UiContextDispatchType) => {
    dispatch({
      name: UI_CONTEXT_TOGGLE_THEME,
    });
  };
}
