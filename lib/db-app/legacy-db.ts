import type { BangleDbSchema } from '@bangle.io/db-key-val';
import { idb } from '@bangle.io/db-key-val';

interface LegacyKeyVal extends BangleDbSchema {
  keyval: {
    key: string;
    value: any;
  };
}

export function legacyKeyVal() {
  const dbPromise = idb.openDB<LegacyKeyVal>('keyval-store', 1, {
    upgrade(db, oldVersion) {
      switch (oldVersion) {
        case 0: {
          db.createObjectStore('keyval');
        }
      }
    },
  });

  return {
    async get(key: string) {
      return (await dbPromise).get('keyval', key);
    },
    async del(key: string) {
      return (await dbPromise).delete('keyval', key);
    },

    async set(key: string, val: any) {
      return (await dbPromise).put('keyval', val, key);
    },
  };
}
