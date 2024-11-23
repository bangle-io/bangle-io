import { BaseService } from '@bangle.io/base-utils';
import type { PlatformServices } from '@bangle.io/types';
import React, { useEffect, createContext } from 'react';

export const ServiceContext = createContext({} as PlatformServices);

export function usePlatformService() {
  return React.useContext(ServiceContext);
}

export function PlatformServiceProvider({
  children,
  services,
}: {
  children: React.ReactNode;
  services: PlatformServices;
}) {
  useEffect(() => {
    for (const service of Object.values(services)) {
      if (service instanceof BaseService) {
        service.initialize();
      }
    }
  }, [services]);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}
