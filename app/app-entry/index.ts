/// <reference path="./missing-types.d.ts" />

import React from 'react';
import ReactDOM from 'react-dom';

import { createNsmStore, initializeBangleStore } from '@bangle.io/bangle-store';
import { APP_ENV, sentryConfig } from '@bangle.io/config';

import { Entry } from './entry';
import { runAfterPolyfills } from './run-after-polyfills';

if (typeof window !== undefined && APP_ENV !== 'local') {
  (window as any).Sentry?.onLoad(function () {
    import('./SentryTracing').then(({ Integrations }) => {
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

runAfterPolyfills(() => {
  let storeChanged = 0;
  const root = document.getElementById('root');

  const nsmStore = createNsmStore();

  (window as any).nsmStore = nsmStore;
  const store = initializeBangleStore({
    onUpdate: () => {
      ReactDOM.render(
        React.createElement(Entry, {
          storeChanged: storeChanged++,
          store,
          nsmStore,
        }),
        root,
      );
    },
  });

  ReactDOM.render(
    React.createElement(Entry, {
      nsmStore,
      storeChanged: storeChanged++,
      store,
    }),
    root,
  );
});
