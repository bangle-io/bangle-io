import { getEventSenderMetadata, throwAppError } from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import {
  BrowserErrorHandlerService,
  BrowserLocalStorageSyncDatabaseService,
  BrowserRouterService,
  FileStorageIndexedDB,
  FileStorageNativeFs,
  HashStrategy,
  IdbDatabaseService,
} from '@bangle.io/service-platform';
import type {
  BaseServiceCommonOptions,
  Command,
  CommandHandler,
  RootEmitter,
} from '@bangle.io/types';
import {
  coreServiceMap,
  createServiceSetup,
  defineAppServiceMap,
} from './service-setup';

const browserPlatformServiceMap = {
  errorService: BrowserErrorHandlerService,
  database: IdbDatabaseService,
  syncDatabase: BrowserLocalStorageSyncDatabaseService,
  fileStorageIdb: FileStorageIndexedDB,
  fileStorageNativeFs: FileStorageNativeFs,
  router: BrowserRouterService,
};

const browserServiceMap = defineAppServiceMap({
  ...browserPlatformServiceMap,
  ...coreServiceMap,
});

export function initializeServices(
  commonOpts: BaseServiceCommonOptions,
  rootEmitter: RootEmitter,
  commands: Command[],
  commandHandlers: Array<{ id: string; handler: CommandHandler }>,
  theme: ThemeManager,
) {
  const setup = createServiceSetup({
    commonOpts,
    rootEmitter,
    commands,
    commandHandlers,
    themeManager: theme,
    shortcutTarget: document,
    serviceMap: browserServiceMap,
    fileStorageSlots: ['fileStorageIdb', 'fileStorageNativeFs'],
  });

  const { container, getServices } = setup;

  container.setConfig(BrowserRouterService, () => ({
    strategy: new HashStrategy(),
    basePath: '/ws',
  }));

  container.setConfig(BrowserErrorHandlerService, () => ({
    onError: (params) => {
      rootEmitter.emit('event::error:uncaught-error', {
        ...params,
        sender: getEventSenderMetadata({ tag: 'BrowserErrorHandlerService' }),
      });
    },
  }));

  container.setConfig(FileStorageIndexedDB, () => ({
    onChange: (change) => {
      commonOpts.logger.info('File storage change:', change);
    },
  }));

  container.setConfig(FileStorageNativeFs, () => ({
    onChange: (change) => {
      commonOpts.logger.info('File storage change:', change);
    },
    getRootDirHandle: async (wsName: string) => {
      const { rootDirHandle } =
        await getServices().workspaceOps.getWorkspaceMetadata(wsName);

      if (!rootDirHandle) {
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
  }));

  setup.instantiate();

  return {
    coreServices: setup.coreServices(),
    mountAll: setup.mountAll,
    describe: setup.describe,
  };
}
