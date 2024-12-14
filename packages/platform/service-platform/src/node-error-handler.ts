import { isAbortError, isAppError } from '@bangle.io/base-utils';
import { BaseService2, type BaseServiceContext } from '@bangle.io/base-utils';

export class NodeErrorHandlerService extends BaseService2 {
  private eventQueue: Array<Error | { reason: any; promise: Promise<any> }> =
    [];

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: {
      onError: (params: {
        appLikeError: boolean;
        error: Error;
        isFakeThrow: boolean;
        rejection: boolean;
      }) => void;
    },
  ) {
    super('node-error-handler', context, dependencies);
    process.on('uncaughtException', this.handleError);
    process.on('unhandledRejection', this.handleRejection);
  }

  async hookMount(): Promise<void> {
    // Process queued events after initialization
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        if (event instanceof Error) {
          this.handleError(event);
        } else {
          this.handleRejection(event.reason, event.promise);
        }
      }
    }

    this.addCleanup(() => {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (event) {
          if (event instanceof Error) {
            this.handleError(event);
          } else {
            this.handleRejection(event.reason, event.promise);
          }
        }
      }
      process.removeListener('uncaughtException', this.handleError);
      process.removeListener('unhandledRejection', this.handleRejection);
    });
  }

  handleError = (error: Error) => {
    if (!this.mounted) {
      this.logger.warn('Received an error during not ok');
      this.logger.error(error);
      this.eventQueue.push(error);
      return;
    }

    if (!error || isAbortError(error)) {
      return;
    }

    this.logger.debug(`Error received: "${error.message}"`);

    const appLikeError = isAppError(error);

    // App errors should be handled by the app and not logged
    if (appLikeError) {
    }

    this.config.onError({
      appLikeError,
      error,
      isFakeThrow: false,
      rejection: false,
    });
  };

  handleRejection = (reason: any, promise: Promise<any>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    if (!this.mounted) {
      this.eventQueue.push({ reason, promise });
      return;
    }

    if (isAbortError(error)) {
      return;
    }

    this.logger.debug(`Unhandled rejection received: "${error.message}"`);

    const appLikeError = isAppError(error);

    this.config.onError({
      appLikeError,
      error,
      isFakeThrow: false,
      rejection: true,
    });
  };
}
