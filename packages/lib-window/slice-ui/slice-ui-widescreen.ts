import { cleanup, createKey } from '@nalanda/core';

import { checkWidescreen, listenToResize } from '@bangle.io/window-utils';
const key = createKey('slice-ui-widescreen', []);

export const initiallyWidescreen =
  !document.firstElementChild!.classList.contains('BU_smallscreen');

// NOTE: part of the code exists in @bangle.io/inline-scripts to ensure
// the BU_widescreen/BU_smallscreen class is added as soon as possible

// This is just a mirror of what is in the  document.firstElementChild
const widescreenField = key.field(initiallyWidescreen);

const screenWidthField = key.field(
  typeof window !== 'undefined' ? window.innerWidth : 0,
);

const screenHeightField = key.field(
  typeof window !== 'undefined' ? window.innerHeight : 0,
);

function updateScreenDimensions({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return key.transaction().step((state) => {
    state = state.apply(screenHeightField.update(height));
    state = state.apply(screenWidthField.update(width));

    return state;
  });
}

function reactToScreenChange(widescreen: boolean) {
  return widescreenField.update(widescreen);
}

export const sliceUIWidescreen = key.slice({
  widescreen: widescreenField,
  screenWidth: screenWidthField,
  screenHeight: screenHeightField,
});

// sets a class when screen is resized
key.effect(function listToResizeEffect(store) {
  const targetNode = document.firstElementChild!;

  const syncWidescreen = (dimensions?: { width: number; height: number }) => {
    if (dimensions) {
      store.dispatch(updateScreenDimensions(dimensions));
    }
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

// watches for class change (done by listToResizeEffect) and updates the store value
// to stay in sync.
key.effect(function watchWidthChangeEffect(store) {
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
