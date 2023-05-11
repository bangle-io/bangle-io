import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';

import { getStore } from '../internals';

export function useUi() {
  return useNsmSliceState(nsmUISlice);
}

export const pick = nsmUI.nsmUISlice.pick;
export const passivePick = nsmUI.nsmUISlice.passivePick;

export const closeSidebar = (): void => {
  const store = getStore();
  store.dispatch(nsmUI.closeSidebar());
};
export const togglePalette = (
  ...args: Parameters<typeof nsmUI.togglePalette>
): void => {
  const store = getStore();
  store.dispatch(nsmUI.togglePalette(...args));
};
export const changeSidebar = (
  ...args: Parameters<typeof nsmUI.changeSidebar>
): void => {
  const store = getStore();
  store.dispatch(nsmUI.changeSidebar(...args));
};
