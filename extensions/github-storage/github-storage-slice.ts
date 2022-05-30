import { Slice, SliceKey } from '@bangle.io/api';

import { handleError } from './error-handling';

const LOG = true;
const debug = LOG
  ? console.debug.bind(console, 'github-storage-slice')
  : () => {};

export const sliceKey = new SliceKey<
  {
    syncState: boolean;
  },
  {
    name: 'action::@bangle.io/github-storage:UPDATE_SYNC_STATE';
    value: {
      syncState: boolean;
    };
  }
>('slice::@bangle.io/github-storage:slice-key');

export function githubStorageSlice() {
  return new Slice({
    key: sliceKey,
    state: {
      init() {
        return {
          syncState: false,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/github-storage:UPDATE_SYNC_STATE': {
            return {
              ...state,
              syncState: action.value.syncState,
            };
          }
          default: {
            return state;
          }
        }
      },
    },
    sideEffect: [],
    onError: (error: any, store) => {
      return handleError(error, store);
    },
  });
}
