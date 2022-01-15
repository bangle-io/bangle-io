import { BaseAction, Slice, SliceKey } from '@bangle.io/create-store';
import {
  asssertNotUndefined,
  setStoreSyncSliceReady,
  StoreSyncConfigType,
  storeSyncSlice,
} from '@bangle.io/utils';

import { WorkerStoreOpts } from './types';

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
            actionSendFilter: () => true,
            actionReceiveFilter: () => true,
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
