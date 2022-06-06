import { useSliceState } from '@bangle.io/bangle-store-context';

import type {
  PageDispatchType,
  PageSliceAction,
  PageSliceStateType,
} from './common';
import { pageSliceKey } from './common';

export function usePageContext() {
  const { sliceState: pageState, store } = useSliceState<
    PageSliceStateType,
    PageSliceAction
  >(pageSliceKey);

  return {
    store,
    pageState,
    dispatch: store.dispatch as PageDispatchType,
  };
}
