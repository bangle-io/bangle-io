import {
  type BaseService,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import { Logger } from '@bangle.io/logger';
import { RootEmitter } from '@bangle.io/root-emitter';
import {
  CommandDispatchService,
  CommandRegistryService,
  FileSystemService,
  NavigationService,
  ShortcutService,
  type ShortcutServiceConfig,
  WorkbenchService,
  WorkbenchStateService,
  WorkspaceOpsService,
  WorkspaceService,
  WorkspaceStateService,
} from '@bangle.io/service-core';
// to avoid loading page-lifecycle
import { FileStorageMemory } from '@bangle.io/service-platform/src/file-storage-memory';
import { MemoryDatabaseService } from '@bangle.io/service-platform/src/memory-database';
import { MemoryRouterService } from '@bangle.io/service-platform/src/memory-router';
import { NodeErrorHandlerService } from '@bangle.io/service-platform/src/node-error-handler';

import {
  type BaseServiceCommonOptions,
  CoreServices,
  type PlatformServices,
  Services,
  type Store,
} from '@bangle.io/types';
import { createStore } from 'jotai';
import { Provider, useAtom, useAtomValue, useStore } from 'jotai/react';
import { vi } from 'vitest';
export type { Store } from '@bangle.io/types';

type CommonEntities = ReturnType<typeof createCommonEntities>;

function pushAndReturn<T>(result: T, array: unknown[]): T {
  array.push(result);
  return result;
}

interface ServiceDeps {
  entities: CommonEntities;
  rootEmitter: RootEmitter;
  platformServices: PlatformServices;
}

interface ServiceWithDeps extends ServiceDeps {
  navigation: NavigationService;
  fileSystem: FileSystemService;
  workspaceOps: WorkspaceOpsService;
}

function createNavigationService({ entities, platformServices }: ServiceDeps) {
  return pushAndReturn(
    new NavigationService(entities.commonOpts, {
      routerService: platformServices.router,
    }),
    entities.allServices,
  );
}

function createFileSystemService({
  entities,
  rootEmitter,
  platformServices,
}: ServiceDeps) {
  const abortController = new AbortController();
  const service = new FileSystemService(
    entities.commonOpts,
    { ...platformServices.fileStorage },
    {
      fileStorageServices: platformServices.fileStorage,
      emitter: rootEmitter.scoped(
        ['event::file:update', 'event::file:force-update'],
        abortController.signal,
      ),
    },
  );
  return pushAndReturn(service, entities.allServices);
}

function createWorkspaceOpsService({
  entities,
  platformServices,
}: ServiceDeps) {
  const service = new WorkspaceOpsService(entities.commonOpts, {
    database: platformServices.database,
  });
  return pushAndReturn(service, entities.allServices);
}

function createWorkspaceStateService({
  entities,
  navigation,
  fileSystem,
  workspaceOps,
}: ServiceWithDeps) {
  return pushAndReturn(
    new WorkspaceStateService(entities.commonOpts, {
      navigation,
      fileSystem,
      workspaceOps,
    }),
    entities.allServices,
  );
}

function initPlatformServices(
  entities: CommonEntities,
  rootEmitter: RootEmitter,
): PlatformServices {
  const errorService = pushAndReturn(
    new NodeErrorHandlerService(entities.commonOpts, undefined, {
      onError: (params) => {
        rootEmitter.emit('event::error:uncaught-error', {
          ...params,
          sender: getEventSenderMetadata({ tag: errorService.name }),
        });
      },
    }),
    entities.allServices,
  );

  const database = pushAndReturn(
    new MemoryDatabaseService(entities.commonOpts, undefined),
    entities.allServices,
  );

  const fileStorageServiceIdb = pushAndReturn(
    new FileStorageMemory(entities.commonOpts, undefined, {
      onChange: (change) => {
        entities.commonOpts.logger.info('File storage change:', change);
      },
    }),
    entities.allServices,
  );

  const browserRouterService = pushAndReturn(
    new MemoryRouterService(entities.commonOpts, undefined),
    entities.allServices,
  );

  return {
    errorService,
    database,
    fileStorage: {
      [fileStorageServiceIdb.workspaceType]: fileStorageServiceIdb,
    },
    router: browserRouterService,
  };
}

export function initUserActivityDepsService({
  signal = new AbortController().signal,
  store,
}: {
  store: Store;
  signal?: AbortSignal;
}) {
  const entities = createCommonEntities({
    signal,
    store,
  });

  const platformServices = initPlatformServices(entities, entities.rootEmitter);
  const deps: ServiceDeps = {
    entities,
    rootEmitter: entities.rootEmitter,
    platformServices,
  };

  const navigation = createNavigationService(deps);
  const fileSystemService = createFileSystemService(deps);
  const workspaceOps = createWorkspaceOpsService(deps);

  const workspaceState = createWorkspaceStateService({
    ...deps,
    navigation,
    fileSystem: fileSystemService,
    workspaceOps,
  });

  return {
    ...entities.mockLog,
    initAllServices: async () => {
      fileSystemService.setInitConfig({
        getWorkspaceInfo: async ({ wsName }) => {
          const wsInfo = await workspaceOps.getWorkspaceInfo(wsName);
          if (!wsInfo) {
            throwAppError(
              'error::workspace:not-found',
              `Workspace not found: ${wsName}`,
              {
                wsName,
              },
            );
          }
          return wsInfo;
        },
      });

      for (const service of entities.allServices) {
        service.initialize();
      }

      for (const service of entities.allServices) {
        await service.initializedPromise;
      }

      entities.allServices;
    },
    logger: entities.logger,
    commonOpts: entities.commonOpts,
    rootEmitter: entities.rootEmitter,
    platformServices,
    navigation,
    fileSystemService,
    workspaceOps,
    workspaceState,
  };
}

function createCommonEntities({
  signal,
  store,
}: { signal: AbortSignal; store: Store }) {
  const mockLog = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const allServices: BaseService<any>[] = [];

  const logger = new Logger('', 'debug', mockLog as any);
  const rootEmitter = new RootEmitter({
    abortSignal: signal,
  });

  const commonOpts: BaseServiceCommonOptions = {
    rootAbortSignal: signal,
    logger,
    store,
    emitAppError(error) {
      rootEmitter.emit('event::error:uncaught-error', {
        error,
        appLikeError: true,
        rejection: false,
        isFakeThrow: true,
        sender: getEventSenderMetadata({ tag: 'initialize-service' }),
      });
    },
  };

  return { allServices, logger, store, commonOpts, rootEmitter, mockLog };
}
