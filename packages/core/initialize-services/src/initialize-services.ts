import { isFileSystemDirectoryHandle } from '@bangle.io/baby-fs';
import {
  assertIsDefined,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import type { EnabledBangleAppCommand } from '@bangle.io/commands';
import { slot } from '@bangle.io/poor-mans-di';
import type { WorkspaceOpsService } from '@bangle.io/service-core';
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
  CommandHandler,
  RootEmitter,
} from '@bangle.io/types';
import { readEditorEnginePreference } from './editor-engine-preference';
import {
  createServiceSetup,
  type EditorEngineServiceConstructor,
} from './service-setup';

/**
 * Resolves the persisted engine preference to a service class. Only the
 * chosen engine's package is imported — Vite code-splits both engine stacks,
 * so a ProseMirror tab never parses Wordgard code and vice versa (plans/011).
 */
async function loadEditorEngine(): Promise<EditorEngineServiceConstructor> {
  if (readEditorEnginePreference() === 'wordgard') {
    const { EditorWService } = await import('@bangle.io/editor-w');
    return EditorWService;
  }
  const { PmEditorService } = await import('@bangle.io/editor');
  return PmEditorService;
}

export async function initializeServices(
  commonOpts: BaseServiceCommonOptions,
  rootEmitter: RootEmitter,
  commands: EnabledBangleAppCommand[],
  commandHandlers: Array<{ id: string; handler: CommandHandler }>,
  theme: ThemeManager,
) {
  const editorEngine = await loadEditorEngine();
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
    fileStorageSlots: ['fileStorageIdb', 'fileStorageNativeFs'],
    editorEngine,
  });

  getWorkspaceOps = () => setup.getServices().workspaceOps;

  setup.instantiate();

  return {
    coreServices: setup.coreServices(),
    mountAll: setup.mountAll,
    describe: setup.describe,
  };
}
