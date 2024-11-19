import { BaseService, type DatabaseService } from '@bangle.io/base-utils';
import type { Logger } from '@bangle.io/logger';
import React, { useEffect, createContext } from 'react';

type PlatformServices = {
  database: DatabaseService;
  logger: Logger;
};

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
