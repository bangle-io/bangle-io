import { Slice, SliceKey } from '@bangle.io/create-store';
import type { BaseHistory } from '@bangle.io/history';
import { createTo, MemoryHistory } from '@bangle.io/history';
import type { PageSliceStateType } from '@bangle.io/slice-page';
import { pageSliceKey, syncPageLocation } from '@bangle.io/slice-page';
import { assertActionName } from '@bangle.io/utils';

const historySliceKey = new SliceKey<
  { history: BaseHistory | undefined },
  {
    name: 'action::@bangle.io/test-utils:history-slice-set-history';
    value: {
      history: BaseHistory;
    };
  }
>('test-memory-history-slice');

if (typeof jest === 'undefined') {
  console.warn('test-utils not using with jest');
}

export function testMemoryHistorySlice() {
  assertActionName('@bangle.io/test-utils', historySliceKey);

  return new Slice({
    key: historySliceKey,
    state: {
      init() {
        return {
          history: undefined,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/test-utils:history-slice-set-history': {
            return {
              ...state,
              history: action.value.history,
            };
          }
          default: {
            return state;
          }
        }
      },
    },
    sideEffect: [mockHistoryEffect],
  });
}

// sets up history and watches for any changes in it
const mockHistoryEffect = historySliceKey.effect(() => {
  let lastProcessed: PageSliceStateType['pendingNavigation'];

  return {
    update(store) {
      const { pendingNavigation } = pageSliceKey.getSliceStateAsserted(
        store.state,
      );

      const { history } = historySliceKey.getSliceStateAsserted(store.state);

      if (!history || !pendingNavigation) {
        return;
      }

      if (pendingNavigation === lastProcessed) {
        return;
      }

      lastProcessed = pendingNavigation;

      if (pendingNavigation.preserve) {
        history.navigate(createTo(pendingNavigation.location, history), {
          replace: pendingNavigation.replaceHistory,
        });
      } else {
        let to = pendingNavigation.location.pathname || '';

        if (pendingNavigation.location.search) {
          to += '?' + pendingNavigation.location.search;
        }
        history.navigate(to, {
          replace: pendingNavigation.replaceHistory,
        });
      }
    },

    deferredOnce(store, abortSignal) {
      const history = new MemoryHistory('', (location) => {
        // @ts-expect-error
        syncPageLocation(location)(
          store.state,
          pageSliceKey.getDispatch(store.dispatch),
        );
      });

      store.dispatch({
        name: 'action::@bangle.io/test-utils:history-slice-set-history',
        value: { history: history },
      });

      // @ts-expect-error
      syncPageLocation({
        search: history.search,
        pathname: history.pathname,
      })(store.state, pageSliceKey.getDispatch(store.dispatch));

      abortSignal.addEventListener(
        'abort',
        () => {
          history.destroy();
        },
        {
          once: true,
        },
      );
    },
  };
});
