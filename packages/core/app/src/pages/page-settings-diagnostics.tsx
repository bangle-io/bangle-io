import { writeTextToClipboard } from '@bangle.io/browser-utils';
import {
  APP_BUILD_ID,
  APP_BUILD_TIME,
  APP_ENV,
  RELEASE_VERSION,
} from '@bangle.io/config';
import { Button } from '@bangle.io/ui-components';
import { Check, ClipboardCopy, LoaderCircle } from 'lucide-react';
import React from 'react';

export type DiagnosticsEnvironment =
  | 'production'
  | 'staging'
  | 'local'
  | 'development'
  | 'unknown';
type DiagnosticsRuntime = 'browser' | 'pwa' | 'desktop' | 'unknown';
type DiagnosticsConnection = 'online' | 'offline' | 'unknown';
type DiagnosticsCapability = 'supported' | 'unsupported' | 'unknown' | 'error';
type DiagnosticsPersistence =
  | 'persisted'
  | 'not-persisted'
  | 'unsupported'
  | 'unknown'
  | 'error';

type DiagnosticsStorageEstimate =
  | Readonly<{
      state: 'available';
      usageMiB: number;
      quotaMiB: number;
      percentUsed: number;
    }>
  | Readonly<{
      state: 'unsupported' | 'unknown' | 'error';
    }>;

/**
 * The complete diagnostics disclosure surface. Browser objects never cross
 * this seam, so adding a field requires an explicit type and formatter change.
 */
export type DiagnosticsSnapshot = Readonly<{
  version: string;
  buildId: string;
  buildTime: string;
  environment: DiagnosticsEnvironment;
  generatedAtUtc: string;
  runtime: DiagnosticsRuntime;
  connection: DiagnosticsConnection;
  indexedDb: DiagnosticsCapability;
  nativeFileSystemPicker: DiagnosticsCapability;
  storageEstimate: DiagnosticsStorageEstimate;
  storagePersistence: DiagnosticsPersistence;
}>;

type StorageEstimateInput = Readonly<{
  usage?: number;
  quota?: number;
}>;

export type DiagnosticsProbes = Readonly<{
  runtime: () => DiagnosticsRuntime;
  connection: () => DiagnosticsConnection;
  indexedDb: () => DiagnosticsCapability;
  nativeFileSystemPicker: () => DiagnosticsCapability;
  estimateStorage?: () => Promise<StorageEstimateInput>;
  storagePersisted?: () => Promise<boolean>;
}>;

type DiagnosticsBuildInfo = Readonly<{
  version: string;
  buildId: string;
  buildTime: string;
  environment: string;
}>;

type BrowserWindow = Pick<Window, 'indexedDB' | 'matchMedia'> & {
  bangleDesktop?: unknown;
  showDirectoryPicker?: unknown;
};

type BrowserNavigator = Pick<Navigator, 'onLine'> & {
  standalone?: boolean;
  storage?: {
    estimate?: () => Promise<StorageEstimateInput>;
    persisted?: () => Promise<boolean>;
  };
};

type AsyncProbeResult<T> =
  | { state: 'available'; value: T }
  | { state: 'unsupported' | 'unknown' | 'error' };

const MIB = 1024 * 1024;
const DEFAULT_PROBE_TIMEOUT_MS = 2_000;
const PWA_DISPLAY_MODE_QUERIES = [
  '(display-mode: standalone)',
  '(display-mode: window-controls-overlay)',
] as const;

const DEFAULT_BUILD_INFO: DiagnosticsBuildInfo = {
  version: RELEASE_VERSION,
  buildId: APP_BUILD_ID,
  buildTime: APP_BUILD_TIME,
  environment: APP_ENV,
};

function unavailableWindow(): BrowserWindow | undefined {
  return typeof window === 'undefined' ? undefined : window;
}

function unavailableNavigator(): BrowserNavigator | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator;
}

