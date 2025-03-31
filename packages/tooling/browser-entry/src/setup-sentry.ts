import { sentryConfig } from '@bangle.io/config';
import type { Logger } from '@bangle.io/logger';
import { setErrorReporter } from '@bangle.io/logger';
import * as Sentry from '@sentry/browser';

export function initializeSentry(logger: Logger, _isDebug: boolean): void {
  Sentry.init({
    ...sentryConfig,
    sendDefaultPii: false,
    /**
     * Intercepts events before they are sent to Sentry.
     * Used here to scrub sensitive data from the URL like query params and hash.
     */
    beforeSend(event, _hint) {
      try {
        // Check if the event contains request URL information
        if (event.request?.url) {
          const url = new URL(event.request.url);
          // Clear query parameters
          url.search = '';
          // Clear hash fragment
          url.hash = '';
          // Update the event with the scrubbed URL
          event.request.url = url.toString();
        }
      } catch (error) {
        logger.warn('Failed to scrub URL in Sentry beforeSend:', error);
      }

      return event;
    },
  });

  setErrorReporter({
    captureException: (error: Error) => {
      Sentry.captureException(error);
      logger.debug('Error reported to Sentry via logger:', error.message);
    },
  });
}
