import * as idb from 'idb-keyval';

import { LocalFileEntryManager } from '@bangle.io/remote-file-sync';

const IDB_PREFIX = 'gh-store-1:';

export const localFileEntryManager = new LocalFileEntryManager({
  get: (key: string) => {
    return idb.get(IDB_PREFIX + key);
  },
  set: (key, entry) => {
    return idb.set(IDB_PREFIX + key, entry);
  },
  getValues: async () => {
    return idb.keys().then(async (keys) => {
      const filteredKeys: string[] = keys.filter((key): key is string => {
        if (typeof key === 'string') {
          return key.startsWith(IDB_PREFIX);
        }

        return false;
      });

      return idb.getMany(filteredKeys);
    });
  },
  delete: (key) => {
    return idb.del(IDB_PREFIX + key);
  },
});
