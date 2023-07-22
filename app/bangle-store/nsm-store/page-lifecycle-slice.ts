/// <reference path="../missing-types.d.ts" />

import lifecycle from 'page-lifecycle';

import { cleanup, effect } from '@bangle.io/nsm-3';
import type { PageLifeCycleState } from '@bangle.io/slice-page';
import { nsmPageSlice, setPageLifeCycleState } from '@bangle.io/slice-page';

const pendingSymbol = Symbol('pending');

type PageLifeCycleEvent = {
  newState: PageLifeCycleState;
  oldState: PageLifeCycleState;
};

const pageLifeCycleWatch = effect(function pageLifeCycleWatch(store) {
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

export const pageLifeCycleBlockReload = effect(
  function pageLifeCycleBlockReload(store) {
    const { blockReload } = nsmPageSlice.track(store);

    if (blockReload) {
      lifecycle.addUnsavedChanges(pendingSymbol);
    } else {
      lifecycle.removeUnsavedChanges(pendingSymbol);
    }
  },
  { deferred: false },
);

export const pageLifeCycleEffects = [
  pageLifeCycleWatch,
  pageLifeCycleBlockReload,
];
