/**
 * @vitest-environment happy-dom
 */

import { t } from '@bangle.io/translations';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  initializeSentry: vi.fn(),
  initializeServices: vi.fn(),
}));

vi.mock('@bangle.io/app', () => ({
  App: () => null,
}));

vi.mock('@bangle.io/initialize-services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@bangle.io/initialize-services')>()),
  initializeServices: mocks.initializeServices,
}));

vi.mock('../setup-sentry', () => ({
  initializeSentry: mocks.initializeSentry,
}));

describe('browser entry startup', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('t', t);
    document.body.innerHTML = '<div id="root"></div>';
    window.history.replaceState(null, '', '/');
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
    expect(startupSignal?.aborted).toBe(true);
  });
});
