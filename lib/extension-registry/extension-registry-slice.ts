import { Slice } from '@bangle.io/create-store';
import type { BangleStateOpts } from '@bangle.io/shared-types';

import {
  ExtensionRegistryAction,
  extensionRegistrySliceKey,
  ExtensionRegistryState,
} from './common';

export const JSON_SCHEMA_VERSION = 'editor-registry/1';

export function extensionRegistrySlice(): Slice<
  ExtensionRegistryState,
  ExtensionRegistryAction
> {
  return new Slice({
    key: extensionRegistrySliceKey,
    state: {
      init(opts: BangleStateOpts) {
        if (!opts.initExtensionRegistry) {
          throw new Error(
            'ExtensionRegistrySlice expects initExtensionRegistry to be provided',
          );
        }
        return {
          extensionRegistry: opts.initExtensionRegistry(),
        };
      },

      stateToJSON(value) {
        return {
          version: JSON_SCHEMA_VERSION,
          data: {},
        };
      },

      stateFromJSON(opts, value) {
        if (!opts.initExtensionRegistry) {
          throw new Error(
            'ExtensionRegistrySlice expects initExtensionRegistry to be provided',
          );
        }

        return {
          extensionRegistry: opts.initExtensionRegistry(),
        };
      },
    },
  });
}
