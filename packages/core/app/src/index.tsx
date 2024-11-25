import '@bangle.io/editor/src/style.css';

import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import {
  CoreServiceProvider,
  LoggerProvider,
  PlatformServiceProvider,
  RouterContext,
} from '@bangle.io/context';
import type { Logger } from '@bangle.io/logger';
import type { ErrorEmitter, Services, Store } from '@bangle.io/types';
import { Provider } from 'jotai/react';
import React, { useEffect } from 'react';
import { AppInner } from './AppInner';

export function App({
  logger,
  store,
  errorEmitter,
  services,
  themeManager,
}: {
  logger: Logger;
  store: Store;
  errorEmitter: ErrorEmitter;
  services: Services;
  themeManager: ThemeManager;
}) {
  useEffect(() => {
    const remove = themeManager.onThemeChange((theme) => {
      logger.debug('theme changed', theme);
    });

    return () => {
      remove();
    };
  }, [themeManager, logger]);

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
