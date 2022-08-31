import { LocalFileEntryManager } from '@bangle.io/remote-file-sync';

import { getLocalEntriesTable } from './database';

export const localFileEntryManager = new LocalFileEntryManager(
  getLocalEntriesTable(),
);
