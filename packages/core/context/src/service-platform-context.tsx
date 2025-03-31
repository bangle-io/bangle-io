import type { PlatformServices } from '@bangle.io/types';
import React, { createContext } from 'react';

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
  return <ServiceContext value={services}>{children}</ServiceContext>;
}