export function normalizeDiagnosticsEnvironment(
  environment: string,
): DiagnosticsEnvironment {
  if (environment === 'production') {
    return 'production';
  }
  if (environment === 'staging') {
    return 'staging';
  }
  if (environment === 'local') {
    return 'local';
  }
  if (
    environment === 'development' ||
    environment === 'dev' ||
    environment.startsWith('dev/')
  ) {
    return 'development';
  }
  return 'unknown';
}

function safeUtc(value: string): string {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? 'unknown'
    : timestamp.toISOString();
}

function safeSyncProbe<T>(probe: () => T, fallback: T): T {
  try {
    return probe();
  } catch {
    return fallback;
  }
}

function rejectedProbe<T>(): Promise<T> {
  return Promise.reject();
}

function getStorageEstimateProbe(
  storage: BrowserNavigator['storage'] | undefined,
  storageAccessFailed: boolean,
): (() => Promise<StorageEstimateInput>) | undefined {
  if (storageAccessFailed) {
    return rejectedProbe;
  }

  try {
    const estimate = storage?.estimate;
    return typeof estimate === 'function'
      ? () => estimate.call(storage)
      : undefined;
  } catch {
    return rejectedProbe;
  }
}

function getStoragePersistedProbe(
  storage: BrowserNavigator['storage'] | undefined,
  storageAccessFailed: boolean,
): (() => Promise<boolean>) | undefined {
  if (storageAccessFailed) {
    return rejectedProbe;
  }

  try {
    const persisted = storage?.persisted;
    return typeof persisted === 'function'
      ? () => persisted.call(storage)
      : undefined;
  } catch {
    return rejectedProbe;
  }
}

/** Creates the only production adapter for the browser diagnostics probes. */
export function createBrowserDiagnosticsProbes(
  windowRef: BrowserWindow | undefined = unavailableWindow(),
  navigatorRef: BrowserNavigator | undefined = unavailableNavigator(),
): DiagnosticsProbes {
  let storage: BrowserNavigator['storage'] | undefined;
  let storageAccessFailed = false;
  try {
    storage = navigatorRef?.storage;
  } catch {
    storageAccessFailed = true;
  }

  return {
    runtime: () =>
      safeSyncProbe<DiagnosticsRuntime>(() => {
        if (!windowRef || !navigatorRef) {
          return 'unknown';
        }
        if (windowRef.bangleDesktop !== undefined) {
          return 'desktop';
        }
        if (
          PWA_DISPLAY_MODE_QUERIES.some(
            (query) => windowRef.matchMedia?.(query).matches === true,
          ) ||
          navigatorRef.standalone === true
        ) {
          return 'pwa';
        }
        return 'browser';
      }, 'unknown'),
    connection: () =>
      safeSyncProbe<DiagnosticsConnection>(() => {
        if (typeof navigatorRef?.onLine !== 'boolean') {
          return 'unknown';
        }
        return navigatorRef.onLine ? 'online' : 'offline';
      }, 'unknown'),
    indexedDb: () => {
      if (!windowRef) {
        return 'unknown';
      }
      return safeSyncProbe<DiagnosticsCapability>(
        () => (windowRef.indexedDB === undefined ? 'unsupported' : 'supported'),
        'error',
      );
    },
    nativeFileSystemPicker: () => {
      if (!windowRef) {
        return 'unknown';
      }
      return safeSyncProbe<DiagnosticsCapability>(
        () =>
          typeof windowRef.showDirectoryPicker === 'function'
            ? 'supported'
            : 'unsupported',
        'error',
      );
    },
    estimateStorage: getStorageEstimateProbe(storage, storageAccessFailed),
    storagePersisted: getStoragePersistedProbe(storage, storageAccessFailed),
  };
}

