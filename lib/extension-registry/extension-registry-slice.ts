import { Slice } from '@bangle.io/create-store';
import type { BangleStateConfig } from '@bangle.io/shared-types';
import { assertActionName, assertNotUndefined } from '@bangle.io/utils';

import type { ExtensionRegistryState } from './common';
import { extensionRegistrySliceKey } from './common';

export function extensionRegistrySlice(): Slice<ExtensionRegistryState> {
  assertActionName('@bangle.io/extension-registry', extensionRegistrySliceKey);

  return new Slice({
    key: extensionRegistrySliceKey,
    state: {
      init(opts: BangleStateConfig) {
        assertNotUndefined(
          opts.extensionRegistry,
          'extensionRegistry needs to be provided',
        );

        return {
          extensionRegistry: opts.extensionRegistry,
        };
      },
    },
    actions: {},
  });
}
