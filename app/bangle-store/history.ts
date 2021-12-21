// Monitors the page's lifecycle

import { Slice, SliceKey } from '@bangle.io/create-store';
import type { HistoryAction } from '@bangle.io/shared-types';
import type { History } from '@bangle.io/ws-path';

const historySliceKey = new SliceKey('history-slice');

// See https://developers.google.com/web/updates/2018/07/page-lifecycle-api
export function historySlice() {
  return new Slice<HistoryState, HistoryAction>({
    key: historySliceKey,
    state: {
      init: () => {
        return new HistoryState({ history: undefined });
      },
      apply: (action, state) => {
        switch (action.name) {
          case 'action::bangle-store:history-auth-error': {
            const { wsName } = action.value;

            if (!state.pathname?.startsWith('/ws-nativefs-auth/' + wsName)) {
              state.history?.replace({
                pathname: '/ws-nativefs-auth/' + wsName,
                state: {
                  previousLocation: state.location,
                },
              });
            }

            return state;
          }

          case 'action::bangle-store:history-ws-not-found': {
            if (
              !state.pathname?.startsWith(
                '/ws-not-found/' + action.value.wsName,
              )
            ) {
              state.history?.replace({
                pathname: '/ws-not-found/' + action.value.wsName,
                state: {},
              });
            }

            return state;
          }

          case 'action::bangle-store:history-set-history': {
            return state[UpdateState]({ history: action.value.history });
          }

          default: {
            return state;
          }
        }
      },
    },
  });
}

export const UpdateState = Symbol('HistoryState');

export class HistoryState {
  constructor(
    private mainFields: {
      history: HistoryState['history'];
    },
    private opts: any = {},
  ) {}

  [UpdateState](
    obj: Partial<ConstructorParameters<typeof HistoryState>[0]>,
  ): HistoryState {
    return new HistoryState(Object.assign({}, this.mainFields, obj), this.opts);
  }

  // mainFields
  get history(): History | undefined {
    return this.mainFields.history;
  }

  // derived
  get location() {
    return this.history?.location;
  }
  get pathname() {
    return this.history?.location.pathname;
  }
  get search() {
    return this.history?.location.search;
  }
}
