import { createKey } from '@nalanda/core';

import { sliceUIColorScheme } from './slice-ui-color-scheme';
import { sliceUIToast } from './slice-ui-toast';
import { initiallyWidescreen, sliceUIWidescreen } from './slice-ui-widescreen';

export {
  clearAllToast,
  clearToast,
  getToastEmitter,
  queueToast,
} from './slice-ui-toast';

const ONLY_ONE_ASIDE_THRESHOLD = 1024;

const key = createKey('slice-ui', [sliceUIWidescreen, sliceUIColorScheme]);

const showRightAsideField = key.field(false);

function toggleRightAside(show: boolean | undefined) {
  const tx = key.transaction();

  return tx.step((state) => {
    const { widescreen, screenWidth } = sliceUIWidescreen.get(state);
    const cur = showRightAsideField.get(state);

    if (!widescreen) {
      return state.apply(showRightAsideField.update(false));
    }

    // minimize the left aside when cramped
    if (screenWidth < ONLY_ONE_ASIDE_THRESHOLD) {
      state = state.apply(showLeftAsideField.update(false));
    }

    return state.apply(
      showRightAsideField.update(typeof show === 'boolean' ? show : !cur),
    );
  });
}

const showLeftAsideField = key.field(initiallyWidescreen ? true : false);

function toggleLeftAside(show: boolean | undefined) {
  const tx = key.transaction();

  return tx.step((state) => {
    const { widescreen, screenWidth } = sliceUIWidescreen.get(state);
    const currentShowLeftAside = showLeftAsideField.get(state);

    if (!widescreen) {
      return state.apply(showLeftAsideField.update(false));
    }

    // if we are showing the right aside, then we should hide it
    // since the screen is not wide enough
    if (screenWidth < ONLY_ONE_ASIDE_THRESHOLD) {
      state = state.apply(showRightAsideField.update(false));
    }

    return state.apply(
      showLeftAsideField.update(
        typeof show === 'boolean' ? show : !currentShowLeftAside,
      ),
    );
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

const screenWidthField = key.derive((state) => {
  return sliceUIWidescreen.getField(state, 'screenWidth');
});

const screenHeightField = key.derive((state) => {
  return sliceUIWidescreen.getField(state, 'screenHeight');
});

const colorSchemeField = key.derive((state) =>
  sliceUIColorScheme.getField(state, 'colorScheme'),
);

export const sliceUI = key.slice({
  colorScheme: colorSchemeField,
  screenHeight: screenHeightField,
  screenWidth: screenWidthField,
  showActivitybar: showActivitybarField,
  showLeftAside: showLeftAsideField,
  showRightAside: showRightAsideField,
  toggleActivitybar,
  toggleLeftAside,
  toggleRightAside,
  widescreen: widescreenField,
});

export const sliceUIAllSlices = [
  sliceUIWidescreen,
  sliceUIColorScheme,
  sliceUI,
  sliceUIToast,
];
