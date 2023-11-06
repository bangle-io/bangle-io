import { cleanup, createKey } from '@nalanda/core';

import { checkWidescreen, listenToResize } from '@bangle.io/utils';
const key = createKey('slice-ui-widescreen', []);

// NOTE: part of the code exists in @bangle.io/inline-scripts to ensure
// the BU_widescreen/BU_smallscreen class is added as soon as possible

// This is just a mirror of what is in the  document.firstElementChild
const widescreenField = key.field(
  !document.firstElementChild!.classList.contains('BU_smallscreen'),
);

function reactToScreenChange(widescreen: boolean) {
  return widescreenField.update(widescreen);
}

export const sliceUIWidescreen = key.slice({
  widescreen: widescreenField,
});

key.effect(function watchWidthChange(store) {
  const config: MutationObserverInit = {
    attributes: true, // Watch for attribute changes
    attributeFilter: ['class'], // Watch for changes only to the 'class' attribute
  };

  const targetNode = document.firstElementChild!;

  // Create a new MutationObserver and pass the callback function
  const observer = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'class'
      ) {
        const classList = (mutation.target as Element).classList;
        const newVal = !classList.contains('BU_smallscreen');
        const curVal = widescreenField.get(store.state);
        if (curVal !== newVal) {
          store.dispatch(reactToScreenChange(newVal));
        }
      }
    }
  });

  observer.observe(targetNode, config);

  cleanup(store, () => {
    observer.disconnect();
  });
});

key.effect((store) => {
  const targetNode = document.firstElementChild!;
  const syncWidescreen = (dimensions?: { width: number; height: number }) => {
    const currentWideScreen = checkWidescreen(dimensions?.width);
    const stateWidescreen = targetNode.classList.contains('BU_widescreen');

    if (currentWideScreen === stateWidescreen) {
      return;
    }

    if (currentWideScreen) {
      targetNode.classList.remove('BU_smallscreen');
      targetNode.classList.add('BU_widescreen');
    } else {
      targetNode.classList.remove('BU_widescreen');
      targetNode.classList.add('BU_smallscreen');
    }
  };

  const controller = new AbortController();

  listenToResize(syncWidescreen, controller.signal);

  cleanup(store, () => {
    controller.abort();
  });
});
