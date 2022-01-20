import { workerSyncWhiteListedActions } from '@bangle.io/constants';
import { BaseAction, Slice, SliceKey } from '@bangle.io/create-store';
import type { NaukarStateConfig } from '@bangle.io/shared-types';
import {
  asssertNotUndefined,
  startStoreSync,
  StoreSyncConfigType,
  storeSyncSlice,
} from '@bangle.io/utils';

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
          asssertNotUndefined(opts.port, 'port needs to be provided');
          return {
            port: opts.port,
            actionSendFilter: actionFilter,
            actionReceiveFilter: actionFilter,
          };
        },
      },
      sideEffect() {
        return {
          deferredOnce(store) {
            // start the store sync in next cycle to let worker stabilize
            Promise.resolve().then(() => {
              startStoreSync()(store.state, store.dispatch);
            });
          },
        };
      },
    }),
    storeSyncSlice(sliceKey),
  ];
}
