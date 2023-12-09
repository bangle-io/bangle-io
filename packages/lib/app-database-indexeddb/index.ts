import {
  APP_ERROR_NAME,
  isAppError,
  throwAppError,
} from '@bangle.io/app-errors';
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
    if (isAppError(error)) {
      throw error;
    }

    if (error instanceof Error) {
      throwAppError(
        APP_ERROR_NAME.appDatabaseIndexedDB,
        `Error writing to IndexedDB`,
        {
          error,
        },
      );
    }
    throw error;
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
  ) {
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
        return {
          found: false,
          value: undefined,
        };
      }

      await Promise.all([
        objStore.put(makeDbRecord(wsName, updated.value)),
        tx.done,
      ]);

      return {
        found: true,
        value: updated.value,
      };
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
