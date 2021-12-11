import React, { createContext, useContext, useMemo } from 'react';

import { useSliceState } from '@bangle.io/app-state-context';

import {
  _UIStateObj,
  initialState,
  UiContextAction,
  uiSliceKey,
} from './ui-slice';

const LOG = false;
let log = LOG ? console.log.bind(console, 'UIManager') : () => {};

export type UIStateObj = _UIStateObj & {
  dispatch: (action: UiContextAction) => void;
};

export const UIManagerContext = createContext<UIStateObj>({
  ...initialState,
  dispatch: () => {},
});

export function useUIManagerContext() {
  return useContext(UIManagerContext);
}

export function UIManager({ children }) {
  const { sliceState: uiState, store } = useSliceState<
    _UIStateObj,
    UiContextAction
  >(uiSliceKey, initialState);

  const value = useMemo(() => {
    return {
      ...uiState,
      dispatch: store.dispatch,
    };
  }, [store, uiState]);

  return (
    <UIManagerContext.Provider value={value}>
      {children}
    </UIManagerContext.Provider>
  );
}
