import './index.css';

import { App } from '@bangle.io/app';
import { ThemeManager } from '@bangle.io/color-scheme-manager';
import { THEME_MANAGER_CONFIG } from '@bangle.io/constants';
import { initializeServices } from '@bangle.io/initialize-services';
import { Logger } from '@bangle.io/logger';
import { RootEmitter } from '@bangle.io/root-emitter';
import { createStore } from 'jotai';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
const logger = new Logger(
  '',
  window.location.hostname === 'localhost' ||
    window.location.search.includes('debug=true')
    ? 'debug'
    : 'info',
);

const abortController = new AbortController();
const emitterLogger = logger.child('root-emitter');
const rootEmitter: RootEmitter = new RootEmitter({
  abortSignal: abortController.signal,
  onEvent: (event) => {
    emitterLogger.debug('[event]', event);
  },
});

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
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      logger={logger}
      services={services}
      store={store}
      rootEmitter={rootEmitter}
      themeManager={themeManager}
    />
  </StrictMode>,
);
