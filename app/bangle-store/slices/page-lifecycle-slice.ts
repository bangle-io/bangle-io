/// <reference path="../missing-types.d.ts" />

import lifecycle from 'page-lifecycle';

import { Slice } from '@bangle.io/create-store';
import {
  PageLifeCycleState,
  pageSliceKey,
  setPageLifeCycleState,
} from '@bangle.io/slice-page';
import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

const pendingSymbol = Symbol('pending');

assertNonWorkerGlobalScope();

type PageLifeCycleEvent = {
  newState: PageLifeCycleState;
  oldState: PageLifeCycleState;
};

export function pageLifeCycleSlice() {
  return new Slice({
    sideEffect: [
      function watchPageLifeCycleEffect(store) {
        const handler = (event: PageLifeCycleEvent) => {
          setPageLifeCycleState(event.newState, event.oldState)(
            store.state,
            store.dispatch,
          );
        };

        lifecycle.addEventListener('statechange', handler);

        handler({ newState: lifecycle.state, oldState: undefined });
        return {
          destroy() {
            lifecycle.removeEventListener('statechange', handler);
          },
        };
      },

      function blockReload() {
        return {
          update(store, prevState) {
            const blockReload = pageSliceKey.getValueIfChanged(
              'blockReload',
              store.state,
              prevState,
            );

            if (blockReload == null) {
              return;
            }

            if (blockReload) {
              lifecycle.addUnsavedChanges(pendingSymbol);
            } else {
              lifecycle.removeUnsavedChanges(pendingSymbol);
            }
          },
        };
      },
    ],
  });
}
