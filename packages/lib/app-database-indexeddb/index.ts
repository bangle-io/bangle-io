import { AppDatabaseErrorCode } from '@bangle.io/app-database';
import { BaseError } from '@bangle.io/base-error';
import { makeDbRecord } from '@bangle.io/db-key-val';
import type {
  BaseAppDatabase,
  DatabaseQueryOptions,
} from '@bangle.io/shared-types';

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

  private throwUnknownError(error: any): never {
    logger.error(error);
    throw new BaseError({
      message: `Error writing to Indexeddb`,
      code: AppDatabaseErrorCode.UNKNOWN_ERROR,
      thrower: this.name,
    });
  }

  async getAllEntries({ tableName }: DatabaseQueryOptions): Promise<unknown[]> {
    if (tableName === 'workspace-info') {
      try {
        return await getWorkspaceInfoTable().getAll();
      } catch (error) {
        this.throwUnknownError(error);
      }
    }

    try {
      return await getMiscTable().getAll();
    } catch (error) {
      this.throwUnknownError(error);
    }
  }

  async getEntry(
    key: string,
    options: DatabaseQueryOptions,
  ): Promise<{
    found: boolean;
    value: unknown;
  }> {
    const isWorkspaceInfo = options.tableName === 'workspace-info';

    const table = isWorkspaceInfo ? WORKSPACE_INFO_TABLE : MISC_TABLE;
    try {
      const db = await getAppDb();
      const tx = db.transaction(table, 'readonly');
      const objStore = tx.objectStore(table);
      const existing = await objStore.get(key);
      await tx.done;

      return {
        found: !!existing,
        value: existing?.value,
      };
    } catch (error) {
      this.throwUnknownError(error);
    }
  }

  async updateEntry(
    key: string,
    updateCallback: (options: { value: unknown; found: boolean }) => {
      value: unknown;
    } | null,
    options: DatabaseQueryOptions,
  ): Promise<void> {
    const isWorkspaceInfo = options.tableName === 'workspace-info';
    const table = isWorkspaceInfo ? WORKSPACE_INFO_TABLE : MISC_TABLE;

    try {
      const db = await getAppDb();

      const tx = db.transaction(table, 'readwrite');
      const objStore = tx.objectStore(table);

      const wsName = key;
      const existing = await objStore.get(wsName);

      const updated = updateCallback({
        found: !!existing,
        value: existing?.value,
      });

      if (!updated) {
        return;
      }

      await Promise.all([
        objStore.put(makeDbRecord(wsName, updated.value)),
        tx.done,
      ]);

      return;
    } catch (error) {
      this.throwUnknownError(error);
    }
  }

  async deleteEntry(key: string, options: DatabaseQueryOptions): Promise<void> {
    const isWorkspaceInfo = options.tableName === 'workspace-info';
    const table = isWorkspaceInfo ? WORKSPACE_INFO_TABLE : MISC_TABLE;

    try {
      const db = await getAppDb();

      const tx = db.transaction(table, 'readwrite');

      const objStore = tx.objectStore(table);

      await Promise.all([objStore.delete(key), tx.done]);
    } catch (error) {
      this.throwUnknownError(error);
    }

    return;
  }
}
