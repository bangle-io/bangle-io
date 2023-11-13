import {
  AppDatabaseErrorCode,
  BaseAppDatabase,
  WorkspaceDatabaseQueryOptions,
} from '@bangle.io/app-database';
import { BaseError } from '@bangle.io/base-error';
import { makeDbRecord } from '@bangle.io/db-key-val';
import type { WorkspaceInfo } from '@bangle.io/shared-types';

import {
  getAppDb,
  getMiscTable,
  getWorkspaceInfoTable,
  MISC_TABLE,
  WORKSPACE_INFO_TABLE,
} from './indexed-db-adaptor';
import { logger } from './logger';

export class AppDatabaseIndexedDB implements BaseAppDatabase {
  name = 'AppDatabaseIndexedDB';

  private throwUnknownWorkspaceError(error: any): never {
    logger.error(error);
    throw new BaseError({
      message: `Error creating workspace`,
      code: AppDatabaseErrorCode.WORKSPACE_ERROR,
      thrower: this.name,
    });
  }

  private throwUnknownMiscDataError(error: any): never {
    logger.error(error);
    throw new BaseError({
      message: `Error with misc data operation`,
      code: AppDatabaseErrorCode.MISC_DATA_ERROR,
      thrower: this.name,
    });
  }

  constructor() {
    //
  }

  async createWorkspaceInfo(workspaceInfo: WorkspaceInfo): Promise<void> {
    const { name: wsName } = workspaceInfo;
    try {
      const db = await getAppDb();
      const tx = db.transaction(WORKSPACE_INFO_TABLE, 'readwrite');

      const objStore = tx.objectStore(WORKSPACE_INFO_TABLE);

      const existing = await objStore.get(wsName);

      if (existing) {
        throw new BaseError({
          message: `Workspace with name ${wsName} already exists`,
          code: AppDatabaseErrorCode.WORKSPACE_EXISTS,
          thrower: this.name,
        });
      }

      const newInfo: WorkspaceInfo = {
        ...workspaceInfo,
        lastModified: Date.now(),
      };

      await Promise.all([objStore.put(makeDbRecord(wsName, newInfo)), tx.done]);

      return;
    } catch (error) {
      this.throwUnknownWorkspaceError(error);
    }
  }

  async getWorkspaceInfo(
    wsName: string,
    options: WorkspaceDatabaseQueryOptions = {},
  ) {
    try {
      let match = await getWorkspaceInfoTable()
        .get(wsName)
        .catch((error) => {
          logger.warn('Error reading workspace info from db', error);
          // swallow error as there is not much we can do, and treat it as if
          // workspace was not found
          return undefined;
        });

      if (!options.allowDeleted && match?.deleted) {
        return undefined;
      }

      if (options.type) {
        return match && match.type === options.type ? match : undefined;
      }

      return match;
    } catch (error) {
      this.throwUnknownWorkspaceError(error);
    }
  }

  async updateWorkspaceInfo(
    wsName: string,
    updateInfoCallback: (
      workspaceInfo: WorkspaceInfo,
    ) => Partial<WorkspaceInfo>,
  ): Promise<void> {
    try {
      const db = await getAppDb();

      const tx = db.transaction(WORKSPACE_INFO_TABLE, 'readwrite');

      const objStore = tx.objectStore(WORKSPACE_INFO_TABLE);

      const existing = await objStore.get(wsName);

      if (!existing) {
        throw new BaseError({
          message: `Workspace with name ${wsName} not found`,
          code: AppDatabaseErrorCode.WORKSPACE_NOT_FOUND,
          thrower: this.name,
        });
      }

      const currentVal = existing.value;
      const newInfo: WorkspaceInfo = {
        ...currentVal,
        ...updateInfoCallback(currentVal),
        lastModified: Date.now(),
      };
      await Promise.all([objStore.put(makeDbRecord(wsName, newInfo)), tx.done]);

      return;
    } catch (error) {
      this.throwUnknownWorkspaceError(error);
    }
  }

  async getAllWorkspaces(
    options: WorkspaceDatabaseQueryOptions = {},
  ): Promise<WorkspaceInfo[]> {
    try {
      const wsInfos = (await getWorkspaceInfoTable().getAll()) || [];

      return wsInfos
        .filter((wsInfo) => {
          if (options?.allowDeleted) {
            return true;
          }

          return !wsInfo.deleted;
        })
        .filter((wsInfo) => {
          if (options?.type) {
            return wsInfo.type === options.type;
          }
          return true;
        });
    } catch (error) {
      this.throwUnknownWorkspaceError(error);
    }
  }

  async getMiscData(key: string) {
    try {
      let match = await getMiscTable()
        .get(key)
        .catch((error) => {
          logger.warn('Error reading workspace info from db', error);
          // swallow error as there is not much we can do, and treat it as if
          // workspace was not found
          return undefined;
        });

      if (match === undefined) {
        return undefined;
      }

      // data is serialized as string in the db
      return { data: match };
    } catch (error) {
      this.throwUnknownMiscDataError(error);
    }
  }

  async setMiscData(key: string, serializedData: string) {
    try {
      const db = await getAppDb();

      const tx = db.transaction(MISC_TABLE, 'readwrite');

      const objStore = tx.objectStore(MISC_TABLE);

      await Promise.all([
        objStore.put(makeDbRecord(key, serializedData)),
        tx.done,
      ]);
    } catch (error) {
      this.throwUnknownMiscDataError(error);
    }
  }

  async deleteMiscData(key: string) {
    try {
      const db = await getAppDb();
      const tx = db.transaction(MISC_TABLE, 'readwrite');
      const objStore = tx.objectStore(MISC_TABLE);

      await Promise.all([objStore.delete(key), tx.done]);
    } catch (error) {
      this.throwUnknownMiscDataError(error);
    }
  }
}
