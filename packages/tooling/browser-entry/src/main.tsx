import './index.css';

import { App } from '@bangle.io/app';
import { ThemeManager } from '@bangle.io/color-scheme-manager';
import { THEME_MANAGER_CONFIG } from '@bangle.io/constants';
import { Emitter } from '@bangle.io/emitter';
import { initializeServices } from '@bangle.io/initialize-services';
import { Logger } from '@bangle.io/logger';
import type { ErrorEmitter } from '@bangle.io/types';
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

const errorEmitter: ErrorEmitter = new Emitter();
const store = createStore();
const themeManager = new ThemeManager(THEME_MANAGER_CONFIG);
const services = initializeServices(logger, errorEmitter, store, themeManager);

// biome-ignore lint/style/noNonNullAssertion: <explanation>
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      logger={logger}
      services={services}
      store={store}
      errorEmitter={errorEmitter}
      themeManager={themeManager}
    />
  </StrictMode>,
);
