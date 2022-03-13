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
  entries: () => {
    return idb.entries().then((entries) => {
      return entries
        .filter(([key]) => {
          if (typeof key === 'string') {
            return key.startsWith(IDB_PREFIX);
          }
          return false;
        })
        .map(([key, value]) => [key, value] as [string, any])
        .map(([key, value]) => [key.slice(IDB_PREFIX.length), value]);
    });
  },
  delete: (key) => {
    return idb.del(IDB_PREFIX + key);
  },
});
