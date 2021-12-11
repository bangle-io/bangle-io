import React, { createContext, useContext, useMemo, useState } from 'react';

import { ApplicationStore, AppState, Slice } from '@bangle.io/create-store';
import {
  safeCancelIdleCallback,
  safeRequestIdleCallback,
} from '@bangle.io/utils';

import {
  _UIStateObj,
  initialState,
  UiContextAction,
  uiSlice,
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
  const [counter, updateCounter] = useState(0);

  const [store] = useState(() => {
    let state = AppState.create({
      slices: [
        uiSlice(),
        new Slice({
          sideEffect() {
            return {
              deferredUpdate() {
                updateCounter((r) => r + 1);
              },
            };
          },
        }),
      ],
    });
    return new ApplicationStore(
      state,
      (store, action) => {
        let newState = store.state.applyAction(action);
        store.updateState(newState);
      },
      (cb) => {
        let id = safeRequestIdleCallback(cb);
        return () => {
          safeCancelIdleCallback(id);
        };
      },
    );
  });

  const value = useMemo(() => {
    log(counter);
    const state = uiSliceKey.getSliceState(store.state) || initialState;
    return {
      ...state,
      dispatch: store.dispatch,
    };
  }, [store, counter]);

  return (
    <UIManagerContext.Provider value={value}>
      {children}
    </UIManagerContext.Provider>
  );
}
