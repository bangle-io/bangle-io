import { createSliceV2, mountEffect, Slice } from '@bangle.io/nsm';

import { ExtensionRegistry } from './ExtensionRegistry';

const defaultRegistry = new ExtensionRegistry([], []);
export const nsmExtensionRegistry = createSliceV2([], {
  name: 'nsm-extension-registry',
  initState: {
    // Note: This will be overridden by respective stores
    // with correct instance of ExtensionRegistry
    extensionRegistry: defaultRegistry,
  },
});

Slice.registerEffectSlice(nsmExtensionRegistry, [
  mountEffect(
    'nsm-extension-registry-check',
    [nsmExtensionRegistry],
    (store) => {
      const { extensionRegistry } = nsmExtensionRegistry.getState(store.state);

      if (extensionRegistry === defaultRegistry) {
        // we should always be overriding the default value with the correct value
        throw new Error(`ExtensionRegistry not set in store`);
      }
    },
  ),
]);
