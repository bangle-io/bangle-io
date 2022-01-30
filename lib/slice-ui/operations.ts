import { AppState } from '@bangle.io/create-store';
import { BaseError } from '@bangle.io/utils';

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
      name: 'action::@bangle.io/slice-ui:CHANGE_SIDEBAR',
      value: {
        type: currentSidebar === sidebar ? null : sidebar,
      },
    });
  };
}

export function uncaughtExceptionNotification(error: Error) {
  return uiSliceKey.op((_, disptach) => {
    let content: string = '';
    if (error instanceof BaseError && error.displayMessage) {
      content = error.displayMessage;
    } else {
      content = error.message;
    }
    disptach({
      name: 'action::@bangle.io/slice-ui:SHOW_NOTIFICATION',
      value: {
        uid: `uncaughtExceptionNotification-` + error.name,
        content: `${content}

Stack Trace:
${error.stack}`,
      },
    });
  });
}
