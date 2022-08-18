import { LocalFileEntryManager } from '@bangle.io/remote-file-sync';

import { EXTENSION_NAME } from './common';
import type { getDatabase } from './helpers';

export const localFileEntryManager = (
  db: ReturnType<typeof getDatabase> = (globalThis as any).myDb(EXTENSION_NAME),
) => {
  return new LocalFileEntryManager({
    get: (key: string) => {
      return db.tables.localEntries.get(key);
    },

    set: async (key, entry) => {
      if (entry == null) {
        throw new Error('entry cannot be null/undefined');
      }

      await db.tables.localEntries.put(key, entry);
    },

    getValues: async (keyPrefix: string) => {
      const results = await db.tables.localEntries.getAll();

      return results.filter((entry) => {
        // For some reason some values have undefined, this
        // filters them out.
        return Boolean(entry);
      });
    },

    delete: async (key) => {
      await db.tables.localEntries.delete(key);
    },
  });
};
