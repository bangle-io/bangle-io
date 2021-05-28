import 'style/index.js';
import { UIManager } from 'ui-context/index';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { EditorManager } from 'editor-manager-context/index';
import { RELEASE_ID, DEPLOY_ENV } from 'config/index';

window.Sentry?.onLoad(function () {
  import(
    /* webpackChunkName: "@sentry/tracing" */
    /* webpackPrefetch: true */
    '@sentry/tracing'
  ).then(({ Integrations }) => {
    window.Sentry.init({
      environment: DEPLOY_ENV,
      dsn: 'https://f1a3d53e530e465e8f74f847370b594b@o573373.ingest.sentry.io/5723848',
      integrations: [new Integrations.BrowserTracing()],
      release: RELEASE_ID,
      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: DEPLOY_ENV === 'local' ? 0 : 0.1,
    });
  });
});

const root = document.getElementById('root');

ReactDOM.render(
  <Router>
    <UIManager>
      <EditorManager>
        <App />
      </EditorManager>
    </UIManager>
  </Router>,
  root,
);
