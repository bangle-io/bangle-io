import {
  BaseService,
  type BaseServiceContext,
  isPlainObject,
  throwAppError,
} from '@bangle.io/base-utils';
import { DATABASE_TABLE_NAME, SERVICE_NAME } from '@bangle.io/constants';
import type {
  BaseDatabaseService,
  WorkspaceDatabaseQueryOptions,
  WorkspaceInfo,
} from '@bangle.io/types';
import { atom } from 'jotai';

/**
 * Provides API operations for managing workspace metadata and info
 */
export class WorkspaceOpsService extends BaseService {
  static deps = ['database'] as const;

  /**
   * Bumps on every workspaceInfo change (create, update, delete). Soft-deletes
   * and restores go through `updateEntry`, which emits an 'update' change rather
   * than 'delete', so consumers that track the visible (non-deleted) workspace
   * set must treat any change as significant.
   */
  $workspaceInfoChange = atom(0);

  private workspaceInfoCache = new Map<string, WorkspaceInfo>();

  constructor(
    context: BaseServiceContext,
    private dep: {
      database: BaseDatabaseService;
    },
  ) {
    super(SERVICE_NAME.workspaceOpsService, context, dep);
  }

  async hookMount(): Promise<void> {
    this.database.subscribe(
      { tableName: DATABASE_TABLE_NAME.workspaceInfo },
      () => {
        this.invalidateCache();
        this.store.set(this.$workspaceInfoChange, (v) => v + 1);
      },
      this.abortSignal,
    );
  }

  /**
   * Retrieves workspace info for a given workspace name, optionally restricted by type.
   * Uses an internal cache to speed up repeated queries.
   */
  public async getWorkspaceInfo(
    wsName: string,
    options?: WorkspaceDatabaseQueryOptions,
  ): Promise<WorkspaceInfo | undefined> {
    await this.mountPromise;

    let wsInfo = this.workspaceInfoCache.get(wsName);
    if (!wsInfo) {
      const result = await this.database.getEntry(wsName, {
        tableName: DATABASE_TABLE_NAME.workspaceInfo,
      });

      if (!result.found) {
        return undefined;
      }

      wsInfo = result.value as WorkspaceInfo;
      this.workspaceInfoCache.set(wsName, wsInfo);
    }

    if (!options?.allowDeleted && wsInfo?.deleted) {
      return undefined;
    }

    if (options?.type && wsInfo.type !== options.type) {
      return undefined;
    }

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
      { tableName: DATABASE_TABLE_NAME.workspaceInfo },
    );

    const updated = result.found ? (result.value as WorkspaceInfo) : undefined;
    return updated;
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
      { tableName: DATABASE_TABLE_NAME.workspaceInfo },
    );
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
        tableName: DATABASE_TABLE_NAME.workspaceInfo,
      },
    );

    if (result.found) {
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
      tableName: DATABASE_TABLE_NAME.workspaceInfo,
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
  ): Promise<Record<string, unknown>> {
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

  public invalidateCache(): void {
    this.workspaceInfoCache.clear();
  }

  private get database() {
    return this.dep.database;
  }
}
