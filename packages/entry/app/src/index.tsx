import '@bangle.io/editor/src/style.css';

import { Emitter } from '@bangle.io/emitter';
import { Logger } from '@bangle.io/logger';
import type { ErrorEmitter } from '@bangle.io/types';
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
const services = initializeServices(logger, errorEmitter);

export function App() {
  return (
    <AppContextProvider services={services} logger={logger}>
      <AppInner errorEmitter={errorEmitter} />
    </AppContextProvider>
  );
}
