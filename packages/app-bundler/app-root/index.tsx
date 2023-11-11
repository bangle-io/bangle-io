import './style';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from '@bangle.io/app';
import { config } from '@bangle.io/config';
import { assertIsDefined } from '@bangle.io/mini-js-utils';
import { setupEternalVarsWindow } from '@bangle.io/setup-eternal-vars/window';
import { setupWorker } from '@bangle.io/setup-worker';
const rootElement = document.getElementById('root');
assertIsDefined(rootElement, 'root element is not defined');
const root = ReactDOM.createRoot(rootElement);

void main();

async function main() {
  const { naukarRemote, naukarTerminate } = setupWorker();

  // await naukarRemote.isReady();

  setupEternalVarsWindow({
    naukarRemote,
  });

  window._nsmE2e = {
    config,
    naukar: naukarRemote,
  };

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
