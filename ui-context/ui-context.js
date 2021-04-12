import React, { useReducer, createContext, useMemo, useEffect } from 'react';
import { useWindowSize, checkWidescreen } from 'utils/index';
import { applyTheme } from 'style/index';

const LOG = false;
let log = LOG ? console.log.bind(console, 'UIManager') : () => {};
const DEFAULT_PALETTE = 'file';

export const UIManagerContext = createContext();

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
    new UIState(
      {
        // UI
        sidebar: null,
        widescreen: checkWidescreen(windowSize.width),
        paletteType: undefined,
        paletteInitialQuery: undefined,
        paletteMetadata: undefined,
        theme: null,
      },
      true,
    ),
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

    case 'UI/CHANGE_PALETTE_TYPE': {
      return {
        ...state,
        paletteType: action.value.type,
        paletteInitialQuery: action.value.initialQuery,
        paletteMetadata: action.value.metadata,
      };
    }

    case 'UI/TOGGLE_PALETTE': {
      return {
        ...state,
        paletteInitialQuery: undefined,
        paletteMetadata: undefined,
        paletteType: state.paletteType
          ? undefined
          : action.paletteType || DEFAULT_PALETTE,
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

class UIState {
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

  // Derived field
  get hideEditorArea() {
    if (this.widescreen) {
      return false;
    }

    return Boolean(this.paletteType || this.sidebar);
  }
}

const persistKey = 'UIManager0.724';

function persistState(obj) {
  window.localStorage.setItem(persistKey, JSON.stringify(obj));
}

function retrievePersistedState() {
  try {
    const item = window.localStorage.getItem(persistKey);
    return JSON.parse(item);
  } catch (error) {
    console.error(error);
    return {};
  }
}
