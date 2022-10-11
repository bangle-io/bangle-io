import { calculateGitFileSha } from '@bangle.io/git-file-sha';
import type { PlainObjEntry } from '@bangle.io/remote-file-sync';

import {
  getLocalEntriesTable,
  LOCAL_ENTRIES_TABLE,
  openDatabase,
} from './database';

/**
 * Creates a idb range which includes all wsPaths of a wsName
 * @param wsName
 */
function createPrefixRange(wsName: string) {
  // TODO test for making sure prefix range is correct
  return IDBKeyRange.bound(`${wsName}:`, `${wsName}:\uffff`);
}

export class DatabaseFileEntry {
  constructor(private _opts: {}) {}

  async bulkCreateEntry(entries: PlainObjEntry[]): Promise<boolean> {
    let result = await getLocalEntriesTable().bulkPutIfNotExists(
      entries.map((entry) => ({ key: entry.uid, value: entry })),
    );

    return result.failed.length === 0;
  }

  async bulkRemoveEntries(wsPaths: string[]): Promise<void> {
    return getLocalEntriesTable().bulkDelete(wsPaths);
  }

  async bulkUpdateSource(payload: Array<{ wsPath: string; sourceFile: File }>) {
    const array: Array<[string, { sourceFile: File; sourceSha: string }]> =
      await Promise.all(
        payload.map(async (pay) => [
          pay.wsPath,
          {
            sourceFile: pay.sourceFile,
            sourceSha: await calculateGitFileSha(pay.sourceFile),
          },
        ]),
      );

    const map = new Map(array);

    return getLocalEntriesTable().bulkUpdateIfExists(
      [...map.keys()],
      (key, value) => {
        const pay = map.get(key);

        if (!pay) {
          return value;
        }

        return {
          ...value,
          source: {
            ...value.source,
            file: pay.sourceFile,
            sha: pay.sourceSha,
          },
        };
      },
    );
  }

  async bulkUpdateSourceAndCurrent(
    payload: Array<{ wsPath: string; file: File }>,
  ) {
    const array: Array<[string, { file: File; sha: string }]> =
      await Promise.all(
        payload.map(async (pay) => [
          pay.wsPath,
          {
            file: pay.file,
            sha: await calculateGitFileSha(pay.file),
          },
        ]),
      );

    const map = new Map(array);

    return getLocalEntriesTable().bulkUpdateIfExists(
      [...map.keys()],
      (key, value) => {
        const pay = map.get(key);

        if (!pay) {
          return value;
        }

        return {
          ...value,
          file: pay.file,
          sha: pay.sha,
          deleted: undefined,
          source: {
            ...value.source,
            file: pay.file,
            sha: pay.sha,
          },
        };
      },
    );
  }

  async bulkUpdateSourceToCurrentSha(payload: string[]) {
    return getLocalEntriesTable().bulkUpdateIfExists(payload, (key, value) => {
      return {
        ...value,
        source: {
          file: value.file,
          sha: value.sha,
        },
      };
    });
  }

  async createEntry(entry: PlainObjEntry): Promise<boolean> {
    let result = await getLocalEntriesTable().putIfNotExists(entry.uid, entry);

    return result;
  }

  async hasEntry(wsPath: string): Promise<boolean> {
    return Boolean(await this.readEntry(wsPath));
  }

  async listAllEntries(wsName: string): Promise<PlainObjEntry[]> {
    const db = await openDatabase();

    const result = await db.getAll(
      LOCAL_ENTRIES_TABLE,
      createPrefixRange(wsName),
    );

    return result.map((entry) => entry.value);
  }

  async listAllKeys(wsName: string): Promise<string[]> {
    // TODO remove this
    // a catch to avoid messing up with the later assumptions
    if (wsName.endsWith(':')) {
      throw new Error('wsName should not end with :');
    }
    const db = await openDatabase();

    return db.getAllKeys(LOCAL_ENTRIES_TABLE, createPrefixRange(wsName));
  }

  async listSoftDeletedKeys(wsName: string): Promise<string[]> {
    // TODO remove this
    // a catch to avoid messing up with the later assumptions
    if (wsName.endsWith(':')) {
      throw new Error('wsName should not end with :');
    }
    const db = await openDatabase();

    const tx = db.transaction(LOCAL_ENTRIES_TABLE, 'readonly');

    const store = tx.objectStore(LOCAL_ENTRIES_TABLE);

    let cursor = await store.openCursor(createPrefixRange(wsName));
    let result: string[] = [];

    while (cursor) {
      // only list keys that are not soft deleted
      if (cursor.value.value.deleted) {
        result.push(cursor.key);
      }
      cursor = await cursor.continue();
    }

    await tx.done;

    return result;
  }

  /**
   * Reads the entry from the database. Does not check for soft deletion.
   * @param wsPath
   * @returns
   */
  readEntry(wsPath: string): Promise<PlainObjEntry | undefined> {
    return getLocalEntriesTable().get(wsPath);
  }

  async removeEntry(wsPath: string): Promise<void> {
    return getLocalEntriesTable().delete(wsPath);
  }

  async resetCurrentToSource(wsPath: string) {
    let noSourceFound = false;

    const success = await getLocalEntriesTable().updateIfExists(
      wsPath,
      (oldValue) => {
        if (!oldValue.source) {
          noSourceFound = true;

          return oldValue;
        }

        return {
          ...oldValue,
          file: oldValue.source.file,
          sha: oldValue.source.sha,
          deleted: undefined,
        };
      },
    );

    if (success) {
      if (noSourceFound) {
        return false;
      }

      return true;
    }

    return false;
  }

  /**
   * Perform a soft delete of the file entry
   * @param wsPath
   */
  async softDeleteEntry(wsPath: string): Promise<boolean> {
    return getLocalEntriesTable().updateIfExists(
      wsPath,
      (oldValue) => ({
        ...oldValue,
        deleted: Date.now(),
      }),
      { durability: 'strict' },
    );
  }

  async updateSource(wsPath: string, sourceFile: File, sourceSha?: string) {
    const newSha = sourceSha || (await calculateGitFileSha(sourceFile));

    return getLocalEntriesTable().updateIfExists(wsPath, (oldValue) => {
      return {
        ...oldValue,
        source: {
          ...oldValue.source,
          file: sourceFile,
          sha: newSha,
        },
      };
    });
  }

  /**
   * Updates both the <file, sha> and the <source file, source sha> to be the one provided in args
   * if the file was marked for soft deletion, it will be unmarked
   */
  async updateSourceAndCurrent(wsPath: string, file: File, sha?: string) {
    const newSha = sha || (await calculateGitFileSha(file));

    return getLocalEntriesTable().updateIfExists(wsPath, (oldValue) => {
      return {
        ...oldValue,
        file,
        sha: newSha,
        deleted: undefined,
        source: {
          ...oldValue.source,
          file: file,
          sha: newSha,
        },
      };
    });
  }

  /**
   * Sets the entries source to match with the one current file
   */
  async updateSourceToCurrentSha(wsPath: string) {
    return getLocalEntriesTable().updateIfExists(
      wsPath,
      (oldValue) => {
        return {
          ...oldValue,
          source: {
            file: oldValue.file,
            sha: oldValue.sha,
          },
        };
      },
      { durability: 'strict' },
    );
  }

  async writeFile(wsPath: string, file: File, sha?: string) {
    const newSha = sha || (await calculateGitFileSha(file));

    return getLocalEntriesTable().updateIfExists(wsPath, (oldValue) => {
      return { ...oldValue, file, sha: newSha };
    });
  }
}

export const fileManager = new DatabaseFileEntry({});
