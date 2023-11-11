import './style';

import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import { App } from '@bangle.io/app';
import { AppDatabaseIndexedDB } from '@bangle.io/app-database-indexeddb';
import { config, sentryConfig } from '@bangle.io/config';
import { assertIsDefined } from '@bangle.io/mini-js-utils';
import { setupEternalVarsWindow } from '@bangle.io/setup-eternal-vars/window';
import { setupWorker } from '@bangle.io/setup-worker';

import { getDebugFlag } from './helpers';
import { ShowAppRootError } from './ShowAppRootError';

const rootElement = document.getElementById('root');
assertIsDefined(rootElement, 'root element is not defined');
const root = ReactDOM.createRoot(rootElement);

let _terminateNaukar: (() => Promise<void>) | undefined;

main().catch((error) => {
  root.render(
    <React.StrictMode>
      <ShowAppRootError error={error} />
    </React.StrictMode>,
  );
  void _terminateNaukar?.();
  throw error;
});

async function main() {
  Sentry.init({
    ...sentryConfig,
    integrations: [
      // new Sentry.BrowserTracing({
      //   tracePropagationTargets: ['localhost', /^https:\/\/[\w-]+\.bangle\.io/],
      // }),
      // new Sentry.Replay(),
    ],
  });

  const debugFlags = getDebugFlag();

  if (debugFlags?.testShowAppRootSetupError) {
    throw new Error('This is debug Test error!');
  }

  const { naukarRemote, naukarTerminate } = setupWorker({ debugFlags });

  window._nsmE2e = {
    config,
    naukar: naukarRemote,
  };

  _terminateNaukar = naukarTerminate;

  const eternalVars = setupEternalVarsWindow({
    naukarRemote,
    debugFlags,
    baseDatabase: new AppDatabaseIndexedDB(),
  });

  root.render(
    <React.StrictMode>
      <ErrorBoundary
        fallbackRender={({ error }) => <ShowAppRootError error={error} />}
        onError={(error) => {
          Sentry.captureException(error);
        }}
      >
        <App eternalVars={eternalVars} />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
