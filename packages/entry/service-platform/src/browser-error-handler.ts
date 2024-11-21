import { BaseService, type Logger, isAppError } from '@bangle.io/base-utils';
import type { ErrorEmitter } from '@bangle.io/types';

export class BrowserErrorHandlerService extends BaseService {
  constructor(
    logger: Logger,
    private emitter: ErrorEmitter,
  ) {
    super('browser-error-handler', 'platform', logger);
  }

  handleError = (event: PromiseRejectionEvent | ErrorEvent) => {
    let error: Error | undefined;
    const isPromiseRejection = 'reason' in event;
    // promise rejection
    if ('reason' in event) {
      if (event.reason instanceof Error) {
        error = event.reason;
      }
    } else {
      if (event.error instanceof Error) {
        error = event.error;
      }
    }
    if (!error) {
      return;
    }

    this.logger.debug(`Error event received: "${error.message}"`);

    // app errors should be handled by the app and not logged
    if (isAppError(error)) {
      event.preventDefault();
      this.emitter.emit('event::browser-error-handler-service:app-error', {
        rejection: isPromiseRejection,
        error,
      });
    } else {
      this.emitter.emit('event::browser-error-handler-service:error', {
        rejection: isPromiseRejection,
        error,
      });
    }
  };

  protected async onInitialize(): Promise<void> {
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handleError);
  }

  async onDispose(): Promise<void> {
    window.removeEventListener('error', this.handleError);
    window.removeEventListener('unhandledrejection', this.handleError);
  }
}
