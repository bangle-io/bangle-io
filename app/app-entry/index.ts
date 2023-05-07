/// <reference path="./missing-types.d.ts" />

import React from 'react';
import ReactDOM from 'react-dom';

import { internals } from '@bangle.io/api';
import { createNsmStore, initializeBangleStore } from '@bangle.io/bangle-store';
import { APP_ENV, sentryConfig } from '@bangle.io/config';
import { onBeforeStoreLoad } from '@bangle.io/shared';

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

  const { registry } = onBeforeStoreLoad();
  const nsmStore = createNsmStore({
    extensionRegistry: registry,
  });

  (window as any).globalNsmStore = nsmStore;

  internals.setStore(nsmStore);

  const store = initializeBangleStore({
    extensionRegistry: registry,
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

  // TODO remove this
  (nsmStore as any).oldStore = store;
  (store as any).newStore = nsmStore;

  ReactDOM.render(
    React.createElement(Entry, {
      nsmStore,
      storeChanged: storeChanged++,
      store,
    }),
    root,
  );
});
