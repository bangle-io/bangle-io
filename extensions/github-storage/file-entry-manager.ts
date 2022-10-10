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
