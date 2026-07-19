import { APP_ENV, RELEASE_ID, sentryConfig } from '@bangle.io/config';
import {
  createPrivacySafeErrorReport,
  type ErrorReportingController,
  type ManualErrorReportHandler,
  type PrivacySafeErrorReport,
} from '@bangle.io/initialize-services';
import { type Logger, setErrorReporter } from '@bangle.io/logger';

const REPORTING_MODE = {
  automatic: 'automatic',
  manual: 'manual',
} as const;

type ReportingMode = (typeof REPORTING_MODE)[keyof typeof REPORTING_MODE];
const MAX_REPORTS_AWAITING_STORE = 50;

export function readAutomaticErrorReportingPreference(
  storageKey: string,
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): boolean {
  try {
    const stored = storage.getItem(storageKey);
    return stored === null ? true : JSON.parse(stored) !== false;
  } catch {
    return true;
  }
}

export function initializeSentry(
  logger: Logger,
  automaticReportingEnabled: boolean,
): ErrorReportingController {
  let automaticEnabled = automaticReportingEnabled;
  let automaticAbortController = new AbortController();
  let manualReportHandler: ManualErrorReportHandler | undefined;
  const capturedErrors = new WeakSet<Error>();
  const reportsAwaitingStore: PrivacySafeErrorReport[] = [];

  const keepAwaitingStoreBounded = (report: PrivacySafeErrorReport) => {
    reportsAwaitingStore.push(report);
    if (reportsAwaitingStore.length > MAX_REPORTS_AWAITING_STORE) {
      reportsAwaitingStore.splice(
        0,
        reportsAwaitingStore.length - MAX_REPORTS_AWAITING_STORE,
      );
    }
  };

  const queueLocally = async (report: PrivacySafeErrorReport) => {
    if (!manualReportHandler) {
      keepAwaitingStoreBounded(report);
      return;
    }
    try {
      await manualReportHandler(report);
    } catch {
      // Do not log here: reporting a queue failure through the same logger
      // would recurse. Keep the already-sanitized report in memory instead.
      keepAwaitingStoreBounded(report);
    }
  };

  const controller: ErrorReportingController = {
    captureException(error) {
      if (capturedErrors.has(error)) {
        return;
      }
      capturedErrors.add(error);
      const report = createReport(error);
      if (!automaticEnabled) {
        void queueLocally(report);
        return;
      }

      void sendReport(
        report,
        REPORTING_MODE.automatic,
        automaticAbortController.signal,
      ).then((sent) => {
        if (!sent) {
          void queueLocally(report);
        }
      });
    },
    async setAutomaticReportingEnabled(enabled) {
      // This flag gates capture synchronously. No Sentry SDK is initialized,
      // so disabling cannot leave global handlers or session envelopes behind.
      automaticEnabled = enabled;
      if (!enabled) {
        automaticAbortController.abort();
        automaticAbortController = new AbortController();
      }
    },
    setManualReportHandler(handler) {
      manualReportHandler = handler;
      if (!handler || reportsAwaitingStore.length === 0) {
        return;
      }

      const pending = reportsAwaitingStore.splice(
        0,
        reportsAwaitingStore.length,
      );
      for (const report of pending) {
        void queueLocally(report);
      }
    },
    async sendReports(reports) {
      const sentReportIds: string[] = [];
      for (const report of reports) {
        if (await sendReport(report, REPORTING_MODE.manual)) {
          sentReportIds.push(report.id);
        }
      }
      return { sentReportIds };
    },
  };

  setErrorReporter(controller);
  logger.debug('Privacy-safe bug reporting initialized');
  return controller;
}

function createReport(error: Error): PrivacySafeErrorReport {
  const route = new URLSearchParams(window.location.hash.slice(1)).get('route');
  return createPrivacySafeErrorReport(error, {
    id: crypto.randomUUID(),
    capturedAt: new Date().toISOString(),
    route: route ?? undefined,
    release: RELEASE_ID,
    environment: APP_ENV,
  });
}

async function sendReport(
  report: PrivacySafeErrorReport,
  mode: ReportingMode,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const response = await fetch(getEnvelopeEndpoint(sentryConfig.dsn), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: serializeSentryEnvelope(report, mode),
      keepalive: true,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal,
    });
    return response.ok;
  } catch {
    return false;
  }
}

function getEnvelopeEndpoint(dsn: string): string {
  const url = new URL(dsn);
  const projectId = url.pathname.replace(/^\//, '');
  return `${url.protocol}//${url.host}/api/${projectId}/envelope/?sentry_version=7&sentry_key=${encodeURIComponent(url.username)}`;
}

export function serializeSentryEnvelope(
  report: PrivacySafeErrorReport,
  mode: ReportingMode,
): string {
  const eventId = report.id.replaceAll('-', '');
  const envelopeHeader = {
    event_id: eventId,
    sent_at: report.capturedAt,
  };
  const itemHeader = { type: 'event' };
  const event = {
    event_id: eventId,
    timestamp: Date.parse(report.capturedAt) / 1000,
    platform: 'javascript',
    level: 'error',
    environment: report.environment,
    release: report.release,
    exception: {
      values: [
        {
          type: report.errorType,
          value: 'Bangle application error',
          stacktrace: {
            frames: report.frames.map((frame) => ({
              filename: frame.filename,
              lineno: frame.lineNumber,
              colno: frame.columnNumber,
              in_app: true,
            })),
          },
          mechanism: {
            type: 'bangle.privacy-safe',
            handled: true,
          },
        },
      ],
    },
    tags: {
      error_type: report.errorType,
      report_schema: String(report.schemaVersion),
      reporting_mode: mode,
      route: report.route,
    },
    sdk: {
      name: 'bangle.privacy-safe-reporting',
      version: '1.0.0',
    },
  };

  return [envelopeHeader, itemHeader, event]
    .map((part) => JSON.stringify(part))
    .join('\n');
}
