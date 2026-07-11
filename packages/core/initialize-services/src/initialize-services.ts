import { isFileSystemDirectoryHandle } from '@bangle.io/baby-fs';
import {
  assertIsDefined,
  atomStorageKey,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import type { EnabledBangleAppCommand } from '@bangle.io/commands';
import {
  DEFAULT_EDITOR_ENGINE,
  EDITOR_ENGINE_PREFERENCE_KEY,
  type EditorEngineId,
  isEditorEngineId,
  SERVICE_NAME,
} from '@bangle.io/constants';
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
import { createServiceSetup } from './service-setup';

export const EDITOR_ENGINE_PREFERENCE_STORAGE_KEY =
  BrowserLocalStorageSyncDatabaseService.storageKeyFor(
    atomStorageKey(
      SERVICE_NAME.workbenchStateService,
      EDITOR_ENGINE_PREFERENCE_KEY,
    ),
    'sync',
  );

export function readEditorEnginePreference(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): EditorEngineId {
  try {
    const raw = storage.getItem(EDITOR_ENGINE_PREFERENCE_STORAGE_KEY);
    if (raw === null) {
      return DEFAULT_EDITOR_ENGINE;
    }
    const parsed: unknown = JSON.parse(raw);
    return isEditorEngineId(parsed) ? parsed : DEFAULT_EDITOR_ENGINE;
  } catch {
    return DEFAULT_EDITOR_ENGINE;
  }
}

export function resetEditorEnginePreference(
  storage: Pick<Storage, 'setItem'> = window.localStorage,
): boolean {
  try {
    storage.setItem(
      EDITOR_ENGINE_PREFERENCE_STORAGE_KEY,
      JSON.stringify(DEFAULT_EDITOR_ENGINE),
    );
    return true;
  } catch {
    return false;
  }
}

export function initializeServices(
  commonOpts: BaseServiceCommonOptions,
  rootEmitter: RootEmitter,
  commands: EnabledBangleAppCommand[],
  commandHandlers: Array<{ id: string; handler: CommandHandler }>,
  theme: ThemeManager,
) {
  const editorEngineId = readEditorEnginePreference();
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
    editorEngineId,
  });

  getWorkspaceOps = () => setup.getServices().workspaceOps;

  setup.instantiate();

  return {
    coreServices: setup.coreServices(),
    mountAll: setup.mountAll,
    describe: setup.describe,
  };
}
