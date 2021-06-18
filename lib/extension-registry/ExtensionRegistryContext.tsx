import { ExtensionRegistry } from 'ExtensionRegistry';
import React, { useMemo } from 'react';

export const ExtensionRegistryContext = React.createContext<ExtensionRegistry>(
  undefined as any,
);

export function ExtensionRegistryContextProvider({
  extensionRegistry,
  children,
}: {
  extensionRegistry: ExtensionRegistry;
  children: JSX.Element;
}) {
  const value = useMemo(() => {
    return extensionRegistry;
  }, [extensionRegistry]);

  return (
    <ExtensionRegistryContext.Provider value={value}>
      {children}
    </ExtensionRegistryContext.Provider>
  );
}
