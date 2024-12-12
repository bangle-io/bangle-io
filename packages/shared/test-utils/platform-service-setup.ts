import { getEventSenderMetadata, throwAppError } from '@bangle.io/base-utils';

// use direct paths to avoid loading page-lifecycle
import { FileStorageMemory } from '@bangle.io/service-platform/src/file-storage-memory';
import { MemoryDatabaseService } from '@bangle.io/service-platform/src/memory-database';
import { MemoryRouterService } from '@bangle.io/service-platform/src/memory-router';
import { MemorySyncDatabaseService } from '@bangle.io/service-platform/src/memory-sync-database';
import { TestErrorHandlerService } from '@bangle.io/service-platform/src/test-error-handler';

import type {
  BaseServiceCommonOptions,
  PlatformServicesSetup,
  RootEmitter,
} from '@bangle.io/types';

export function platformServicesSetup(
  commonOpts: BaseServiceCommonOptions,
  _rootEmitter: RootEmitter,
) {
  const testErrorService = new TestErrorHandlerService(commonOpts, undefined);
  const memoryDatabaseService = new MemoryDatabaseService(
    commonOpts,
    undefined,
  );

  const fileStorageMemory = new FileStorageMemory(commonOpts, undefined, {
    onChange: (change) => {
      commonOpts.logger.info('File storage change:', change);
    },
  });

  const memoryRouterService = new MemoryRouterService(commonOpts, undefined);
  const memorySyncDatabaseService = new MemorySyncDatabaseService(
    commonOpts,
    undefined,
  );

  return {
    services: {
      errorService: testErrorService,
      database: memoryDatabaseService,
      syncDatabase: memorySyncDatabaseService,
      fileStorage: {
        [fileStorageMemory.workspaceType]: fileStorageMemory,
      },
      router: memoryRouterService,
    },
    configure: () => {},
  } satisfies PlatformServicesSetup;
}
