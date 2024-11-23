import {
  CoreServiceProvider,
  PlatformServiceProvider,
} from '@bangle.io/context';
import { LoggerProvider } from '@bangle.io/context/src/logger-context';
import type { Logger } from '@bangle.io/logger';
import type { Services } from '@bangle.io/types';
import React from 'react';

export function AppContextProvider({
  children,
  services,
  logger,
}: { children: React.ReactNode; services: Services; logger: Logger }) {
  return (
    <LoggerProvider logger={logger}>
      <PlatformServiceProvider services={services.platform}>
        <CoreServiceProvider services={services.core}>
          {children}
        </CoreServiceProvider>
      </PlatformServiceProvider>
    </LoggerProvider>
  );
}
