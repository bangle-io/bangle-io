import type { BaseService, DatabaseService } from '@bangle.io/base-utils';
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
    services.database.initialize();
  }, [services.database]);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}
