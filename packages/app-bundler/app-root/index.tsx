import './style';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

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

let _terminateNaukar: (() => Promise<void>) | undefined;

main().catch((err) => {
  console.error(err);
  root.render(
    <React.StrictMode>
      <ShowAppRootError error={err} />
    </React.StrictMode>,
  );

  void _terminateNaukar?.();
});

async function main() {
  const debugFlags = getDebugFlag();

  if (debugFlags?.testShowAppRootSetupError) {
    throw new Error('This is debug Test error!');
  }

  const { naukarRemote, naukarTerminate } = setupWorker({ debugFlags });

  _terminateNaukar = naukarTerminate;

  const eternalVars = setupEternalVarsWindow({
    naukarRemote,
    debugFlags,
  });

  window._nsmE2e = {
    config,
    naukar: naukarRemote,
  };

  root.render(
    <React.StrictMode>
      <ErrorBoundary
        fallbackRender={({ error }) => <ShowAppRootError error={error} />}
      >
        <App eternalVars={eternalVars} />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
