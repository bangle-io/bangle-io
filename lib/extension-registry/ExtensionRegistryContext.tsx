import React from 'react';

import { useNsmSliceState } from '@bangle.io/bangle-store-context';

import type { ExtensionRegistry } from './ExtensionRegistry';
import { nsmExtensionRegistry } from './nsm-extension-registry-slice';

export const ExtensionRegistryContext = React.createContext<ExtensionRegistry>(
  undefined as any,
);

export function useExtensionRegistryContext() {
  const { extensionRegistry } = useNsmSliceState(nsmExtensionRegistry);

  return extensionRegistry;
}
