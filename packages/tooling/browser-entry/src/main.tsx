import './default-theme.processed.css';
import './index.css';

import { App } from '@bangle.io/app';
import { ThemeManager } from '@bangle.io/color-scheme-manager';
import { THEME_MANAGER_CONFIG } from '@bangle.io/constants';
import { initializeServices } from '@bangle.io/initialize-services';
import { Logger } from '@bangle.io/logger';
import { createStore } from 'jotai';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setupRootEmitter } from './setup-root-emitter';
import { initializeSentry } from './setup-sentry';

const isDebug =
  window.location.hostname === 'localhost' ||
  window.location.search.includes('debug=true');

const startupLogger = new Logger('', isDebug ? 'debug' : 'info');

void main(startupLogger).catch((error) => {
  handleStartupFailure(error, startupLogger);
});

async function main(logger: Logger) {
  // Initialize Sentry with privacy protections
  initializeSentry(logger, isDebug);

  const abortController = new AbortController();
  const tabId = `tab_${Math.random().toString(36).substr(2, 9)}`;

  const rootEmitter = setupRootEmitter(
    'bangle_io_channel',
    tabId,
    logger,
    abortController.signal,
  );

  const store = createStore();
  const themeManager = new ThemeManager(THEME_MANAGER_CONFIG);
  const services = await initializeServices(
    logger,
    rootEmitter,
    store,
    themeManager,
    abortController.signal,
  );

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  const root = createRoot(rootElement);

  root.render(
    <StrictMode>
      <App
        logger={logger}
        services={services}
        store={store}
        rootEmitter={rootEmitter}
      />
    </StrictMode>,
  );

  if (isDebug) {
    (window as any).services = services;
  }

  abortController.signal.addEventListener('abort', () => {
    root.unmount();
  });

  rootEmitter.on(
    'event::app:reload-ui',
    () => {
      logger.info('-------------Reloading UI-------------');
      abortController.abort();
      queueMicrotask(() => {
        void main(logger).catch((error) => {
          handleStartupFailure(error, logger);
        });
      });
    },
    abortController.signal,
  );
}

function handleStartupFailure(error: unknown, logger: Logger) {
  logger.error('Unable to start Bangle', error);
  renderStartupError(error);
}

export function renderStartupError(error: unknown) {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Unable to show startup failure because #root is missing');
    return;
  }

  createRoot(rootElement).render(
    <StrictMode>
      <StartupErrorView error={error} />
    </StrictMode>,
  );
}

function StartupErrorView({ error }: { error: unknown }) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : t.app.pageStartupError.description;

  return (
    <main
      role="alert"
      aria-labelledby="startup-error-title"
      className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground"
    >
      <section className="w-full max-w-xl rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h1 id="startup-error-title" className="font-semibold text-2xl">
          {t.app.pageStartupError.title}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {t.app.pageStartupError.description}
        </p>
        <details className="mt-4 rounded-md border bg-muted/40 p-3">
          <summary className="cursor-pointer font-medium text-sm">
            {t.app.pageStartupError.detailsLabel}
          </summary>
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-muted-foreground text-xs">
            {message}
          </pre>
        </details>
        <button
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm"
          type="button"
          onClick={() => window.location.reload()}
        >
          {t.app.pageStartupError.reloadButton}
        </button>
      </section>
    </main>
  );
}
