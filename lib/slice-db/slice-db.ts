import { Slice } from '@bangle.io/create-store';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import { assertActionName } from '@bangle.io/utils';

import { dbSliceKey } from './common';

export function dbSlice() {
  assertActionName('@bangle.io/slice-db', dbSliceKey);

  return new Slice({
    key: dbSliceKey,
    state: {
      init(_, state) {
        const { extensionRegistry } =
          extensionRegistrySliceKey.getSliceStateAsserted(state);

        return {};
      },
    },
    sideEffect: [
      dbSliceKey.effect(() => {
        return {};
      }),
    ],
  });
}
