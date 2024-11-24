import '@bangle.io/editor/src/style.css';

import {
  CoreServiceProvider,
  LoggerProvider,
  PlatformServiceProvider,
  RouterContext,
} from '@bangle.io/context';
import type { Logger } from '@bangle.io/logger';
import type { ErrorEmitter, Services, Store } from '@bangle.io/types';
import { Provider } from 'jotai/react';
import React from 'react';

import { AppInner } from './AppInner';

export function App({
  logger,
  store,
  errorEmitter,
  services,
}: {
  logger: Logger;
  store: Store;
  errorEmitter: ErrorEmitter;
  services: Services;
}) {
  return (
    <LoggerProvider logger={logger}>
      <Provider store={store}>
        <PlatformServiceProvider services={services.platform}>
          <CoreServiceProvider services={services.core}>
            <RouterContext>
              <AppInner errorEmitter={errorEmitter} />
            </RouterContext>
          </CoreServiceProvider>
        </PlatformServiceProvider>
      </Provider>
    </LoggerProvider>
  );
}
