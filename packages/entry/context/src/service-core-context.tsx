import { BaseService } from '@bangle.io/base-utils';

import type { CoreServices } from '@bangle.io/types';
import React, { useEffect, createContext } from 'react';

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
  useEffect(() => {
    for (const service of Object.values(services)) {
      if (service instanceof BaseService) {
        service.initialize();
      }
    }
  }, [services]);

  return (
    <CoreServiceContext.Provider value={services}>
      {children}
    </CoreServiceContext.Provider>
  );
}
