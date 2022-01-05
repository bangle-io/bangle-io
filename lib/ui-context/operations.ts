import type { AppState } from '@bangle.io/create-store';

import type { UiContextDispatchType, UISliceState } from './ui-slice';
import { uiSliceKey } from './ui-slice';

export const updatePalette = (type: UISliceState['paletteType']) => {
  return (state: AppState, dispatch: UiContextDispatchType) => {
    const paletteType = uiSliceKey.getSliceState(state)?.paletteType;
    dispatch({
      name: 'UI/UPDATE_PALETTE',
      value: {
        type: (paletteType === type ? null : type) || null,
      },
    });
  };
};