function settleAsyncProbe<T>(
  probe: (() => Promise<T>) | undefined,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<AsyncProbeResult<T>> {
  if (!probe) {
    return Promise.resolve({ state: 'unsupported' });
  }

  let pending: Promise<T>;
  try {
    pending = probe();
  } catch {
    return Promise.resolve({ state: 'error' });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: AsyncProbeResult<T>) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abort);
      resolve(result);
    };
    const abort = () => finish({ state: 'unknown' });
    const timeoutId = setTimeout(
      () => finish({ state: 'unknown' }),
      Math.max(0, timeoutMs),
    );

    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }

    void pending.then(
      (value) => finish({ state: 'available', value }),
      () => finish({ state: 'error' }),
    );
  });
}

function normalizeStorageEstimate(
  result: AsyncProbeResult<StorageEstimateInput>,
): DiagnosticsStorageEstimate {
  if (result.state !== 'available') {
    return { state: result.state };
  }

  const { quota, usage } = result.value;
  if (
    typeof usage !== 'number' ||
    !Number.isFinite(usage) ||
    usage < 0 ||
    typeof quota !== 'number' ||
    !Number.isFinite(quota) ||
    quota <= 0
  ) {
    return { state: 'unknown' };
  }

  return {
    state: 'available',
    usageMiB: Math.round(usage / MIB),
    quotaMiB: Math.round(quota / MIB),
    percentUsed: Math.round((usage / quota) * 100),
  };
}

function normalizePersistence(
  result: AsyncProbeResult<boolean>,
): DiagnosticsPersistence {
  if (result.state !== 'available') {
    return result.state;
  }
  return result.value ? 'persisted' : 'not-persisted';
}

export async function collectDiagnosticsSnapshot({
  build = DEFAULT_BUILD_INFO,
  probes = createBrowserDiagnosticsProbes(),
  now = () => new Date(),
  timeoutMs = DEFAULT_PROBE_TIMEOUT_MS,
  signal,
}: {
  build?: DiagnosticsBuildInfo;
  probes?: DiagnosticsProbes;
  now?: () => Date;
  timeoutMs?: number;
  signal?: AbortSignal;
} = {}): Promise<DiagnosticsSnapshot> {
  const [storageEstimate, storagePersistence] = await Promise.all([
    settleAsyncProbe(probes.estimateStorage, timeoutMs, signal),
    settleAsyncProbe(probes.storagePersisted, timeoutMs, signal),
  ]);

  return {
    version: build.version,
    buildId: build.buildId,
    buildTime: safeUtc(build.buildTime),
    environment: normalizeDiagnosticsEnvironment(build.environment),
    generatedAtUtc: now().toISOString(),
    runtime: safeSyncProbe(probes.runtime, 'unknown'),
    connection: safeSyncProbe(probes.connection, 'unknown'),
    indexedDb: safeSyncProbe(probes.indexedDb, 'error'),
    nativeFileSystemPicker: safeSyncProbe(
      probes.nativeFileSystemPicker,
      'error',
    ),
    storageEstimate: normalizeStorageEstimate(storageEstimate),
    storagePersistence: normalizePersistence(storagePersistence),
  };
}

/** Stable formatter intended to match the displayed report. */
export function formatDiagnosticsReport(snapshot: DiagnosticsSnapshot): string {
  const lines = [
    'Bangle.io diagnostics',
    `Version: ${snapshot.version}`,
    `Build ID: ${snapshot.buildId}`,
    `Build time: ${snapshot.buildTime}`,
    `Environment: ${snapshot.environment}`,
    `Generated (UTC): ${snapshot.generatedAtUtc}`,
    `Runtime: ${snapshot.runtime}`,
    `Connection: ${snapshot.connection}`,
    `IndexedDB: ${snapshot.indexedDb}`,
    `Native file system picker: ${snapshot.nativeFileSystemPicker}`,
    `Storage estimate: ${snapshot.storageEstimate.state}`,
  ];

  if (snapshot.storageEstimate.state === 'available') {
    lines.push(
      `Storage usage: ${snapshot.storageEstimate.usageMiB} MiB`,
      `Storage quota: ${snapshot.storageEstimate.quotaMiB} MiB`,
      `Storage used: ${snapshot.storageEstimate.percentUsed}%`,
    );
  }

  lines.push(`Storage persistence: ${snapshot.storagePersistence}`);
  return lines.join('\n');
}

