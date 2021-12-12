import React, { createContext, useContext, useMemo } from 'react';

import { useSliceState } from '@bangle.io/app-state-context';
import type { JsonValue } from '@bangle.io/shared-types';

import {
  initialState,
  UiContextAction,
  uiSliceKey,
  UISliceState,
} from './ui-slice';

const LOG = false;
let log = LOG ? console.log.bind(console, 'UIManager') : () => {};

export type UIStateObj = UISliceState & {
  dispatch: (action: UiContextAction & JsonValue) => void;
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
    UISliceState,
    UiContextAction
  >(uiSliceKey, initialState);

  const value = useMemo(() => {
    return {
      ...(uiState || initialState),
      dispatch: store.dispatch,
    };
  }, [store, uiState]);

  return (
    <UIManagerContext.Provider value={value}>
      {children}
    </UIManagerContext.Provider>
  );
}
