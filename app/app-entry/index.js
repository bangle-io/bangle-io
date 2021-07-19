import { DEPLOY_ENV, RELEASE_ID } from 'config';
import React from 'react';
import ReactDOM from 'react-dom';
import { Entry } from './entry';
const root = document.getElementById('root');

if (typeof window !== undefined) {
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
  if ('scrollRestoration' in window.history) {
    // Back off, browser, I got this...
    window.history.scrollRestoration = 'manual';
  }
}
ReactDOM.render(React.createElement(Entry, {}), root);
