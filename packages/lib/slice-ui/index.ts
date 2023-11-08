import { createKey } from '@nalanda/core';

import { sliceUIColorScheme } from './slice-ui-color-scheme';
import { sliceUIWidescreen } from './slice-ui-widescreen';

export { sliceUIColorScheme } from './slice-ui-color-scheme';
export { sliceUIWidescreen } from './slice-ui-widescreen';

const key = createKey('slice-ui', [sliceUIWidescreen, sliceUIColorScheme]);

const widescreenField = key.derive((state) => {
  return sliceUIWidescreen.getField(state, 'widescreen');
});

const colorSchemeField = key.derive((state) =>
  sliceUIColorScheme.getField(state, 'colorScheme'),
);

export const sliceUI = key.slice({
  widescreen: widescreenField,
  colorScheme: colorSchemeField,
});
