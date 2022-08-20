import { workerSyncWhiteListedActions } from '@bangle.io/constants';
import type { BaseAction } from '@bangle.io/create-store';
import { Slice, SliceKey } from '@bangle.io/create-store';
import type { StoreSyncConfigType } from '@bangle.io/store-sync';
import { startStoreSync, storeSyncSlice } from '@bangle.io/store-sync';
import { assertNotUndefined } from '@bangle.io/utils';

import type { NaukarStateConfig } from '../common';

const actionFilter = (action: BaseAction) =>
  workerSyncWhiteListedActions.some((rule) => action.name.startsWith(rule));

/**
 * Sets up syncing of store actions with the window
 */
export function syncWithWindowSlices() {
  const sliceKey = new SliceKey<StoreSyncConfigType<BaseAction>>(
    'sync-with-window-stateSyncKey',
  );

  return [
    new Slice({
      key: sliceKey,
      state: {
        init(opts: NaukarStateConfig) {
          assertNotUndefined(opts.port, 'port needs to be provided');

          return {
            port: opts.port,
            actionSendFilter: actionFilter,
            actionReceiveFilter: actionFilter,
          };
        },
      },
      sideEffect() {
        return {
          deferredOnce(store, signal) {
            // start the store sync in next cycle to let worker stabilize
            Promise.resolve().then(() => {
              if (!signal.aborted) {
                startStoreSync()(store.state, store.dispatch);
              }
            });
          },
        };
      },
    }),
    storeSyncSlice(sliceKey),
  ];
}
