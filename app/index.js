import 'style/index.js';
import { UIManager } from 'ui-context/index';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, matchPath } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import App from './App';
import { EditorManager } from './editor/EditorManager';
import { GIT_HASH } from 'config/index';
import { createBrowserHistory } from 'history';
const history = createBrowserHistory();

const routes = [{ path: '/ws/:wsName' }, { path: '/' }];

Sentry.init({
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
  release: 'bangle-io@' + GIT_HASH,
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

const root = document.getElementById('root');

ReactDOM.render(
  <Router history={history}>
    <EditorManager>
      <UIManager>
        <App />
      </UIManager>
    </EditorManager>
  </Router>,
  root,
);
