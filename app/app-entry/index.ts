/// <reference path="./missing-types.d.ts" />

import React from 'react';
import ReactDOM from 'react-dom';

import { APP_ENV, RELEASE_ID, sentryConfig } from '@bangle.io/config';

import { LoadingBlock } from './LoadingBlock';

const root = document.getElementById('root');

if (typeof window !== undefined && APP_ENV !== 'local') {
  (window as any).Sentry?.onLoad(function () {
    import(
      /* webpackChunkName: "@sentry/tracing" */
      /* webpackPrefetch: true */
      '@sentry/tracing'
    ).then(({ Integrations }) => {
      (window as any).Sentry.init({
        ...sentryConfig,
        integrations: [new Integrations.BrowserTracing()],
      });
    });
  });

  if ('scrollRestoration' in window.history) {
    // Back off, browser, I got this...
    window.history.scrollRestoration = 'manual';
  }

  (window as any).simulateError = () => {
    throw new Error('I am a simulated error');
  };
}

ReactDOM.render(React.createElement(LoadingBlock, {}), root);
