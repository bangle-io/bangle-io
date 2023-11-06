import { createStore } from '@nalanda/core';

import { sliceUI } from '@bangle.io/slice-ui';

export const store = createStore({
  slices: [sliceUI],
});
