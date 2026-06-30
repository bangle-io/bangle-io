import type {
  BaseError,
  BaseErrorService,
  BaseService,
  Logger,
} from '@bangle.io/base-utils';
import type { createStore } from 'jotai';

import type { BaseAppDatabase, BaseAppSyncDatabase } from './base-database';
import type { BaseFileStorageProvider } from './base-file-storage';
import type { BaseRouter } from './base-router';

export type ServiceKind = 'platform' | 'core';

export type Store = ReturnType<typeof createStore>;

export type BaseServiceCommonOptions = {
  rootAbortSignal: AbortSignal;
  logger: Logger;
  store: Store;
  // for cases where throwing an error is not possible
  emitAppError: (error: BaseError) => void;
};

export type RouterState = {
  [key: string]: unknown;
};

export type BaseRouterService = BaseRouter<RouterState> & BaseService;

export type CoreServiceSlotId =
  | 'commandDispatcher'
  | 'commandRegistry'
  | 'editorService'
  | 'fileSystem'
  | 'navigation'
  | 'pmEditorService'
  | 'shortcut'
  | 'userActivityService'
  | 'workbench'
  | 'workbenchState'
  | 'workspace'
  | 'workspaceOps'
  | 'workspaceState';

export type PlatformServiceSlotId =
  | 'database'
  | 'errorService'
  | 'fileStorageIdb'
  | 'fileStorageMemory'
  | 'fileStorageNativeFs'
  | 'router'
  | 'syncDatabase';

export type AllServiceName = CoreServiceSlotId | PlatformServiceSlotId;

export type CommandExcludedServiceSlotId =
  | 'commandDispatcher'
  | 'commandRegistry';

export type CommandExposedServiceSlotId = Exclude<
  CoreServiceSlotId,
  CommandExcludedServiceSlotId
>;

export type BaseDatabaseService = BaseAppDatabase & BaseService;
export type BaseFileStorageService = BaseFileStorageProvider & BaseService;
export type BaseSyncDatabaseService = BaseAppSyncDatabase & BaseService;
