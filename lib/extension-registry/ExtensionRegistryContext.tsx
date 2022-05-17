import React, { useContext } from 'react';

import { useSliceState } from '@bangle.io/bangle-store-context';

import { extensionRegistrySliceKey } from './common';
import { ExtensionRegistry } from './ExtensionRegistry';

export const ExtensionRegistryContext = React.createContext<ExtensionRegistry>(
  undefined as any,
);

export function useExtensionRegistryContext() {
  return useContext(ExtensionRegistryContext);
}

export function ExtensionRegistryContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sliceState } = useSliceState(extensionRegistrySliceKey);

  return (
    <ExtensionRegistryContext.Provider value={sliceState?.extensionRegistry!}>
      {children}
    </ExtensionRegistryContext.Provider>
  );
}
