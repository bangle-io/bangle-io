import { APP_ENV, RELEASE_ID, sentryConfig } from '@bangle.io/config';
import {
  createPrivacySafeErrorReport,
  type ErrorReportingController,
  getCurrentBuildAssetDebugIds,
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
    if (stored === null) {
      return true;
    }
    return JSON.parse(stored) === true;
  } catch {
    // Consent must fail closed. A stored opt-out cannot be distinguished from
    // unavailable or corrupted storage, so do not send automatically.
    return false;
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
  let reportStoreFlushScheduled = false;
  let flushingReportStore = false;

  const keepAwaitingStoreBounded = (report: PrivacySafeErrorReport) => {
    reportsAwaitingStore.push(report);
    if (reportsAwaitingStore.length > MAX_REPORTS_AWAITING_STORE) {
      reportsAwaitingStore.splice(
        0,
        reportsAwaitingStore.length - MAX_REPORTS_AWAITING_STORE,
      );
    }
  };

  const flushReportStore = async () => {
    if (flushingReportStore || !manualReportHandler) {
      return;
    }
    flushingReportStore = true;
    try {
      while (reportsAwaitingStore.length > 0) {
        const currentHandler = manualReportHandler;
        if (!currentHandler) {
          return;
        }
        const report = reportsAwaitingStore[0];
        if (!report) {
          return;
        }
        try {
          await currentHandler(report);
        } catch {
          // Do not log here: reporting a queue failure through the same logger
          // would recurse. A later capture or handler registration retries it.
          return;
        }
        const index = reportsAwaitingStore.findIndex(
          (candidate) => candidate.id === report.id,
        );
        if (index >= 0) {
          reportsAwaitingStore.splice(index, 1);
        }
      }
    } finally {
      flushingReportStore = false;
    }
  };

  const scheduleReportStoreFlush = () => {
    if (reportStoreFlushScheduled) {
      return;
    }
    reportStoreFlushScheduled = true;
    queueMicrotask(() => {
      reportStoreFlushScheduled = false;
      void flushReportStore();
    });
  };

  const queueLocally = (report: PrivacySafeErrorReport) => {
    keepAwaitingStoreBounded(report);
    scheduleReportStoreFlush();
  };

  const controller: ErrorReportingController = {
    captureException(error) {
      if (capturedErrors.has(error)) {
        return;
      }
      capturedErrors.add(error);
      const report = createReport(error);
      if (!automaticEnabled) {
        queueLocally(report);
        return report;
      }

      void sendReport(
        report,
        REPORTING_MODE.automatic,
        automaticAbortController.signal,
      ).then((sent) => {
        if (!sent) {
          queueLocally(report);
        }
      });
      return report;
    },
    getAutomaticReportingEnabled() {
      return automaticEnabled;
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
      if (handler) {
        scheduleReportStoreFlush();
      }
    },
    async sendReports(reports) {
      const sentReportIds: string[] = [];
      for (const report of reports) {
        if (await sendReport(report, REPORTING_MODE.manual)) {
          sentReportIds.push(report.id);
        }
      }
      if (sentReportIds.length > 0) {
        const sentIds = new Set(sentReportIds);
        for (
          let index = reportsAwaitingStore.length - 1;
          index >= 0;
          index -= 1
        ) {
          if (sentIds.has(reportsAwaitingStore[index]?.id ?? '')) {
            reportsAwaitingStore.splice(index, 1);
          }
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
    buildAssetDebugIds: getCurrentBuildAssetDebugIds(),
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
              abs_path: frame.filename,
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
    debug_meta: {
      images: uniqueDebugImages(report.frames),
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

function uniqueDebugImages(frames: PrivacySafeErrorReport['frames']): Array<{
  type: 'sourcemap';
  code_file: string;
  debug_id: string;
}> {
  const images = new Map<string, { code_file: string; debug_id: string }>();
  for (const frame of frames) {
    images.set(frame.debugId, {
      code_file: frame.filename,
      debug_id: frame.debugId,
    });
  }
  return [...images.values()].map((image) => ({
    type: 'sourcemap' as const,
    ...image,
  }));
}
