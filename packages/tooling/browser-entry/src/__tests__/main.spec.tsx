/**
 * @vitest-environment happy-dom
 */

import { t } from '@bangle.io/translations';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consumePwaLaunchParams: vi.fn(),
  initializeSentry: vi.fn(),
  initializeServices: vi.fn(),
  readAutomaticErrorReportingPreference: vi.fn().mockReturnValue(true),
}));

vi.mock('@bangle.io/app', () => ({
  App: () => null,
  consumePwaLaunchParams: mocks.consumePwaLaunchParams,
}));

vi.mock('@bangle.io/initialize-services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@bangle.io/initialize-services')>()),
  initializeServices: mocks.initializeServices,
}));

vi.mock('../setup-sentry', () => ({
  initializeSentry: mocks.initializeSentry,
  readAutomaticErrorReportingPreference:
    mocks.readAutomaticErrorReportingPreference,
}));

describe('browser entry startup', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('t', t);
    document.body.innerHTML = '<div id="root"></div>';
    window.history.replaceState(null, '', '/');
    mocks.consumePwaLaunchParams.mockReset();
    mocks.initializeSentry.mockReset();
    mocks.initializeServices.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  // Importing `../main` pulls in the whole app graph; under a fully parallel
  // vitest run that import alone can eat most of the default 5s test budget,
  // so this test gets a wider one — it is import-bound, not logic-bound.
  test('renders a user-visible startup error when service initialization fails', {
    timeout: 30_000,
  }, async () => {
    const error = new Error('database mount failed');
    const report = {
      schemaVersion: 2,
      id: 'fb3b15d4-c536-4bf5-8d06-f328247b9619',
      capturedAt: '2026-07-19T12:00:00.000Z',
      errorType: 'Error',
      route: 'welcome',
      release: 'bangle.io@1.2.3+abcdef12',
      environment: 'production',
      frames: [],
    } as const;
    const sendReports = vi.fn().mockResolvedValue({
      sentReportIds: [report.id],
    });
    mocks.readAutomaticErrorReportingPreference.mockReturnValueOnce(false);
    mocks.initializeSentry.mockReturnValueOnce({
      captureException: vi.fn().mockReturnValue(report),
      getAutomaticReportingEnabled: vi.fn().mockReturnValue(false),
      sendReports,
      setAutomaticReportingEnabled: vi.fn().mockResolvedValue(undefined),
      setManualReportHandler: vi.fn(),
    });
    let startupSignal: AbortSignal | undefined;
    mocks.initializeServices.mockImplementationOnce(
      (
        _logger: unknown,
        _rootEmitter: unknown,
        _store: unknown,
        _theme: unknown,
        abortSignal: AbortSignal,
      ) => {
        startupSignal = abortSignal;
        return Promise.reject(error);
      },
    );

    await import('../main');

    expect(mocks.consumePwaLaunchParams).toHaveBeenCalledWith(window);

    await vi.waitFor(
      () => {
        expect(document.getElementById('root')?.textContent ?? '').toContain(
          t.app.pageStartupError.title,
        );
      },
      { timeout: 10_000 },
    );

    expect(document.getElementById('root')?.textContent ?? '').toContain(
      t.app.pageStartupError.description,
    );
    expect(document.getElementById('root')?.textContent ?? '').toContain(
      error.message,
    );
    expect(
      document.querySelector('[data-testid="startup-bug-report-preview"]')
        ?.textContent ?? '',
    ).toContain('"schemaVersion": 2');
    const sendButton = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent === t.app.bugReportPrompt.sendReport,
    );
    expect(sendButton).toBeDefined();
    sendButton?.click();
    await vi.waitFor(() => expect(sendReports).toHaveBeenCalledWith([report]));
    expect(startupSignal?.aborted).toBe(true);
  });
});
