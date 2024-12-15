import {
  BaseErrorService,
  type BaseServiceContext,
  isAbortError,
  isAppError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';

export class BrowserErrorHandlerService extends BaseErrorService {
  private eventQueue: Array<PromiseRejectionEvent | ErrorEvent> = [];

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
    super(SERVICE_NAME.browserErrorHandlerService, context, dependencies);
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handleError);
  }

  async hookMount() {
    // Process any queued events
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.handleError(event);
      }
    }

    // Add cleanup to remove event listeners on abort
    this.addCleanup(() => {
      window.removeEventListener('error', this.handleError);
      window.removeEventListener('unhandledrejection', this.handleError);
    });
  }

  handleError = (event: PromiseRejectionEvent | ErrorEvent) => {
    if (!this.mounted) {
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

    this.config.onError({
      appLikeError,
      error,
      isFakeThrow: false,
      rejection: isPromiseRejection,
    });
  };
}
