import { createKey } from '@nalanda/core';

import { sliceUIColorScheme } from './slice-ui-color-scheme';
import { sliceUIWidescreen } from './slice-ui-widescreen';

const key = createKey('slice-ui', [sliceUIWidescreen, sliceUIColorScheme]);

const showRightAsideField = key.field(false);
function toggleRightAside(show: boolean | undefined) {
  return showRightAsideField.update((cur) => {
    if (typeof show === 'boolean') {
      return show;
    }
    return !cur;
  });
}

const showLeftAsideField = key.field(false);
function toggleLeftAside(show: boolean | undefined) {
  return showLeftAsideField.update((cur) => {
    if (typeof show === 'boolean') {
      return show;
    }
    return !cur;
  });
}

const showActivitybarField = key.field(false);
function toggleActivitybar(show: boolean | undefined) {
  return showActivitybarField.update((cur) => {
    if (typeof show === 'boolean') {
      return show;
    }
    return !cur;
  });
}

const widescreenField = key.derive((state) => {
  return sliceUIWidescreen.getField(state, 'widescreen');
});

const colorSchemeField = key.derive((state) =>
  sliceUIColorScheme.getField(state, 'colorScheme'),
);

export const sliceUI = key.slice({
  widescreen: widescreenField,
  colorScheme: colorSchemeField,
  showRightAside: showRightAsideField,
  showLeftAside: showLeftAsideField,
  showActivitybar: showActivitybarField,
  toggleRightAside,
  toggleLeftAside,
  toggleActivitybar,
});

export const sliceUIAllSlices = [
  sliceUIWidescreen,
  sliceUIColorScheme,
  sliceUI,
];
