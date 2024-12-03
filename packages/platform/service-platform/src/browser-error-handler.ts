import {
  BaseErrorService,
  getEventSenderMetadata,
  isAbortError,
  isAppError,
} from '@bangle.io/base-utils';
import type { BaseServiceCommonOptions } from '@bangle.io/types';

export class BrowserErrorHandlerService extends BaseErrorService {
  private eventQueue: Array<PromiseRejectionEvent | ErrorEvent> = [];

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: undefined,
    private options: {
      onError: (params: {
        appLikeError: boolean;
        error: Error;
        isFakeThrow: boolean;
        rejection: boolean;
      }) => void;
    },
  ) {
    super({
      ...baseOptions,
      name: 'browser-error-handler',
      kind: 'platform',
      dependencies,
    });
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handleError);

    // we want to emit queued events after initialization
    this.initializedPromise.then(() => {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (event) {
          this.handleError(event);
        }
      }
    });
  }

  handleError = (event: PromiseRejectionEvent | ErrorEvent) => {
    if (!this.isOk) {
      this.logger.warn('Received an error event during not ok');
      this.logger.error(event);
      this.eventQueue.push(event);
      return;
    }

    let error: Error | undefined;
    const isPromiseRejection = 'reason' in event;

    if (isPromiseRejection) {
      if (event.reason instanceof Error) {
        error = event.reason;
      }
    } else {
      if (event.error instanceof Error) {
        error = event.error;
      }
    }
    if (!error || isAbortError(error)) {
      return;
    }

    this.logger.debug(`Error event received: "${error.message}"`);

    const appLikeError = isAppError(error);

    // app errors should be handled by the app and not logged
    if (appLikeError) {
      event.preventDefault();
    }

    this.options.onError({
      appLikeError,
      error,
      isFakeThrow: false,
      rejection: isPromiseRejection,
    });
  };
  protected async onInitialize(): Promise<void> {}

  async onDispose(): Promise<void> {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.handleError(event);
      }
    }
    window.removeEventListener('error', this.handleError);
    window.removeEventListener('unhandledrejection', this.handleError);
  }
}
