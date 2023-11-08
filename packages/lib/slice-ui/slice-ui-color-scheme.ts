import { cleanup, createKey, ref } from '@nalanda/core';

import { COLOR_SCHEME } from '@bangle.io/constants';

// NOTE part of the code exists in @bangle.io/inline-scripts to ensure
// the dark-scheme/light-scheme class is added as soon as possible
const key = createKey('slice-ui-color-scheme', []);

type ColorScheme =
  | (typeof COLOR_SCHEME)['LIGHT']
  | (typeof COLOR_SCHEME)['DARK'];

const colorSchemeField = key.field(
  document.firstElementChild!.classList.contains('dark-scheme')
    ? COLOR_SCHEME.DARK
    : COLOR_SCHEME.LIGHT,
);

function reactToColorSchemeChange(color: ColorScheme) {
  return colorSchemeField.update(color);
}

export const sliceUIColorScheme = key.slice({
  colorScheme: colorSchemeField,
});

key.effect(function watchColorSchemeChange(store) {
  const config: MutationObserverInit = {
    attributes: true,
    attributeFilter: ['class'],
  };

  const targetNode = document.firstElementChild!;

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'class'
      ) {
        const classList = (mutation.target as Element).classList;
        const isDark = classList.contains('dark-scheme');
        const newVal = isDark ? COLOR_SCHEME.DARK : COLOR_SCHEME.LIGHT;
        const curVal = colorSchemeField.get(store.state);
        if (curVal !== newVal) {
          store.dispatch(reactToColorSchemeChange(newVal));
        }
      }
    }
  });

  observer.observe(targetNode, config);

  cleanup(store, () => {
    observer.disconnect();
  });
});
