import type { CoreServices } from '@bangle.io/types';
import React, { createContext } from 'react';

export const CoreServiceContext = createContext<CoreServices>(
  {} as CoreServices,
);

export function useCoreServices() {
  return React.useContext(CoreServiceContext);
}

export function CoreServiceProvider({
  children,
  services,
}: {
  children: React.ReactNode;
  services: CoreServices;
}) {
  return (
    <CoreServiceContext.Provider value={services}>
      {children}
    </CoreServiceContext.Provider>
  );
}
