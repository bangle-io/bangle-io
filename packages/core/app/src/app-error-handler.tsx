import { getGithubUrl, handleAppError } from '@bangle.io/base-utils';
import { useCoreServices, useLogger } from '@bangle.io/context';
import type { AppError, RootEmitter } from '@bangle.io/types';
import { toast } from '@bangle.io/ui-components';
import React, { useEffect } from 'react';

export function shouldReportAppError(appError: AppError): boolean {
  switch (appError.name) {
    case 'error::file:already-existing':
    case 'error::file:size-too-large':
    case 'error::file-storage:file-does-not-exist':
    case 'error::workspace:native-fs-auth-needed':
    case 'error::workspace:no-note-opened':
    case 'error::workspace:no-notes-found':
    case 'error::workspace:not-opened':
    case 'error::ws-path:create-new-note':
    case 'error::ws-path:invalid-markdown-path':
    case 'error::ws-path:invalid-note-path':
    case 'error::ws-path:invalid-ws-name':
    case 'error::ws-path:invalid-ws-path':
      return false;
    default:
      return true;
  }
}

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
      return handleAppError(error, (appError, error) => {
        if (shouldReportAppError(appError)) {
          logger.error(error);
        } else {
          logger.warn('Handled app error:', error.message);
        }

        switch (appError.name) {
          case 'error::editor:save-failed': {
            const toastId = `editor-save-failed:${appError.payload.wsPath}`;
            toast.error(t.app.toasts.saveFailed, {
              id: toastId,
              duration: Number.POSITIVE_INFINITY,
              action: {
                label: t.app.toasts.retrySave,
                onClick: () => {
                  if (
                    coreServices.pmEditorService.retryFailedSave(
                      appError.payload.wsPath,
                    )
                  ) {
                    toast.dismiss(toastId);
                  }
                },
              },
            });
            return;
          }

          case 'error::workspace:native-fs-auth-needed': {
            coreServices.commandDispatcher.dispatch(
              'command::ui:native-fs-auth',
              { wsName: appError.payload.wsName },
              'AppErrorHandler',
            );
            return;
          }

          case 'error::file:size-too-large': {
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
