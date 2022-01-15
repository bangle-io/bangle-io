import { workerSyncWhiteListedActions } from '@bangle.io/constants';
import { BaseAction, Slice, SliceKey } from '@bangle.io/create-store';
import {
  asssertNotUndefined,
  setStoreSyncSliceReady,
  StoreSyncConfigType,
  storeSyncSlice,
} from '@bangle.io/utils';

import { WorkerStoreOpts } from './types';

const actionFilter = (action: BaseAction) =>
  workerSyncWhiteListedActions.some((rule) => action.name.startsWith(rule));

export function syncWithWindowSlices() {
  const sliceKey = new SliceKey<StoreSyncConfigType<BaseAction>>(
    'sync-with-window-stateSyncKey',
  );

  return [
    new Slice({
      key: sliceKey,
      state: {
        init(opts: WorkerStoreOpts) {
          asssertNotUndefined(opts.port, 'port needs to be provided');
          return {
            port: opts.port,
            actionSendFilter: actionFilter,
            actionReceiveFilter: actionFilter,
          };
        },
      },
      sideEffect(store) {
        setStoreSyncSliceReady()(store.state, store.dispatch);
        return {};
      },
    }),
    storeSyncSlice(sliceKey),
  ];
}
