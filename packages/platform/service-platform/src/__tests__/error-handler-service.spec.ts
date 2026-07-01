/**
 * @vitest-environment happy-dom
 */

import { makeTestCommonOpts } from '@bangle.io/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserErrorHandlerService } from '../browser-error-handler';
import { NodeErrorHandlerService } from '../node-error-handler';

type NodeErrorHandlerInternals = {
  handleUncaughtException: (error: Error) => void;
};

describe('error handler services', () => {
  const controllers: AbortController[] = [];

  afterEach(() => {
    for (const controller of controllers.splice(0)) {
      controller.abort();
    }
  });

  function setup() {
    const controller = new AbortController();
    controllers.push(controller);
    const { commonOpts } = makeTestCommonOpts({ controller });
    return { commonOpts, controller };
  }

  it('replays browser error events queued before mount', async () => {
    const { commonOpts } = setup();
    const onError = vi.fn();
    const service = new BrowserErrorHandlerService(
      {
        ctx: commonOpts,
        serviceContext: { abortSignal: commonOpts.rootAbortSignal },
      },
      null,
      { onError },
    );
    const error = new Error('queued browser error');

    window.dispatchEvent(
      new ErrorEvent('error', {
        cancelable: true,
        error,
        message: error.message,
      }),
    );

    expect(onError).not.toHaveBeenCalled();

    await service.mount();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error,
        isFakeThrow: false,
        isRejection: false,
      }),
    );
  });

  it('replays node error events queued before mount', async () => {
    const { commonOpts } = setup();
    const onError = vi.fn();
    const service = new NodeErrorHandlerService(
      {
        ctx: commonOpts,
        serviceContext: { abortSignal: commonOpts.rootAbortSignal },
      },
      null,
      { onError },
    );
    const error = new Error('queued node error');

    (service as unknown as NodeErrorHandlerInternals).handleUncaughtException(
      error,
    );

    expect(onError).not.toHaveBeenCalled();

    await service.mount();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        appLikeError: false,
        error,
        isFakeThrow: false,
        rejection: false,
      }),
    );
  });
});
