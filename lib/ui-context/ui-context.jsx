import { applyTheme } from './apply-theme';
import React, {
  useContext,
  useReducer,
  createContext,
  useMemo,
  useEffect,
} from 'react';
import { useWindowSize, checkWidescreen } from 'utils/index';

const LOG = false;
let log = LOG ? console.log.bind(console, 'UIManager') : () => {};
const persistKey = 'UIManager0.724';

export class UIState {
  /**
   *
   * @param {*} obj
   * @param {*} restore if true restore any value from localStorage
   */
  constructor(obj, restore) {
    this.dispatch = undefined;

    if (restore) {
      obj = Object.assign(obj, retrievePersistedState());
    }

    this.sidebar = obj.sidebar;
    this.widescreen = obj.widescreen;
    this.paletteType = obj.paletteType;
    this.paletteInitialQuery = obj.paletteInitialQuery;
    this.paletteMetadata = obj.paletteMetadata;
    this.theme = obj.theme;
    this.notifications = obj.notifications;

    persistState({ sidebar: this.sidebar, theme: this.theme });

    if (
      obj.theme === 'dark' ||
      (!this.theme &&
        window?.matchMedia?.('(prefers-color-scheme: dark)').matches)
    ) {
      this.theme = 'dark';
    } else {
      this.theme = 'light';
    }
  }

  // NOTE this is not used but sits here as a demonstration
  // on how to do derived fields
  // Derived field
  get hideEditorArea() {
    if (this.widescreen) {
      return false;
    }

    return Boolean(this.paletteType || this.sidebar);
  }
}

const initialState = {
  // UI
  sidebar: null,
  widescreen: checkWidescreen(),
  paletteType: undefined,
  paletteInitialQuery: undefined,
  paletteMetadata: undefined,
  theme: null,
  notifications: [],
};

const initialContextUIState = {};
initialContextUIState.dispatch = () => {};

export const UIManagerContext = createContext(initialContextUIState);

export function useUIManagerContext() {
  return useContext(UIManagerContext);
}

function setRootWidescreenClass(widescreen) {
  const root = document.getElementById('root');
  if (widescreen) {
    root?.classList.add('widescreen');
  } else {
    root?.classList.remove('widescreen');
  }
}

export function UIManager({ children }) {
  const windowSize = useWindowSize();

  const [state, dispatch] = useReducer(
    (state, action) => new UIState(reducer(state, action)),
    new UIState(initialState, true),
    (store) => {
      applyTheme(store.theme);
      setRootWidescreenClass(store.widescreen);
      return store;
    },
  );

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
const reducer = (state, action) => {
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
      const { uid, content, buttons, severity = 'info' } = action.value;
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
        paletteType: null,
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

    default:
      throw new Error(`Unrecognized action "${action.type}"`);
  }
};

function persistState(obj) {
  localStorage.setItem(persistKey, JSON.stringify(obj));
}

function retrievePersistedState() {
  try {
    const item = localStorage.getItem(persistKey);
    return JSON.parse(item);
  } catch (error) {
    console.error(error);
    return {};
  }
}
