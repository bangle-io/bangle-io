import { useSliceState } from '@bangle.io/app-state-context';

import {
  PageDispatchType,
  PageSliceAction,
  pageSliceKey,
  PageSliceStateType,
} from './common';
import { pageSliceInitialState } from './page-slice';

export function usePageContext() {
  const { sliceState: pageState, store } = useSliceState<
    PageSliceStateType,
    PageSliceAction
  >(pageSliceKey, pageSliceInitialState);

  return {
    store,
    pageState,
    dispatch: store.dispatch as PageDispatchType,
  };
}
