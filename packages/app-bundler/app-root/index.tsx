import './style';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from '@bangle.io/app';
import { config } from '@bangle.io/config';
import { assertIsDefined } from '@bangle.io/mini-js-utils';
import { setupEternalVarsWindow } from '@bangle.io/setup-eternal-vars/window';
import { setupWorker } from '@bangle.io/setup-worker';

import { getDebugFlag } from './helpers';
import { ShowAppRootError } from './ShowAppRootError';

const rootElement = document.getElementById('root');
assertIsDefined(rootElement, 'root element is not defined');
const root = ReactDOM.createRoot(rootElement);

main().catch((err) => {
  console.error(err);
  root.render(
    <React.StrictMode>
      <ShowAppRootError error={err} />
    </React.StrictMode>,
  );
});

async function main() {
  const debugFlags = getDebugFlag();

  if (debugFlags?.testShowAppRootError) {
    throw new Error('This is debug Test error!');
  }

  const { naukarRemote, naukarTerminate } = setupWorker();

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
