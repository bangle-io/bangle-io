import { createContext, useMemo } from 'react';

import {
  initialBangleStore,
  useSliceState,
} from '@bangle.io/bangle-store-context';
import type { ApplicationStore } from '@bangle.io/create-store';

import type { UiContextAction, UISliceState } from './ui-slice';
import { initialState, uiSliceKey } from './ui-slice';

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
  const { sliceState: uiState, store } = useSliceState<
    UISliceState,
    UiContextAction
  >(uiSliceKey);

  return useMemo(() => {
    return {
      ...(uiState || initialState),
      dispatch: store.dispatch,
      bangleStore: store,
    };
  }, [store, uiState]);
}
