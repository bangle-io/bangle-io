import React from 'react';

import { useSliceState } from '@bangle.io/bangle-store-context';

import { extensionRegistrySliceKey } from './common';
import type { ExtensionRegistry } from './ExtensionRegistry';

export const ExtensionRegistryContext = React.createContext<ExtensionRegistry>(
  undefined as any,
);

export function useExtensionRegistryContext() {
  const { sliceState } = useSliceState(extensionRegistrySliceKey);

  return sliceState.extensionRegistry;
}
