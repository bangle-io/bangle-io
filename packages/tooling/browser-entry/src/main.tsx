import './default-theme.processed.css';
import './index.css';

import { App } from '@bangle.io/app';
import { ThemeManager } from '@bangle.io/color-scheme-manager';
import { THEME_MANAGER_CONFIG } from '@bangle.io/constants';
import { initializeServices } from '@bangle.io/initialize-services';
import { Logger } from '@bangle.io/logger';
import { createStore } from 'jotai';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setupRootEmitter } from './setup-root-emitter';
import { initializeSentry } from './setup-sentry';

const isDebug =
  window.location.hostname === 'localhost' ||
  window.location.search.includes('debug=true');

main();

function main() {
  const logger = new Logger('', isDebug ? 'debug' : 'info');

  // Initialize Sentry with privacy protections
  initializeSentry(logger, isDebug);

  const abortController = new AbortController();
  const tabId = `tab_${Math.random().toString(36).substr(2, 9)}`;

  const rootEmitter = setupRootEmitter(
    'bangle_io_channel',
    tabId,
    logger,
    abortController.signal,
  );

  const store = createStore();
  const themeManager = new ThemeManager(THEME_MANAGER_CONFIG);
  const services = initializeServices(
    logger,
    rootEmitter,
    store,
    themeManager,
    abortController.signal,
  );

  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  const root = createRoot(document.getElementById('root')!);

  root.render(
    <StrictMode>
      <App
        logger={logger}
        services={services}
        store={store}
        rootEmitter={rootEmitter}
      />
    </StrictMode>,
  );

  if (isDebug) {
    (window as any).services = services;
  }

  abortController.signal.addEventListener('abort', () => {
    root.unmount();
  });

  rootEmitter.on(
    'event::app:reload-ui',
    () => {
      logger.info('-------------Reloading UI-------------');
      abortController.abort();
      queueMicrotask(() => {
        main();
      });
    },
    abortController.signal,
  );
}
