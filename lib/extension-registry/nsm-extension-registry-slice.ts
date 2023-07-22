import { effect, slice } from '@bangle.io/nsm-3';

import { ExtensionRegistry } from './ExtensionRegistry';

const defaultRegistry = new ExtensionRegistry([], []);

export const nsmExtensionRegistry = slice([], {
  name: 'nsm-extension-registry',
  state: {
    // Note: This will be overridden by respective stores
    // with correct instance of ExtensionRegistry
    extensionRegistry: defaultRegistry,
  },
});

const extensionRegistryCheckEffect = effect(
  function extensionRegistryCheckEffect(store) {
    const { extensionRegistry } = nsmExtensionRegistry.get(store.state);

    if (extensionRegistry === defaultRegistry) {
      // we should always be overriding the default value with the correct value
      throw new Error(`ExtensionRegistry not set in store`);
    }
  },
);

export const extensionRegistryEffects = [extensionRegistryCheckEffect];
