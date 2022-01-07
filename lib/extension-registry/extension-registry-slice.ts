import { Slice } from '@bangle.io/create-store';
import type { BangleStateOpts } from '@bangle.io/shared-types';
import { asssertNotUndefined } from '@bangle.io/utils';

import {
  ExtensionRegistryAction,
  extensionRegistrySliceKey,
  ExtensionRegistryState,
} from './common';

export function extensionRegistrySlice(): Slice<
  ExtensionRegistryState,
  ExtensionRegistryAction
> {
  return new Slice({
    key: extensionRegistrySliceKey,
    state: {
      init(opts: BangleStateOpts) {
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
