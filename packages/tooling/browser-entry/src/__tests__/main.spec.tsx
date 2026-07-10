/**
 * @vitest-environment happy-dom
 */

import { t } from '@bangle.io/translations';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  initializeSentry: vi.fn(),
  initializeServices: vi.fn(),
  readEditorEnginePreference: vi.fn((): string => 'prosemirror'),
  resetEditorEnginePreference: vi.fn((): boolean => true),
}));

vi.mock('@bangle.io/app', () => ({
  App: () => null,
}));

vi.mock('@bangle.io/initialize-services', () => ({
  initializeServices: mocks.initializeServices,
  readEditorEnginePreference: mocks.readEditorEnginePreference,
  resetEditorEnginePreference: mocks.resetEditorEnginePreference,
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
    mocks.readEditorEnginePreference.mockReset();
    mocks.readEditorEnginePreference.mockReturnValue('prosemirror');
    mocks.resetEditorEnginePreference.mockReset();
    mocks.resetEditorEnginePreference.mockReturnValue(true);
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
    mocks.readEditorEnginePreference.mockReturnValue('wordgard');
    mocks.initializeServices.mockImplementationOnce(() =>
      Promise.reject(error),
    );

    await import('../main');

    await vi.waitFor(() => {
      expect(mocks.resetEditorEnginePreference).toHaveBeenCalled();
      expect(reloadSpy).toHaveBeenCalled();
    });

    // The recovery path reloads; the startup error screen must not render.
    expect(document.getElementById('root')?.textContent ?? '').not.toContain(
      t.app.pageStartupError.title,
    );
  });

  test('recoverFromExperimentalEngineFailure only fires for a non-default engine and a writable storage', async () => {
    const { recoverFromExperimentalEngineFailure } = await import('../main');
    const logger = {
      error: vi.fn(),
    } as unknown as import('@bangle.io/logger').Logger;
    const storage = { getItem: vi.fn(), setItem: vi.fn() };
    const reload = vi.fn();

    // Default engine selected: nothing to recover from.
    mocks.readEditorEnginePreference.mockReturnValue('prosemirror');
    expect(recoverFromExperimentalEngineFailure(logger, storage, reload)).toBe(
      false,
    );
    expect(reload).not.toHaveBeenCalled();

    // Experimental engine selected: reset + reload.
    mocks.readEditorEnginePreference.mockReturnValue('wordgard');
    expect(recoverFromExperimentalEngineFailure(logger, storage, reload)).toBe(
      true,
    );
    expect(mocks.resetEditorEnginePreference).toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);

    // Unwritable storage: fall through to the error screen, never loop.
    mocks.resetEditorEnginePreference.mockReturnValue(false);
    expect(recoverFromExperimentalEngineFailure(logger, storage, reload)).toBe(
      false,
    );
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
