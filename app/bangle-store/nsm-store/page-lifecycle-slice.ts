/// <reference path="../missing-types.d.ts" />

import lifecycle from 'page-lifecycle';

import { changeEffect } from '@bangle.io/nsm';
import type { PageLifeCycleState } from '@bangle.io/slice-page';
import { nsmPageSlice } from '@bangle.io/slice-page';

const pendingSymbol = Symbol('pending');

type PageLifeCycleEvent = {
  newState: PageLifeCycleState;
  oldState: PageLifeCycleState;
};

export const pageLifeCycleWatch = changeEffect(
  'pageLifeCycleWatch',
  {
    _: nsmPageSlice.passivePick((s) => s),
  },
  (_, dispatch) => {
    const handler = (event: PageLifeCycleEvent) => {
      dispatch(
        nsmPageSlice.actions.setPageLifeCycleState({
          current: event.newState,
          previous: event.oldState,
        }),
      );
    };

    lifecycle.addEventListener('statechange', handler);

    handler({ newState: lifecycle.state, oldState: undefined });

    return () => {
      lifecycle.removeEventListener('statechange', handler);
    };
  },
);

export const pageLifeCycleBlockReload = changeEffect(
  'pageLifeCycleBlockReload',
  {
    blockReload: nsmPageSlice.pick((s) => s.blockReload),
  },
  ({ blockReload }) => {
    if (blockReload) {
      lifecycle.addUnsavedChanges(pendingSymbol);
    } else {
      lifecycle.removeUnsavedChanges(pendingSymbol);
    }
  },
  {
    sync: true,
  },
);
