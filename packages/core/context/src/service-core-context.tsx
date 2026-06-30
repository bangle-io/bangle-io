import React, { createContext } from 'react';
import type { CoreServices, PmEditorServiceContract } from './service-types';

export const CoreServiceContext = createContext<CoreServices>(
  {} as CoreServices,
);

export function useCoreServices<
  TPmEditorService extends PmEditorServiceContract = PmEditorServiceContract,
>() {
  return React.useContext(CoreServiceContext) as CoreServices<TPmEditorService>;
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
