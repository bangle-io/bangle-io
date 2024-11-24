import { BaseService, isAppError } from '@bangle.io/base-utils';
import type { BaseServiceCommonOptions, ErrorEmitter } from '@bangle.io/types';

export class BrowserErrorHandlerService extends BaseService {
  private eventQueue: Array<PromiseRejectionEvent | ErrorEvent> = [];

  constructor(
    baseOptions: BaseServiceCommonOptions,
    _dependencies: undefined,
    private emitter: ErrorEmitter,
  ) {
    super({
      ...baseOptions,
      name: 'browser-error-handler',
      kind: 'platform',
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
