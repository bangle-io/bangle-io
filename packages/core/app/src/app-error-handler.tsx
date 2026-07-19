import { getGithubUrl, handleAppError } from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
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
      return handleAppError(error, (appError, error) => {
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
                    coreServices.editorEngine.retryFailedSave(
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

          case 'error::workspace:native-fs-locate-failed':
          case 'error::workspace:native-fs-reconnect-failed': {
            // Expected user-facing outcomes, not app defects: no Report action.
            toast.error(error.message, {
              duration: 5000,
              cancel: {
                label: t.app.common.dismiss,
                onClick: () => {},
              },
            });
            return;
          }

          case 'error::file-storage:file-does-not-exist': {
            if (
              appError.payload.storage ===
                SERVICE_NAME.fileStorageNativeFsService &&
              appError.payload.wsPath.endsWith(':')
            ) {
              // WorkspaceState exposes a missing Native FS root as a full-page
              // recovery view. A second transient toast would compete with it.
              return;
            }
            showAppLikeError(error);
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
