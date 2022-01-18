import { Slice } from '@bangle.io/create-store';
import type { BangleStateConfig } from '@bangle.io/shared-types';
import { assertActionName, asssertNotUndefined } from '@bangle.io/utils';

import {
  ExtensionRegistryAction,
  extensionRegistrySliceKey,
  ExtensionRegistryState,
} from './common';

export function extensionRegistrySlice(): Slice<
  ExtensionRegistryState,
  ExtensionRegistryAction
> {
  assertActionName('@bangle.io/extension-registry', extensionRegistrySliceKey);

  return new Slice({
    key: extensionRegistrySliceKey,
    state: {
      init(opts: BangleStateConfig) {
        asssertNotUndefined(
          opts.extensionRegistry,
          'extensionRegistry needs to be provided',
        );
        return {
          extensionRegistry: opts.extensionRegistry,
        };
      },
    },
  });
}
