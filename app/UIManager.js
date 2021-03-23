import React, { useReducer, createContext, useMemo } from 'react';
import { applyTheme } from './style/apply-theme';

const LOG = false;
let log = LOG ? console.log.bind(console, 'UIManager') : () => {};
const DEFAULT_PALETTE = 'file';

export const UIManagerContext = createContext();

export function UIManager({ children }) {
  const [state, dispatch] = useReducer(
    reducer,
    {
      // UI
      sidebar: false,
      paletteType: undefined,
      paletteInitialQuery: undefined,
      paletteMetadata: undefined,
      theme: localStorage.getItem('theme') || 'light',
    },
    (store) => {
      applyTheme(store.theme);
      return store;
    },
  );

  // Does not give semantic guarantee, but we are fine
  const value = useMemo(() => {
    return { ...state, dispatch };
  }, [state, dispatch]);

  return (
    <UIManagerContext.Provider value={value}>
      {children}
    </UIManagerContext.Provider>
  );
}

const reducer = (state, action) => {
  log('Received', action.type, { action });
  switch (action.type) {
    case 'UI/TOGGLE_SIDEBAR': {
      return {
        ...state,
        sidebar: !state.sidebar,
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
      localStorage.setItem('theme', theme);
      applyTheme(theme);
      return {
        ...state,
        theme,
      };
    }

    default:
      throw new Error(`Unrecognized action "${action.type}"`);
  }
};
