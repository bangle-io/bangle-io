import './default-theme.processed.css';
import './index.css';

import { App, consumePwaLaunchParams } from '@bangle.io/app';
import { ThemeManager } from '@bangle.io/color-scheme-manager';
import {
  AUTOMATIC_ERROR_REPORTING_STORAGE_KEY,
  THEME_MANAGER_CONFIG,
} from '@bangle.io/constants';
import {
  createEditorSaveCoordinator,
  type ErrorReportingController,
  initializeServices,
  type PrivacySafeErrorReport,
} from '@bangle.io/initialize-services';
import { Logger } from '@bangle.io/logger';
import { createStore } from 'jotai';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setupRootEmitter } from './setup-root-emitter';
import {
  initializeSentry,
  readAutomaticErrorReportingPreference,
} from './setup-sentry';

const isDebug =
  window.location.hostname === 'localhost' ||
  window.location.search.includes('debug=true');

const startupLogger = new Logger('', isDebug ? 'debug' : 'info');
const editorSaveCoordinator = createEditorSaveCoordinator();
const errorReporting = initializeSentry(
  startupLogger,
  readAutomaticErrorReportingPreference(AUTOMATIC_ERROR_REPORTING_STORAGE_KEY),
);

void main(startupLogger, errorReporting).catch((error) => {
  handleStartupFailure(error, startupLogger, errorReporting);
});

async function main(
  logger: Logger,
  errorReportingController: ErrorReportingController,
) {
  // Consume PWA launch params (?launch=, ?shortcut=) before any service is
  // constructed: the router captures `window.location.search` at creation
  // and re-emits it on every navigation, so a param still present here
  // would be re-added to the URL and replayed on reload. Idempotent, so the
  // in-app fallback consumer stays harmless.
  consumePwaLaunchParams(window);

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
      editorSaveCoordinator,
      errorReportingController,
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
        void main(logger, errorReportingController).catch((error) => {
          handleStartupFailure(error, logger, errorReportingController);
        });
      });
    },
    abortController.signal,
  );
}

function handleStartupFailure(
  error: unknown,
  logger: Logger,
  errorReportingController: ErrorReportingController,
) {
  const reportableError =
    error instanceof Error ? error : new Error('Unable to start Bangle');
  logger.error('Unable to start Bangle', reportableError);
  // The normal IndexedDB-backed UI did not finish mounting. Keep this report
  // in the controller's bounded memory queue so the standalone recovery view
  // owns its send lifecycle and cannot leave a duplicate durable row behind.
  errorReportingController.setManualReportHandler(undefined);
  const report = errorReportingController.captureException(reportableError);
  renderStartupError(
    error,
    report && !errorReportingController.getAutomaticReportingEnabled()
      ? { controller: errorReportingController, report }
      : undefined,
  );
}

export function renderStartupError(
  error: unknown,
  manualBugReport?: {
    controller: ErrorReportingController;
    report: PrivacySafeErrorReport;
  },
) {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Unable to show startup failure because #root is missing');
    return;
  }

  createRoot(rootElement).render(
    <StrictMode>
      <StartupErrorView error={error} manualBugReport={manualBugReport} />
    </StrictMode>,
  );
}

function StartupErrorView({
  error,
  manualBugReport,
}: {
  error: unknown;
  manualBugReport?: {
    controller: ErrorReportingController;
    report: PrivacySafeErrorReport;
  };
}) {
  const [sendState, setSendState] = React.useState<
    'idle' | 'sending' | 'sent' | 'failed'
  >('idle');
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
        {manualBugReport ? (
          <section className="mt-4 rounded-md border bg-muted/40 p-3">
            <h2 className="font-semibold text-lg">
              {t.app.bugReportPrompt.title}
            </h2>
            <p className="mt-2 text-muted-foreground text-sm">
              {t.app.bugReportPrompt.reassurance}
            </p>
            <h3 className="mt-3 font-medium text-sm">
              {t.app.bugReportPrompt.previewLabel}
            </h3>
            <pre
              className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-muted-foreground text-xs"
              data-testid="startup-bug-report-preview"
            >
              {JSON.stringify(manualBugReport.report, null, 2)}
            </pre>
            <button
              className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm disabled:opacity-50"
              disabled={sendState === 'sending' || sendState === 'sent'}
              type="button"
              onClick={() => {
                setSendState('sending');
                void manualBugReport.controller
                  .sendReports([manualBugReport.report])
                  .then(({ sentReportIds }) => {
                    setSendState(
                      sentReportIds.includes(manualBugReport.report.id)
                        ? 'sent'
                        : 'failed',
                    );
                  })
                  .catch(() => setSendState('failed'));
              }}
            >
              {sendState === 'sending'
                ? t.app.bugReportPrompt.sendingReport
                : sendState === 'sent'
                  ? t.app.bugReportPrompt.reportSent
                  : t.app.bugReportPrompt.sendReport}
            </button>
            {sendState === 'failed' ? (
              <p className="mt-2 text-destructive text-sm" role="status">
                {t.app.bugReportPrompt.reportSendFailed}
              </p>
            ) : null}
          </section>
        ) : null}
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
