import {
  BaseErrorService,
  getEventSenderMetadata,
  isAbortError,
  isAppError,
} from '@bangle.io/base-utils';
import type { BaseServiceCommonOptions, RootEmitter } from '@bangle.io/types';

export class NodeErrorHandlerService extends BaseErrorService {
  private eventQueue: Array<Error | { reason: any; promise: Promise<any> }> =
    [];

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: undefined,
    private emitter: RootEmitter,
  ) {
    super({
      ...baseOptions,
      name: 'node-error-handler',
      kind: 'platform',
      dependencies,
    });

    process.on('uncaughtException', this.handleError);
    process.on('unhandledRejection', this.handleRejection);

    // Process queued events after initialization
    this.initializedPromise.then(() => {
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
    });
  }

  handleError = (error: Error) => {
    if (!this.isOk) {
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
      // Implement custom logic if needed
    }

    this.emitter.emit('event::error:uncaught-error', {
      appLikeError,
      error,
      isFakeThrow: false,
      rejection: false,
      sender: getEventSenderMetadata({ tag: this.name }),
    });
  };

  handleRejection = (reason: any, promise: Promise<any>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    if (!this.isOk) {
      this.eventQueue.push({ reason, promise });
      return;
    }

    if (isAbortError(error)) {
      return;
    }

    this.logger.debug(`Unhandled rejection received: "${error.message}"`);

    const appLikeError = isAppError(error);

    this.emitter.emit('event::error:uncaught-error', {
      appLikeError,
      error,
      isFakeThrow: false,
      rejection: true,
      sender: getEventSenderMetadata({ tag: this.name }),
    });
  };

  protected async onInitialize(): Promise<void> {}

  async onDispose(): Promise<void> {
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
  }
}
