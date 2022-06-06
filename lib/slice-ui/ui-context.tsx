import React, { createContext, useContext, useMemo } from 'react';

import {
  initialBangleStore,
  useSliceState,
} from '@bangle.io/bangle-store-context';
import type { ApplicationStore } from '@bangle.io/create-store';

import type { UiContextAction, UISliceState } from './ui-slice';
import { initialState, uiSliceKey } from './ui-slice';

const LOG = false;
let log = LOG ? console.log.bind(console, 'UIManager') : () => {};

export type UIStateObj = UISliceState & {
  dispatch: ApplicationStore<UISliceState, UiContextAction>['dispatch'];
  bangleStore: ApplicationStore;
};

export const UIManagerContext = createContext<UIStateObj>({
  ...initialState,
  dispatch: () => {},
  bangleStore: initialBangleStore,
});

export function useUIManagerContext() {
  return useContext(UIManagerContext);
}

export function UIManager({ children }: { children: React.ReactNode }) {
  const { sliceState: uiState, store } = useSliceState<
    UISliceState,
    UiContextAction
  >(uiSliceKey);

  const value = useMemo(() => {
    return {
      ...(uiState || initialState),
      dispatch: store.dispatch,
      bangleStore: store,
    };
  }, [store, uiState]);

  return (
    <UIManagerContext.Provider value={value}>
      {children}
    </UIManagerContext.Provider>
  );
}
