import { useMemo } from 'react';

import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';

export function useUi() {
  const { widescreen } = useNsmSliceState(nsmUISlice);

  return useMemo(() => {
    return { widescreen };
  }, [widescreen]);
}

export const pick = nsmUI.nsmUISlice.pick;
export const passivePick = nsmUI.nsmUISlice.passivePick;

export const closeSidebar = nsmUI.closeSidebar;
export const togglePalette = nsmUI.togglePalette;
export const changeSidebar = nsmUI.changeSidebar;
