import React, { createContext } from 'react';
import type { CoreServices, EditorEngineContract } from './service-types';

export const CoreServiceContext = createContext<CoreServices>(
  {} as CoreServices,
);

export function useCoreServices<
  TEditorEngine extends EditorEngineContract = EditorEngineContract,
>() {
  return React.useContext(CoreServiceContext) as CoreServices<TEditorEngine>;
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
