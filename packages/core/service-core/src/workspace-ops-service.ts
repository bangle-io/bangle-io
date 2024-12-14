import {
  BaseService2,
  type BaseServiceContext,
  isPlainObject,
  throwAppError,
} from '@bangle.io/base-utils';
import type {
  BaseDatabaseService,
  WorkspaceDatabaseQueryOptions,
  WorkspaceInfo,
} from '@bangle.io/types';
import { atom } from 'jotai';

const WORKSPACE_INFO_TABLE = 'workspace-info';
const MISC_TABLE = 'misc';

/**
 * Provides API operations for managing workspace metadata and info
 */
export class WorkspaceOpsService extends BaseService2 {
  static deps = ['database'] as const;

  $workspaceInfoAnyChange = atom(0);
  $workspaceInfoListChange = atom(0);
  private workspaceInfoCache = new Map<string, WorkspaceInfo>();

  constructor(
    context: BaseServiceContext,
    private dep: {
      database: BaseDatabaseService;
    },
  ) {
    super('workspace-ops', context, dep);
  }

  async hookMount(): Promise<void> {
    this.database.subscribe(
      { tableName: WORKSPACE_INFO_TABLE },
      (change) => {
        this.store.set(this.$workspaceInfoAnyChange, (v) => v + 1);
        if (change.type === 'create' || change.type === 'delete') {
          this.store.set(this.$workspaceInfoListChange, (v) => v + 1);
        }
      },
      this.abortSignal,
    );
  }

  public async getWorkspaceInfo(
    wsName: string,
    options?: WorkspaceDatabaseQueryOptions,
  ): Promise<WorkspaceInfo | undefined> {
    await this.mountPromise;

    const cacheKey =
      wsName + (options?.type || '') + (options?.allowDeleted || '');
    if (this.workspaceInfoCache.has(cacheKey)) {
      return this.workspaceInfoCache.get(cacheKey);
    }

    const result = await this.database.getEntry(wsName, {
      tableName: WORKSPACE_INFO_TABLE,
    });

    if (!result.found) {
      return undefined;
    }

    const wsInfo = result.value as WorkspaceInfo;

    if (!options?.allowDeleted && wsInfo?.deleted) {
      return undefined;
    }

    if (options?.type && wsInfo.type !== options.type) {
      return undefined;
    }

    this.workspaceInfoCache.set(cacheKey, wsInfo);
    return wsInfo;
  }

  public async createWorkspaceInfo(
    info: Omit<WorkspaceInfo, 'lastModified' | 'deleted'>,
  ): Promise<WorkspaceInfo | undefined> {
    await this.mountPromise;
    const wsName = info.name;
    const result = await this.database.updateEntry(
      wsName,
      (existing) => {
        if (existing.found && !(existing.value as WorkspaceInfo)?.deleted) {
          throwAppError(
            'error::workspace:already-exists',
            'Cannot create workspace as it already exists',
            {
              wsName,
            },
          );
        }

        const value: WorkspaceInfo = {
          ...info,
          deleted: false,
          lastModified: Date.now(),
        };

        return {
          value,
        };
      },
      { tableName: WORKSPACE_INFO_TABLE },
    );

    const updated = result.found ? (result.value as WorkspaceInfo) : undefined;
    if (updated) {
      this.invalidateCache();
      return updated;
    }

    return undefined;
  }

  public async deleteWorkspaceInfo(wsName: string): Promise<void> {
    await this.mountPromise;
    await this.database.updateEntry(
      wsName,
      (existing) => {
        if (!existing.found) {
          throwAppError(
            'error::workspace:not-found',
            'Cannot delete workspace as it does not exist',
            {
              wsName,
            },
          );
        }

        const value: WorkspaceInfo = {
          ...(existing.value as WorkspaceInfo),
          lastModified: Date.now(),
          deleted: true,
        };

        return {
          value,
        };
      },
      { tableName: WORKSPACE_INFO_TABLE },
    );
    this.invalidateCache();
  }

  public async updateWorkspaceInfo(
    name: string,
    update: (wsInfo: WorkspaceInfo) => WorkspaceInfo,
  ): Promise<WorkspaceInfo | undefined> {
    await this.mountPromise;
    const result = await this.database.updateEntry(
      name,
      (existing) => {
        if (!existing.found) {
          throwAppError(
            'error::workspace:not-found',
            'Cannot update workspace as it does not exist',
            {
              wsName: name,
            },
          );
        }

        const existingValue = existing.value as WorkspaceInfo;
        const value = {
          ...existingValue,
          ...update(existingValue),
          lastModified: Date.now(),
        };

        return {
          value,
        };
      },
      {
        tableName: WORKSPACE_INFO_TABLE,
      },
    );

    if (result.found) {
      this.invalidateCache();
      return result.value as WorkspaceInfo;
    }

    return undefined;
  }

  public async getAllWorkspaces(options?: {
    type?: WorkspaceInfo['type'];
    allowDeleted?: boolean;
  }): Promise<WorkspaceInfo[]> {
    await this.mountPromise;
    const result = (await this.database.getAllEntries({
      tableName: WORKSPACE_INFO_TABLE,
    })) as WorkspaceInfo[];

    return result.filter((wsInfo) => {
      if (!options?.allowDeleted && wsInfo?.deleted) {
        return false;
      }
      if (options?.type) {
        return wsInfo.type === options.type;
      }
      return true;
    });
  }

  public async getWorkspaceMetadata(
    name: string,
  ): Promise<Record<string, any>> {
    await this.mountPromise;
    const result = (await this.getWorkspaceInfo(name))?.metadata;

    if (!result || !isPlainObject(result)) {
      return {};
    }
    return result;
  }

  public async updateWorkspaceMetadata(
    name: string,
    metadata: (
      existingMetadata: WorkspaceInfo['metadata'],
    ) => WorkspaceInfo['metadata'],
  ): Promise<boolean> {
    await this.mountPromise;
    await this.updateWorkspaceInfo(name, (wsInfo) => {
      const finalMetadata = metadata(wsInfo.metadata ?? {});

      if (!isPlainObject(finalMetadata)) {
        throwAppError(
          'error::workspace:invalid-metadata',
          `Invalid metadata for workspace ${name}`,
          {
            wsName: name,
          },
        );
      }

      return {
        ...wsInfo,
        metadata: finalMetadata,
      };
    });

    return true;
  }

  public async getMiscData(key: string): Promise<{ data: string } | undefined> {
    await this.mountPromise;
    const data = await this.database.getEntry(key, {
      tableName: MISC_TABLE,
    });

    if (!data.found) {
      return undefined;
    }

    if (typeof data.value !== 'string') {
      throwAppError('error::workspace:invalid-misc-data', 'Invalid misc data', {
        info: key,
      });
    }

    return {
      data: data.value,
    };
  }

  public async setMiscData(key: string, data: string): Promise<void> {
    await this.mountPromise;
    if (typeof data !== 'string') {
      throwAppError(
        'error::workspace:invalid-misc-data',
        `Invalid data for key ${key}`,
        {
          info: key,
        },
      );
    }

    await this.database.updateEntry(
      key,
      () => {
        return {
          value: data,
        };
      },
      { tableName: MISC_TABLE },
    );
  }

  public async deleteMiscData(key: string): Promise<void> {
    await this.mountPromise;
    await this.database.deleteEntry(key, {
      tableName: MISC_TABLE,
    });
  }

  public invalidateCache(): void {
    this.workspaceInfoCache.clear();
  }

  private get database() {
    return this.dep.database;
  }
}
