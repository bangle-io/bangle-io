import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

import { checkWidescreen, useWindowSize } from '@bangle.io/utils';

import { applyTheme, ThemeType } from './apply-theme';

const LOG = false;
let log = LOG ? console.log.bind(console, 'UIManager') : () => {};
const persistKey = 'UIManager0.724';

interface NotificationType {
  uid: string;
  content: string;
  buttons: any[];
  severity?: string;
}

interface UIStateObj {
  changelogHasUpdates: boolean;
  dispatch: Function;
  modal: string | undefined;
  notifications: NotificationType[];
  paletteInitialQuery: string | undefined;
  paletteMetadata: any | undefined;
  paletteType: string | undefined;
  sidebar: string | undefined;
  theme: ThemeType;
  widescreen: boolean;
}
function getThemePreference() {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window?.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

const initialState: UIStateObj = {
  // UI
  sidebar: undefined,
  widescreen: checkWidescreen(),
  paletteType: undefined,
  paletteInitialQuery: undefined,
  paletteMetadata: undefined,
  theme: getThemePreference(),
  notifications: [],
  dispatch: () => {},
  modal: undefined,
  changelogHasUpdates: false,
};

export const UIManagerContext = createContext(initialState);

export function useUIManagerContext() {
  return useContext(UIManagerContext);
}

function setRootWidescreenClass(widescreen) {
  const root = document.getElementById('root');
  const body = document.body;
  if (widescreen) {
    root?.classList.add('widescreen');
    body?.classList.add('widescreen');
  } else {
    root?.classList.remove('widescreen');
    body?.classList.remove('widescreen');
  }
}

export function UIManager({ children }) {
  const windowSize = useWindowSize();

  const [state, dispatch] = useReducer(
    (state, action) => reducer(state, action),
    initialState,
    (store) => {
      store = Object.assign({}, store, retrievePersistedState());

      applyTheme(store.theme);
      setRootWidescreenClass(store.widescreen);
      return store;
    },
  );

  useEffect(() => {
    persistState({ sidebar: state.sidebar, theme: state.theme });
  }, [state]);

  // Does not give semantic guarantee, but we are fine
  const value = useMemo(() => {
    state.dispatch = dispatch;
    return state;
  }, [state]);

  useEffect(() => {
    dispatch({
      type: 'UI/UPDATE_WINDOW_SIZE',
      value: {
        windowSize,
      },
    });
  }, [windowSize]);

  log(value);
  return (
    <UIManagerContext.Provider value={value}>
      {children}
    </UIManagerContext.Provider>
  );
}

/**
 *
 * @param {UIState} state
 * @param {*} action
 */
const reducer = (
  state: UIStateObj,
  action: { type: string; value: any },
): UIStateObj => {
  log('Received', action.type, { action });
  switch (action.type) {
    case 'UI/TOGGLE_SIDEBAR': {
      const sidebar = Boolean(state.sidebar) ? null : action.value.type;
      return {
        ...state,
        sidebar,
      };
    }

    case 'UI/CHANGE_SIDEBAR': {
      return {
        ...state,
        sidebar: action.value.type,
      };
    }

    case 'UI/SHOW_NOTIFICATION': {
      const {
        uid,
        content,
        buttons,
        severity = 'info',
      } = action.value as NotificationType;
      if (!['error', 'warning', 'info', 'success'].includes(severity)) {
        throw new Error('Unknown severity value: ' + severity);
      }
      if (!content) {
        throw new Error('Must provide content for notification');
      }
      // Prevent repeat firing of notifications
      if (state.notifications.find((n) => n.uid === uid)) {
        return state;
      }

      return {
        ...state,
        notifications: [
          ...state.notifications,
          { uid, content, buttons, severity },
        ],
      };
    }

    case 'UI/DISMISS_NOTIFICATION': {
      const { uid } = action.value;
      if (state.notifications.some((n) => n.uid === uid)) {
        return {
          ...state,
          notifications: state.notifications.filter((n) => n.uid !== uid),
        };
      }

      return state;
    }

    case 'UI/UPDATE_PALETTE': {
      return {
        ...state,
        paletteType: action.value.type,
        paletteInitialQuery: action.value.initialQuery,
        paletteMetadata: action.value.metadata,
      };
    }

    case 'UI/RESET_PALETTE': {
      return {
        ...state,
        paletteType: undefined,
        paletteInitialQuery: '',
        paletteMetadata: {},
      };
    }

    case 'UI/TOGGLE_THEME': {
      const theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      return {
        ...state,
        theme,
      };
    }

    case 'UI/UPDATE_THEME': {
      applyTheme(action.value.theme);
      return {
        ...state,
        theme: action.value.theme,
      };
    }

    case 'UI/UPDATE_WINDOW_SIZE': {
      const { windowSize } = action.value;
      const widescreen = checkWidescreen(windowSize.width);
      setRootWidescreenClass(widescreen);
      return {
        ...state,
        widescreen,
      };
    }

    case 'UI/SHOW_MODAL': {
      return {
        ...state,
        modal: action.value.modal,
      };
    }

    case 'UI/DISMISS_MODAL': {
      return {
        ...state,
        modal: undefined,
      };
    }

    case 'UI/UPDATE_NEW_CHANGELOG': {
      return {
        ...state,
        changelogHasUpdates: action.value,
      };
    }

    default:
      throw new Error(`Unrecognized action "${action.type}"`);
  }
};

function persistState(obj: Partial<UIStateObj>) {
  localStorage.setItem(persistKey, JSON.stringify(obj));
}

function retrievePersistedState(): Partial<UIStateObj> {
  try {
    const item = localStorage.getItem(persistKey);
    if (typeof item === 'string') {
      return JSON.parse(item);
    }
  } catch (error) {
    console.error(error);
  }
  return {};
}
