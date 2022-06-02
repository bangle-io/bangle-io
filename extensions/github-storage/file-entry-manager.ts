import * as idb from 'idb-keyval';

import { LocalFileEntryManager } from '@bangle.io/remote-file-sync';

const IDB_PREFIX = 'gh-store-1:';

export const localFileEntryManager = new LocalFileEntryManager({
  get: (key: string) => {
    return idb.get(IDB_PREFIX + key);
  },
  set: (key, entry) => {
    if (entry == null) {
      throw new Error('entry cannot be null/undefined');
    }

    return idb.set(IDB_PREFIX + key, entry);
  },
  getValues: async (keyPrefix: string) => {
    return idb.keys().then(async (keys) => {
      const filteredKeys: string[] = keys.filter((key): key is string => {
        if (typeof key === 'string') {
          return key.startsWith(IDB_PREFIX + keyPrefix);
        }

        return false;
      });

      const values = await idb.getMany(filteredKeys);

      // For some reason some values have undefined, this
      // filters them out.
      return values.filter((val) => val != null);
    });
  },
  delete: (key) => {
    return idb.del(IDB_PREFIX + key);
  },
});
