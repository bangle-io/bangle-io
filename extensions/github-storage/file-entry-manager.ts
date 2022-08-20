import { LocalFileEntryManager } from '@bangle.io/remote-file-sync';

import { getLocalEntriesTable } from './database';

export const localFileEntryManager = () => {
  return new LocalFileEntryManager({
    get: (key: string) => {
      return getLocalEntriesTable().get(key);
    },

    set: async (key, entry) => {
      if (entry == null) {
        throw new Error('entry cannot be null/undefined');
      }

      await getLocalEntriesTable().put(key, entry);
    },

    getValues: async (keyPrefix: string) => {
      const results = (await getLocalEntriesTable().getAll()) || [];

      return results.filter((entry) => {
        return entry?.uid.startsWith(keyPrefix);
      });
    },

    delete: async (key) => {
      await getLocalEntriesTable().delete(key);
    },
  });
};
