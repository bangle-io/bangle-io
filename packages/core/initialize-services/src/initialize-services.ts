import { isFileSystemDirectoryHandle } from '@bangle.io/baby-fs';
import {
  assertIsDefined,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import type { EnabledBangleAppCommand } from '@bangle.io/commands';
import {
  FILE_STORAGE_MAX_FILE_SIZE_BYTES,
  SERVICE_NAME,
  WORKSPACE_STORAGE_TYPE,
} from '@bangle.io/constants';
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
    // "Remote Server" — HTTP transport, built from the workspace's stored URL +
    // token. An empty URL targets the same origin (bundled/Docker mode).
    fileStorageRemote: slot(FileStorageRemote, () => ({
      serviceName: SERVICE_NAME.fileStorageRemoteService,
      workspaceType: WORKSPACE_STORAGE_TYPE.Remote,
      displayName: 'Remote Server',
      description: 'Syncs notes with your own file server',
      maxFileSizeBytes: FILE_STORAGE_MAX_FILE_SIZE_BYTES.remote,
      onChange: (change) => {
        commonOpts.logger.info('File storage change:', change);
      },
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

        return createHttpRemoteClient({ baseUrl: serverUrl, token });
      },
    })),
    // "This device" — the Electron desktop's on-disk store, reached over IPC to
    // the main process. Same provider, different transport. On the web the
    // bridge is absent, so this type is never offered nor resolvable.
    fileStorageElectron: slot(FileStorageRemote, () => ({
      serviceName: SERVICE_NAME.fileStorageElectronService,
      workspaceType: WORKSPACE_STORAGE_TYPE.Electron,
      displayName: 'This device',
      description: 'Saves notes on this computer',
      maxFileSizeBytes: FILE_STORAGE_MAX_FILE_SIZE_BYTES.electron,
      onChange: (change) => {
        commonOpts.logger.info('File storage change:', change);
      },
      getClient: (wsName: string) => {
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
      'fileStorageElectron',
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
