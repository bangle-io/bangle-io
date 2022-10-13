import type { DBSchema, IDBPDatabase } from 'idb';

export * as idb from 'idb';

type Durability = 'default' | 'strict' | 'relaxed';

type IdbOpts = { durability?: Durability };

export function makeDbRecord<V>(key: string, value: V): DbRecord<V> {
  return {
    key,
    value,
    lastModified: Date.now(),
  };
}

export interface DbRecord<V> {
  key: string; // will always be the primary key
  value: V;
  lastModified: number;
}

export class DBKeyVal<V> {
  constructor(
    public readonly dbName: string,
    private _storeName: string,
    private _openDb: () => Promise<IDBPDatabase<any>>,
  ) {}

  async bulkDelete(uids: string[]): Promise<void> {
    const db = await this._openDb();
    const tx = db.transaction(this._storeName, 'readwrite');
    const store = tx.objectStore(this._storeName);

    let promises: Array<Promise<unknown>> = [];

    for (const uid of uids) {
      promises.push(store.delete(uid));
    }

    await Promise.all(promises);
    await tx.done;
  }

  async bulkPutIfNotExists(
    payload: Array<{ key: string; value: V }>,
    opts: IdbOpts = {},
  ): Promise<{ failed: string[] }> {
    const db = await this._openDb();
    const tx = db.transaction(this._storeName, 'readwrite', opts);
    const store = tx.objectStore(this._storeName);

    let promises: Array<Promise<unknown>> = [];
    let failed: string[] = [];

    for (const { key, value } of payload) {
      const existing: DbRecord<V> | undefined = await store.get(key);

      if (!existing) {
        promises.push(store.put(makeDbRecord(key, value)));
      } else {
        failed.push(key);
      }
    }

    await Promise.all(promises);
    await tx.done;

    return {
      failed,
    };
  }

  async bulkUpdateIfExists(
    keys: string[],
    updater: (key: string, oldValue: V) => V,
    opts: IdbOpts = {},
  ): Promise<{ failed: string[] }> {
    const db = await this._openDb();
    const tx = db.transaction(this._storeName, 'readwrite', opts);
    const store = tx.objectStore(this._storeName);

    let promises: Array<Promise<unknown>> = [];
    let failed: string[] = [];

    for (const key of keys) {
      const existing: DbRecord<V> | undefined = await store.get(key);

      if (existing) {
        const newRecord = makeDbRecord(key, updater(key, existing.value));

        promises.push(store.put(newRecord));
      } else {
        failed.push(key);
      }
    }

    await Promise.all(promises);
    await tx.done;

    return {
      failed,
    };
  }

  async delete(uid: string): Promise<void> {
    const db = await this._openDb();

    await db.delete(this._storeName, uid);
  }

  async get(uid: string): Promise<V | undefined> {
    const db = await this._openDb();

    const result = (await db.get(this._storeName, uid)) as
      | DbRecord<V>
      | undefined;

    return result?.value;
  }

  async getAll(): Promise<V[]> {
    const db = await this._openDb();

    const results = (await db.getAll(this._storeName)) as Array<DbRecord<V>>;

    return results.map((r) => {
      return r.value;
    });
  }

  openDb() {
    return this._openDb();
  }

  async put(key: string, val: V): Promise<void> {
    const db = await this._openDb();

    const result: DbRecord<V> = makeDbRecord(key, val);

    await db.put(this._storeName, result);
  }

  /**
   *
   * @returns False if the key already exists
   */
  async putIfNotExists(
    key: string,
    val: V,
    opts: IdbOpts = {},
  ): Promise<boolean> {
    const db = await this._openDb();
    const tx = db.transaction(this._storeName, 'readwrite', opts);
    const store = tx.objectStore(this._storeName);

    const existing: DbRecord<V> | undefined = await store.get(key);

    if (!existing) {
      let newRecord = makeDbRecord(key, val);

      await Promise.all([store.put(newRecord), tx.done]);

      return true;
    } else {
      await tx.done;

      return false;
    }
  }

  async updateIfExists(
    key: string,
    updater: (oldValue: V) => V,
    opts: IdbOpts = {},
  ): Promise<boolean> {
    const db = await this._openDb();
    const tx = db.transaction(this._storeName, 'readwrite', opts);
    const store = tx.objectStore(this._storeName);

    const existing: DbRecord<V> | undefined = await store.get(key);

    if (existing) {
      let newRecord = makeDbRecord(key, updater(existing.value));

      await Promise.all([store.put(newRecord), tx.done]);

      return true;
    } else {
      await tx.done;

      return false;
    }
  }
}

export interface BangleDbSchema extends DBSchema {
  [s: string]: {
    key: IDBValidKey;
    value: DbRecord<any>;
    indexes?: IndexKeys;
  };
}

interface IndexKeys {
  [s: string]: IDBValidKey;
}

// provides helper abstract to deal with database
export function getTable<
  DB extends BangleDbSchema,
  StoreName extends Extract<keyof DB, string>,
>(
  dbName: string,
  storeName: StoreName,
  getDb: () => Promise<IDBPDatabase<DB>>,
): DBKeyVal<DB[StoreName]['value']['value']> {
  return new DBKeyVal<DB[StoreName]['value']['value']>(
    dbName,
    storeName,
    getDb,
  );
}
