// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectDiagnosticsSnapshot,
  createBrowserDiagnosticsProbes,
  type DiagnosticsProbes,
  DiagnosticsSettingsPage,
  type DiagnosticsSnapshot,
  formatDiagnosticsReport,
  normalizeDiagnosticsEnvironment,
} from '../page-settings-diagnostics';

const BUILD = {
  version: '1.2.3',
  buildId: 'build-123',
  buildTime: '2026-08-08T12:00:00.000Z',
  environment: 'production',
};

const SNAPSHOT: DiagnosticsSnapshot = {
  version: '1.2.3',
  buildId: 'build-123',
  buildTime: '2026-08-08T12:00:00.000Z',
  environment: 'production',
  generatedAtUtc: '2026-08-09T15:30:00.000Z',
  runtime: 'browser',
  connection: 'online',
  indexedDb: 'supported',
  nativeFileSystemPicker: 'unsupported',
  storageEstimate: {
    state: 'available',
    usageMiB: 2,
    quotaMiB: 10,
    percentUsed: 15,
  },
  storagePersistence: 'not-persisted',
};

function makeProbes(
  overrides: Partial<DiagnosticsProbes> = {},
): DiagnosticsProbes {
  return {
    runtime: () => 'browser',
    connection: () => 'online',
    indexedDb: () => 'supported',
    nativeFileSystemPicker: () => 'unsupported',
    estimateStorage: () =>
      Promise.resolve({ usage: 1.6 * 1024 * 1024, quota: 10.4 * 1024 * 1024 }),
    storagePersisted: () => Promise.resolve(false),
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe('diagnostics snapshot', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('has a closed privacy-safe shape and drops extra probe details', async () => {
    const privateSentinels = [
      'private.example/path',
      'secret-workspace',
      'secret-note-content',
      'private-branch-name',
      'failure stack sentinel',
    ];
    const estimateWithForbiddenDetails = {
      usage: 2 * 1024 * 1024,
      quota: 10 * 1024 * 1024,
      usageDetails: { indexedDB: privateSentinels[2] },
      url: privateSentinels[0],
      workspace: privateSentinels[1],
    };
    const snapshot = await collectDiagnosticsSnapshot({
      build: {
        ...BUILD,
        environment: `dev/${privateSentinels[3]}`,
      },
      probes: makeProbes({
        estimateStorage: () => Promise.resolve(estimateWithForbiddenDetails),
      }),
      now: () => new Date('2026-08-09T15:30:00.000Z'),
    });
    const serialized = `${JSON.stringify(snapshot)}\n${formatDiagnosticsReport(snapshot)}`;

    expect(Object.keys(snapshot)).toEqual([
      'version',
      'buildId',
      'buildTime',
      'environment',
      'generatedAtUtc',
      'runtime',
      'connection',
      'indexedDb',
      'nativeFileSystemPicker',
      'storageEstimate',
      'storagePersistence',
    ]);
    expect(snapshot.environment).toBe('development');
    expect(snapshot.storageEstimate).toEqual({
      state: 'available',
      usageMiB: 2,
      quotaMiB: 10,
      percentUsed: 20,
    });
    expect(serialized).not.toContain('usageDetails');
    for (const sentinel of privateSentinels) {
      expect(serialized).not.toContain(sentinel);
    }
  });

  it('formats fields in a stable order without locale-dependent output', () => {
    expect(formatDiagnosticsReport(SNAPSHOT)).toBe(
      [
        'Bangle.io diagnostics',
        'Version: 1.2.3',
        'Build ID: build-123',
        'Build time: 2026-08-08T12:00:00.000Z',
        'Environment: production',
        'Generated (UTC): 2026-08-09T15:30:00.000Z',
        'Runtime: browser',
        'Connection: online',
        'IndexedDB: supported',
        'Native file system picker: unsupported',
        'Storage estimate: available',
        'Storage usage: 2 MiB',
        'Storage quota: 10 MiB',
        'Storage used: 15%',
        'Storage persistence: not-persisted',
      ].join('\n'),
    );
  });

  it('normalizes development branches without disclosing their names', () => {
    expect(normalizeDiagnosticsEnvironment('dev/private-feature')).toBe(
      'development',
    );
    expect(normalizeDiagnosticsEnvironment('production')).toBe('production');
    expect(normalizeDiagnosticsEnvironment('unexpected-private-value')).toBe(
      'unknown',
    );
  });

  it('rounds aggregate storage values to MiB and whole percent', async () => {
    const snapshot = await collectDiagnosticsSnapshot({
      build: BUILD,
      probes: makeProbes(),
      now: () => new Date('2026-08-09T15:30:00.000Z'),
    });

    expect(snapshot.storageEstimate).toEqual({
      state: 'available',
      usageMiB: 2,
      quotaMiB: 10,
      percentUsed: 15,
    });
    expect(snapshot.storagePersistence).toBe('not-persisted');
  });

  it('maps probe failures to the literal error state without error details', async () => {
    const failure = new Error('failure stack sentinel');
    const snapshot = await collectDiagnosticsSnapshot({
      build: BUILD,
      probes: makeProbes({
        indexedDb: () => {
          throw failure;
        },
        nativeFileSystemPicker: () => {
          throw failure;
        },
        estimateStorage: () => Promise.reject(failure),
        storagePersisted: () => Promise.reject(failure),
      }),
      now: () => new Date('2026-08-09T15:30:00.000Z'),
    });
    const report = formatDiagnosticsReport(snapshot);

    expect(snapshot).toMatchObject({
      indexedDb: 'error',
      nativeFileSystemPicker: 'error',
      storageEstimate: { state: 'error' },
      storagePersistence: 'error',
    });
    expect(report).toContain('Storage estimate: error');
    expect(report).toContain('Storage persistence: error');
    expect(report).not.toContain(failure.message);
  });

  it('reports unsupported probes distinctly from timed-out probes', async () => {
    vi.useFakeTimers();
    const never = new Promise<never>(() => {});
    const timedOut = collectDiagnosticsSnapshot({
      build: BUILD,
      probes: makeProbes({
        estimateStorage: () => never,
        storagePersisted: () => never,
      }),
      timeoutMs: 500,
      now: () => new Date('2026-08-09T15:30:00.000Z'),
    });

    await vi.advanceTimersByTimeAsync(500);
    await expect(timedOut).resolves.toMatchObject({
      storageEstimate: { state: 'unknown' },
      storagePersistence: 'unknown',
    });

    const unsupported = await collectDiagnosticsSnapshot({
      build: BUILD,
      probes: makeProbes({
        estimateStorage: undefined,
        storagePersisted: undefined,
      }),
      now: () => new Date('2026-08-09T15:30:00.000Z'),
    });
    expect(unsupported).toMatchObject({
      storageEstimate: { state: 'unsupported' },
      storagePersistence: 'unsupported',
    });
  });

  it('detects desktop before PWA and never inspects user-agent details', () => {
    const privateUserAgent = 'user-agent-private-sentinel';
    const probes = createBrowserDiagnosticsProbes(
      {
        bangleDesktop: { platform: 'private-platform' },
        indexedDB: {} as IDBFactory,
        matchMedia: () => ({ matches: true }) as MediaQueryList,
        showDirectoryPicker: () => Promise.reject(new Error('unused')),
        userAgent: privateUserAgent,
      } as unknown as Window,
      {
        onLine: false,
        standalone: true,
        userAgent: privateUserAgent,
      } as unknown as Navigator,
    );

    expect(probes.runtime()).toBe('desktop');
    expect(probes.connection()).toBe('offline');
    expect(probes.indexedDb()).toBe('supported');
    expect(probes.nativeFileSystemPicker()).toBe('supported');
    expect(JSON.stringify(probes.runtime())).not.toContain(privateUserAgent);
  });

  it('turns a browser storage accessor fault into literal error states', async () => {
    const failureSentinel = 'private storage failure detail';
    const navigatorRef = { onLine: true };
    Object.defineProperty(navigatorRef, 'storage', {
      get: () => {
        throw new Error(failureSentinel);
      },
    });
    const probes = createBrowserDiagnosticsProbes(
      {
        indexedDB: {} as IDBFactory,
        matchMedia: () => ({ matches: false }) as MediaQueryList,
      } as unknown as Window,
      navigatorRef as unknown as Navigator,
    );

    const snapshot = await collectDiagnosticsSnapshot({
      build: BUILD,
      probes,
      now: () => new Date('2026-08-09T15:30:00.000Z'),
    });
    const report = formatDiagnosticsReport(snapshot);

    expect(snapshot.storageEstimate).toEqual({ state: 'error' });
    expect(snapshot.storagePersistence).toBe('error');
    expect(report).not.toContain(failureSentinel);
  });
});

describe('DiagnosticsSettingsPage', () => {
  it('exposes an accessible preparing state and enables copy only when settled', async () => {
    const pending = deferred<DiagnosticsSnapshot>();
    const dependencies = {
      collect: vi.fn(() => pending.promise),
      copyText: vi.fn(() => Promise.resolve()),
    };
    render(<DiagnosticsSettingsPage dependencies={dependencies} />);

    expect(
      screen.getByRole('region', { name: 'Diagnostics report' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Preparing…' })).toBeDisabled();
    expect(screen.getByText('Preparing diagnostics…')).toBeVisible();

    await act(() => {
      pending.resolve(SNAPSHOT);
      return pending.promise;
    });

    expect(
      screen.getByRole('button', { name: 'Copy diagnostics' }),
    ).toBeEnabled();
    expect(screen.getByTestId('diagnostics-report')).toHaveTextContent(
      'Storage persistence: not-persisted',
    );
  });

  it('copies the already displayed report directly from the click handler', async () => {
    const copyText = vi.fn(() => Promise.resolve());
    render(
      <DiagnosticsSettingsPage
        dependencies={{
          collect: () => Promise.resolve(SNAPSHOT),
          copyText,
        }}
      />,
    );
    const copyButton = await screen.findByRole('button', {
      name: 'Copy diagnostics',
    });
    const displayedReport =
      screen.getByTestId('diagnostics-report').textContent;

    fireEvent.click(copyButton);

    expect(copyText).toHaveBeenCalledOnce();
    expect(copyText).toHaveBeenCalledWith(displayedReport);
    await waitFor(() =>
      expect(screen.getByText('Diagnostics copied')).toBeVisible(),
    );
  });

  it('aborts collection and ignores a late result after unmount', async () => {
    const pending = deferred<DiagnosticsSnapshot>();
    let collectionSignal: AbortSignal | undefined;
    const rendered = render(
      <DiagnosticsSettingsPage
        dependencies={{
          collect: (signal) => {
            collectionSignal = signal;
            return pending.promise;
          },
          copyText: vi.fn(() => Promise.resolve()),
        }}
      />,
    );

    rendered.unmount();
    expect(collectionSignal?.aborted).toBe(true);

    await act(() => {
      pending.resolve(SNAPSHOT);
      return pending.promise;
    });
    expect(screen.queryByTestId('diagnostics-report')).not.toBeInTheDocument();
  });
});
