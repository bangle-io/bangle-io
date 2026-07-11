/**
 * @vitest-environment happy-dom
 */

import {
  EDITOR_ENGINE_PREFERENCE_STORAGE_KEY,
  readEditorEnginePreference,
} from '@bangle.io/initialize-services';
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
    window.localStorage.clear();
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
    expect(startupSignal?.aborted).toBe(true);
  });

  test('boot guard resets an experimental engine preference and reloads instead of showing the error screen', async () => {
    const error = new Error('wordgard stack exploded');
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => {});
    window.localStorage.setItem(
      EDITOR_ENGINE_PREFERENCE_STORAGE_KEY,
      JSON.stringify('wordgard'),
    );
    mocks.initializeServices.mockImplementationOnce(() =>
      Promise.reject(error),
    );

    await import('../main');

    await vi.waitFor(() => {
      expect(reloadSpy).toHaveBeenCalled();
    });
    expect(readEditorEnginePreference()).toBe('prosemirror');

    // The recovery path reloads; the startup error screen must not render.
    expect(document.getElementById('root')?.textContent ?? '').not.toContain(
      t.app.pageStartupError.title,
    );
  });

  test('recoverFromExperimentalEngineFailure only fires for a non-default engine and a writable storage', async () => {
    const { recoverFromExperimentalEngineFailure } = await import('../main');
    const logger = {
      error: vi.fn(),
    };
    const reload = vi.fn();

    // Default engine selected: nothing to recover from.
    expect(
      recoverFromExperimentalEngineFailure(logger, window.localStorage, reload),
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();

    // Experimental engine selected: reset + reload.
    window.localStorage.setItem(
      EDITOR_ENGINE_PREFERENCE_STORAGE_KEY,
      JSON.stringify('wordgard'),
    );
    expect(
      recoverFromExperimentalEngineFailure(logger, window.localStorage, reload),
    ).toBe(true);
    expect(readEditorEnginePreference()).toBe('prosemirror');
    expect(reload).toHaveBeenCalledTimes(1);

    // Unwritable storage: fall through to the error screen, never loop.
    const unavailableStorage = {
      getItem: window.localStorage.getItem.bind(window.localStorage),
      setItem: () => {
        throw new Error('storage unavailable');
      },
    };
    window.localStorage.setItem(
      EDITOR_ENGINE_PREFERENCE_STORAGE_KEY,
      JSON.stringify('wordgard'),
    );
    expect(
      recoverFromExperimentalEngineFailure(logger, unavailableStorage, reload),
    ).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