type DiagnosticsPageDependencies = Readonly<{
  collect: (signal: AbortSignal) => Promise<DiagnosticsSnapshot>;
  copyText: (value: string) => Promise<void>;
}>;

const DEFAULT_PAGE_DEPENDENCIES: DiagnosticsPageDependencies = {
  collect: (signal) => collectDiagnosticsSnapshot({ signal }),
  copyText: writeTextToClipboard,
};

function createDiagnosticsFailureSnapshot(): DiagnosticsSnapshot {
  return {
    version: DEFAULT_BUILD_INFO.version,
    buildId: DEFAULT_BUILD_INFO.buildId,
    buildTime: safeUtc(DEFAULT_BUILD_INFO.buildTime),
    environment: normalizeDiagnosticsEnvironment(
      DEFAULT_BUILD_INFO.environment,
    ),
    generatedAtUtc: new Date().toISOString(),
    runtime: 'unknown',
    connection: 'unknown',
    indexedDb: 'error',
    nativeFileSystemPicker: 'error',
    storageEstimate: { state: 'error' },
    storagePersistence: 'error',
  };
}

export function DiagnosticsSettingsPage({
  dependencies = DEFAULT_PAGE_DEPENDENCIES,
}: {
  dependencies?: DiagnosticsPageDependencies;
}) {
  const [snapshot, setSnapshot] = React.useState<DiagnosticsSnapshot>();
  const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'error'>(
    'idle',
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void dependencies.collect(controller.signal).then(
      (nextSnapshot) => {
        if (!controller.signal.aborted) {
          setSnapshot(nextSnapshot);
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setSnapshot(createDiagnosticsFailureSnapshot());
        }
      },
    );
    return () => controller.abort();
  }, [dependencies]);

  const report = snapshot ? formatDiagnosticsReport(snapshot) : undefined;
  const copyReport = () => {
    if (!report) {
      return;
    }
    setCopyState('idle');
    // Start the clipboard write directly in the activation handler. All async
    // diagnostics work completed before the button became enabled.
    let pendingCopy: Promise<void>;
    try {
      pendingCopy = dependencies.copyText(report);
    } catch {
      setCopyState('error');
      return;
    }
    void pendingCopy.then(
      () => setCopyState('copied'),
      () => setCopyState('error'),
    );
  };

  return (
    <section className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {t.app.settings.diagnostics.description}
      </p>
      <div className="overflow-hidden rounded-lg border bg-card/80 text-card-foreground shadow-sm">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium" id="diagnostics-report-heading">
              {t.app.settings.diagnostics.reportTitle}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t.app.settings.diagnostics.reportDescription}
            </p>
          </div>
          <Button disabled={!report} onClick={copyReport} type="button">
            {report ? (
              <ClipboardCopy aria-hidden className="h-4 w-4" />
            ) : (
              <LoaderCircle
                aria-hidden
                className="h-4 w-4 motion-safe:animate-spin"
              />
            )}
            {report
              ? t.app.settings.diagnostics.copyButton
              : t.app.settings.diagnostics.preparingButton}
          </Button>
        </div>
        <section
          aria-label={t.app.settings.diagnostics.reportLabel}
          className="overflow-x-auto p-5"
        >
          {report ? (
            <pre
              className="whitespace-pre-wrap break-words font-mono text-sm"
              data-testid="diagnostics-report"
            >
              {report}
            </pre>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t.app.settings.diagnostics.preparingReport}
            </p>
          )}
        </section>
      </div>
      <p aria-live="polite" className="min-h-5 text-muted-foreground text-sm">
        {copyState === 'copied' ? (
          <span className="inline-flex items-center gap-1.5">
            <Check aria-hidden className="h-4 w-4" />
            {t.app.settings.diagnostics.copied}
          </span>
        ) : copyState === 'error' ? (
          t.app.settings.diagnostics.copyFailed
        ) : null}
      </p>
    </section>
  );
}
