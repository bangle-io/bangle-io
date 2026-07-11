import './default-theme.processed.css';
import './index.css';

import { App } from '@bangle.io/app';
import { ThemeManager } from '@bangle.io/color-scheme-manager';
import {
  DEFAULT_EDITOR_ENGINE,
  EDITOR_ENGINE_QUERY_PARAM,
  THEME_MANAGER_CONFIG,
} from '@bangle.io/constants';
import {
  initializeServices,
  readEditorEngineFromUrl,
} from '@bangle.io/initialize-services';
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

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

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
  let services: Awaited<ReturnType<typeof initializeServices>>;
  try {
    services = await initializeServices(
      logger,
      rootEmitter,
      store,
      themeManager,
      abortController.signal,
    );
  } catch (error) {
    abortController.abort();
    throw error;
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
  if (recoverFromExperimentalEngineFailure(logger)) {
    return;
  }
  renderStartupError(error);
}

/**
 * Boot guard for the experimental editor engine (plans/011 M0b): if startup
 * failed while a non-default engine was selected, replace the URL selection
 * and reload so the stable engine boots instead. An experimental
 * engine must never be able to brick the app — and this escape hatch cannot
 * live inside the thing that is broken. After the reset the URL reads as the
 * default, so a second failure falls through to the error screen
 * rather than looping.
 */
export function recoverFromExperimentalEngineFailure(
  logger: Pick<Logger, 'error'>,
  reload: () => void = () => window.location.reload(),
): boolean {
  if (readEditorEngineFromUrl() === DEFAULT_EDITOR_ENGINE) {
    return false;
  }
  const url = new URL(window.location.href);
  url.searchParams.set(EDITOR_ENGINE_QUERY_PARAM, DEFAULT_EDITOR_ENGINE);
  window.history.replaceState(window.history.state, '', url);
  logger.error(
    `Experimental editor engine failed to boot; falling back to "${DEFAULT_EDITOR_ENGINE}" and reloading`,
  );
  reload();
  return true;
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
