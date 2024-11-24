import {
  BaseService,
  isPlainObject,
  throwAppError,
} from '@bangle.io/base-utils';
import type {
  BaseDatabaseService,
  BaseServiceCommonOptions,
  WorkspaceDatabaseQueryOptions,
  WorkspaceInfo,
} from '@bangle.io/types';

const WORKSPACE_INFO_TABLE = 'workspace-info';
const MISC_TABLE = 'misc';

type ChangeEvent =
  | {
      type: 'workspace-create';
      payload: WorkspaceInfo;
    }
  | {
      type: 'workspace-update';
      payload: { name: string };
    }
  | {
      type: 'workspace-delete';
      payload: { name: string };
    };

export class WorkspaceService extends BaseService {
  private database: BaseDatabaseService;

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: {
      database: BaseDatabaseService;
    },
    private onChange: (change: ChangeEvent) => void,
  ) {
    super({
      ...baseOptions,
      name: 'workspace',
      kind: 'core',
      dependencies,
    });
    this.database = dependencies.database;
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('Initializing workspace service');
  }

  async getWorkspaceInfo(
    wsName: string,
    options?: WorkspaceDatabaseQueryOptions,
  ): Promise<WorkspaceInfo | undefined> {
    await this.initializedPromise;
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

    if (options?.type) {
      return wsInfo.type === options.type ? wsInfo : undefined;
    }

    return wsInfo;
  }

  async createWorkspaceInfo(
    info: Omit<WorkspaceInfo, 'lastModified' | 'deleted'>,
  ): Promise<WorkspaceInfo | undefined> {
    await this.initializedPromise;
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
      this.onChange({
        type: 'workspace-create',
        payload: updated,
      });

      return updated;
    }

    return undefined;
  }

  async deleteWorkspaceInfo(wsName: string): Promise<void> {
    await this.initializedPromise;
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

    this.onChange({
      type: 'workspace-delete',
      payload: { name: wsName },
    });
  }

  async updateWorkspaceInfo(
    name: string,
    update: (wsInfo: WorkspaceInfo) => WorkspaceInfo,
  ): Promise<WorkspaceInfo | undefined> {
    await this.initializedPromise;
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
      this.onChange({
        type: 'workspace-update',
        payload: { name },
      });

      return result.value as WorkspaceInfo;
    }

    return undefined;
  }

  async getAllWorkspaces(options?: {
    type?: WorkspaceInfo['type'];
    allowDeleted?: boolean;
  }): Promise<WorkspaceInfo[]> {
    await this.initializedPromise;
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

  async getWorkspaceMetadata(name: string): Promise<Record<string, any>> {
    await this.initializedPromise;
    const result = (await this.getWorkspaceInfo(name))?.metadata;

    if (!result || !isPlainObject(result)) {
      return {};
    }
    return result;
  }
  /**
   * The callback is called with the existing metadata and the
   *  return value is used to replace all of the metadata.
   */
  async updateWorkspaceMetadata(
    name: string,
    metadata: (
      existingMetadata: WorkspaceInfo['metadata'],
    ) => WorkspaceInfo['metadata'],
  ): Promise<boolean> {
    await this.initializedPromise;
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

  async getMiscData(key: string): Promise<{ data: string } | undefined> {
    await this.initializedPromise;
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

  async setMiscData(key: string, data: string): Promise<void> {
    await this.initializedPromise;
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

  async deleteMiscData(key: string): Promise<void> {
    await this.initializedPromise;
    await this.database.deleteEntry(key, {
      tableName: MISC_TABLE,
    });
  }
}
