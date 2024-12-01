import {
  BaseError,
  getGithubUrl,
  handleAppError,
  isAppError,
  throwAppError,
} from '@bangle.io/base-utils';
import { useCoreServices, useLogger } from '@bangle.io/context';
import { FileStorageNativeFs } from '@bangle.io/service-platform';
import type { RootEmitter } from '@bangle.io/types';
import { toast } from '@bangle.io/ui-components';
import { useAtom, useSetAtom } from 'jotai';
import React, { useEffect } from 'react';

export function AppErrorHandler({
  rootEmitter,
}: {
  rootEmitter: RootEmitter;
}) {
  const coreServices = useCoreServices();
  const logger = useLogger();
  const setAlertDialog = useSetAtom(coreServices.workbenchState.$alertDialog);

  useEffect(() => {
    const controller = new AbortController();

    const showUnexpectedError = (error: Error) => {
      toast.error(error.message, {
        duration: Number.POSITIVE_INFINITY,
        cancel: {
          label: 'Dismiss',
          onClick: () => {},
        },
        action: {
          label: 'Report',
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
          label: 'Dismiss',
          onClick: () => {},
        },
      });
    };

    const handleAppLikeError = (error: Error) => {
      logger.error(error);
      return handleAppError(error, (appError, error) => {
        switch (appError.name) {
          case 'error::workspace:native-fs-auth-needed': {
            const wsName = appError.payload.wsName;

            coreServices.workspaceOps
              .getWorkspaceMetadata(wsName)
              .then(({ rootDirHandle }) => {
                if (!rootDirHandle) {
                  throwAppError(
                    'error::workspace:invalid-metadata',
                    `Invalid workspace metadata for ${wsName}. Missing root dir handle`,
                    {
                      wsName,
                    },
                  );
                }

                const onNotGranted = () => {
                  toast.error('Permission not granted', {
                    duration: 5000,
                    cancel: {
                      label: 'Dismiss',
                      onClick: () => {},
                    },
                  });
                  coreServices.navigation.goHome();
                };

                setAlertDialog({
                  dialogId: 'dialog::workspace:native-fs-auth-needed',
                  title: 'Grant permission?',
                  description: `Bangle.io needs you permission to access "${wsName}"`,
                  continueText: 'Grant',
                  onContinue: async () => {
                    const granted =
                      await FileStorageNativeFs.requestNativeBrowserFSPermission(
                        rootDirHandle,
                      );

                    if (!granted) {
                      onNotGranted();
                      return;
                    }
                    coreServices.navigation.goWorkspace(wsName);
                    return;
                  },
                  onCancel: () => {
                    onNotGranted();
                  },
                });
              });
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
        if (!event.appLikeError) {
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
  }, [rootEmitter, setAlertDialog, coreServices, logger]);

  return null;
}
