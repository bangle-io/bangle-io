// Monitors the page's lifecycle

import { Slice, SliceKey } from '@bangle.io/create-store';
import type { HistoryAction } from '@bangle.io/shared-types';
import { History, OpenedWsPaths } from '@bangle.io/ws-path';

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
        if (action.name.startsWith('action::bangle-store:')) {
          console.log(action, state);
        }
        switch (action.name) {
          case 'action::bangle-store:history-auth-error': {
            const { wsName } = action.value;
            // TODO check if wsName is current
            if (!state.pathname?.startsWith('/ws-nativefs-auth/' + wsName)) {
              return state[HistoryReplace]({
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
              // TODO check if wsName is current
              return state[HistoryReplace]({
                pathname: '/ws-not-found/' + action.value.wsName,
                state: {},
              });
            }

            return state;
          }

          case 'action::bangle-store:history-on-invalid-path': {
            const { invalidPath, wsName } = action.value;

            if (!state.pathname?.startsWith('/ws-invalid-path/' + wsName)) {
              return state[HistoryReplace]({
                pathname: '/ws-invalid-path/' + wsName,
              });
            }

            return state;
          }

          case 'action::bangle-store:history-set-history': {
            return state[UpdateState]({ history: action.value.history });
          }

          case 'action::bangle-store:history-go-to-path': {
            return state[HistoryPush]({
              pathname: action.value.pathname,
            });
          }

          case 'action::bangle-store:history-update-opened-ws-paths': {
            if (!state.history?.location) {
              return state;
            }
            const { openedWsPathsArray, wsName, replace } = action.value;

            const openedWsPaths =
              OpenedWsPaths.createFromArray(openedWsPathsArray);

            const newLocation = openedWsPaths.getLocation(
              state.history?.location,
              wsName,
            );

            if (replace) {
              return state[HistoryReplace](newLocation);
            } else {
              return state[HistoryPush](newLocation);
            }
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
export const HistoryReplace = Symbol('HistoryReplace');
export const HistoryPush = Symbol('HistoryPush');

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

  [HistoryReplace](newLocation: Parameters<History['replace']>[0]) {
    // TODO if I remove the setTimeouts
    // very very very strange things happen
    // magically the current call goes silent event though it is not async
    // and next things in event loop run and after that
    // this line continues, causing problems with action dispatches.
    setTimeout(() => {
      this.history?.replace(newLocation);
    }, 0);

    return new HistoryState(Object.assign({}, this.mainFields), this.opts);
  }

  [HistoryPush](newLocation: Parameters<History['push']>[0]) {
    setTimeout(() => {
      this.history?.push(newLocation);
    }, 0);

    return new HistoryState(Object.assign({}, this.mainFields), this.opts);
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
