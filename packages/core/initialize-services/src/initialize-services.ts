import { isFileSystemDirectoryHandle } from '@bangle.io/baby-fs';
import {
  assertIsDefined,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import type { EnabledBangleAppCommand } from '@bangle.io/commands';
import { DESKTOP_REMOTE_FS_SERVER_URL } from '@bangle.io/constants';
import { slot } from '@bangle.io/poor-mans-di';
import {
  createHttpRemoteClient,
  createRemoteClientFromRouter,
} from '@bangle.io/remote-file-sync';
import type { WorkspaceOpsService } from '@bangle.io/service-core';
import {
  BrowserErrorHandlerService,
  BrowserLocalStorageSyncDatabaseService,
  BrowserRouterService,
  FileStorageIndexedDB,
  FileStorageNativeFs,
  FileStorageRemote,
  HashStrategy,
  IdbDatabaseService,
} from '@bangle.io/service-platform';
import type {
  BaseServiceCommonOptions,
  CommandHandler,
  RootEmitter,
} from '@bangle.io/types';
import { createServiceSetup } from './service-setup';

export function initializeServices(
  commonOpts: BaseServiceCommonOptions,
  rootEmitter: RootEmitter,
  commands: EnabledBangleAppCommand[],
  commandHandlers: Array<{ id: string; handler: CommandHandler }>,
  theme: ThemeManager,
) {
  // Native FS root-handle resolution needs workspace metadata, which lives in
  // a core service. The lookup is late-bound: it is wired right after the
  // setup is created and only runs after services are instantiated.
  let getWorkspaceOps: (() => WorkspaceOpsService) | undefined;

  const browserPlatformServices = {
    errorService: slot(BrowserErrorHandlerService, () => ({
      onError: (params) => {
        rootEmitter.emit('event::error:uncaught-error', {
          ...params,
          sender: getEventSenderMetadata({ tag: 'BrowserErrorHandlerService' }),
        });
      },
    })),
    database: IdbDatabaseService,
    syncDatabase: BrowserLocalStorageSyncDatabaseService,
    fileStorageIdb: slot(FileStorageIndexedDB, () => ({
      onChange: (change) => {
        commonOpts.logger.info('File storage change:', change);
      },
    })),
    fileStorageNativeFs: slot(FileStorageNativeFs, () => ({
      onChange: (change) => {
        commonOpts.logger.info('File storage change:', change);
      },
      getRootDirHandle: async (wsName: string) => {
        assertIsDefined(getWorkspaceOps, 'getWorkspaceOps');
        const { rootDirHandle } =
          await getWorkspaceOps().getWorkspaceMetadata(wsName);

        if (!isFileSystemDirectoryHandle(rootDirHandle)) {
          throwAppError(
            'error::workspace:invalid-metadata',
            `Invalid workspace metadata for ${wsName}`,
            { wsName },
          );
        }

        if (!(await FileStorageNativeFs.hasPermission(rootDirHandle))) {
          throwAppError(
            'error::workspace:native-fs-auth-needed',
            `Need permission for ${rootDirHandle.name}`,
            { wsName },
          );
        }

        return { handle: rootDirHandle };
      },
    })),
    fileStorageRemote: slot(FileStorageRemote, () => ({
      onChange: (change) => {
        commonOpts.logger.info('File storage change:', change);
      },
      // Build an HTTP client from the workspace's stored connection details.
      // An empty `serverUrl` targets the same origin (bundled/Docker mode).
      getClient: async (wsName: string) => {
        assertIsDefined(getWorkspaceOps, 'getWorkspaceOps');
        const metadata = await getWorkspaceOps().getWorkspaceMetadata(wsName);
        const serverUrl =
          typeof metadata.serverUrl === 'string'
            ? metadata.serverUrl
            : undefined;
        const token =
          typeof metadata.token === 'string' && metadata.token.length > 0
            ? metadata.token
            : undefined;

        if (serverUrl === undefined) {
          throwAppError(
            'error::workspace:invalid-metadata',
            `Remote workspace ${wsName} is missing a server URL`,
            { wsName },
          );
        }

        // On Electron, a workspace pointed at the desktop sentinel talks to the
        // main-process file store over IPC instead of HTTP.
        if (serverUrl === DESKTOP_REMOTE_FS_SERVER_URL) {
          const bridge =
            typeof window !== 'undefined'
              ? window.bangleDesktop?.remoteFs
              : undefined;
          if (!bridge) {
            throwAppError(
              'error::remote-storage:request-failed',
              'Desktop file backend is unavailable',
              { wsName, code: 'network', reason: 'desktop bridge missing' },
            );
          }
          return createRemoteClientFromRouter((req) => bridge.request(req));
        }

        return createHttpRemoteClient({ baseUrl: serverUrl, token });
      },
    })),
    router: slot(BrowserRouterService, () => ({
      strategy: new HashStrategy(),
      basePath: '/ws',
    })),
  };

  const setup = createServiceSetup({
    commonOpts,
    rootEmitter,
    commands,
    commandHandlers,
    themeManager: theme,
    shortcutTarget: document,
    platformServices: browserPlatformServices,
    fileStorageSlots: [
      'fileStorageIdb',
      'fileStorageNativeFs',
      'fileStorageRemote',
    ],
  });

  getWorkspaceOps = () => setup.getServices().workspaceOps;

  setup.instantiate();

  return {
    coreServices: setup.coreServices(),
    mountAll: setup.mountAll,
    describe: setup.describe,
  };
}
