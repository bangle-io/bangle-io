import React, { useContext, useState } from 'react';

import { ExtensionRegistry } from './ExtensionRegistry';

export const ExtensionRegistryContext = React.createContext<ExtensionRegistry>(
  undefined as any,
);

export function useExtensionRegistryContext() {
  return useContext(ExtensionRegistryContext);
}

export function ExtensionRegistryContextProvider({
  initExtensionRegistry,
  children,
}: {
  initExtensionRegistry: () => ExtensionRegistry;
  children: JSX.Element;
}) {
  const [value] = useState(() => initExtensionRegistry());

  return (
    <ExtensionRegistryContext.Provider value={value}>
      {children}
    </ExtensionRegistryContext.Provider>
  );
}
