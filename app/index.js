import 'style/index.js';
import { UIManager } from 'ui-context/index';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, matchPath } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import App from './App';
import { EditorManager } from './editor/EditorManager';
import { RELEASE_ID, DEPLOY_ENV } from 'config/index';
import { createBrowserHistory } from 'history';
const history = createBrowserHistory();

const routes = [{ path: '/ws/:wsName' }, { path: '/' }];
if (DEPLOY_ENV !== 'local') {
  Sentry.init({
    environment: DEPLOY_ENV,
    dsn:
      'https://f1a3d53e530e465e8f74f847370b594b@o573373.ingest.sentry.io/5723848',
    integrations: [
      new Integrations.BrowserTracing({
        routingInstrumentation: Sentry.reactRouterV5Instrumentation(
          history,
          routes,
          matchPath,
        ),
      }),
    ],
    release: RELEASE_ID,
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
  });
}

const root = document.getElementById('root');

ReactDOM.render(
  <Router history={history}>
    <UIManager>
      <EditorManager>
        <App />
      </EditorManager>
    </UIManager>
  </Router>,
  root,
);
