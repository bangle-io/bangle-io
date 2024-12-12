import { getEventSenderMetadata, throwAppError } from '@bangle.io/base-utils';

import {
  BrowserErrorHandlerService,
  BrowserLocalStorageSyncDatabaseService,
  BrowserRouterService,
  FileStorageIndexedDB,
  FileStorageNativeFs,
  IdbDatabaseService,
} from '@bangle.io/service-platform';

import type {
  BaseServiceCommonOptions,
  PlatformServicesSetup,
  RootEmitter,
} from '@bangle.io/types';

export function platformServicesSetup(
  commonOpts: BaseServiceCommonOptions,
  rootEmitter: RootEmitter,
): PlatformServicesSetup {
  const errorService = new BrowserErrorHandlerService(commonOpts, undefined, {
    onError: (params) => {
      rootEmitter.emit('event::error:uncaught-error', {
        ...params,
        sender: getEventSenderMetadata({ tag: errorService.name }),
      });
    },
  });

  const idbDatabase = new IdbDatabaseService(commonOpts, undefined);
  const fileStorageServiceIdb = new FileStorageIndexedDB(
    commonOpts,
    undefined,
    {
      onChange: (change) => {
        commonOpts.logger.info('File storage change:', change);
      },
    },
  );

  const nativeFsFileStorage = new FileStorageNativeFs(commonOpts, undefined, {
    onChange: (change) => {
      commonOpts.logger.info('File storage change:', change);
    },
  });

  const browserRouterService = new BrowserRouterService(commonOpts, undefined);

  const browserLocalStorage = new BrowserLocalStorageSyncDatabaseService(
    commonOpts,
    undefined,
  );

  return {
    services: {
      errorService,
      database: idbDatabase,
      syncDatabase: browserLocalStorage,
      fileStorage: {
        [fileStorageServiceIdb.workspaceType]: fileStorageServiceIdb,
        [nativeFsFileStorage.workspaceType]: nativeFsFileStorage,
      },
      router: browserRouterService,
    },
    configure: ({ workspaceOps }) => {
      errorService.initialize();

      nativeFsFileStorage.setInitConfig({
        getRootDirHandle: async (wsName: string) => {
          const { rootDirHandle } =
            await workspaceOps.getWorkspaceMetadata(wsName);

          if (!rootDirHandle) {
            throwAppError(
              'error::workspace:invalid-metadata',
              `Invalid workspace metadata for ${wsName}. Missing root dir handle`,
              {
                wsName,
              },
            );
          }

          if (!(await FileStorageNativeFs.hasPermission(rootDirHandle))) {
            throwAppError(
              'error::workspace:native-fs-auth-needed',
              `Need permission for ${rootDirHandle.name}`,
              {
                wsName,
              },
            );
          }

          return { handle: rootDirHandle };
        },
      });
    },
  };
}
