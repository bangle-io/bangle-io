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

vi.mock('@bangle.io/initialize-services', () => ({
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
    mocks.initializeSentry.mockReset();
    mocks.initializeServices.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  test('renders a user-visible startup error when service initialization fails', async () => {
    const error = new Error('database mount failed');
    mocks.initializeServices.mockRejectedValueOnce(error);

    await import('../main');

    await vi.waitFor(() => {
      expect(document.getElementById('root')?.textContent ?? '').toContain(
        t.app.pageStartupError.title,
      );
    });

    expect(document.getElementById('root')?.textContent ?? '').toContain(
      t.app.pageStartupError.description,
    );
    expect(document.getElementById('root')?.textContent ?? '').toContain(
      error.message,
    );
  });
});
