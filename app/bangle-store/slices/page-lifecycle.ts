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
export interface PageLifeCycle {
  state: PageLifeCycleState;
  addUnsavedChanges: (s: Symbol) => void;
  removeUnsavedChanges: (s: Symbol) => void;
  addEventListener: (
    type: string,
    cb: (event: PageLifeCycleEvent) => void,
  ) => void;
  removeEventListener: (
    type: string,
    cb: (event: PageLifeCycleEvent) => void,
  ) => void;
}

export function pageLifeCycleSlice(lifecycle: PageLifeCycle) {
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
        let lastValue = false;
        return {
          update(store) {
            const blockReload = pageSliceKey.getSliceStateAsserted(
              store.state,
            ).blockReload;

            if (blockReload === lastValue) {
              return;
            }

            lastValue = blockReload;

            if (lastValue) {
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
