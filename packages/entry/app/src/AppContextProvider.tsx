import {
  CoreServiceProvider,
  PlatformServiceProvider,
  RouterContext,
} from '@bangle.io/context';
import { LoggerProvider } from '@bangle.io/context/src/logger-context';
import type { Logger } from '@bangle.io/logger';
import type { Services, Store } from '@bangle.io/types';
import { Provider } from 'jotai';
import React from 'react';

export function AppContextProvider({
  children,
  services,
  logger,
  store,
}: {
  children: React.ReactNode;
  services: Services;
  logger: Logger;
  store: Store;
}) {
  return (
    <LoggerProvider logger={logger}>
      <Provider store={store}>
        <PlatformServiceProvider services={services.platform}>
          <CoreServiceProvider services={services.core}>
            <RouterContext>{children}</RouterContext>
          </CoreServiceProvider>
        </PlatformServiceProvider>
      </Provider>
    </LoggerProvider>
  );
}
