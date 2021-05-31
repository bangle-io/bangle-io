import './style';
import { UIManager } from 'ui-context/index';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { EditorManager } from 'editor-manager-context/index';
import { RELEASE_ID, DEPLOY_ENV } from 'config/index';
import { polyfills } from 'polyfill/index';
import { setupNaukar } from './setup-naukar/setup-naukar';
import { setNaukarReady } from 'naukar-proxy/index';

setupNaukar().then((naukar) => {
  setNaukarReady(naukar);
});

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

function LoadingBlock({ children }) {
  const [loaded, updateLoaded] = useState(() => {
    return polyfills.length === 0;
  });
  useEffect(() => {
    if (polyfills.length > 0) {
      console.debug('Polyfilling ' + polyfills.length + ' features.');
      Promise.all(polyfills).then(() => [updateLoaded(true)]);
    }
  }, []);
  return loaded ? children : null;
}

ReactDOM.render(
  <LoadingBlock>
    <Router>
      <UIManager>
        <EditorManager>
          <App />
        </EditorManager>
      </UIManager>
    </Router>
  </LoadingBlock>,
  root,
);
