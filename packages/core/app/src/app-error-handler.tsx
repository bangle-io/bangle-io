import { getGithubUrl, handleAppError } from '@bangle.io/base-utils';
import { useCoreServices, useLogger } from '@bangle.io/context';
import type { RootEmitter } from '@bangle.io/types';
import { toast } from '@bangle.io/ui-components';
import React, { useEffect } from 'react';

export function AppErrorHandler({ rootEmitter }: { rootEmitter: RootEmitter }) {
  const coreServices = useCoreServices();
  const logger = useLogger();

  useEffect(() => {
    const controller = new AbortController();
    const showUnexpectedError = (error: Error) => {
      toast.error(error.message, {
        duration: Number.POSITIVE_INFINITY,
        cancel: {
          label: t.app.common.dismiss,
          onClick: () => {},
        },
        action: {
          label: t.app.common.report,
          onClick: () => {
            window.open(getGithubUrl(error, logger), '_blank');
          },
        },
      });
    };

    const showAppLikeError = (error: Error) => {
      toast.error(error.message, {
        duration: 5000,
        cancel: {
          label: t.app.common.dismiss,
          onClick: () => {},
        },
        action: {
          label: t.app.common.report,
          onClick: () => {
            window.open(getGithubUrl(error, logger), '_blank');
          },
        },
      });
    };

    const handleAppLikeError = (error: Error) => {
      logger.error(error);
      return handleAppError(error, (appError, error) => {
        switch (appError.name) {
          case 'error::workspace:native-fs-auth-needed': {
            coreServices.commandDispatcher.dispatch(
              'command::ui:native-fs-auth',
              { wsName: appError.payload.wsName },
              'AppErrorHandler',
            );
            return;
          }

          default: {
            showAppLikeError(error);
            return;
          }
        }
      });
    };

    rootEmitter.on(
      'event::error:uncaught-error',
      (event) => {
        if (!event.isAppError) {
          showUnexpectedError(event.error);
          return;
        }
        const handled = handleAppLikeError(event.error);
        if (!handled) {
          showUnexpectedError(event.error);
        }
      },
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [rootEmitter, coreServices, logger]);

  return null;
}
