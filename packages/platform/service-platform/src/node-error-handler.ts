import type { BaseServiceContext } from '@bangle.io/base-utils';
import {
  BaseErrorService,
  isAbortError,
  isAppError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';

type ErrorInfo = {
  appLikeError: boolean;
  error: Error;
  isFakeThrow: boolean;
  rejection: boolean;
};

export class NodeErrorHandlerService extends BaseErrorService {
  static deps = [] as const;
  private pendingEvents: Array<Error | { reason: any; promise: Promise<any> }> =
    [];

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: {
      onError: (params: ErrorInfo) => void;
    },
  ) {
    super(SERVICE_NAME.nodeErrorHandlerService, context, dependencies);
    process.on('uncaughtException', this.handleUncaughtException);
    process.on('unhandledRejection', this.handleUnhandledRejection);
  }

  async hookMount(): Promise<void> {
    // Process any pending events that occurred before the service was mounted.
    while (this.pendingEvents.length > 0) {
      const event = this.pendingEvents.shift();
      if (event instanceof Error) {
        this.processUncaughtException(event);
      } else if (event) {
        this.processUnhandledRejection(event.reason);
      }
    }

    this.addCleanup(() => {
      // Process any remaining events during cleanup.
      while (this.pendingEvents.length > 0) {
        const event = this.pendingEvents.shift();
        if (event instanceof Error) {
          this.processUncaughtException(event);
        } else if (event) {
          this.processUnhandledRejection(event.reason);
        }
      }
      process.removeListener('uncaughtException', this.handleUncaughtException);
      process.removeListener(
        'unhandledRejection',
        this.handleUnhandledRejection,
      );
    });
  }

  private handleUncaughtException = (error: Error) => {
    if (!this.mounted) {
      this.logger.warn(
        'Received an uncaught exception before the service was ready.',
      );
      this.logger.error(error);
      this.pendingEvents.push(error);
      return;
    }

    this.processUncaughtException(error);
  };

  private processUncaughtException(error: Error) {
    if (isAbortError(error)) {
      return;
    }

    this.logger.debug(`Uncaught exception: "${error.message}"`);

    const appLikeError = isAppError(error);

    this.config.onError({
      appLikeError,
      error,
      isFakeThrow: false,
      rejection: false,
    });
  }

  private handleUnhandledRejection = (reason: any, promise: Promise<any>) => {
    if (!this.mounted) {
      this.pendingEvents.push({ reason, promise });
      return;
    }

    this.processUnhandledRejection(reason);
  };

  private processUnhandledRejection(reason: any) {
    const error = reason instanceof Error ? reason : new Error(String(reason));

    if (isAbortError(error)) {
      return;
    }

    this.logger.debug(`Unhandled rejection: "${error.message}"`);

    const appLikeError = isAppError(error);

    this.config.onError({
      appLikeError,
      error,
      isFakeThrow: false,
      rejection: true,
    });
  }
}
