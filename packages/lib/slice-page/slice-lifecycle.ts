import { cleanup, createKey } from '@nalanda/core';
import lifecycle from 'page-lifecycle';

import {
  PageLifeCycleEvent,
  PageLifeCycleState,
} from '@bangle.io/shared-types';

const pendingSymbol = Symbol('pending');
const key = createKey('slice-lifecycle', []);

// FIELDS
const lifeCycleStateField = key.field<{
  current?: PageLifeCycleState;
  previous?: PageLifeCycleState;
}>({});

const pageLifeCycleField = key.derive((state) => {
  return lifeCycleStateField.get(state).current;
});

export const blockPageField = key.field<boolean>(false);

// ACTIONS
function setPageLifeCycleState(state: {
  current: PageLifeCycleState;
  previous: PageLifeCycleState;
}) {
  return lifeCycleStateField.update(state);
}

function blockPageReload() {
  return blockPageField.update(true);
}

function unblockPageReload() {
  return blockPageField.update(false);
}

// EFFECTS
key.effect(function pageLifeCycleWatch(store) {
  const handler = (event: PageLifeCycleEvent) => {
    store.dispatch(
      setPageLifeCycleState({
        current: event.newState,
        previous: event.oldState,
      }),
    );
  };

  lifecycle.addEventListener('statechange', handler);
  handler({ newState: lifecycle.state, oldState: undefined });

  cleanup(store, () => {
    lifecycle.removeEventListener('statechange', handler);
  });
});

key.effect(
  function pageLifeCycleBlockReload(store) {
    const blockReload = blockPageField.track(store);

    if (blockReload) {
      lifecycle.addUnsavedChanges(pendingSymbol);
    } else {
      lifecycle.removeUnsavedChanges(pendingSymbol);
    }
  },
  {
    metadata: {
      runImmediately: true,
    },
  },
);

export const sliceLifeCycle = key.slice({
  blockPageReload,
  unblockPageReload,
  pageLifeCycle: pageLifeCycleField,
});
