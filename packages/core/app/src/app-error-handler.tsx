import { getGithubUrl, handleAppError } from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import {
  type EditorEngineContract,
  useCoreServices,
  useLogger,
} from '@bangle.io/context';
import type { AppError, RootEmitter } from '@bangle.io/types';
import { toast } from '@bangle.io/ui-components';
import React, { useEffect } from 'react';

type SaveFailureSource = Pick<
  EditorEngineContract,
  'getSaveStatus' | 'retryFailedSave' | 'subscribeToSaveStatus'
>;

export type SaveFailureToastTarget = {
  dismiss: (wsPath: string) => void;
  show: (wsPath: string, retry: () => void) => void;
};

/**
 * Keeps every infinite save-failure toast bound to the queue state for its
 * exact path. Retry never dismisses optimistically: the pending transition
 * emitted by the queue is what withdraws the failure UI.
 */
export function createSaveFailureToastManager(
  source: SaveFailureSource,
  target: SaveFailureToastTarget,
): {
  dispose: () => void;
  show: (wsPath: string) => void;
} {
  type Watcher = {
    active: boolean;
    unsubscribe: () => void;
  };
  const watchers = new Map<string, Watcher>();

  const stop = (wsPath: string, dismiss: boolean) => {
    const watcher = watchers.get(wsPath);
    if (!watcher) {
      return;
    }
    watcher.active = false;
    watcher.unsubscribe();
    watchers.delete(wsPath);
    if (dismiss) {
      target.dismiss(wsPath);
    }
  };

  const show = (wsPath: string) => {
    stop(wsPath, false);

    const watcher: Watcher = { active: true, unsubscribe: () => {} };
    watchers.set(wsPath, watcher);
    const syncWithQueue = () => {
      if (!watcher.active || source.getSaveStatus(wsPath) === 'failed') {
        return;
      }
      stop(wsPath, true);
    };
    watcher.unsubscribe = source.subscribeToSaveStatus(syncWithQueue, wsPath);
    if (!watcher.active) {
      // Handles a source that calls its listener synchronously while
      // subscribing before the real unsubscribe function was assigned.
      watcher.unsubscribe();
      return;
    }
    syncWithQueue();

    if (watcher.active) {
      target.show(wsPath, () => {
        source.retryFailedSave(wsPath);
      });
    }
  };

  return {
    show,
    dispose: () => {
      for (const wsPath of [...watchers.keys()]) {
        stop(wsPath, true);
      }
    },
  };
}

export function shouldReportAppError(appError: AppError): boolean {
  switch (appError.name) {
    case 'error::file:already-existing':
    case 'error::file:size-too-large':
    case 'error::file-storage:file-does-not-exist':
    case 'error::workspace:native-fs-auth-needed':
    case 'error::workspace:native-fs-locate-failed':
    case 'error::workspace:native-fs-reconnect-failed':
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
    const saveFailureToasts = createSaveFailureToastManager(
      coreServices.editorEngine,
      {
        dismiss: (wsPath) => {
          toast.dismiss(`editor-save-failed:${wsPath}`);
        },
        show: (wsPath, retry) => {
          toast.error(t.app.toasts.saveFailed, {
            id: `editor-save-failed:${wsPath}`,
            duration: Number.POSITIVE_INFINITY,
            action: {
              label: t.app.toasts.retrySave,
              onClick: retry,
            },
          });
        },
      },
    );
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
            saveFailureToasts.show(appError.payload.wsPath);
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
      saveFailureToasts.dispose();
    };
  }, [rootEmitter, coreServices, logger]);

  return null;
}
