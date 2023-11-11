import { createStore } from '@nalanda/core';

import {
  sliceUI,
  sliceUIColorScheme,
  sliceUIWidescreen,
} from '@bangle.io/slice-ui';

export const store = createStore({
  slices: [
    // ui
    sliceUIColorScheme,
    sliceUIWidescreen,
    sliceUI,

    //
  ],
});
