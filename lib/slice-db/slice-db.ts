import { Slice } from '@bangle.io/create-store';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import { assertActionName } from '@bangle.io/utils';

import { dbSliceKey } from './common';
import { setupExtensionDbs } from './setup-extension-dbs';

export function dbSlice() {
  assertActionName('@bangle.io/slice-db', dbSliceKey);

  return new Slice({
    key: dbSliceKey,
    state: {
      init(_, state) {
        const { extensionRegistry } =
          extensionRegistrySliceKey.getSliceStateAsserted(state);

        const extensionDbs = setupExtensionDbs(extensionRegistry);

        // TODO remove this
        (globalThis as any).myDb = (name: string) => {
          return extensionDbs[name];
        };

        return {
          extensionDbs,
        };
      },
    },
    sideEffect: [
      dbSliceKey.effect(() => {
        return {};
      }),
    ],
  });
}
