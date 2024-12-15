import {
  BaseErrorService,
  type BaseServiceContext,
  isAbortError,
  isAppError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';

type ErrorInfo = {
  isAppError: boolean;
  error: Error;
  isFakeThrow: boolean;
  isRejection: boolean;
};

export class BrowserErrorHandlerService extends BaseErrorService {
  private pendingEvents: Array<PromiseRejectionEvent | ErrorEvent> = [];
  private readonly onError: (params: ErrorInfo) => void;

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    config: {
      onError: (params: ErrorInfo) => void;
    },
  ) {
    super(SERVICE_NAME.browserErrorHandlerService, context, dependencies);
    this.onError = config.onError;
    window.addEventListener('error', this.handleErrorEvent);
    window.addEventListener('unhandledrejection', this.handleErrorEvent);
  }

  async hookMount() {
    // Process any queued events
    while (this.pendingEvents.length > 0) {
      const event = this.pendingEvents.shift();
      if (event) {
        this.handleErrorEvent(event);
      }
    }

    // Add cleanup to remove event listeners on abort
    this.addCleanup(() => {
      window.removeEventListener('error', this.handleErrorEvent);
      window.removeEventListener('unhandledrejection', this.handleErrorEvent);
    });
  }

  private handleErrorEvent = (event: PromiseRejectionEvent | ErrorEvent) => {
    if (!this.mounted) {
      this.logger.warn(
        'Received an error event before the service was fully mounted.',
      );
      this.logger.error(event);
      this.pendingEvents.push(event);
      return;
    }

    let error: Error | undefined;
    const isRejection = 'reason' in event;

    if (isRejection) {
      error = event.reason instanceof Error ? event.reason : undefined;
    } else {
      error = event.error instanceof Error ? event.error : undefined;
    }

    if (!error || isAbortError(error)) {
      return;
    }

    this.logger.debug(`Error event received: "${error.message}"`);

    const isAppErrorFlag = isAppError(error);

    // App errors should be handled by the app and not logged
    if (isAppErrorFlag) {
      event.preventDefault();
    }

    this.onError({
      isAppError: isAppErrorFlag,
      error,
      isFakeThrow: false,
      isRejection,
    });
  };
}
