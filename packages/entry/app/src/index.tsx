import '@bangle.io/editor/src/style.css';

import { Emitter } from '@bangle.io/emitter';
import { Logger } from '@bangle.io/logger';
import type { ErrorEmitter } from '@bangle.io/types';
import { createStore } from 'jotai';
import React from 'react';
import { AppContextProvider } from './AppContextProvider';
import { AppInner } from './AppInner';
import { initializeServices } from './service-setup';

const logger = new Logger(
  '',
  window.location.hostname === 'localhost' ||
    window.location.search.includes('debug=true')
    ? 'debug'
    : 'info',
);

const errorEmitter: ErrorEmitter = new Emitter();
const store = createStore();
const services = initializeServices(logger, errorEmitter, store);

export function App() {
  return (
    <AppContextProvider services={services} logger={logger} store={store}>
      <AppInner errorEmitter={errorEmitter} />
    </AppContextProvider>
  );
}
