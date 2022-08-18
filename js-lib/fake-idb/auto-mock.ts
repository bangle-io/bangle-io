import 'fake-indexeddb/auto';

import { IDBFactory } from 'fake-indexeddb';

globalThis.indexedDB = new IDBFactory();

beforeEach(() => {
  // clear idb before every test
  globalThis.indexedDB = new IDBFactory();
});
