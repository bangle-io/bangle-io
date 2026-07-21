import {
  assertIsDefined,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import type { EnabledBangleAppCommand } from '@bangle.io/commands';
import {
  DEFAULT_EDITOR_ENGINE,
  EDITOR_ENGINE_QUERY_PARAM,
  type EditorEngineId,
  isEditorEngineId,
} from '@bangle.io/constants';
import type { EditorSaveCoordinator } from '@bangle.io/editor';
import { isFileSystemDirectoryHandle } from '@bangle.io/native-fs';
import { slot } from '@bangle.io/poor-mans-di';
import type { WorkspaceOpsService } from '@bangle.io/service-core';
import {
  BrowserErrorHandlerService,
  BrowserLocalStorageSyncDatabaseService,
  BrowserRouterService,
  DesktopHybridDatabaseService,
  DesktopNativeDatabaseService,
  FileStorageIndexedDB,
  FileStorageNativeFs,
  HashStrategy,
  IdbDatabaseService,
} from '@bangle.io/service-platform';
import type {
  BaseServiceCommonOptions,
  CommandHandler,
  DesktopConfigBridge,
  RootEmitter,
  WindowWithDesktopBridge,
} from '@bangle.io/types';
import { createServiceSetup } from './service-setup';

export function readEditorEngineFromUrl(
  location: Pick<Location, 'search'> = window.location,
): EditorEngineId {
  const engineId = new URLSearchParams(location.search).get(
    EDITOR_ENGINE_QUERY_PARAM,
  );
  return isEditorEngineId(engineId) ? engineId : DEFAULT_EDITOR_ENGINE;
}

/**
 * The native config bridge the Electron preload injects on `window` before any
 * renderer script runs. Present only inside the desktop shell; `undefined` in a
 * plain browser, which keeps the browser wiring on IndexedDB.
 */
function getDesktopConfigBridge(): DesktopConfigBridge | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return (window as WindowWithDesktopBridge).bangleDesktop?.configDb;
}

export function initializeServices(
  commonOpts: BaseServiceCommonOptions,
  rootEmitter: RootEmitter,
  commands: EnabledBangleAppCommand[],
  commandHandlers: Array<{ id: string; handler: CommandHandler }>,
  theme: ThemeManager,
  editorSaveCoordinator: EditorSaveCoordinator,
) {
  const editorEngineId = readEditorEngineFromUrl();
  // Native FS root-handle resolution needs workspace metadata, which lives in
  // a core service. The lookup is late-bound: it is wired right after the
  // setup is created and only runs after services are instantiated.
  let getWorkspaceOps: (() => WorkspaceOpsService) | undefined;

  // Platform slots shared by the browser and desktop composition. Only the
  // `database` seam differs between environments (see below); everything here —
  // including the localStorage sync database — is identical.
  const commonPlatformServices = {
    errorService: slot(BrowserErrorHandlerService, () => ({
      onError: (params) => {
        rootEmitter.emit('event::error:uncaught-error', {
          ...params,
          sender: getEventSenderMetadata({ tag: 'BrowserErrorHandlerService' }),
        });
      },
    })),
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
    router: slot(BrowserRouterService, () => ({
      strategy: new HashStrategy(window.location.search),
      basePath: '/ws',
    })),
  };

  const commonSetupOptions = {
    commonOpts,
    rootEmitter,
    commands,
    commandHandlers,
    themeManager: theme,
    shortcutTarget: document,
    fileStorageSlots: ['fileStorageIdb', 'fileStorageNativeFs'] as const,
    editorEngineId,
    editorSaveCoordinator,
  };

  const desktopConfigBridge = getDesktopConfigBridge();

  // On desktop the async `database` seam is served by a native, file-backed
  // store (via IPC). A hybrid fronts it and IndexedDB, keeping records that
  // carry a non-serializable native-FS handle in IndexedDB. In the browser the
  // seam stays on IndexedDB directly.
  if (desktopConfigBridge) {
    const setup = createServiceSetup({
      ...commonSetupOptions,
      platformServices: {
        ...commonPlatformServices,
        database: slot(DesktopHybridDatabaseService),
        nativeConfigDatabase: slot(DesktopNativeDatabaseService, () => ({
          bridge: desktopConfigBridge,
        })),
        idbDatabase: IdbDatabaseService,
      },
    });

    getWorkspaceOps = () => setup.getServices().workspaceOps;
    setup.instantiate();

    return {
      coreServices: setup.coreServices(),
      mountAll: setup.mountAll,
      describe: setup.describe,
    };
  }

  const setup = createServiceSetup({
    ...commonSetupOptions,
    platformServices: {
      ...commonPlatformServices,
      database: IdbDatabaseService,
    },
  });

  getWorkspaceOps = () => setup.getServices().workspaceOps;
  setup.instantiate();

  return {
    coreServices: setup.coreServices(),
    mountAll: setup.mountAll,
    describe: setup.describe,
  };
}
