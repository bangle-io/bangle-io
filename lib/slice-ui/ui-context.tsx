import { useMemo } from 'react';

import { useSliceState } from '@bangle.io/bangle-store-context';
import type { ApplicationStore } from '@bangle.io/create-store';

import type { UiContextAction, UISliceState } from './ui-slice';
import { uiSliceKey } from './ui-slice';

export type UIStateObj = UISliceState & {
  dispatch: ApplicationStore<UISliceState, UiContextAction>['dispatch'];
  bangleStore: ApplicationStore;
};

export function useUIManagerContext() {
  const { sliceState: uiState, store } = useSliceState<
    UISliceState,
    UiContextAction
  >(uiSliceKey);

  return useMemo(() => {
    return {
      ...uiState,
      dispatch: store.dispatch,
      bangleStore: store,
    };
  }, [store, uiState]);
}
